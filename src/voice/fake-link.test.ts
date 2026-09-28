// The scripted call against the real conversation: a person who answers everything is asked at most
// eight questions, then the call ends in show_matches with their words, exactly as it would live.

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { initialVoice, step, type Action, type VoiceState } from "./conversation";
import { fakeLink, FAKE_QUESTIONS } from "./fake-link";
import { MAX_FOLLOW_UPS, OPENING_QUESTION } from "./interviewer";

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

function call(answers: string[]) {
  let state: VoiceState = initialVoice();
  const captions: string[] = [];
  const link = fakeLink(
    {
      onOpen: () => act({ type: "connected" }),
      onEvent: (event) => {
        act({ type: "server", event });
        if (event.type === "response.output_audio_transcript.done") captions.push(state.caption);
      },
      onFail: () => act({ type: "failed", failure: "unavailable" }),
    },
    answers,
  );
  function act(action: Action) {
    const next = step(state, action);
    state = next.state;
    for (const event of next.send) link.emit(event);
  }
  return { get state() { return state; }, captions, link };
}

describe("the scripted call", () => {
  it("opens on the welcome question and holds there with nobody speaking", async () => {
    const c = call([]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(c.captions).toEqual([`Hi. ${OPENING_QUESTION}`]);
    expect(c.state.phase).toBe("live");
  });

  it("asks at most eight questions of a person who keeps answering, then reveals their words", async () => {
    const answers = ["an adult ADHD assessment", "for me", "Hornsby", "bulk billing", "a woman", "don't rush me", "anxiety", "an assessment", "mornings", "that's all"];
    const c = call(answers);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(c.state.asked).toBe(MAX_FOLLOW_UPS);
    expect(c.captions.slice(1)).toEqual(FAKE_QUESTIONS.slice(0, MAX_FOLLOW_UPS));
    expect(c.state.phase).toBe("revealing");
    // The ninth answer is the last one heard: it ends the call, and the tenth is never asked for.
    expect(c.state.reveal?.request).toBe(answers.slice(0, MAX_FOLLOW_UPS + 1).join(", "));
  });

  it("stops everything it scheduled when the call is closed", async () => {
    const c = call(["an assessment", "for me"]);
    await vi.advanceTimersByTimeAsync(200);
    c.link.close();
    const before = c.state;
    await vi.advanceTimersByTimeAsync(10_000);
    expect(c.state).toBe(before);
  });
});
