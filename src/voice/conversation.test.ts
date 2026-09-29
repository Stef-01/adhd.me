// The voice finder's conversation, driven by scripted realtime events: the question budget the
// client holds, the forced last turn, the reveal, typing, and urgent help.

import { describe, expect, it } from "vitest";
import { initialVoice, inTheirWords, placeOf, saidAsRequest, step, type Action, type ClientEvent, type ServerEvent, type VoiceState } from "./conversation";
import { AFTER_URGENT, MAX_FOLLOW_UPS, NUDGE, NUDGE_START, OPENING_QUESTION, SHOW_MATCHES, URGENT_HELP, WRAP_UP } from "./interviewer";

/** Runs actions in order, collecting everything sent. */
function run(actions: Action[], start: VoiceState = initialVoice()) {
  let state = start;
  const sent: ClientEvent[] = [];
  for (const action of actions) {
    const next = step(state, action);
    state = next.state;
    sent.push(...next.send);
  }
  return { state, sent };
}

const server = (event: ServerEvent): Action => ({ type: "server", event });
let ids = 0;
/** One spoken assistant turn, as the realtime API reports it. */
function asks(text: string, status = "completed"): Action[] {
  const id = `resp_${++ids}`;
  return [
    server({ type: "response.created", response: { id } }),
    server({ type: "response.output_audio_transcript.delta", response_id: id, delta: text }),
    server({ type: "response.output_audio_transcript.done", response_id: id, transcript: text }),
    server({ type: "response.done", response: { id, status, output: [{ type: "message", role: "assistant" }] } }),
  ];
}
/** One spoken answer: the server commits the audio, then its transcript arrives. */
function answers(text: string): Action[] {
  return [
    server({ type: "input_audio_buffer.speech_started" }),
    server({ type: "input_audio_buffer.speech_stopped" }),
    server({ type: "input_audio_buffer.committed" }),
    server({ type: "conversation.item.input_audio_transcription.completed", transcript: text }),
  ];
}
function calls(name: string, args: Record<string, unknown> | string, metadata: unknown = null): Action {
  return server({
    type: "response.done",
    response: {
      id: `resp_${++ids}`,
      status: "completed",
      metadata,
      output: [{ type: "function_call", name, call_id: `call_${ids}`, arguments: typeof args === "string" ? args : JSON.stringify(args) }],
    },
  });
}
const opened: Action[] = [{ type: "connected" }, ...asks(`Hi. ${OPENING_QUESTION}`)];
const types = (sent: ClientEvent[]) => sent.map((e) => e.type);
const forced = (event: ClientEvent) =>
  event.type === "response.create" && (event.response as { tool_choice?: { name?: string } } | undefined)?.tool_choice?.name === SHOW_MATCHES;
const turnDetectionOf = (event: ClientEvent) =>
  (event.session as { audio?: { input?: { turn_detection?: { create_response?: boolean } } } }).audio?.input?.turn_detection;

/** A conversation that has used `n` questions after the first answer. */
function conversation(n: number) {
  const actions: Action[] = [...opened, ...answers("an adult ADHD assessment")];
  for (let i = 0; i < n; i++) actions.push(...asks(`Question ${i + 1}?`), ...answers(`answer ${i + 1}`));
  return run(actions);
}

describe("the record of the call", () => {
  it("keeps every turn: the person's, the assistant's and the tool's, in order", () => {
    const { state } = run([
      { type: "connected" },
      ...asks(`Hi. ${OPENING_QUESTION}`),
      ...answers("I had a baby eight months ago and I think I might have ADHD"),
      ...asks("Is this for you, or for someone else?"),
      { type: "typed", text: "for me" },
      calls(SHOW_MATCHES, { request: "An ADHD assessment for me, postpartum", place: "" }),
    ]);
    expect(state.turns).toEqual([
      { who: "assistant", text: `Hi. ${OPENING_QUESTION}` },
      { who: "person", text: "I had a baby eight months ago and I think I might have ADHD" },
      { who: "assistant", text: "Is this for you, or for someone else?" },
      { who: "person", text: "for me" },
      { who: "tool", text: `${SHOW_MATCHES} ${JSON.stringify({ request: "An ADHD assessment for me, postpartum", place: "" })}` },
    ]);
  });
});

describe("the voice conversation", () => {
  it("opens on the welcome screen's question and asks it aloud once connected", () => {
    const start = initialVoice();
    expect(start.caption).toBe(OPENING_QUESTION);
    expect(start.phase).toBe("connecting");
    const { state, sent } = run([{ type: "connected" }]);
    expect(state.phase).toBe("live");
    expect(types(sent)).toEqual(["conversation.item.create", "response.create"]);
    expect(JSON.stringify(sent[0])).toContain(OPENING_QUESTION);
  });

  it("counts a question only after the first answer, and only when it was said in full", () => {
    const before = run([...opened, ...asks("Could you say that again?")]);
    expect(before.state.asked).toBe(0);
    const after = run([...opened, ...answers("a GP"), ...asks("Is this for you?"), ...asks("Sorry, go on", "cancelled")]);
    expect(after.state.asked).toBe(1);
  });

  it("counts the answer when its audio is committed, before its transcript arrives", () => {
    const { state } = run([
      ...opened,
      server({ type: "input_audio_buffer.committed" }),
      ...asks("Is this for you?"),
      server({ type: "conversation.item.input_audio_transcription.completed", transcript: "a GP" }),
    ]);
    expect(state.asked).toBe(1);
    expect(state.said).toEqual(["a GP"]);
  });

  it("asks at most eight questions, then forces show_matches on the next answer", () => {
    expect(MAX_FOLLOW_UPS).toBe(8);
    const almost = conversation(MAX_FOLLOW_UPS - 1);
    expect(almost.state.wrapping).toBe(false);
    expect(almost.sent.filter((e) => e.type === "session.update")).toEqual([]);

    const spent = run(asks("One last question?"), almost.state);
    expect(spent.state.asked).toBe(MAX_FOLLOW_UPS);
    expect(spent.state.wrapping).toBe(true);
    // The next answer starts no response on its own.
    expect(spent.sent).toHaveLength(1);
    expect(turnDetectionOf(spent.sent[0]!)).toMatchObject({ create_response: false });

    const last = run([server({ type: "input_audio_buffer.committed" })], spent.state);
    expect(last.state.forced).toBe(true);
    expect(last.sent.some(forced)).toBe(true);
    expect(JSON.stringify(last.sent)).toContain(JSON.stringify(WRAP_UP).slice(1, -1));
    // A second commit does not force twice.
    expect(run([server({ type: "input_audio_buffer.committed" })], last.state).sent).toEqual([]);
  });

  it("never asks a ninth question, however the model behaves", () => {
    const { state } = conversation(MAX_FOLLOW_UPS);
    expect(state.asked).toBe(8);
    expect(state.forced).toBe(true);
    const extra = run(asks("A ninth question?"), state);
    expect(extra.state.asked).toBe(8);
  });

  it("reveals with the model's sentence and place when it calls show_matches", () => {
    const { state } = run([
      ...opened,
      ...answers("an assessment for me"),
      calls(SHOW_MATCHES, { request: "An adult ADHD assessment near Hornsby", place: "Hornsby" }),
    ]);
    expect(state.phase).toBe("revealing");
    expect(state.reveal).toEqual({ request: "An adult ADHD assessment near Hornsby", place: "Hornsby" });
  });

  it("falls back to the person's own words when the model's call is empty or broken", () => {
    const start = run([...opened, ...answers("a psychiatrist"), ...answers("telehealth please")]).state;
    expect(run([calls(SHOW_MATCHES, { request: " ", place: 3 })], start).state.reveal).toEqual({ request: "a psychiatrist, telehealth please", place: "" });
    expect(run([calls(SHOW_MATCHES, "{not json")], start).state.reveal?.request).toBe("a psychiatrist, telehealth please");
  });

  it("reveals on the person's words when the forced last turn ends without show_matches", () => {
    const { state } = conversation(MAX_FOLLOW_UPS);
    expect(state.forced).toBe(true);
    // Another response finishing is not the forced one.
    expect(run(asks("Anything else?"), state).state.phase).toBe("live");
    const done = run(
      [server({ type: "response.done", response: { id: "resp_last", status: "completed", metadata: { purpose: "wrap-up" }, output: [] } })],
      state,
    );
    expect(done.state.phase).toBe("revealing");
    expect(done.state.reveal?.request).toBe(saidAsRequest(state.said));
  });

  it("sends typed words as the person's turn, cancelling a reply under way", () => {
    const live = run([...opened, server({ type: "response.created", response: { id: "resp_x" } })]).state;
    expect(live.responding).toBe(true);
    const { state, sent } = run([{ type: "typed", text: "  a woman GP  " }], live);
    expect(types(sent)).toEqual(["response.cancel", "output_audio_buffer.clear", "conversation.item.create", "response.create"]);
    expect(sent[2]).toMatchObject({ item: { role: "user", content: [{ type: "input_text", text: "a woman GP" }] } });
    expect(state.said).toEqual(["a woman GP"]);
    expect(state.answers).toBe(1);
    expect(run([{ type: "typed", text: "   " }], state).sent).toEqual([]);
  });

  it("ends in show_matches when the person types after the budget is spent", () => {
    const spent = run(asks("Last one?"), conversation(MAX_FOLLOW_UPS - 1).state).state;
    const { state, sent } = run([{ type: "typed", text: "bulk billing" }], spent);
    expect(state.forced).toBe(true);
    expect(sent.some(forced)).toBe(true);
  });

  it("shows urgent help when the model calls it, and hands the turn back", () => {
    const { state, sent } = run([...opened, ...answers("I can't do this any more"), calls(URGENT_HELP, {})]);
    expect(state.urgent).toBe(true);
    expect(types(sent).slice(-3)).toEqual(["conversation.item.create", "conversation.item.create", "response.create"]);
    expect(sent.at(-3)).toMatchObject({ item: { type: "function_call_output", output: "shown" } });
    expect(JSON.stringify(sent.at(-2))).toContain(AFTER_URGENT.slice(0, 40));
    expect(run([{ type: "urgent-seen" }], state).state.urgent).toBe(false);
  });

  it("opens urgent help from the person's own words, whatever the model does", () => {
    expect(run([...opened, ...answers("honestly I want to die")]).state.urgent).toBe(true);
    expect(run([...opened, { type: "typed", text: "I don't want to be here any more" }]).state.urgent).toBe(true);
    // Words that are ordinary in an ADHD search do not.
    for (const words of ["my racing thoughts at night", "a history of substance abuse", "my heart races on stimulants"]) {
      expect(run([...opened, ...answers(words)]).state.urgent, words).toBe(false);
    }
  });

  it("finishes on request only once the person has said something", () => {
    const quiet = run([...opened, { type: "finish" }]);
    expect(quiet.sent.filter(forced)).toEqual([]);
    const { state, sent } = run([...opened, ...answers("an assessment"), { type: "finish" }]);
    expect(state.forced).toBe(true);
    expect(sent.some(forced)).toBe(true);
    expect(run([{ type: "finish" }], state).sent).toEqual([]);
  });

  it("captions each reply on its own", () => {
    const { state } = run([
      ...opened,
      server({ type: "response.output_audio_transcript.delta", response_id: "r9", delta: "Where " }),
      server({ type: "response.output_audio_transcript.delta", response_id: "r9", delta: "are you?" }),
    ]);
    expect(state.caption).toBe("Where are you?");
    const done = run([server({ type: "response.output_audio_transcript.done", response_id: "r9", transcript: "Where are you based?" })], state).state;
    expect(done.caption).toBe("Where are you based?");
  });

  it("follows who is talking, for the orb", () => {
    const person = run([...opened, server({ type: "input_audio_buffer.speech_started" })]).state;
    expect(person.talking).toBe("person");
    const assistant = run([server({ type: "output_audio_buffer.started" })], person).state;
    expect(assistant.talking).toBe("assistant");
    expect(run([server({ type: "output_audio_buffer.stopped" })], assistant).state.talking).toBeNull();
  });

  it("holds still once failed, and takes nothing but the call's own events while revealing", () => {
    const failed = run([{ type: "failed", failure: "mic" }]).state;
    expect(failed).toMatchObject({ phase: "failed", failure: "mic" });
    expect(run([{ type: "connected" }, { type: "typed", text: "hello" }], failed).state).toBe(failed);

    const revealing = run([...opened, ...answers("a GP"), calls(SHOW_MATCHES, { request: "a GP", place: "" })]).state;
    expect(run([{ type: "typed", text: "wait" }], revealing).sent).toEqual([]);
    const speaking = run([server({ type: "output_audio_buffer.started" })], revealing).state;
    expect(speaking.talking).toBe("assistant");
  });
});

describe("the request the model composes", () => {
  it("names a kind of clinician only when the person did, since a kind narrows the list", () => {
    expect(inTheirWords("An ADHD assessment with a psychologist near Parramatta", ["an assessment for my son"])).toBe("An ADHD assessment with a clinician near Parramatta");
    expect(inTheirWords("A Vietnamese-speaking GP or psychiatrist in Cabramatta", ["tôi cần bác sĩ"])).toBe("A Vietnamese-speaking clinician in Cabramatta");
    expect(inTheirWords("An occupational therapist for routines", ["help with routines"])).toBe("A clinician for routines");
    expect(inTheirWords("A GP near Hornsby who bulk bills", ["a GP", "Hornsby"])).toBe("A GP near Hornsby who bulk bills");
    expect(inTheirWords("A woman doctor near Epping", ["I'd like a woman doctor"])).toBe("A woman doctor near Epping");
    expect(inTheirWords("GPs who do telehealth", ["telehealth"])).toBe("clinicians who do telehealth");
  });

  it("drops 'adult' from a request for a child", () => {
    expect(inTheirWords("An adult ADHD assessment for my 15-year-old daughter in Cabramatta", ["con gái 15 tuổi"])).toBe("An ADHD assessment for my 15-year-old daughter in Cabramatta");
    expect(inTheirWords("An adult ADHD assessment for my son, 9", ["my son"])).toBe("An ADHD assessment for my son, 9");
    expect(inTheirWords("An adult ADHD assessment for me, 34", ["for me"])).toBe("An adult ADHD assessment for me, 34");
  });

  it("never writes 'specialist', whoever wrote it", () => {
    expect(inTheirWords("A psychologist specialising in ADHD coaching", ["a psychologist for coaching"])).toBe("A psychologist for ADHD coaching");
    expect(inTheirWords("An ADHD specialist by telehealth", ["telehealth"])).toBe("An ADHD clinician by telehealth");
  });

  it("holds the model's sentence to the person's words at the reveal", () => {
    const { state } = run([
      ...opened,
      ...answers("an assessment for my daughter, she's 15"),
      calls(SHOW_MATCHES, { request: "An ADHD assessment for my 15-year-old daughter with a psychiatrist specialising in teens", place: "" }),
    ]);
    expect(state.reveal?.request).toBe("An ADHD assessment for my 15-year-old daughter with a clinician for teens");
  });
});

describe("the place the model gives", () => {
  it("keeps the suburb or postcode alone", () => {
    expect(placeOf("Hornsby, NSW, or telehealth")).toBe("Hornsby");
    expect(placeOf("Parramatta NSW")).toBe("Parramatta");
    expect(placeOf("2077")).toBe("2077");
    expect(placeOf("Newtown or telehealth")).toBe("Newtown");
    expect(placeOf("")).toBe("");
    expect(placeOf(12)).toBe("");
  });
});

describe("back and forth", () => {
  it("does not count an answer to the person's own question as a follow-up", () => {
    const { state } = run([...opened, ...answers("what is bulk billing?"), ...asks("It means the clinician charges Medicare only, so you pay nothing.")]);
    expect(state.asked).toBe(0);
    expect(run(asks("Does cost matter to you?"), state).state.asked).toBe(1);
  });

  it("checks gently on a quiet person, then shows the matches for what they said", () => {
    const talked = run([...opened, ...answers("an adult ADHD assessment"), ...asks("Where are you?")]).state;
    const first = run([{ type: "quiet" }], talked);
    expect(first.state.quiet).toBe(1);
    expect(JSON.stringify(first.sent)).toContain(JSON.stringify(NUDGE).slice(1, 40));
    // The check asks something, but it is not a follow-up.
    const checked = run([server({ type: "response.created", response: { id: "n1" } }), server({ type: "response.output_audio_transcript.done", response_id: "n1", transcript: "Still there? I can show you matches now if you like." }), server({ type: "response.done", response: { id: "n1", status: "completed", metadata: { purpose: "nudge" }, output: [{ type: "message", role: "assistant" }] } })], first.state).state;
    expect(checked.asked).toBe(talked.asked);
    const second = run([{ type: "quiet" }], checked);
    expect(second.state.forced).toBe(true);
    expect(second.sent.some(forced)).toBe(true);
  });

  it("before anything is said, asks the opening question again and never finishes", () => {
    const first = run([...opened, { type: "quiet" }]);
    expect(JSON.stringify(first.sent)).toContain(JSON.stringify(NUDGE_START).slice(1, 40));
    const second = run([{ type: "quiet" }], first.state);
    expect(second.sent).toEqual([]);
    expect(second.state.forced).toBe(false);
  });

  it("starts the checks again once the person speaks", () => {
    const quiet = run([...opened, ...answers("a GP"), ...asks("Where are you?"), { type: "quiet" }]).state;
    expect(quiet.quiet).toBe(1);
    expect(run(answers("Hornsby"), quiet).state.quiet).toBe(0);
  });
});
