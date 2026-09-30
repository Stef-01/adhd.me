// The scripted call against the real conversation, both ways a sentence can be said: played as a
// recording, as the screen does, and said by the model, as a call with no recordings does. A person
// who answers everything is asked the plan's questions and no more, then the call reveals their words.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialVoice, step, type Action, type VoiceState } from "./conversation";
import { FAKE_ANSWER, fakeLink } from "./fake-link";
import { MAX_FOLLOW_UPS, OPENING_QUESTION } from "./interviewer";
import { CULTURE_ASK, LIVED_ASK, SENTENCES } from "./plan";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function call(answers: string[], recorded: boolean) {
  let state: VoiceState = initialVoice();
  const clips = () => recorded;
  const link = fakeLink(
    {
      onMic: () => act({ type: "mic" }),
      onOpen: () => act({ type: "connected" }),
      onEvent: (event) => act({ type: "server", event }),
      onFail: () => act({ type: "failed", failure: "unavailable" }),
    },
    answers,
  );
  function act(action: Action) {
    const next = step(state, action, clips);
    state = next.state;
    if (next.hush) link.hush();
    for (const event of next.send) link.emit(event);
    const say = next.say;
    if (say) void link.say(say.id).then((heard) => act({ type: "said", say: say.id, heard }));
  }
  return {
    get state() { return state; },
    /** What the call said, in order: the record's assistant turns. */
    get said() { return state.turns.filter((turn) => turn.who === "assistant").map((turn) => turn.text); },
    link,
  };
}

const ANSWERS = ["I need help at work", "deadlines, and my boss", "Parramatta, but telehealth is fine", "yes please", "yes", "Indian", "I have anxiety as well"];
const ASKED = ["opening", "detail-work", "place", "lived", "culture", "which-culture", "extra", "closing"] as const;
const REQUEST = `I need help at work. deadlines, and my boss. Parramatta, but telehealth is fine. ${LIVED_ASK}. ${CULTURE_ASK}, Indian. I have anxiety as well. help with focus and getting things done`;

describe.each([
  ["played as recordings", true],
  ["said by the model", false],
])("the scripted call, %s", (_name, recorded) => {
  it("opens on the welcome question and holds there with nobody speaking", async () => {
    const c = call([], recorded);
    await vi.advanceTimersByTimeAsync(5000);
    expect(c.said).toEqual([`Hi. ${OPENING_QUESTION}`]);
    expect(c.state.caption).toBe(`Hi. ${OPENING_QUESTION}`);
    expect(c.state.phase).toBe("live");
    expect(c.state.pending?.question).toBe("opening");
  });

  it("asks the plan's questions of a person who answers each, then reveals their words", async () => {
    const c = call(ANSWERS, recorded);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(c.said).toEqual(ASKED.map((id) => SENTENCES[id].text));
    expect(c.state.asked).toBe(6);
    expect(c.state.asked).toBeLessThanOrEqual(MAX_FOLLOW_UPS);
    expect(c.state.phase).toBe("revealing");
    expect(c.state.reveal).toEqual({ request: REQUEST, place: "Parramatta" });
  });

  it("answers what the person asks it, then asks its own question again", async () => {
    const c = call(["an ADHD assessment", "What does bulk billing mean?", "Hornsby"], recorded);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(c.said.slice(0, 5)).toEqual([SENTENCES.opening.text, SENTENCES.place.text, FAKE_ANSWER, SENTENCES.place.text, SENTENCES.lived.text]);
    expect(c.state.heard.map((answer) => answer.text)).toEqual(["an ADHD assessment", "Hornsby"]);
  });

  it("stops everything it scheduled when the call is closed", async () => {
    const c = call(["an assessment", "Hornsby"], recorded);
    await vi.advanceTimersByTimeAsync(200);
    c.link.close();
    const before = c.state;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(c.state).toBe(before);
  });
});
