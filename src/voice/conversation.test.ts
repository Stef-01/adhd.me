// The voice finder's conversation, driven by scripted events: the app asks the plan's questions, an
// answer belongs to the question the person last heard in full, a sentence is a recording or the
// model saying it, and the model is left answering what it is asked and watching for danger.

import { describe, expect, it } from "vitest";
import { HEARD, MOST_ANSWERS, initialVoice, inTheirWords, resting, saidAsRequest, settled, stalled, step, type Action, type ClientEvent, type ServerEvent, type Step, type VoiceState } from "./conversation";
import { ANSWER, MAX_FOLLOW_UPS, SAFETY_CHECK, TRANSLATE, URGENT_HELP, safetyInput, sayExactly } from "./interviewer";
import { CULTURE_ASK, LIVED_ASK, NEED_PHRASE, SENTENCES, TELEHEALTH_ASK, type SayId } from "./plan";

const RECORDED = () => true;
const server = (event: ServerEvent): Action => ({ type: "server", event });
let ids = 0;

/** A call on its recordings, as the screen runs it: every sentence asked for is played to its end unless the test cuts it. */
function call(start: VoiceState = initialVoice(), clips: (id: SayId) => boolean = RECORDED) {
  let state = start;
  const sent: ClientEvent[] = [];
  const played: SayId[] = [];
  let playing: SayId | null = null;
  let hushes = 0;
  const take = (next: Step) => {
    state = next.state;
    sent.push(...next.send);
    if (next.hush) {
      hushes += 1;
      playing = null;
    }
    if (next.say) {
      played.push(next.say.id);
      playing = next.say.id;
    }
    return next;
  };
  const act = (action: Action) => take(step(state, action, clips));
  const self = {
    get state() { return state; },
    sent,
    played,
    get playing() { return playing; },
    get hushes() { return hushes; },
    act,
    /** The recording being played ends, or is cut short at this share of it. */
    ends(share = 1) {
      const id = playing;
      if (!id) throw new Error("nothing is being played");
      playing = null;
      act({ type: "said", say: id, heard: share });
      return self;
    },
    /** Every recording asked for plays to its end, until the call waits on the person. */
    through() {
      while (playing) self.ends();
      return self;
    },
    /** The person speaks: the server commits the audio, then its words arrive. */
    hears(text: string, { cut }: { cut?: number } = {}) {
      const item_id = `item_${++ids}`;
      act(server({ type: "input_audio_buffer.speech_started", item_id }));
      // Speaking over a recording stops it, as the screen does.
      if (playing && cut !== undefined) self.ends(cut);
      act(server({ type: "input_audio_buffer.speech_stopped", item_id }));
      act(server({ type: "input_audio_buffer.committed", item_id }));
      act(server({ type: "conversation.item.input_audio_transcription.completed", item_id, transcript: text }));
      return self;
    },
    /** A whole exchange: what is being said is heard out, then the person answers. */
    answers(text: string) {
      return self.through().hears(text);
    },
  };
  return self;
}

/** A call begun on its recordings, with the opening question heard. */
const begun = () => {
  const c = call();
  c.act({ type: "mic" });
  c.act({ type: "connected" });
  return c.through();
};

const purposes = (sent: ClientEvent[]) => sent.filter((event) => event.type === "response.create").map((event) => (event.response as { metadata?: { purpose?: string } }).metadata?.purpose);
const assistant = (state: VoiceState) => state.turns.filter((turn) => turn.who === "assistant").map((turn) => turn.text);
const person = (state: VoiceState) => state.turns.filter((turn) => turn.who === "person").map((turn) => turn.text);
/** One response of the model's, done. */
function done(purpose: string, output: unknown[] = [], status = "completed"): Action[] {
  const id = `resp_${++ids}`;
  return [server({ type: "response.created", response: { id, metadata: { purpose } } }), server({ type: "response.done", response: { id, status, metadata: { purpose }, output } })];
}

describe("the opening", () => {
  it("is played the moment the microphone is open, before the call has connected", () => {
    const c = call();
    expect(c.state.caption).toBe(SENTENCES.opening.text);
    const first = c.act({ type: "mic" });
    expect(first.say).toEqual({ id: "opening", firm: false });
    expect(c.state.phase).toBe("live");
    expect(c.state.talking).toBe("assistant");
    // The sentence joins the conversation, and the model is asked for nothing.
    expect(first.send).toEqual([{ type: "conversation.item.create", item: { type: "message", role: "assistant", content: [{ type: "output_text", text: SENTENCES.opening.text }] } }]);
    expect(c.act({ type: "connected" }).send).toEqual([]);
    c.ends();
    expect(c.state.pending).toEqual({ say: "opening", question: "opening" });
    expect(c.state.talking).toBeNull();
    expect(c.state.asked).toBe(0);
  });

  it("is asked again when the person answered before the call could carry their voice", () => {
    const c = call();
    c.act({ type: "mic" });
    c.ends();
    const opened = c.act({ type: "connected", missed: true });
    expect(opened.say?.id).toBe("catch");
    c.ends();
    // The question without its hello: nobody says hello twice.
    expect(c.playing).toBe("again");
    c.ends();
    expect(c.state.pending?.question).toBe("opening");
    expect(c.state.asked).toBe(0);
    // Still being said when the call opens: the sentence is finished first.
    const during = call();
    during.act({ type: "mic" });
    expect(during.act({ type: "connected", missed: true }).say).toBeNull();
    during.ends();
    expect(during.playing).toBe("catch");
    // Nothing was missed: nothing is said.
    const heard = call();
    heard.act({ type: "mic" });
    heard.ends();
    expect(heard.act({ type: "connected", missed: false }).say).toBeNull();
  });

  it("is said by the model when there is no recording, once the call has connected, with no conversation behind it", () => {
    const c = call(initialVoice(), () => false);
    expect(c.act({ type: "mic" }).say).toBeNull();
    expect(c.state.phase).toBe("connecting");
    const opened = c.act({ type: "connected" });
    expect(opened.say).toBeNull();
    expect(c.state.phase).toBe("live");
    const asked = opened.send.find((event) => event.type === "response.create")!.response as Record<string, unknown>;
    expect(asked).toMatchObject({ conversation: "none", input: [], instructions: sayExactly(SENTENCES.opening.text), tool_choice: "none", metadata: { purpose: "say" } });
    for (const action of done("say")) c.act(action);
    expect(c.state.pending?.question).toBe("opening");
  });

  it("says the numbers aloud as they are said, and shows them as they are written", () => {
    const c = call(initialVoice(), () => false);
    c.act({ type: "connected" });
    for (const action of done("say")) c.act(action);
    c.act({ type: "typed", text: "I want to die" });
    const said = c.sent.filter((event) => event.type === "response.create").map((event) => (event.response as { instructions?: string }).instructions);
    expect(said).toContain(sayExactly(SENTENCES.urgent.spoken!));
    expect(c.state.caption).toBe(SENTENCES.urgent.text);
  });
});

describe("the founder's call of 2026-09-30, 07:49, as the app now runs it", () => {
  it("hears 'with my needs with focusing' as the rest of his first answer, asks what is hardest at work, and reads work and focus", () => {
    const c = begun();
    c.hears("With someone that would help me at work.");
    // The follow-up begins, and he is still speaking: it stops, and his words go where they belong.
    expect(c.playing).toBe("detail-work");
    c.hears("with my needs with focusing.", { cut: 0.2 });
    expect(c.state.heard.map((answer) => answer.question)).toEqual(["opening", "opening"]);
    // The question he did not hear is asked again, whole.
    expect(c.playing).toBe("detail-work");
    c.answers("Deadlines, and I can't get started on anything.");
    expect(c.playing).toBe("place");
    c.answers("In Sydney.");
    expect(c.playing).toBe("lived");
    c.answers("Yeah, that's fine.");
    expect(c.playing).toBe("culture");
    c.answers("No.");
    expect(c.playing).toBe("extra");
    c.answers("Okay, show me who fits.");
    expect(c.playing).toBe("closing");
    expect(c.state.phase).toBe("revealing");
    expect(c.state.reveal).toEqual({
      request: `With someone that would help me at work. with my needs with focusing. Deadlines, and I can't get started on anything. In Sydney. ${LIVED_ASK}`,
      place: "Sydney",
    });
    expect(c.state.asked).toBe(5);
    expect(assistant(c.state)).toEqual(["opening", "detail-work", "detail-work", "place", "lived", "culture", "extra", "closing"].map((id) => SENTENCES[id as SayId].text));
    // Nothing the model said is in the call: it was asked only to watch for danger.
    expect(new Set(purposes(c.sent))).toEqual(new Set(["safety"]));
  });
});

describe("an answer belongs to the question the person last heard in full", () => {
  it(`takes a question as heard once ${HEARD * 100}% of it has played`, () => {
    const late = begun().answers("an ADHD assessment");
    expect(late.playing).toBe("place");
    late.hears("Parramatta", { cut: 0.8 });
    expect(late.state.heard.at(-1)).toEqual({ question: "place", say: "place", text: "Parramatta" });
    expect(late.playing).toBe("lived");

    const early = begun().answers("an ADHD assessment");
    early.hears("for myself, I mean", { cut: 0.3 });
    expect(early.state.heard.at(-1)).toEqual({ question: "opening", say: "opening", text: "for myself, I mean" });
    expect(early.playing).toBe("place");
    expect(early.state.asked).toBe(0);
  });

  it("counts a question once, however often it is said", () => {
    const c = begun().answers("an ADHD assessment");
    c.hears("sorry, one more thing, it's for me", { cut: 0.1 });
    c.through();
    expect(c.state.asked).toBe(1);
    expect(c.played.filter((id) => id === "place")).toHaveLength(2);
  });

  it("waits for the words of what was said before it says anything more", () => {
    const c = begun();
    c.act(server({ type: "input_audio_buffer.speech_started", item_id: "a" }));
    c.act(server({ type: "input_audio_buffer.speech_stopped", item_id: "a" }));
    c.act(server({ type: "input_audio_buffer.committed", item_id: "a" }));
    expect(c.playing).toBeNull();
    expect(c.state.open).toBe(1);
    expect(c.state.answers).toBe(1);
    expect(settled(c.state)).toBe(false);
    c.act(server({ type: "conversation.item.input_audio_transcription.completed", item_id: "a", transcript: "help with my anxiety" }));
    expect(c.playing).toBe("place");
  });

  it("holds the next question while the person is still speaking", () => {
    const c = begun();
    c.act(server({ type: "input_audio_buffer.committed", item_id: "a" }));
    c.act(server({ type: "input_audio_buffer.speech_started", item_id: "b" }));
    c.act(server({ type: "conversation.item.input_audio_transcription.completed", item_id: "a", transcript: "help with my anxiety" }));
    expect(c.playing).toBeNull();
    c.act(server({ type: "input_audio_buffer.speech_stopped", item_id: "b" }));
    c.act(server({ type: "input_audio_buffer.committed", item_id: "b" }));
    c.act(server({ type: "conversation.item.input_audio_transcription.completed", item_id: "b", transcript: "and my sleep" }));
    expect(c.playing).toBe("place");
    expect(c.state.heard.map((answer) => answer.text)).toEqual(["help with my anxiety", "and my sleep"]);
  });
});

describe("what is not an answer", () => {
  it("is the finder's own voice in the microphone: nobody's words, and the sentence is said through next time", () => {
    const c = begun().answers("an ADHD assessment");
    c.hears("Where are you, or would telehealth", { cut: 0.1 });
    expect(c.state.said).toEqual(["an ADHD assessment"]);
    expect(person(c.state)).toEqual(["an ADHD assessment"]);
    expect(c.state.turns.at(-2)).toEqual({ who: "tool", text: "echo: Where are you, or would telehealth" });
    expect(c.played.at(-1)).toBe("place");
    expect(c.state.firm).toBe(true);
    c.ends();
    expect(c.state.firm).toBe(false);
    expect(c.state.pending?.question).toBe("place");
  });

  it("is a request to hear the question again: it is said again, and the request never holds the asking", () => {
    const c = begun().answers("an ADHD assessment").answers("Hornsby").answers("Sorry, I didn't catch what you just said.");
    expect(c.played.slice(-2)).toEqual(["lived", "lived"]);
    c.answers("Yeah, that would be great.");
    expect(c.state.heard.map((answer) => answer.text)).toEqual(["an ADHD assessment", "Hornsby", "Yeah, that would be great"]);
    expect(c.state.asked).toBe(2);
    expect(person(c.state)).toContain("Sorry, I didn't catch what you just said.");
  });

  it("is a sound nobody can read: 'Sorry, I didn't catch that', the question once more, then the call moves on", () => {
    const c = begun().answers("an ADHD assessment").answers("什么?").through();
    expect(c.played.slice(-2)).toEqual(["catch", "place"]);
    expect(person(c.state)).toContain("什么?");
    expect(c.state.said).toEqual(["an ADHD assessment"]);
    c.answers("Gar");
    expect(c.state.heard.at(-1)?.text).toBe("Gar");
    const twice = begun().answers("an ADHD assessment").answers("…").answers("…");
    expect(twice.played.slice(-3)).toEqual(["catch", "place", "lived"]);
    expect(twice.state.done).toContain("place");
  });

  it("is a request for the matches: the call closes on what was said, without the asking", () => {
    const c = begun().answers("an ADHD assessment").answers("I'm in Hornsby, just show me the matches");
    expect(c.played.at(-1)).toBe("closing");
    expect(c.state.reveal).toEqual({ request: "an ADHD assessment. I'm in Hornsby", place: "Hornsby" });
    expect(c.state.turns.at(-1)).toEqual({ who: "tool", text: `reveal ${JSON.stringify(c.state.reveal)}` });
  });
});

describe("what the model is left to do", () => {
  it("answers what the person asks it, before the question they did not answer is asked again", () => {
    const c = begun().answers("an ADHD assessment").answers("What does bulk billing mean?");
    expect(c.playing).toBeNull();
    expect(c.state.answering).toBe(true);
    const asked = c.sent.filter((event) => event.type === "response.create").at(-1)!.response as Record<string, unknown>;
    expect(asked).toEqual({ instructions: ANSWER, metadata: { purpose: "answer" } });
    const id = "resp_answer";
    c.act(server({ type: "response.created", response: { id, metadata: { purpose: "answer" } } }));
    c.act(server({ type: "output_audio_buffer.started", response_id: id }));
    c.act(server({ type: "response.output_audio_transcript.delta", response_id: id, delta: "It means Medicare" }));
    expect(c.state.caption).toBe("It means Medicare");
    c.act(server({ type: "response.output_audio_transcript.done", response_id: id, transcript: "It means Medicare pays." }));
    c.act(server({ type: "response.done", response: { id, status: "completed", metadata: { purpose: "answer" }, output: [] } }));
    // Its voice is still playing: nothing is said over it.
    expect(c.playing).toBeNull();
    c.act(server({ type: "output_audio_buffer.stopped", response_id: id }));
    expect(c.playing).toBe("place");
    expect(c.state.asked).toBe(1);
    expect(assistant(c.state).slice(-2)).toEqual(["It means Medicare pays.", SENTENCES.place.text]);
    expect(c.answers("Penrith").state.heard.map((answer) => answer.text)).toEqual(["an ADHD assessment", "Penrith"]);
  });

  it("answers, and takes the answer given in the same breath", () => {
    const c = begun().answers("an ADHD assessment").answers("What does bulk billing mean? I'm in Penrith.");
    expect(c.state.answering).toBe(true);
    for (const action of done("answer")) c.act(action);
    expect(c.playing).toBe("lived");
    expect(c.state.heard.at(-1)?.text).toBe("I'm in Penrith");
  });

  it("answers three of their questions in a call, and keeps to finding a clinician after that", () => {
    const c = begun();
    for (let asked = 0; asked < MOST_ANSWERS; asked++) {
      c.answers(`an assessment, number ${asked}`).answers("What does bulk billing mean?");
      expect(c.state.answering).toBe(true);
      for (const action of done("answer")) c.act(action);
    }
    c.answers("What is a referral?");
    expect(c.state.answering).toBe(false);
    expect(c.state.answered).toBe(MOST_ANSWERS);
  });

  it("asks its own question twice more of a person who only asks theirs, then moves on", () => {
    const c = begun();
    for (let turn = 0; turn < 3; turn++) {
      c.answers("Should I double my Ritalin dose?");
      for (const action of done("answer")) c.act(action);
    }
    c.through();
    expect(c.played.slice(0, 4)).toEqual(["opening", "again", "again", "help"]);
    expect(c.state.done).toContain("opening");
  });

  it("calls for help in place of an answer when what they asked says danger", () => {
    const c = begun().answers("an ADHD assessment").answers("What happens if I just stop existing?");
    expect(c.state.answering).toBe(true);
    for (const action of done("answer", [{ type: "function_call", name: URGENT_HELP, call_id: "c9", arguments: "{}" }])) c.act(action);
    expect(c.state.urgent).toBe(true);
    expect(c.played.at(-1)).toBe("urgent");
  });

  it("is asked, silently and apart from the conversation, whether what was said is danger, in one word", () => {
    const c = begun().answers("an ADHD assessment");
    const check = c.sent.filter((event) => event.type === "response.create").at(-1)!.response as Record<string, unknown>;
    expect(check).toEqual({
      conversation: "none",
      input: [{ type: "message", role: "user", content: [{ type: "input_text", text: safetyInput(SENTENCES.opening.text, "an ADHD assessment") }] }],
      instructions: SAFETY_CHECK,
      output_modalities: ["text"],
      tool_choice: "none",
      max_output_tokens: 200,
      metadata: { purpose: "safety" },
    });
    for (const action of done("safety", [{ type: "message", content: [{ type: "output_text", text: "fine" }] }])) c.act(action);
    expect(c.state.urgent).toBe(false);
    expect(c.playing).toBe("place");
  });

  it("stops what is being said when the check says danger, and the numbers come first", () => {
    const c = begun().answers("everything would be easier if I just wasn't around");
    expect(c.state.urgent).toBe(false);
    expect(c.playing).toBe("help");
    for (const action of done("safety", [{ type: "message", content: [{ type: "output_text", text: "Danger" }] }])) c.act(action);
    expect(c.hushes).toBe(1);
    expect(c.state.urgent).toBe(true);
    expect(c.played.at(-1)).toBe("urgent");
    expect(c.state.turns).toContainEqual({ who: "tool", text: URGENT_HELP });
    c.ends();
    expect(c.playing).toBe("carry-on");
  });
});

describe("urgent help", () => {
  it("opens from the person's own words, whatever the model does, and asks whether to keep looking", () => {
    const c = begun().answers("Honestly I don't want to be here any more.");
    expect(c.state.urgent).toBe(true);
    expect(c.played.slice(-1)).toEqual(["urgent"]);
    // The app has seen it: the model is not asked.
    expect(purposes(c.sent)).toEqual([]);
    c.ends();
    expect(c.playing).toBe("carry-on");
    c.answers("I'd still like to find a GP near Newtown for ADHD");
    expect(c.state.paused).toBe(false);
    expect(c.playing).toBe("lived");
    c.act({ type: "urgent-seen" });
    expect(c.state.urgent).toBe(false);
    c.answers("no").answers("no").answers("no");
    expect(c.state.reveal).toEqual({ request: "Honestly I don't want to be here any more. I'd still like to find a GP near Newtown for ADHD", place: "Newtown" });
  });

  it("asks nothing more of a person who does not want to keep looking", () => {
    const c = begun().answers("I want to kill myself").through().answers("No.");
    expect(c.state.paused).toBe(true);
    expect(c.playing).toBeNull();
    expect(c.act({ type: "quiet" }).say).toBeNull();
    expect(c.state.phase).toBe("live");
    expect(stalled(c.state)).toBe(false);
  });

  it("says the numbers once in a call", () => {
    const c = begun().answers("I want to die").through().answers("yes, I want to die but I need a GP");
    expect(c.played.filter((id) => id === "urgent")).toHaveLength(1);
  });
});

describe("a person who goes quiet", () => {
  it("is checked on gently, then shown the matches for what they said", () => {
    const c = begun().answers("an ADHD assessment").through();
    expect(c.act({ type: "quiet" }).say?.id).toBe("nudge");
    c.through();
    expect(c.state.pending?.question).toBe("place");
    expect(c.act({ type: "quiet" }).say?.id).toBe("closing");
    expect(c.state.reveal).toEqual({ request: "an ADHD assessment", place: "" });
  });

  it("before anything is said, hears the opening question again and is never shown a list for no words", () => {
    const c = begun();
    expect(c.act({ type: "quiet" }).say?.id).toBe("nudge");
    c.ends();
    expect(c.playing).toBe("again");
    c.ends();
    expect(resting(c.state)).toBe(true);
    expect(c.act({ type: "quiet" }).say).toBeNull();
    expect(c.state.phase).toBe("live");
  });

  it("starts the checks again once they speak", () => {
    const c = begun().answers("an ADHD assessment").through();
    c.act({ type: "quiet" });
    c.answers("Hornsby");
    expect(c.state.quiet).toBe(0);
    expect(c.through().act({ type: "quiet" }).say?.id).toBe("nudge");
  });

  it("is not nudged while anything is being said or awaited", () => {
    const c = begun().answers("an ADHD assessment");
    expect(c.playing).toBe("place");
    expect(c.act({ type: "quiet" }).say).toBeNull();
  });
});

describe("words that never arrive", () => {
  it("are an answer nobody caught: the question is asked once more", () => {
    const c = begun();
    c.act(server({ type: "input_audio_buffer.committed", item_id: "a" }));
    expect(stalled(c.state)).toBe(true);
    expect(c.act({ type: "unheard" }).say?.id).toBe("catch");
    expect(c.state.open).toBe(0);
    c.through();
    expect(c.state.pending?.question).toBe("opening");
    expect(stalled(c.state)).toBe(false);
  });

  it("are told apart from a transcript that failed", () => {
    const c = begun();
    c.act(server({ type: "input_audio_buffer.committed", item_id: "a" }));
    c.act(server({ type: "conversation.item.input_audio_transcription.failed", item_id: "a" }));
    expect(c.played.slice(-1)).toEqual(["catch"]);
  });

  it("a sound that cut a question short and was never a turn leaves the call to say it again, through", () => {
    const c = begun().answers("an ADHD assessment");
    c.act(server({ type: "input_audio_buffer.speech_started", item_id: "cough" }));
    c.ends(0.2);
    c.act(server({ type: "input_audio_buffer.speech_stopped", item_id: "cough" }));
    expect(c.playing).toBeNull();
    expect(stalled(c.state)).toBe(true);
    expect(c.act({ type: "unheard" }).say).toEqual({ id: "place", firm: true });
  });
});

describe("the end of the call", () => {
  it("comes when the questions are spent, with the person's words as the request", () => {
    const c = begun()
      .answers("I need help at work")
      .answers("Stress, mostly. And my boss.")
      .answers("Parramatta, but telehealth is fine.")
      .answers("Yes, please.")
      .answers("Yes")
      .answers("Indian, and Hindi")
      .answers("I also struggle with sleep a lot");
    expect(c.played).toEqual(["opening", "detail-work", "place", "lived", "culture", "which-culture", "extra", "closing"]);
    expect(c.state.asked).toBe(6);
    expect(c.state.asked).toBeLessThanOrEqual(MAX_FOLLOW_UPS);
    expect(c.state.phase).toBe("revealing");
    expect(c.state.reveal).toEqual({
      request: `I need help at work. Stress, mostly. And my boss. Parramatta, but telehealth is fine. ${LIVED_ASK}. ${CULTURE_ASK}, Indian. someone who speaks Hindi. I also struggle with sleep a lot. ${NEED_PHRASE["care:emotional-regulation"]}`,
      place: "Parramatta",
    });
    // The matches wait for the last sentence to be said.
    expect(c.state.talking).toBe("assistant");
    c.ends();
    expect(c.state.talking).toBeNull();
    expect(c.state.phase).toBe("revealing");
  });

  it("reads a yes to telehealth, and says nothing about what they declined", () => {
    const c = begun().answers("an ADHD assessment").answers("Yeah, that's fine.").answers("No thanks.").answers("No, English is fine.").answers("No.");
    expect(c.state.reveal).toEqual({ request: `an ADHD assessment. ${TELEHEALTH_ASK}`, place: "" });
  });

  it("comes at the cap on the call's length, once the person has said something", () => {
    const silent = begun();
    expect(silent.act({ type: "finish" }).say).toBeNull();
    expect(silent.state.phase).toBe("live");
    const c = begun().answers("an ADHD assessment");
    expect(c.playing).toBe("place");
    const end = c.act({ type: "finish" });
    expect(end.hush).toBe(true);
    expect(end.say?.id).toBe("closing");
    expect(c.state.reveal?.request).toBe("an ADHD assessment");
  });

  it("is the typing screen when nothing anybody could read was said", () => {
    const c = begun();
    for (let turn = 0; turn < 20 && c.state.phase === "live"; turn++) c.answers("…");
    expect(c.state.phase).toBe("failed");
    expect(c.state.failure).toBe("unavailable");
    expect(c.state.reveal).toBeNull();
  });

  it("asks the model for their request in English when they did not speak it, and keeps their words on the record", () => {
    const c = call(initialVoice(), () => false);
    c.act({ type: "connected" });
    for (const action of done("say")) c.act(action);
    const say = (text: string) => {
      c.act({ type: "typed", text });
      for (const action of done("say")) c.act(action);
    };
    say("Con gái tôi 15 tuổi, có thể bị ADHD. Tôi muốn bác sĩ nói tiếng Việt.");
    say("Cabramatta");
    say("không");
    say("không");
    c.act({ type: "typed", text: "không" });
    expect(c.state.translating).toBe(true);
    expect(c.state.phase).toBe("live");
    const asked = c.sent.filter((event) => event.type === "response.create").map((event) => event.response as Record<string, unknown>).find((response) => (response.metadata as { purpose: string }).purpose === "translate")!;
    expect(asked).toMatchObject({ conversation: "none", instructions: TRANSLATE, output_modalities: ["text"], tool_choice: "none" });
    for (const action of done("translate", [{ type: "message", content: [{ type: "output_text", text: "An ADHD assessment for my 15-year-old daughter with a psychiatrist who speaks Vietnamese, in Cabramatta" }] }])) c.act(action);
    expect(c.state.phase).toBe("revealing");
    // A kind of clinician she did not name narrows nothing.
    expect(c.state.reveal?.request).toBe("An ADHD assessment for my 15-year-old daughter with a clinician who speaks Vietnamese, in Cabramatta");
    expect(c.state.said[0]).toContain("tiếng Việt");
  });

  it("falls back to their own words when the model writes nothing", () => {
    const c = call(initialVoice(), () => false);
    c.act({ type: "connected" });
    for (const action of done("say")) c.act(action);
    c.act({ type: "typed", text: "Tôi muốn bác sĩ nói tiếng Việt ở Cabramatta" });
    for (const action of done("say")) c.act(action);
    c.act({ type: "finish" });
    for (const action of done("translate", [])) c.act(action);
    expect(c.state.reveal?.request).toBe("Tôi muốn bác sĩ nói tiếng Việt ở Cabramatta");
  });
});

describe("a sentence the model is given", () => {
  const spoken = () => {
    const c = call(initialVoice(), () => false);
    c.act({ type: "connected" });
    for (const action of done("say")) c.act(action);
    return c;
  };

  it("goes on the record as the model said it", () => {
    const c = spoken();
    c.act({ type: "typed", text: "an ADHD assessment" });
    const id = "resp_place";
    c.act(server({ type: "response.created", response: { id, metadata: { purpose: "say" } } }));
    expect(c.state.responding).toBe(true);
    c.act(server({ type: "response.output_audio_transcript.delta", response_id: id, delta: "Okay, where" }));
    // The screen holds the sentence as written, whatever the model makes of it.
    expect(c.state.caption).toBe(SENTENCES.place.text);
    c.act(server({ type: "response.output_audio_transcript.done", response_id: id, transcript: "Okay, where are you, or would telehealth suit you?" }));
    c.act(server({ type: "response.done", response: { id, status: "completed", metadata: { purpose: "say" }, output: [] } }));
    expect(assistant(c.state).at(-1)).toBe("Okay, where are you, or would telehealth suit you?");
    expect(c.state.responding).toBe(false);
    expect(c.state.pending?.question).toBe("place");
  });

  it("is cut short when the person speaks, and asked again after what they said", () => {
    const c = spoken();
    c.act({ type: "typed", text: "an ADHD assessment" });
    const id = "resp_place";
    c.act(server({ type: "response.created", response: { id, metadata: { purpose: "say" } } }));
    const over = c.act(server({ type: "input_audio_buffer.speech_started", item_id: "x" }));
    expect(over.send).toEqual([{ type: "response.cancel", response_id: id }, { type: "output_audio_buffer.clear" }]);
    c.act(server({ type: "response.done", response: { id, status: "cancelled", metadata: { purpose: "say" }, output: [] } }));
    c.act(server({ type: "input_audio_buffer.speech_stopped", item_id: "x" }));
    c.act(server({ type: "input_audio_buffer.committed", item_id: "x" }));
    const next = c.act(server({ type: "conversation.item.input_audio_transcription.completed", item_id: "x", transcript: "it's for me" }));
    expect(c.state.heard.at(-1)).toEqual({ question: "opening", say: "opening", text: "it's for me" });
    expect(purposes(next.send)).toEqual(["safety", "say"]);
  });

  it("ends the call in the typing screen when the model will not say it", () => {
    const c = call(initialVoice(), () => false);
    c.act({ type: "connected" });
    for (let tries = 0; tries < 3; tries++) for (const action of done("say", [], "failed")) c.act(action);
    expect(c.state.phase).toBe("failed");
  });
});

describe("the call's own state", () => {
  it("follows who is talking, for the orb", () => {
    const c = call();
    c.act({ type: "mic" });
    expect(c.state.talking).toBe("assistant");
    c.ends();
    expect(c.state.talking).toBeNull();
    c.act(server({ type: "input_audio_buffer.speech_started" }));
    expect(c.state.talking).toBe("person");
    c.act(server({ type: "input_audio_buffer.speech_stopped" }));
    expect(c.state.talking).toBeNull();
  });

  it("holds still once failed, and stops what it was saying", () => {
    const c = call();
    c.act({ type: "mic" });
    const failed = c.act({ type: "failed", failure: "busy" });
    expect(failed.hush).toBe(true);
    expect(c.state).toMatchObject({ phase: "failed", failure: "busy", talking: null, saying: null });
    const before = c.state;
    c.act({ type: "connected" });
    c.act({ type: "typed", text: "hello" });
    expect(c.state).toBe(before);
  });

  it("takes nothing but the end of its last sentence while the matches are on their way", () => {
    const c = begun().answers("an ADHD assessment").answers("show me the matches");
    expect(c.state.phase).toBe("revealing");
    const before = c.state;
    c.act({ type: "typed", text: "wait" });
    c.act({ type: "quiet" });
    c.act({ type: "finish" });
    expect(c.state).toBe(before);
    c.hears("one more thing");
    expect(c.state.heard).toEqual(before.heard);
  });

  it("keeps every turn for the record: the person's, the finder's and the tools', in order", () => {
    const c = begun().answers("an ADHD assessment").answers("Hornsby").answers("just show me who fits").through();
    expect(c.state.turns).toEqual([
      { who: "assistant", text: SENTENCES.opening.text },
      { who: "person", text: "an ADHD assessment" },
      { who: "assistant", text: SENTENCES.place.text },
      { who: "person", text: "Hornsby" },
      { who: "assistant", text: SENTENCES.lived.text },
      { who: "person", text: "just show me who fits" },
      { who: "assistant", text: SENTENCES.closing.text },
      { who: "tool", text: `reveal ${JSON.stringify({ request: "an ADHD assessment. Hornsby", place: "Hornsby" })}` },
    ]);
  });

  it("gives the stop button what was said, as it was said", () => {
    expect(saidAsRequest(["an adult ADHD assessment", "Hornsby, or telehealth"])).toBe("an adult ADHD assessment, Hornsby, or telehealth");
    expect(begun().answers("an ADHD assessment").answers("Hornsby").state.said).toEqual(["an ADHD assessment", "Hornsby"]);
  });
});

describe("a sentence the model wrote, held to the person's words", () => {
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
    const c = begun().answers("an assessment for my daughter, she's 15, with a specialist in teens").answers("show me the matches");
    expect(c.state.reveal?.request).toBe("an assessment for my daughter, she's 15, with a clinician in teens");
  });
});
