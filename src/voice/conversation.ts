// The voice finder's conversation: a pure step over the realtime API's server events and the
// person's own actions, returning the next state, the client events to send and the sentence to
// say. The screen (app/finder-stages/voice-stage.tsx) renders the state, sends the events and plays
// the sentence; the call (src/voice/link.ts) carries them. Pure, so a whole conversation is tested
// with scripted events.
//
// THE APP ASKS (O263, 2026-09-30). The questions, their order and the request they make are
// src/voice/plan.ts; this file is the floor: who is speaking, which question an answer belongs to,
// and what is said next. The server never answers a turn on its own. A sentence is a recording the
// screen plays (`say`), or, where there is none, the model saying exactly that sentence. The model's
// own jobs are two: to answer what the person asks it, and to call urgent_help.

import { checkSafety, type SafetyRuleId } from "@/model/safety";
import { PROFESSION_ENTRIES, professionsMentioned } from "@/support/professions";
import { ANSWER, DANGER, MAX_FOLLOW_UPS, SAFETY_CHECK, TRANSLATE, URGENT_HELP, safetyInput, sayExactly } from "./interviewer";
import { MAX_REQUEST, SENTENCES, compose, echoes, hear, mostlyEnglish, nextQuestion, saysNo, type Answer, type Line, type QuestionId, type SayId } from "./plan";

export { mostlyEnglish, placeOf, withoutQuestions } from "./plan";

export type Phase = "connecting" | "live" | "revealing" | "failed";
export type Failure = "mic" | "busy" | "unavailable";

export interface Reveal {
  request: string;
  place: string;
}

/** One turn of the call as the record keeps it. */
export interface Turn {
  who: "person" | "assistant" | "tool";
  text: string;
}

export interface VoiceState {
  phase: Phase;
  failure: Failure | null;
  /** The sentence being said, or the last one: the screen's one line. */
  caption: string;
  /** The model's response the caption belongs to, when the model is answering. */
  captionOf: string | null;
  /** Who is talking; the orb follows it. */
  talking: "assistant" | "person" | null;
  /** The model is speaking: an answer, or a sentence it was given. */
  responding: boolean;
  /** What the person said or typed, in order. */
  said: string[];
  /** Every turn, for the record (src/db/finder.ts): the person's, the assistant's and the tools'. */
  turns: Turn[];
  /** The person's turns, counted when their audio is committed or their words are sent. */
  answers: number;
  /** Questions asked in full after the opening one; a question said again is not another. */
  asked: number;
  /** Gentle checks since the person last spoke: the first asks if they are there, the second finishes. */
  quiet: number;
  muted: boolean;
  urgent: boolean;
  reveal: Reveal | null;

  /** The person's answers, each under the question it answers. */
  heard: Answer[];
  /** The questions answered, or given up on. */
  done: QuestionId[];
  /** The question the person's next words answer: the last one they heard in full. */
  pending: Line | null;
  /** The sentence being said now, by the recording or by the model. */
  saying: (Line & { by: "clip" | "model" }) | null;
  /** Sentences waiting to be said, in order. */
  lines: Line[];
  /** The last sentence begun, heard in full or not: what the microphone may have picked up. */
  last: SayId | null;
  /** The sentence a sound has just cut short: a sound made of its own words was the sentence itself. */
  cut: SayId | null;
  /** Each committed stretch of the person's audio, and the question it answers. */
  items: Record<string, QuestionId>;
  /** Stretches of audio whose words have not arrived yet. */
  open: number;
  /** How often each question has been said again. */
  retried: Partial<Record<QuestionId, number>>;
  /** The questions counted in `asked`, and the sentence each was asked in. */
  counted: Partial<Record<QuestionId, SayId>>;
  /** The model's responses under way, each with what it is for. */
  responses: Record<string, string>;
  /** The person asked the assistant something: the model answers before the next question. */
  owed: boolean;
  answering: boolean;
  /** How many of the person's questions the model has answered in this call. */
  answered: number;
  /** The person asked for the matches, or went quiet twice: the call closes at the next free moment. */
  finishing: boolean;
  /** The crisis numbers have been said in this call. */
  urgentSaid: boolean;
  /** After the crisis numbers, they did not want to keep looking: nothing more is asked. */
  paused: boolean;
  /** Their words were not English: the model is writing the request in English. */
  translating: boolean;
  /** The last sentence was cut short by a sound that was nobody's answer: the next is said through. */
  firm: boolean;
  /** Sentences the model was given and did not say. */
  misfires: number;
}

export type ServerEvent = { type: string } & Record<string, unknown>;
export type ClientEvent = { type: string } & Record<string, unknown>;

export type Action =
  /** The microphone is open: a recorded sentence can be played before the call has connected. */
  | { type: "mic" }
  /** The call can carry events; `missed` when the person spoke before it could carry their voice. */
  | { type: "connected"; missed?: boolean }
  | { type: "failed"; failure: Failure }
  | { type: "server"; event: ServerEvent }
  /** A recorded sentence ended or was cut short: the share of it that was played. */
  | { type: "said"; say: SayId; heard: number }
  | { type: "typed"; text: string }
  | { type: "muted"; muted: boolean }
  | { type: "finish" }
  | { type: "quiet" }
  /** A stretch of the person's audio whose words never arrived. */
  | { type: "unheard" }
  | { type: "urgent-seen" };

export interface Step {
  state: VoiceState;
  send: ClientEvent[];
  /** The recorded sentence to play now; `firm` when a sound must not cut it short. */
  say: { id: SayId; firm: boolean } | null;
  /** Stop the sentence being played. */
  hush: boolean;
}

/** The recordings this call can play: none, in a test or a call that could not load them. */
export type Clips = (id: SayId) => boolean;
const NO_CLIPS: Clips = () => false;

export function initialVoice(): VoiceState {
  return {
    phase: "connecting",
    failure: null,
    caption: SENTENCES.opening.text,
    captionOf: null,
    talking: null,
    responding: false,
    said: [],
    turns: [],
    answers: 0,
    asked: 0,
    quiet: 0,
    muted: false,
    urgent: false,
    reveal: null,
    heard: [],
    done: [],
    pending: null,
    saying: null,
    lines: [],
    last: null,
    cut: null,
    items: {},
    open: 0,
    retried: {},
    counted: {},
    responses: {},
    owed: false,
    answering: false,
    answered: 0,
    finishing: false,
    urgentSaid: false,
    paused: false,
    translating: false,
    firm: false,
    misfires: 0,
  };
}

/** Nothing is being said, heard or awaited: the call rests on the person. */
export function settled(state: VoiceState): boolean {
  return !state.saying && !state.answering && !state.translating && state.open === 0 && state.lines.length === 0 && !state.owed;
}

/** The call is waiting on the person: for an answer, or, after the crisis numbers, for nothing more. */
export function resting(state: VoiceState): boolean {
  return state.phase === "live" && settled(state) && state.talking === null && (awaited(state) || state.paused);
}

/** The question the person is being waited on for, if there is one. */
const awaited = (state: VoiceState) => Boolean(state.pending?.question && !state.done.includes(state.pending.question));

/**
 * Nobody is speaking and nothing is being waited for that will arrive by itself: words that have not
 * come, or a sound that cut a sentence short and was never a turn. The screen gives it a few seconds,
 * then says so (`unheard`).
 */
export function stalled(state: VoiceState): boolean {
  if (state.phase !== "live" || state.saying || state.answering || state.translating || state.talking !== null || state.paused) return false;
  return state.open > 0 || state.lines.length > 0 || state.owed || state.finishing || !awaited(state);
}

/** The share of a question that has to be heard for the next words to be its answer. */
export const HEARD = 0.6;
/** The rules that open the crisis contacts from the person's own words, whatever the model does. */
const URGENT_RULES: ReadonlySet<SafetyRuleId> = new Set(["self-harm", "hopelessness", "danger"]);
/** A question is said again at most twice; after that the call moves on. */
const MOST_RETRIES = 2;
/** The model answers this many of the person's questions in a call; a call is for finding a clinician. */
export const MOST_ANSWERS = 3;
/** The model is given a sentence at most this often without saying one. */
const MOST_MISFIRES = 3;

/** What the person said, as they said it, when the call is left before its end. */
export function saidAsRequest(said: readonly string[]): string {
  return said.join(", ").slice(0, MAX_REQUEST);
}

const FOR_A_CHILD = /\b(son|daughter|child|kid|teen(?:ager)?|boy|girl)\b|\b(?:1[0-7]|[1-9])[- ]year[- ]old\b|\b(?:son|daughter|child)\s*,\s*(?:1[0-7]|[1-9])\b/i;

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * A sentence the model wrote, held to the person's own words where a word does real work. A kind of
 * clinician narrows the list to that kind (`searchRoster`), so the sentence names one only when the
 * person did: any other becomes "clinician". A request for a child drops "adult". And "specialist"
 * never reaches a screen a patient reads (the taste law's honesty gate), whoever wrote it.
 */
export function inTheirWords(request: string, said: readonly string[]): string {
  const theirs = new Set(professionsMentioned(said.join(" ")));
  let out = request;
  for (const entry of PROFESSION_ENTRIES) {
    if (theirs.has(entry.id)) continue;
    for (const cue of [...entry.cues].sort((a, b) => b.length - a.length)) {
      const word = cue === "gps" ? "clinicians" : "clinician";
      out = out.replace(new RegExp(`(^|[^a-z])${escape(cue)}(?=$|[^a-z])`, "gi"), (_, before: string) => `${before}${word}`);
    }
  }
  // A request for a child is not an adult assessment, whatever the model wrote.
  if (FOR_A_CHILD.test(out)) out = out.replace(/\badult\s+/gi, "");
  return out
    .replace(/\bspeciali[sz](?:ing|es|ed|e)\s+in\b/gi, "for")
    .replace(/\bspecialists?\b/gi, (found) => (found.toLowerCase().endsWith("s") ? "clinicians" : "clinician"))
    .replace(/\b(an?\s+)?clinician\s+(?:or|and)\s+(?:an?\s+)?clinician\b/gi, (_, article: string | undefined) => `${article ?? ""}clinician`)
    .replace(/\b(a)n(\s+clinician)/gi, "$1$2");
}

// ── What is sent ─────────────────────────────────────────────────────────────────────────────────

const message = (role: "assistant" | "user", text: string) => ({ type: "message", role, content: [{ type: role === "assistant" ? "output_text" : "input_text", text }] });
const item = (role: "assistant" | "user", text: string): ClientEvent => ({ type: "conversation.item.create", item: message(role, text) });
/** A response of the model's, marked with what it is for. */
const respond = (purpose: string, response: Record<string, unknown>): ClientEvent => ({ type: "response.create", response: { ...response, metadata: { purpose } } });
/** Apart from the conversation: what it says or writes is not added to it, and it reads only what it is given. */
const apart = (purpose: string, given: string, instructions: string, more: Record<string, unknown> = {}): ClientEvent =>
  respond(purpose, { conversation: "none", input: given ? [message("user", given)] : [], instructions, ...more });

const SAY = "say";
const ANSWERING = "answer";
const SAFETY = "safety";
const TRANSLATING = "translate";

const idle = (state: VoiceState): Step => ({ state, send: [], say: null, hush: false });

/** Cuts the model short, whichever of its responses is speaking. */
function cancel(state: VoiceState): ClientEvent[] {
  const speaking = Object.entries(state.responses).filter(([, purpose]) => purpose === SAY || purpose === ANSWERING);
  if (!speaking.length) return [];
  return [...speaking.map(([id]) => ({ type: "response.cancel", response_id: id })), { type: "output_audio_buffer.clear" }];
}

/** Stops whatever is being said: the recording on the screen, the model on the call. */
function stop(state: VoiceState): { state: VoiceState; send: ClientEvent[]; hush: boolean } {
  const send = cancel(state);
  const hush = state.saying?.by === "clip";
  return { state: { ...state, saying: null, lines: [], answering: false, talking: state.talking === "assistant" ? null : state.talking }, send, hush };
}

// ── Saying ───────────────────────────────────────────────────────────────────────────────────────

/** Says the first sentence waiting: the recording where there is one, the model where there is not. */
function speak(state: VoiceState, clips: Clips): Step {
  const [line, ...lines] = state.lines;
  if (!line) return idle(state);
  const sentence = SENTENCES[line.say];
  const recorded = clips(line.say);
  const next: VoiceState = {
    ...state,
    lines,
    last: line.say,
    saying: { ...line, by: recorded ? "clip" : "model" },
    caption: sentence.text,
    captionOf: null,
    talking: recorded ? "assistant" : state.talking,
    // A recording says what is written. The model's own words go on the record when it has said them.
    turns: recorded ? [...state.turns, { who: "assistant", text: sentence.text }] : state.turns,
  };
  // The sentence joins the conversation either way, so an answer the model gives later has heard the question.
  const send = [item("assistant", sentence.text)];
  if (!recorded) send.push(apart(SAY, "", sayExactly(sentence.spoken ?? sentence.text), { tool_choice: "none" }));
  return { state: next, send, say: recorded ? { id: line.say, firm: state.firm } : null, hush: false };
}

/** A sentence has been said, or cut short: a question heard becomes the one the next words answer. */
function spoken(state: VoiceState, share: number): VoiceState {
  const line = state.saying;
  if (!line) return state;
  // A recording ends when it ends; the model's voice is still playing when its response is done.
  let next: VoiceState = { ...state, saying: null, talking: line.by === "clip" && state.talking === "assistant" ? null : state.talking };
  if (share < HEARD) return { ...next, lines: [], cut: line.say };
  next = { ...next, firm: false, cut: null };
  if (!line.question) return next;
  next = { ...next, pending: { say: line.say, question: line.question } };
  if (line.question in next.counted) return next;
  const follows = line.question !== "opening" && line.question !== "carry-on";
  return { ...next, counted: { ...next.counted, [line.question]: line.say }, asked: next.asked + (follows ? 1 : 0) };
}

// ── Hearing ──────────────────────────────────────────────────────────────────────────────────────

const finished = (state: VoiceState, question: QuestionId): VoiceState => (state.done.includes(question) ? state : { ...state, done: [...state.done, question] });

/** The person's words on the record, read for danger by the app's own rules. */
function noted(state: VoiceState, words: string): VoiceState {
  const rule = checkSafety(words);
  return {
    ...state,
    said: [...state.said, words],
    turns: [...state.turns, { who: "person", text: words }],
    urgent: state.urgent || (rule !== null && URGENT_RULES.has(rule.id)),
  };
}

/** A question said a second time: the opening one without its hello. */
const again = (line: Line): Line => (line.say === "opening" ? { say: "again", question: line.question } : line);

/** The silent check on what was said, unless the app's own rules have already seen danger in it. */
const checked = (state: VoiceState, words: string): ClientEvent[] =>
  state.urgent ? [] : [apart(SAFETY, safetyInput(SENTENCES[state.pending?.say ?? "opening"].text, words), SAFETY_CHECK, { output_modalities: ["text"], tool_choice: "none", max_output_tokens: 200 })];

/** One turn of the person's, under the question it answers. */
function take(state: VoiceState, question: QuestionId, text: string): { state: VoiceState; send: ClientEvent[] } {
  const words = text.trim();
  // The microphone may have heard the sentence last begun, or the question before it.
  const ours = [state.last, state.pending?.say].flatMap((id) => (id ? [SENTENCES[id].text, SENTENCES[id].spoken ?? ""] : []));
  const echo = ours.find((sentence) => sentence && hear(words, question, sentence).kind === "echo") ?? "";
  // A word or two of the sentence this sound cut short is that sentence, not an answer to the one before.
  const clipped = state.cut !== null && echoes(words, SENTENCES[state.cut].spoken ?? SENTENCES[state.cut].text, 1);
  const what = clipped ? ({ kind: "echo" } as const) : hear(words, question, echo);
  const say = state.counted[question] ?? state.pending?.say ?? "opening";
  const tries = state.retried[question] ?? 0;
  /** The question once more, with these sentences; after the last try the call moves on. */
  const once = (from: VoiceState, most: number, before: Line[] = []): VoiceState =>
    tries >= most || !state.pending ? finished(from, question) : { ...from, retried: { ...from.retried, [question]: tries + 1 }, lines: [...before, again(state.pending)] };
  switch (what.kind) {
    case "echo":
      // The finder's own voice: nobody's answer. What it cut short is said through next time.
      return { state: { ...state, firm: true, cut: null, turns: [...state.turns, { who: "tool", text: `echo: ${words}` }] }, send: [] };
    case "unclear": {
      const kept = words ? { ...state, turns: [...state.turns, { who: "person" as const, text: words }] } : state;
      // Once: "Sorry, I didn't catch that", and the question again. After that the call moves on.
      return { state: { ...once(kept, 1, [{ say: "catch", question: null }]), firm: state.firm || !words }, send: [] };
    }
    case "repeat":
      return { state: once({ ...state, turns: [...state.turns, { who: "person", text: words }] }, MOST_RETRIES), send: [] };
    case "finish": {
      let next = noted({ ...state, cut: null }, words);
      if (what.text) next = { ...next, heard: [...next.heard, { question, say, text: what.text }] };
      return { state: { ...finished(next, question), finishing: true }, send: checked(next, words) };
    }
    case "answer": {
      let next = noted({ ...state, cut: null }, words);
      if (what.text) next = { ...next, heard: [...next.heard, { question, say, text: what.text }] };
      // The model answers a few of their questions; past that the call keeps to finding a clinician.
      next = { ...next, owed: next.owed || (what.asks && next.answered < MOST_ANSWERS) };
      // A question of theirs with no answer beside it leaves ours waiting, to be asked again once theirs is answered.
      if (what.text || !what.asks) next = finished(next, question);
      else next = once(next, MOST_RETRIES);
      if (question === "carry-on" && saysNo(what.text)) next = { ...next, paused: true };
      return { state: next, send: checked(next, words) };
    }
  }
}

// ── What happens next ────────────────────────────────────────────────────────────────────────────

/** The call's end: the closing sentence, and the request the answers make. */
function close(state: VoiceState, clips: Clips): Step {
  const own = compose(state.heard);
  const request = own.request || saidAsRequest(state.said);
  // Nothing anybody could read was said: there is nothing to rank on, and typing is the way through.
  if (!request) return { state: { ...state, phase: "failed", failure: "unavailable", talking: null, finishing: false }, send: [], say: null, hush: false };
  const closing: VoiceState = { ...state, finishing: false, lines: [{ say: "closing", question: null }] };
  if (!mostlyEnglish(request)) {
    const said = speak({ ...closing, translating: true }, clips);
    return { ...said, send: [...said.send, apart(TRANSLATING, state.said.join("\n"), TRANSLATE, { output_modalities: ["text"], tool_choice: "none", max_output_tokens: 300 })] };
  }
  const reveal = { request: inTheirWords(request, state.said), place: own.place };
  const said = speak({ ...closing, phase: "revealing", reveal }, clips);
  return { ...said, state: { ...said.state, turns: [...said.state.turns, { who: "tool", text: `reveal ${JSON.stringify(reveal)}` }] } };
}

/** With the floor free, the next thing: the crisis numbers, a sentence waiting, an answer owed, the next question, or the end. */
function advance(state: VoiceState, clips: Clips): Step {
  if (state.phase !== "live" && !(state.phase === "revealing" && state.lines.length)) return idle(state);
  if (state.saying || state.answering) return idle(state);
  // Somebody is speaking: the person, or the model's voice still playing.
  if (state.talking !== null) return idle(state);
  if (state.phase === "revealing") return speak(state, clips);
  if (state.translating || state.open > 0) return idle(state);
  if (state.urgent && !state.urgentSaid) {
    return speak({ ...state, urgentSaid: true, firm: true, lines: [{ say: "urgent", question: null }, { say: "carry-on", question: "carry-on" }] }, clips);
  }
  // What they asked is answered before anything of ours is said.
  if (state.owed) return { state: { ...state, owed: false, answering: true, answered: state.answered + 1 }, send: [respond(ANSWERING, { instructions: ANSWER })], say: null, hush: false };
  if (state.lines.length) return speak(state, clips);
  if (state.paused) return idle(state);
  if (state.finishing) return close(state, clips);
  if (awaited(state)) return idle(state);
  const line = state.asked >= MAX_FOLLOW_UPS ? null : nextQuestion(state.heard, state.done);
  if (!line) return state.said.length || state.heard.length ? close(state, clips) : { state: { ...state, phase: "failed", failure: "unavailable", talking: null }, send: [], say: null, hush: false };
  return speak({ ...state, lines: [line] }, clips);
}

const then = (first: { state: VoiceState; send: ClientEvent[]; hush?: boolean }, clips: Clips): Step => {
  const next = advance(first.state, clips);
  return { ...next, send: [...first.send, ...next.send], hush: Boolean(first.hush) || next.hush };
};

interface OutputItem {
  type?: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  role?: string;
  content?: { type?: string; text?: string; transcript?: string }[];
}

function onResponseDone(state: VoiceState, event: ServerEvent, clips: Clips): Step {
  const response = (event.response ?? {}) as { id?: string; status?: string; output?: OutputItem[]; metadata?: { purpose?: string } | null };
  const id = response.id ?? "";
  const purpose = response.metadata?.purpose ?? state.responses[id] ?? "";
  const output = response.output ?? [];
  const { [id]: _gone, ...responses } = state.responses;
  const speaking = Object.values(responses).some((what) => what === SAY || what === ANSWERING);
  let next: VoiceState = { ...state, responses, responding: speaking };

  const written = output.flatMap((entry) => entry.content ?? []).map((part) => part.text ?? "").join("").trim();
  const called = output.some((entry) => entry.type === "function_call" && entry.name === URGENT_HELP);
  if (purpose === SAFETY) {
    if (!called && !DANGER.test(written)) return idle(next);
    next = { ...next, turns: [...next.turns, { who: "tool", text: URGENT_HELP }] };
    if (next.urgent || next.urgentSaid) return then({ state: { ...next, urgent: true }, send: [] }, clips);
    // The numbers come before anything else that was about to be said.
    const stopped = stop({ ...next, urgent: true });
    return then(stopped, clips);
  }
  if (purpose === TRANSLATING) {
    if (!next.translating) return idle(next);
    const own = compose(next.heard);
    const request = written ? inTheirWords(written.slice(0, MAX_REQUEST), next.said) : own.request || saidAsRequest(next.said);
    const reveal = { request, place: own.place };
    return then({ state: { ...next, translating: false, phase: "revealing", reveal, turns: [...next.turns, { who: "tool", text: `reveal ${JSON.stringify(reveal)}` }] }, send: [] }, clips);
  }
  if (purpose === ANSWERING) {
    // Asked about their own danger, the model calls for help in place of an answer.
    if (called && !next.urgent && !next.urgentSaid) return then(stop({ ...next, answering: false, urgent: true, turns: [...next.turns, { who: "tool", text: URGENT_HELP }] }), clips);
    return then({ state: { ...next, answering: false }, send: [] }, clips);
  }
  if (purpose === SAY) {
    if (next.saying?.by !== "model") return idle(next);
    const said = response.status === "completed";
    const misfires = said || response.status === "cancelled" ? next.misfires : next.misfires + 1;
    if (misfires >= MOST_MISFIRES) return { state: { ...next, phase: "failed", failure: "unavailable", talking: null, saying: null, misfires }, send: [], say: null, hush: false };
    return then({ state: { ...spoken(next, said ? 1 : 0), misfires }, send: [] }, clips);
  }
  // A response nobody asked for (the server answering a turn on its own): its tools still count.
  if (called) {
    return then(stop({ ...next, urgent: true, turns: [...next.turns, { who: "tool", text: URGENT_HELP }] }), clips);
  }
  return idle(next);
}

function onServer(state: VoiceState, event: ServerEvent, clips: Clips): Step {
  switch (event.type) {
    case "response.created": {
      const response = (event.response ?? {}) as { id?: string; metadata?: { purpose?: string } | null };
      const purpose = response.metadata?.purpose ?? "";
      const responses = response.id ? { ...state.responses, [response.id]: purpose } : state.responses;
      return idle({ ...state, responses, responding: state.responding || purpose === SAY || purpose === ANSWERING });
    }
    case "response.output_audio_transcript.delta": {
      const id = typeof event.response_id === "string" ? event.response_id : "";
      // A sentence the model was given is on the screen already, as written.
      if (state.responses[id] !== ANSWERING) return idle(state);
      const delta = typeof event.delta === "string" ? event.delta : "";
      return idle({ ...state, caption: id === state.captionOf ? state.caption + delta : delta, captionOf: id });
    }
    case "response.output_audio_transcript.done": {
      const text = typeof event.transcript === "string" ? event.transcript.trim() : "";
      if (!text) return idle(state);
      const id = typeof event.response_id === "string" ? event.response_id : "";
      const answer = state.responses[id] === ANSWERING;
      return idle({ ...state, ...(answer ? { caption: text, captionOf: id } : {}), turns: [...state.turns, { who: "assistant", text }] });
    }
    case "input_audio_buffer.speech_started": {
      const next: VoiceState = { ...state, talking: "person" };
      // The model is cut short by the person, as the recording is by the screen.
      return { state: next, send: state.saying?.by === "model" && !state.firm ? cancel(state) : [], say: null, hush: false };
    }
    case "input_audio_buffer.speech_stopped":
      // Their words are on the way (committed, then transcribed): nothing is said until they are in.
      return idle({ ...state, talking: state.talking === "person" ? null : state.talking });
    case "input_audio_buffer.committed": {
      const id = typeof event.item_id === "string" ? event.item_id : `item_${state.answers}`;
      return idle({ ...state, answers: state.answers + 1, quiet: 0, open: state.open + 1, items: { ...state.items, [id]: state.pending?.question ?? "opening" } });
    }
    case "conversation.item.input_audio_transcription.completed":
    case "conversation.item.input_audio_transcription.failed": {
      const id = typeof event.item_id === "string" ? event.item_id : "";
      const { [id]: question = state.pending?.question ?? "opening", ...items } = state.items;
      const text = event.type.endsWith("completed") && typeof event.transcript === "string" ? event.transcript : "";
      const open = Math.max(0, state.open - 1);
      if (state.phase !== "live") return idle({ ...state, items, open });
      return then(take({ ...state, items, open }, question, text), clips);
    }
    case "output_audio_buffer.started":
      return idle({ ...state, talking: "assistant" });
    case "output_audio_buffer.stopped":
    case "output_audio_buffer.cleared":
      return advance({ ...state, talking: state.talking === "assistant" ? null : state.talking }, clips);
    case "response.done":
      return onResponseDone(state, event, clips);
    default:
      return idle(state);
  }
}

export function step(state: VoiceState, action: Action, clips: Clips = NO_CLIPS): Step {
  if (state.phase === "failed") return idle(state);
  // While the matches are on their way the call still ends its sentence, and nothing else moves it.
  if (state.phase === "revealing" && action.type !== "server" && action.type !== "said") return idle(state);
  switch (action.type) {
    case "mic":
      // With the opening recorded, the call begins the moment the microphone is open.
      if (state.phase !== "connecting" || !clips("opening")) return idle(state);
      return speak({ ...state, phase: "live", lines: [{ say: "opening", question: "opening" }] }, clips);
    case "connected":
      if (state.phase === "connecting") return speak({ ...state, phase: "live", lines: [{ say: "opening", question: "opening" }] }, clips);
      // They answered the opening before the call could hear them: it says so, and asks again.
      if (!action.missed || state.phase !== "live" || state.answers > 0 || state.lines.length) return idle(state);
      return advance({ ...state, lines: [{ say: "catch", question: null }, { say: "again", question: "opening" }] }, clips);
    case "failed": {
      const stopped = stop(state);
      return { state: { ...stopped.state, phase: "failed", failure: action.failure, talking: null }, send: [], say: null, hush: stopped.hush };
    }
    case "server":
      return onServer(state, action.event, clips);
    case "said":
      if (state.saying?.by !== "clip" || state.saying.say !== action.say) return idle(state);
      return advance(spoken(state, action.heard), clips);
    case "typed": {
      const words = action.text.trim();
      if (!words || state.phase !== "live") return idle(state);
      // Typing over a sentence cuts it short, as speaking does.
      const stopped = stop(state);
      const base: VoiceState = { ...stopped.state, answers: state.answers + 1, quiet: 0 };
      const taken = take(base, base.pending?.question ?? "opening", words);
      return then({ state: taken.state, send: [...stopped.send, item("user", words), ...taken.send], hush: stopped.hush }, clips);
    }
    case "muted":
      return idle({ ...state, muted: action.muted });
    case "finish": {
      if (state.phase !== "live" || state.said.length === 0) return idle(state);
      return then(stop({ ...state, finishing: true, owed: false }), clips);
    }
    case "quiet":
      // The first quiet spell gets one gentle check; the second, once they have said anything,
      // shows the matches for what they said rather than leaving them waiting.
      if (state.phase !== "live" || state.saying || state.answering || state.translating || state.urgent || state.paused || state.open > 0) return idle(state);
      if (state.quiet === 0) {
        const asked = state.said.length === 0 && state.pending ? [again(state.pending)] : [];
        return speak({ ...state, quiet: 1, lines: [{ say: "nudge", question: null }, ...asked] }, clips);
      }
      if (state.said.length === 0) return idle(state);
      return advance({ ...state, quiet: state.quiet + 1, finishing: true }, clips);
    case "unheard": {
      if (!stalled(state)) return idle(state);
      // Words that never arrived are an answer nobody caught; a sound that was no turn is nothing at all.
      if (state.open === 0) return advance({ ...state, firm: true }, clips);
      return then(take({ ...state, open: 0, items: {} }, state.pending?.question ?? "opening", ""), clips);
    }
    case "urgent-seen":
      return idle({ ...state, urgent: false });
  }
}
