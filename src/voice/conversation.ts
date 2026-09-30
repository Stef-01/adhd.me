// The voice finder's conversation: a pure step over the realtime API's server events and the
// person's own actions, returning the next state, the client events to send and the sentence to
// say. The screen (app/finder-stages/voice-stage.tsx) renders the state, sends the events and plays
// the sentence; the call (src/voice/link.ts) carries them. Pure, so a whole conversation is tested
// with scripted events.
//
// THE APP ASKS (O263, 2026-09-30). The questions, their order and the request they make are
// src/voice/plan.ts; this file is the floor: who is speaking, which question an answer belongs to,
// and what is said next. The server never answers a turn on its own. A sentence is a recording the
// screen plays (`say`), or, where there is none, the model saying exactly that sentence.
//
// EACH ANSWER IS HEARD THREE WAYS (O264). From the moment the person stops, the transcriber writes
// the words and says how sure it is of them, and the model, hearing the same audio, fills a form (a
// yes or a no, a place, a culture, a wish to hear the question again or to see the matches). The
// next thing is said when both are in; a plain yes or no does not wait for the form. The words then
// go to the model with one question, answered in a word: do they say danger? That answer is waited
// on by nothing, and stops whatever is being said when it is yes.

import { checkSafety, type SafetyRuleId } from "@/model/safety";
import { PROFESSION_ENTRIES, professionsMentioned } from "@/support/professions";
import { ANSWER, DANGER, FORM, FORM_INSTRUCTIONS, MAX_FOLLOW_UPS, SAFETY_CHECK, SURE, TRANSLATE, URGENT_HELP, asked, sayExactly } from "./interviewer";
import { MAX_REQUEST, SENTENCES, asksSomething, compose, echoes, formFor, formFrom, formOf, mostlyEnglish, nextQuestion, plainAnswer, withoutQuestions, type Answer, type Form, type Line, type QuestionId, type SayId } from "./plan";

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
  /** Each stretch of the person's speech that is still being read: the question it answers, and what has come in about it. */
  items: Record<string, Hearing>;
  /** How many of them there are: nothing more is said until each is heard in full. */
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

/** One stretch of the person's speech, as it is being heard. */
export interface Hearing {
  question: QuestionId;
  /** The sentence the question was asked in. */
  asked: SayId;
  /** The transcriber's words, and how sure it was of them (the mean probability of its tokens). */
  text?: string;
  sure?: number;
  /** The model's form. */
  form?: Form;
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
const respond = (purpose: string, response: Record<string, unknown>): ClientEvent => ({ type: "response.create", response: { ...response, metadata: { purpose, ...((response.metadata as Record<string, unknown> | undefined) ?? {}) } } });
/** Apart from the conversation: what it says or writes is not added to it, and it reads only what it is given. */
const apart = (purpose: string, given: string, instructions: string, more: Record<string, unknown> = {}): ClientEvent =>
  respond(purpose, { conversation: "none", input: given ? [message("user", given)] : [], instructions, ...more });

const SAY = "say";
const ANSWERING = "answer";
const FORMING = "form";
const SAFETY = "safety";
const TRANSLATING = "translate";

/** The question, then the person's own audio, or their words when they typed them. */
const answerTo = (item: string, question: SayId, words?: string) => [
  { type: "message", role: "system", content: [{ type: "input_text", text: asked(SENTENCES[question].text) }] },
  words === undefined ? { type: "item_reference", id: item } : message("user", words),
];

/** The form for one answer, asked for silently and apart from the conversation. */
const form = (item: string, question: SayId, words?: string): ClientEvent =>
  respond(FORMING, {
    conversation: "none",
    input: answerTo(item, question, words),
    instructions: FORM_INSTRUCTIONS,
    output_modalities: ["text"],
    tools: [FORM],
    tool_choice: { type: "function", name: FORM.name },
    max_output_tokens: 300,
    metadata: { purpose: FORMING, item },
  });

/** The word on danger, asked of the words themselves: read, the model missed none; heard, it missed one in twenty-one. */
const check = (item: string, question: SayId, words: string): ClientEvent =>
  respond(SAFETY, {
    conversation: "none",
    input: answerTo(item, question, words),
    instructions: SAFETY_CHECK,
    output_modalities: ["text"],
    tool_choice: "none",
    max_output_tokens: 200,
    metadata: { purpose: SAFETY, item },
  });

/** How sure the transcriber was: the mean probability of the tokens it wrote. */
function sureOf(logprobs: unknown): number | undefined {
  if (!Array.isArray(logprobs) || logprobs.length === 0) return undefined;
  const values = logprobs.map((token) => (token as { logprob?: unknown }).logprob).filter((value): value is number => typeof value === "number");
  return values.length ? Math.exp(values.reduce((sum, value) => sum + value, 0) / values.length) : undefined;
}

const idle = (state: VoiceState): Step => ({ state, send: [], say: null, hush: false });

function parse(args: unknown): unknown {
  if (typeof args !== "string") return null;
  try {
    return JSON.parse(args);
  } catch {
    return null;
  }
}

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

/** A question said a second time: the opening one without its hello. */
const again = (line: Line): Line => (line.say === "opening" ? { say: "again", question: line.question } : line);

/** One answer, with its words and its form in: what it was, and what the call does with it. */
function take(state: VoiceState, item: string): VoiceState {
  const held = state.items[item];
  if (!held) return state;
  const { [item]: _taken, ...items } = state.items;
  const base: VoiceState = { ...state, items, open: Object.keys(items).length };
  const { question } = held;
  const words = (held.text ?? "").trim();
  const filled = formFor(question, held.form ?? formFrom(words), words);
  // Words the transcriber was not sure of are words nobody said: fluent, and wrong. Unless the model, hearing
  // the same audio, made out a plain answer in it ("Hindi", written down at 0.33): then the answer stands.
  const named = Boolean(filled.yes_no || filled.place || filled.telehealth || filled.culture || filled.language);
  const unsure = held.sure !== undefined && held.sure < SURE && !named;
  const heard: Form = unsure ? { understood: false, ...(filled.again ? { again: true } : {}) } : filled;
  const tries = base.retried[question] ?? 0;
  /** The question once more, with these sentences before it; after the last try the call moves on. */
  const once = (from: VoiceState, most: number, before: Line[] = []): VoiceState =>
    tries >= most || !base.pending ? finished(from, question) : { ...from, retried: { ...from.retried, [question]: tries + 1 }, lines: [...before, again(base.pending)] };

  // The finder's own voice in the microphone: the sentence last begun, the question before it, or a
  // word or two of the sentence this very sound cut short. Nobody's answer; it is said through next time.
  const ours = [base.last, base.pending?.say].flatMap((id) => (id ? [SENTENCES[id].text, SENTENCES[id].spoken ?? ""] : []));
  const clipped = base.cut !== null && echoes(words, SENTENCES[base.cut].spoken ?? SENTENCES[base.cut].text, 1);
  if (words && (clipped || ours.some((sentence) => sentence && echoes(words, sentence)))) {
    return { ...base, firm: true, cut: null, turns: [...base.turns, { who: "tool", text: `echo: ${words}` }] };
  }
  // What was heard, on the record beside the words: how sure the transcriber was, and what the model made of it.
  const hearing: Turn = { who: "tool", text: `heard ${JSON.stringify({ ...(held.sure !== undefined ? { sure: Number(held.sure.toFixed(2)) } : {}), ...heard })}` };
  const kept: VoiceState = { ...base, cut: null, turns: [...base.turns, ...(words ? [{ who: "person" as const, text: words }] : []), hearing] };
  // Nothing anybody could make out: "Sorry, I didn't catch that", and the question once more.
  if (!heard.understood && !heard.again) return { ...once(kept, 1, [{ say: "catch", question: null }]), firm: base.firm || !words };
  if (heard.again) return once(kept, MOST_RETRIES);

  const rule = checkSafety(words);
  const urgent = kept.urgent || (rule !== null && URGENT_RULES.has(rule.id));
  let next: VoiceState = { ...kept, urgent, said: words ? [...kept.said, words] : kept.said };
  const said = withoutQuestions(words);
  const answers = Boolean(said) || Boolean(heard.yes_no || heard.place || heard.telehealth || heard.culture || heard.language);
  if (answers && !(heard.show_matches && !heard.place && !heard.culture && !heard.language && said.split(/\s+/).length < 8)) {
    // An answer is in: anything queued to ask this question again is dropped.
    next = { ...next, heard: [...next.heard, { question, say: held.asked, text: heard.show_matches ? "" : words, form: heard }], lines: next.lines.filter((line) => line.question !== question && line.say !== "catch") };
  }
  if (heard.show_matches) return { ...finished(next, question), finishing: true };
  // The model answers a few of their questions; past that the call keeps to finding a clinician.
  const asks = asksSomething(words) && next.answered < MOST_ANSWERS;
  next = { ...next, owed: next.owed || asks };
  // A question of theirs with no answer beside it leaves ours waiting, to be asked again once theirs is answered.
  next = answers ? finished(next, question) : once(next, MOST_RETRIES);
  if (question === "carry-on" && heard.yes_no === "no") next = { ...next, paused: true };
  return next;
}

/** Takes every answer whose words and form are both in, oldest first. */
function settle(state: VoiceState): VoiceState {
  let next = state;
  for (const [item, held] of Object.entries(state.items)) {
    if (held.text === undefined || held.form === undefined) break;
    next = take(next, item);
  }
  return next;
}

/** One more thing heard about an answer; then whatever is heard in full is taken, and danger comes before anything else. */
function heardMore(state: VoiceState, item: string, more: Partial<Hearing>, clips: Clips, send: ClientEvent[] = []): Step {
  const held = state.items[item];
  if (!held) return { ...idle(state), send };
  const before = state.urgent;
  const taken = settle({ ...state, items: { ...state.items, [item]: { ...held, ...more } } });
  if (state.phase !== "live") return { ...idle(taken), send };
  if (taken.urgent && !before && !taken.urgentSaid) {
    const stopped = stop(taken);
    return then({ ...stopped, send: [...send, ...stopped.send] }, clips);
  }
  return then({ state: taken, send }, clips);
}

/** Their words are in: the word on danger is asked for, and a plain yes or no waits for nothing more. */
function wordsIn(state: VoiceState, item: string, text: string, sure: number | undefined, clips: Clips): Step {
  const held = state.items[item];
  if (!held) return idle(state);
  const plain = sure === undefined || sure >= SURE ? plainAnswer(held.question, text) : null;
  const asks = text.trim() && state.phase === "live" ? [check(item, held.asked, text)] : [];
  return heardMore(state, item, { text, sure, ...(plain && !held.form ? { form: plain } : {}) }, clips, asks);
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
  const item = (response.metadata as { item?: string } | null)?.item ?? "";
  if (purpose === FORMING) {
    if (!next.items[item] || next.items[item]!.form) return idle(next);
    const filled = output.find((entry) => entry.type === "function_call" && entry.name === FORM.name);
    // A form that did not come, or came broken, is read from the words alone.
    const given = (filled ? formOf(parse(filled.arguments)) : null) ?? formFrom(next.items[item]!.text ?? "");
    return heardMore(next, item, { form: given }, clips);
  }
  if (purpose === SAFETY) {
    if (!(called || DANGER.test(written)) || next.phase !== "live") return idle(next);
    next = { ...next, turns: [...next.turns, { who: "tool", text: URGENT_HELP }] };
    if (next.urgent || next.urgentSaid) return then({ state: { ...next, urgent: true }, send: [] }, clips);
    // The numbers come before anything else that was about to be said.
    return then(stop({ ...next, urgent: true }), clips);
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
      // They have stopped: the transcriber writes their words, and the model hears what they hold, side by side.
      if (state.phase !== "live") return idle(state);
      const id = typeof event.item_id === "string" ? event.item_id : `item_${state.answers}`;
      const said = state.pending ?? { say: "opening" as SayId, question: "opening" as QuestionId };
      const items = { ...state.items, [id]: { question: said.question ?? "opening", asked: said.say } };
      const next: VoiceState = { ...state, answers: state.answers + 1, quiet: 0, items, open: Object.keys(items).length };
      return { state: next, send: [form(id, said.say)], say: null, hush: false };
    }
    case "conversation.item.input_audio_transcription.completed":
    case "conversation.item.input_audio_transcription.failed": {
      const id = typeof event.item_id === "string" ? event.item_id : "";
      const text = event.type.endsWith("completed") && typeof event.transcript === "string" ? event.transcript : "";
      return wordsIn(state, id, text, sureOf(event.logprobs), clips);
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
      // Typing over a sentence cuts it short, as speaking does. The words are in; their form is asked for.
      const stopped = stop(state);
      const id = `typed_${state.answers}`;
      const said = state.pending ?? { say: "opening" as SayId, question: "opening" as QuestionId };
      const items = { ...stopped.state.items, [id]: { question: said.question ?? "opening", asked: said.say, text: words } };
      const next: VoiceState = { ...stopped.state, answers: state.answers + 1, quiet: 0, items, open: Object.keys(items).length };
      const plain = plainAnswer(said.question ?? "opening", words);
      const asks = [item("user", words), ...(plain ? [] : [form(id, said.say, words)]), check(id, said.say, words)];
      const heard = plain ? heardMore(next, id, { form: plain }, clips, asks) : { state: next, send: asks, say: null, hush: false };
      return { ...heard, send: [...stopped.send, ...heard.send], hush: stopped.hush || heard.hush };
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
      // A sound that cut a sentence short and was never a turn: the sentence is said again, through.
      if (state.open === 0) return advance({ ...state, firm: true }, clips);
      // Words or a form that never arrived: the call goes on with what it has, and asks again when that is nothing.
      const items = Object.fromEntries(Object.entries(state.items).map(([id, held]) => [id, { ...held, text: held.text ?? "", form: held.form ?? formFrom(held.text ?? "") }]));
      const before = state.urgent;
      const taken = settle({ ...state, items });
      if (taken.urgent && !before && !taken.urgentSaid) return then(stop(taken), clips);
      return then({ state: taken, send: [] }, clips);
    }
    case "urgent-seen":
      return idle({ ...state, urgent: false });
  }
}
