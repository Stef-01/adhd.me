// The voice finder's conversation, driven by scripted events: the app asks the plan's questions, an
// answer belongs to the question the person last heard in full, a sentence is a recording or the
// model saying it, and the model fills a form for each answer and answers what it is asked.

import { describe, expect, it } from "vitest";
import { HEARD, MOST_ANSWERS, initialVoice, inTheirWords, resting, saidAsRequest, settled, stalled, step, type Action, type ClientEvent, type ServerEvent, type Step, type VoiceState } from "./conversation";
import { ANSWER, FORM, FORM_INSTRUCTIONS, MAX_FOLLOW_UPS, SAFETY_CHECK, SURE, TRANSLATE, URGENT_HELP, asked, sayExactly } from "./interviewer";
import { CULTURE_ASK, LIVED_ASK, SENTENCES, TELEHEALTH_ASK, formFrom, type Form, type SayId } from "./plan";

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
    /** The person speaks: the server commits the audio; then its words arrive, the model's form, and its word on danger. */
    hears(text: string, { cut, form = {}, first = "words", sure = 1, danger = false }: { cut?: number; form?: Partial<Form>; first?: "words" | "form"; sure?: number; danger?: boolean } = {}) {
      const item_id = `item_${++ids}`;
      act(server({ type: "input_audio_buffer.speech_started", item_id }));
      // Speaking over a recording stops it, as the screen does.
      if (playing && cut !== undefined) self.ends(cut);
      act(server({ type: "input_audio_buffer.speech_stopped", item_id }));
      act(server({ type: "input_audio_buffer.committed", item_id }));
      const words = () => act(server({ type: "conversation.item.input_audio_transcription.completed", item_id, transcript: text, logprobs: [{ token: text, logprob: Math.log(sure) }] }));
      const filled = () => { for (const action of [...formed(item_id, { ...formFrom(text), ...form }), ...checked(item_id, danger)]) act(action); };
      if (first === "words") words(), filled();
      else filled(), words();
      return self;
    },
    /** A whole exchange: what is being said is heard out, then the person answers. */
    answers(text: string, form: Partial<Form> = {}, more: { sure?: number; danger?: boolean } = {}) {
      return self.through().hears(text, { form, ...more });
    },
    /** The person types, and the model fills the form for the words and says whether they say danger. */
    types(text: string, form: Partial<Form> = {}, danger = false) {
      const item = `typed_${state.answers}`;
      act({ type: "typed", text });
      for (const action of [...formed(item, { ...formFrom(text), ...form }), ...checked(item, danger)]) act(action);
      return self;
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
/** The form for one answer, as the model returns it. */
function formed(item: string, form: Form): Action[] {
  const id = `resp_${++ids}`;
  const metadata = { purpose: "form", item };
  return [
    server({ type: "response.created", response: { id, metadata } }),
    server({ type: "response.done", response: { id, status: "completed", metadata, output: [{ type: "function_call", name: FORM.name, call_id: `call_${id}`, arguments: JSON.stringify(form) }] } }),
  ];
}

/** The model's word on danger for one answer. */
function checked(item: string, danger: boolean): Action[] {
  const id = `resp_${++ids}`;
  const metadata = { purpose: "safety", item };
  return [
    server({ type: "response.created", response: { id, metadata } }),
    server({ type: "response.done", response: { id, status: "completed", metadata, output: [{ type: "message", role: "assistant", content: [{ type: "output_text", text: danger ? "Danger." : "fine" }] }] } }),
  ];
}

/** One response of the model's, done. */
function done(purpose: string, output: unknown[] = [], status = "completed"): Action[] {
  const id = `resp_${++ids}`;
  return [server({ type: "response.created", response: { id, metadata: { purpose } } }), server({ type: "response.done", response: { id, status, metadata: { purpose }, output } })];
}

function rng(seed: number) { return () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648); }
const OPENINGS = ["I think I might have ADHD", "my son is 9 and his teacher thinks it might be ADHD", "since menopause I can't focus", "help at work with deadlines", "a GP near Hornsby", "Hi"];
const ANSWERS: Array<[string, Partial<Form>]> = [
  ["Yes.", { yes_no: "yes" }], ["No.", { yes_no: "no" }], ["Parramatta", { place: "Parramatta" }], ["Telehealth is fine", { telehealth: true }], ["Yes, Indian", { yes_no: "yes", culture: "Indian" }],
  ["She's nine", {}], ["A first look, never assessed", {}], ["Deadlines and forgetting meetings", {}], ["Say that again please", { again: true }],
  ["Um, let me think", {}], ["It's a wrap-up, legit", { off_topic: true } as Partial<Form>], ["zzz qqq", { understood: false }],
];

describe("the conversation, fuzzed with timing (2026-10-01)", () => {
  it("over 1,500 calls: no question is played past its retries, the call reveals, and the request holds no junk", () => {
    const random = rng(7);
    const pick = <T,>(xs: readonly T[]) => xs[Math.floor(random() * xs.length)]!;
    let revealed = 0;
    for (let n = 0; n < 1500; n++) {
      const c = call();
      c.act({ type: "mic" });
      c.act({ type: "connected" });
      c.through();
      const opening = pick(OPENINGS);
      c.hears(opening, { form: formFrom(opening) });
      let agains = 0;
      let cuts = 0;
      for (let turn = 0; turn < 30 && !c.state.reveal; turn++) {
        // Sometimes the next question is still playing when they answer, sometimes cut short, sometimes heard out.
        const mode = random();
        if (mode < 0.6) c.through();
        const [text, form] = pick(ANSWERS);
        if (form.again) agains += 1;
        const cut = c.playing && mode > 0.85 ? (random() < 0.5 ? 0.1 : 0.9) : undefined;
        if (cut !== undefined && cut < 0.6) cuts += 1;
        c.hears(text, { form, cut, first: random() < 0.5 ? "words" : "form", sure: random() < 0.1 ? 0.3 : 0.95 });
        if (!c.playing && !c.state.reveal && turn > 20) c.answers("Just show me who fits", { show_matches: true });
      }
      c.through();
      const counts: Record<string, number> = {};
      for (const id of c.played) counts[id] = (counts[id] ?? 0) + 1;
      for (const [id, times] of Object.entries(counts)) if (!["catch", "again", "nudge"].includes(id)) expect(times, `${id} played ${times} times in call ${n}: ${c.played.join(" > ")}`).toBeLessThanOrEqual(3 + agains + cuts); // asked, said again at most twice (MOST_RETRIES), and once more for each 'say again' and each time they spoke over its start
      if (c.state.reveal) {
        revealed += 1;
        for (const part of c.state.reveal.request.split(". ")) {
          expect(part, c.state.reveal.request).not.toMatch(/^(yes|no)\.?$/i);
          expect(part, c.state.reveal.request).not.toMatch(/wrap-up|say that again|let me think|zzz/i);
        }
      }
    }
    expect(revealed).toBeGreaterThan(1400);
  });
});

it("an echo cuts a yes-or-no question, and the yes after it answers that question (the call of 2026-10-02 04:44)", () => {
  const c = begun();
  c.hears("an ADHD GP in Brisbane", { form: { place: "Brisbane" } });
  const ev = (e: object) => c.act(server(e as never));
  ev({ type: "input_audio_buffer.speech_started", item_id: "e1" });
  c.ends(0.2);
  ev({ type: "input_audio_buffer.speech_stopped", item_id: "e1" });
  ev({ type: "input_audio_buffer.committed", item_id: "e1" });
  ev({ type: "input_audio_buffer.speech_started", item_id: "y1" });
  if (c.playing) c.ends(0.1);
  ev({ type: "input_audio_buffer.speech_stopped", item_id: "y1" });
  ev({ type: "input_audio_buffer.committed", item_id: "y1" });
  ev({ type: "conversation.item.input_audio_transcription.completed", item_id: "e1", transcript: "Would you like", logprobs: [] });
  for (const a of formed("e1", { understood: true } as never)) c.act(a);
  ev({ type: "conversation.item.input_audio_transcription.completed", item_id: "y1", transcript: "Yes", logprobs: [] });
  for (const a of formed("y1", { understood: true, yes_no: "yes" } as never)) c.act(a);
  c.through();
  expect(c.state.heard.at(-1)!.question).toBe("lived");
  expect(assistant(c.state).at(-1)).toBe("Would you like someone from your own culture?");
});

it("a culture answer that names none is asked once more (the call of 2026-10-02 04:44: 'Indeed.')", () => {
  const c = begun();
  c.answers("an ADHD GP in Brisbane", { place: "Brisbane" });
  c.answers("No.", { yes_no: "no" });
  c.answers("Yes.", { yes_no: "yes" });
  c.answers("Indeed.", { understood: true });
  c.through();
  expect(assistant(c.state).slice(-2)).toEqual(["Sorry, I didn't catch that.", "Which culture or language?"]);
  c.answers("Indian.", { culture: "Indian" });
  expect(c.state.heard.at(-1)!.form.culture).toBe("Indian");
});

it("over 800 calls with the finder's own voice echoed before answers, a yes to lived experience reaches the request", () => {
  const random = rng(11);
  let lost = 0;
  const lostCalls: string[] = [];
  for (let n = 0; n < 800; n++) {
    const c = begun();
    c.hears("an ADHD GP in Brisbane", { form: { place: "Brisbane" } });
    let saidLived = false;
    for (let turn = 0; turn < 25 && !c.state.reveal; turn++) {
      // The finder's own question heard back, cutting it short, with the answer begun before the echo is written down.
      if (random() < 0.3 && c.playing) {
        const asked = c.playing;
        const echo = `echo_${n}_${turn}`, reply = `reply_${n}_${turn}`;
        const ev = (e: object) => c.act(server(e as never));
        ev({ type: "input_audio_buffer.speech_started", item_id: echo });
        c.ends(0.2);
        ev({ type: "input_audio_buffer.speech_stopped", item_id: echo });
        ev({ type: "input_audio_buffer.committed", item_id: echo });
        ev({ type: "input_audio_buffer.speech_started", item_id: reply });
        if (c.playing) c.ends(0.1);
        ev({ type: "input_audio_buffer.speech_stopped", item_id: reply });
        ev({ type: "input_audio_buffer.committed", item_id: reply });
        ev({ type: "conversation.item.input_audio_transcription.completed", item_id: echo, transcript: SENTENCES[asked].text.split(" ").slice(0, 3).join(" "), logprobs: [] });
        for (const a of formed(echo, { understood: true } as Form)) c.act(a);
        const yes = asked === "lived";
        if (yes) saidLived = true;
        ev({ type: "conversation.item.input_audio_transcription.completed", item_id: reply, transcript: yes ? "Yes." : "No.", logprobs: [] });
        for (const a of formed(reply, { understood: true, yes_no: yes ? "yes" : "no" } as Form)) c.act(a);
        continue;
      }
      // The finder's own question, heard back by the microphone, sometimes cutting it short.
      if (random() < 0.4 && c.playing) c.hears(SENTENCES[c.playing].text.split(" ").slice(0, 3).join(" "), { cut: random() < 0.5 ? 0.2 : undefined, form: { understood: true } });
      // They answer the question being asked: over its end, or once it is heard out.
      const over = c.playing && random() < 0.3;
      if (!over) c.through();
      const asked = over ? c.playing : [...c.played].reverse().find((id) => !["catch", "again", "nudge"].includes(id));
      if (!asked) break;
      if (asked === "lived") (saidLived = true), c.hears("Yes.", { form: { yes_no: "yes" }, cut: over ? 0.9 : undefined });
      else c.hears("No.", { form: { yes_no: "no" }, cut: over ? 0.9 : undefined });
    }
    c.through();
    if (saidLived && c.state.reveal && !c.state.reveal.request.includes(LIVED_ASK)) (lost += 1), lostCalls.length < 3 && lostCalls.push(JSON.stringify(c.state.heard.map((h) => [h.question, h.text])) + "\n" + c.state.turns.map((t) => `${t.who}: ${t.text}`).join("\n"));
  }
  expect(lost, lostCalls.join("\n\n")).toBe(0);
});
