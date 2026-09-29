// The voice finder's conversation: a pure step over the realtime API's server events and the
// person's own actions, returning the next state and the client events to send. The screen
// (app/finder-stages/voice-stage.tsx) renders the state and sends the events; the call
// (src/voice/link.ts) carries them. Pure, so a whole conversation is tested with scripted events.
//
// The question budget is held here, not by the model: once eight questions are asked, the next
// answer does not start a response on its own, and the one that follows is forced to call
// show_matches.

import { checkSafety, type SafetyRuleId } from "@/model/safety";
import { PROFESSION_ENTRIES, professionsMentioned } from "@/support/professions";
import { AFTER_URGENT, MAX_FOLLOW_UPS, NUDGE, NUDGE_START, OPENING_QUESTION, SHOW_MATCHES, TOO_SOON, turnDetection, URGENT_HELP, WRAP_UP } from "./interviewer";

export type Phase = "connecting" | "live" | "revealing" | "failed";
export type Failure = "mic" | "busy" | "unavailable";

export interface Reveal {
  request: string;
  place: string;
}

export interface VoiceState {
  phase: Phase;
  failure: Failure | null;
  /** The assistant's words in the turn under way, or the last one: the screen's one line. */
  caption: string;
  /** The response the caption belongs to. */
  captionOf: string | null;
  /** Who is talking; the orb follows it. */
  talking: "assistant" | "person" | null;
  /** A response is under way, so a new one must cancel it first. */
  responding: boolean;
  /** What the person said or typed, in order. */
  said: string[];
  /** Every turn, for the record (src/db/finder.ts): the person's, the assistant's and the tools'. */
  turns: Turn[];
  /** The person's turns, counted when their audio is committed or their words are sent: a
   * transcript can arrive after the reply to it, so the count does not wait for one. */
  answers: number;
  /** Questions asked after the person's first answer: replies that ask something, not answers to theirs. */
  asked: number;
  /** Gentle checks since the person last spoke: the first asks if they are there, the second finishes. */
  quiet: number;
  /** The budget is spent: the next answer ends in show_matches. */
  wrapping: boolean;
  /** show_matches has been forced and not yet answered. */
  forced: boolean;
  muted: boolean;
  urgent: boolean;
  reveal: Reveal | null;
}

/** One turn of the call as the record keeps it. */
export interface Turn {
  who: "person" | "assistant" | "tool";
  text: string;
}

export type ServerEvent = { type: string } & Record<string, unknown>;
export type ClientEvent = { type: string } & Record<string, unknown>;

export type Action =
  | { type: "connected" }
  | { type: "failed"; failure: Failure }
  | { type: "server"; event: ServerEvent }
  | { type: "typed"; text: string }
  | { type: "muted"; muted: boolean }
  | { type: "finish" }
  | { type: "quiet" }
  | { type: "urgent-seen" };

export function initialVoice(): VoiceState {
  return {
    phase: "connecting",
    failure: null,
    caption: OPENING_QUESTION,
    captionOf: null,
    talking: null,
    responding: false,
    said: [],
    turns: [],
    answers: 0,
    asked: 0,
    quiet: 0,
    wrapping: false,
    forced: false,
    muted: false,
    urgent: false,
    reveal: null,
  };
}

/** The rules that open the crisis contacts from the person's own words, whatever the model does. */
const URGENT_RULES: ReadonlySet<SafetyRuleId> = new Set(["self-harm", "hopelessness", "danger"]);
const MAX_REQUEST = 2000;

/** What the person asked for, when the model gives nothing usable. */
export function saidAsRequest(said: readonly string[]): string {
  return said.join(", ").slice(0, MAX_REQUEST);
}

const FOR_A_CHILD = /\b(son|daughter|child|kid|teen(?:ager)?|boy|girl)\b|\b(?:1[0-7]|[1-9])[- ]year[- ]old\b|\b(?:son|daughter|child)\s*,\s*(?:1[0-7]|[1-9])\b/i;

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/**
 * The model's sentence, held to the person's own words where a word does real work. A kind of
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

const system = (text: string): ClientEvent => ({
  type: "conversation.item.create",
  item: { type: "message", role: "system", content: [{ type: "input_text", text }] },
});
const respond = (response?: Record<string, unknown>): ClientEvent => (response ? { type: "response.create", response } : { type: "response.create" });
const interrupt = (state: VoiceState): ClientEvent[] =>
  state.responding ? [{ type: "response.cancel" }, { type: "output_audio_buffer.clear" }] : [];
const respondOnTurn = (on: boolean): ClientEvent => ({
  type: "session.update",
  session: { type: "realtime", audio: { input: { turn_detection: turnDetection(on) } } },
});

/** Marks the forced last response, so only it can end the call without show_matches. */
const LAST = "wrap-up";
/** Marks a check on a quiet person: it asks something, but it is not a follow-up. */
const CHECK = "nudge";

/** The last response: the model says one line and must call show_matches. */
function forceWrapUp(state: VoiceState): ClientEvent[] {
  return [
    ...interrupt(state),
    system(WRAP_UP),
    respond({ tool_choice: { type: "function", name: SHOW_MATCHES }, metadata: { purpose: LAST } }),
  ];
}

function heard(state: VoiceState, text: string): VoiceState {
  const words = text.trim();
  if (!words) return state;
  const rule = checkSafety(words);
  return {
    ...state,
    said: [...state.said, words],
    turns: [...state.turns, { who: "person", text: words }],
    urgent: state.urgent || (rule !== null && URGENT_RULES.has(rule.id)),
  };
}

function parse(args: unknown): Record<string, unknown> {
  if (typeof args !== "string") return {};
  try {
    const value: unknown = JSON.parse(args);
    return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}

/** The suburb or postcode alone: the model writes "Hornsby, NSW, or telehealth" where a place is one name. */
export function placeOf(value: unknown): string {
  if (typeof value !== "string") return "";
  const first = value.split(/,|;|\bor\b|\band\b/i)[0] ?? "";
  return first.replace(/^\s*(in|near|around|at|from)\s+/i, "").replace(/\b(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\b\.?/gi, "").replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim().slice(0, 80);
}

/**
 * THE REQUEST IS THE PERSON'S OWN WORDS (2026-09-29, docs/matching/RCA-NIGHT-2026-09-29.md, stage 2).
 * The realtime model used to write it, and paraphrased, invented ("for a baby eight months old" for
 * a mother asking for herself), dropped facts ("diagnosed last year") and merged answers. Now the
 * client assembles it from the turns: the first answer verbatim, every free-text answer verbatim,
 * and the yes/no questions mapped by rule, because the questions are fixed and known. An answer with
 * no Latin letters (a transcriber's "什么?") is dropped. The model's sentence is a fallback only.
 */
type Ask = "opening" | "place" | "lived" | "language" | "extra" | "cost" | "who" | "catch" | "other";
function askOf(question: string | null): Ask {
  if (!question) return "opening";
  const q = question.toLowerCase();
  if (q.includes(OPENING_QUESTION.toLowerCase())) return "opening";
  if (/didn.t catch/.test(q)) return "catch";
  if (/adhd (them|her|him)sel|has adhd/.test(q)) return "lived";
  if (/language|background/.test(q)) return "language";
  if (/where are you|telehealth|in person|suburb|postcode/.test(q)) return "place";
  if (/anything else/.test(q)) return "extra";
  if (/\bcost\b|bulk|afford/.test(q)) return "cost";
  if (/for you|someone else|who is (this|it) for/.test(q)) return "who";
  return "other";
}
const YES = /^\s*(yes|yeah|yep|yup|sure|please|ok|okay|definitely|absolutely|i would|that would|i.d like that)\b/i;
const NO = /^\s*(no|nah|nope|not really|no thanks|no preference|none|(it )?doesn.t matter|not (at all|particularly|really))\b/i;
const LEAD = /^\s*(yes|yeah|yep|yup|sure|please|ok|okay|definitely|absolutely|no|nah|nope|not really|no thanks|no preference|none)\b[,.!:;—–\- ]*/i;
const readable = (text: string) => /[a-z]{2,}/i.test(text);
/** Written mostly in English letters: a person answering in Vietnamese or Arabic is read through the model's English request instead. */
export function mostlyEnglish(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return true;
  const plain = letters.filter((letter) => /[a-z]/i.test(letter)).length;
  return plain / letters.length >= 0.9;
}
export const LIVED_ASK = "someone who has ADHD themselves";
/** After a yes, words that say nothing more: "that would be helpful", "please", "thanks". */
const FILLER = /^\s*(that|this|it)('s| is| would be| will be|'d be)?\s*(really |very )?(helpful|great|good|fine|ok|okay|nice|perfect|ideal|lovely|wonderful)[.!]?\s*$|^\s*(please|thanks|thank you)[.!]?\s*$/i;
/** A yes that opens a request of its own is not an answer to the question ("Yes, please find me a GP near Penrith who bulk bills"). */
const ASKS_ANEW = /\b(find me|please find|i want|i need|i'?m looking for|looking for|i'?d like|can you find|could you find|do you know (of |any )?(a |an |some |any )?(clinician|gp|doctor|psychologist|psychiatrist|coach|therapist|counsellor|someone|anyone)|know of (a |an |any )?(clinician|gp|doctor|psychologist|someone|anyone))\b/i;
/** A clause that asks the assistant something ("what does bulk billing mean?", "do you mean …?") is a question, not a request part. */
const QUESTION_TO_ASSISTANT = /^\s*(what|how|why|which|who|when|where|do you|does|did|is it|is that|is there|are you|are there|can you|could you|would you|will you|should i|would it|do i|am i|isn'?t|don'?t you|what'?s|how'?s)\b/i;
/** The person's answer without the questions they asked the assistant in it, clause by clause. */
export function withoutQuestions(text: string): string {
  const clauses = text.match(/[^.;?!]+[.;?!]*/g) ?? [text];
  const kept = clauses.filter((clause) => !(clause.trim().endsWith("?") && QUESTION_TO_ASSISTANT.test(clause.replace(/^[\s—–\-,;]+/, "")) && !ASKS_ANEW.test(clause)));
  return kept.map((clause) => clause.trim().replace(/[\s.;:!?—–\-]+$/, "")).filter(Boolean).join(". ");
}
/** After a no, the rest is kept only where it turns into an ask ("no, but I'd like a woman"); "no particular language matters" restates the no. */
const NO_THEN_ASK = /\b(but|however|although|though|i want|i need|i'?d like|i would like|i prefer|prefer|preferably|ideally|someone who|somebody who|a woman|a man|looking for|find me|do you know)\b/i;
/** "English is fine", "just English", "no, English" as the whole answer to the language question. */
const ENGLISH_ONLY = /^\s*(no[,.]?\s*)?(just |only )?english( is| would be| works| will do)?( fine| ok| okay| only| please| good| great)?[.!]?\s*$/i;

export function requestFromTurns(turns: readonly Turn[]): { request: string; place: string } {
  const parts: string[] = [];
  let question: string | null = null;
  let answered = false;
  let placeSaid = "";
  for (const turn of turns) {
    if (turn.who === "assistant") { question = turn.text; continue; }
    if (turn.who !== "person") continue;
    const text = withoutQuestions(turn.text.trim());
    if (!readable(text)) continue;
    const ask: Ask = answered ? askOf(question) : "opening";
    answered = true;
    const yes = YES.test(text);
    const no = NO.test(text);
    const rest = text.replace(LEAD, "").replace(/^(but|and|though|although)\s+/i, "").trim();
    // After a yes the rest is usually the substance ("yes, a woman if possible"); after a no it usually
    // restates the no ("no, English is fine", "no particular language or cultural background matters", the eval's
    // negation persona, 2026-09-30) unless it turns into an ask ("no, but I'd like a woman").
    const more = rest.split(/\s+/).filter(Boolean).length >= 3 && (!no || NO_THEN_ASK.test(rest)) ? rest : "";
    // "English" to the language question is no ask: the roster speaks it, and the ranking would read nothing from it.
    if (ask === "language" && ENGLISH_ONLY.test(text)) continue;
    // Yes to the lived-experience question is that ask in the finder's words; any other answer to it is theirs ("a woman would be good").
    // A yes that goes on to ask for something else is that ask, not this one (the eval's asker persona, 2026-09-30: the
    // model asked the question four times, the person kept asking their own, and "Yes, please find me a GP near Penrith"
    // was written as a wish for a clinician with ADHD).
    if (ask === "lived" && yes && !ASKS_ANEW.test(rest)) {
      parts.push(LIVED_ASK);
      if (more && !FILLER.test(rest)) parts.push(more);
      continue;
    }
    if (yes && ASKS_ANEW.test(rest)) {
      parts.push(rest);
      continue;
    }
    if (ask === "place") {
      if (!no) { placeSaid = text; parts.push(text); }
      continue;
    }
    if (yes || no) {
      if (more && !FILLER.test(rest)) parts.push(more);
      continue;
    }
    parts.push(text);
  }
  // Each answer keeps its own sentence: "…from the inside. Telehealth's fine, I'm in Marrickville." rather than "…inside., Telehealth's fine…".
  const request = parts.map((part) => part.replace(/[\s.,;:!?]+$/, "")).filter(Boolean).join(". ").slice(0, MAX_REQUEST);
  return { request, place: placeSaid ? placeOf(placeSaid) : "" };
}

function revealFrom(state: VoiceState, args: unknown): Reveal {
  const { request, place } = parse(args);
  const own = requestFromTurns(state.turns);
  const modelWords = typeof request === "string" && request.trim() ? inTheirWords(request.trim().slice(0, MAX_REQUEST), state.said) : "";
  // The person's words, unless they were not in English (the eval's Vietnamese persona, 2026-09-30: "nói tiếng Việt" read
  // no language); then the model's English request is the translation the reader can use, and the transcript keeps theirs.
  const foreign = own.request !== "" && !mostlyEnglish(own.request) && modelWords !== "";
  const words = own.request && !foreign ? inTheirWords(own.request, state.said) : modelWords || saidAsRequest(state.said);
  return { request: words, place: placeOf(place) || own.place };
}

interface OutputItem {
  type?: string;
  name?: string;
  call_id?: string;
  arguments?: string;
  role?: string;
}

function onResponseDone(state: VoiceState, event: ServerEvent): { state: VoiceState; send: ClientEvent[] } {
  const response = (event.response ?? {}) as { id?: string; status?: string; output?: OutputItem[]; metadata?: { purpose?: string } | null };
  const output = response.output ?? [];
  const tools: Turn[] = output.filter((item) => item.type === "function_call").map((item) => ({ who: "tool", text: `${item.name ?? ""} ${item.arguments ?? ""}`.trim() }));
  let next: VoiceState = { ...state, responding: false, turns: tools.length ? [...state.turns, ...tools] : state.turns };
  const send: ClientEvent[] = [];

  const matches = output.find((item) => item.type === "function_call" && item.name === SHOW_MATCHES);
  // A reveal before the person has said anything shows a list for words that are nobody's (the text eval,
  // 2026-09-29: show_matches straight after the opening question, request "I want help finding ADHD care").
  // The call is answered as not shown and the model asks again; the forced last turn is never this early.
  if (matches && next.answers === 0 && !state.forced) {
    send.push(
      { type: "conversation.item.create", item: { type: "function_call_output", call_id: matches.call_id ?? "", output: "not shown: the person has not answered yet" } },
      system(TOO_SOON),
      respond(),
    );
    return { state: next, send };
  }
  if (matches) return { state: { ...next, phase: "revealing", forced: false, reveal: revealFrom(next, matches.arguments) }, send };
  if (state.forced && response.metadata?.purpose === LAST && response.status !== "cancelled") {
    return { state: { ...next, phase: "revealing", forced: false, reveal: { request: saidAsRequest(next.said), place: "" } }, send };
  }

  const urgent = output.find((item) => item.type === "function_call" && item.name === URGENT_HELP);
  if (urgent) {
    next = { ...next, urgent: true };
    send.push(
      { type: "conversation.item.create", item: { type: "function_call_output", call_id: urgent.call_id ?? "", output: "shown" } },
      system(AFTER_URGENT),
      respond(),
    );
    return { state: next, send };
  }

  const spoke = output.some((item) => item.type === "message" && item.role === "assistant");
  // A reply counts against the eight only when it asks something: an answer to the person's own
  // question, or a check on a quiet person, is not a follow-up.
  const said = response.id && next.captionOf === response.id ? next.caption : "";
  const asks = said.includes("?") && response.metadata?.purpose !== CHECK;
  if (spoke && asks && response.status === "completed" && next.answers > 0 && !next.wrapping) {
    const asked = next.asked + 1;
    next = { ...next, asked };
    if (asked >= MAX_FOLLOW_UPS) {
      next = { ...next, wrapping: true };
      send.push(respondOnTurn(false));
    }
  }
  return { state: next, send };
}

function onServer(state: VoiceState, event: ServerEvent): { state: VoiceState; send: ClientEvent[] } {
  const none: ClientEvent[] = [];
  switch (event.type) {
    case "response.created":
      return { state: { ...state, responding: true }, send: none };
    case "response.output_audio_transcript.delta": {
      const id = typeof event.response_id === "string" ? event.response_id : "";
      const delta = typeof event.delta === "string" ? event.delta : "";
      const caption = id === state.captionOf ? state.caption + delta : delta;
      return { state: { ...state, caption, captionOf: id }, send: none };
    }
    case "response.output_audio_transcript.done": {
      const text = typeof event.transcript === "string" ? event.transcript.trim() : "";
      if (!text) return { state, send: none };
      const id = typeof event.response_id === "string" ? event.response_id : state.captionOf;
      return { state: { ...state, caption: text, captionOf: id, turns: [...state.turns, { who: "assistant", text }] }, send: none };
    }
    case "input_audio_buffer.speech_started":
      return { state: { ...state, talking: "person" }, send: none };
    case "input_audio_buffer.speech_stopped":
      return { state: { ...state, talking: state.talking === "person" ? null : state.talking }, send: none };
    case "input_audio_buffer.committed": {
      const next = { ...state, answers: state.answers + 1, quiet: 0 };
      // With the budget spent the server starts no response on its own; this answer gets the last one.
      if (state.wrapping && !state.forced && state.phase === "live") return { state: { ...next, forced: true }, send: forceWrapUp(state) };
      return { state: next, send: none };
    }
    case "conversation.item.input_audio_transcription.completed":
      return { state: heard(state, typeof event.transcript === "string" ? event.transcript : ""), send: none };
    case "output_audio_buffer.started":
      return { state: { ...state, talking: "assistant" }, send: none };
    case "output_audio_buffer.stopped":
    case "output_audio_buffer.cleared":
      return { state: { ...state, talking: state.talking === "assistant" ? null : state.talking }, send: none };
    case "response.done":
      return onResponseDone(state, event);
    default:
      return { state, send: none };
  }
}

export function step(state: VoiceState, action: Action): { state: VoiceState; send: ClientEvent[] } {
  const none: ClientEvent[] = [];
  if (state.phase === "failed" || (state.phase === "revealing" && action.type !== "server")) return { state, send: none };
  switch (action.type) {
    case "connected":
      if (state.phase !== "connecting") return { state, send: none };
      return {
        state: { ...state, phase: "live" },
        send: [system(`Begin now. Say exactly: "Hi. ${OPENING_QUESTION}"`), respond()],
      };
    case "failed":
      return { state: { ...state, phase: "failed", failure: action.failure, talking: null }, send: none };
    case "server":
      return onServer(state, action.event);
    case "typed": {
      const words = heard(state, action.text);
      if (words === state || state.phase !== "live") return { state, send: none };
      const next = { ...words, answers: words.answers + 1, quiet: 0 };
      const item: ClientEvent = {
        type: "conversation.item.create",
        item: { type: "message", role: "user", content: [{ type: "input_text", text: action.text.trim() }] },
      };
      if (next.wrapping) return { state: { ...next, forced: true }, send: [...interrupt(state), item, ...forceWrapUp({ ...state, responding: false })] };
      return { state: next, send: [...interrupt(state), item, respond()] };
    }
    case "muted":
      return { state: { ...state, muted: action.muted }, send: none };
    case "finish":
      if (state.phase !== "live" || state.answers === 0 || state.forced) return { state, send: none };
      return { state: { ...state, wrapping: true, forced: true }, send: [respondOnTurn(false), ...forceWrapUp(state)] };
    case "quiet":
      // The first quiet spell gets one gentle check; the second, once they have said anything,
      // shows the matches for what they said rather than leaving them waiting.
      if (state.phase !== "live" || state.forced || state.responding || state.urgent) return { state, send: none };
      if (state.quiet === 0) return { state: { ...state, quiet: 1 }, send: [system(state.answers ? NUDGE : NUDGE_START), respond({ metadata: { purpose: CHECK } })] };
      if (state.answers === 0) return { state, send: none };
      return { state: { ...state, quiet: state.quiet + 1, wrapping: true, forced: true }, send: [respondOnTurn(false), ...forceWrapUp(state)] };
    case "urgent-seen":
      return { state: { ...state, urgent: false }, send: none };
  }
}
