// The voice finder's questions (O263, 2026-09-30): the sentences it says, the order it asks them in,
// what it does with each answer, and the request those answers make. The app asks; the realtime model
// is left two jobs, answering what the person asks it and watching for danger.
//
// WHY THE APP ASKS. The model chose its own next question until now, and the calls on record show what
// that cost (the founder's, journal rows 7caf49ae and 132972d8, and six before them): it thought aloud
// ("let me ask one more small question"), asked two questions before one was answered, put a city in a
// question that nobody had said ("someone in Perth?"), and never asked what was hard at work of a
// person who had asked for help at work. A fixed sentence cannot drift, and a recorded one starts at
// once. Pure, so a whole call is tested with no model and no microphone.

import { resolvePlace } from "@/geo/suburbs";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";
import { facetKey, readNeeds } from "@/matching/needs";
import { said as number } from "@/model/crisis-contacts";
import { OPENING_QUESTION } from "./interviewer";

/** What a person can be asked. "detail" is one question said one of six ways. */
export type QuestionId = "opening" | "detail" | "place" | "lived" | "culture" | "which-culture" | "extra" | "carry-on";

/** Every sentence the finder says itself. Each is recorded once (public/voice, scripts/voice-clips.mjs). */
export const SAY_IDS = [
  "opening",
  "again",
  "help",
  "detail-work",
  "detail-study",
  "detail-home",
  "detail-relationship",
  "detail-social",
  "place",
  "lived",
  "culture",
  "which-culture",
  "extra",
  "catch",
  "nudge",
  "closing",
  "urgent",
  "carry-on",
] as const;
export type SayId = (typeof SAY_IDS)[number];

export interface Sentence {
  /** As the screen reader's heading and the record hold it. */
  text: string;
  /** As it is said, where a number is said another way. */
  spoken?: string;
}

export const SENTENCES: Record<SayId, Sentence> = {
  opening: { text: `Hi. ${OPENING_QUESTION}` },
  // The opening question, asked a second time: nobody says hello twice.
  again: { text: OPENING_QUESTION },
  help: { text: "What would you like help with?" },
  "detail-work": { text: "What's hardest at work?" },
  "detail-study": { text: "What's hardest with school or study?" },
  "detail-home": { text: "What's hardest at home?" },
  "detail-relationship": { text: "What's hardest in your relationship?" },
  "detail-social": { text: "What's hardest with other people?" },
  place: { text: "Where are you, or would telehealth suit you?" },
  lived: { text: "Would you like someone who has ADHD themselves?" },
  culture: { text: "Would you like someone from your own culture?" },
  "which-culture": { text: "Which culture or language?" },
  extra: { text: "Is there anything else a clinician should know?" },
  catch: { text: "Sorry, I didn't catch that." },
  nudge: { text: "Still there? Take your time." },
  closing: { text: "Thanks, here's who fits." },
  urgent: {
    text: `If you're in danger now, call ${number("emergency")}. Lifeline is ${number("lifeline")}, any hour, or text ${number("lifeline-text")}.`,
    spoken: `If you're in danger now, call triple zero. Lifeline is ${number("lifeline")}, any hour, or text ${number("lifeline-text")}.`,
  },
  "carry-on": { text: "Would you like to keep looking for a clinician?" },
};

/** A sentence to say, and the question it asks when it asks one. */
export interface Line {
  say: SayId;
  question: QuestionId | null;
}

/** What the person said, under the question it answers. */
export interface Answer {
  question: QuestionId;
  /** The sentence the question was asked in: which of the six a detail answer is about. */
  say: SayId;
  text: string;
}

/** The questions, in the order they are asked. "carry-on" is asked only after urgent help. */
const ORDER: readonly QuestionId[] = ["opening", "detail", "place", "lived", "culture", "which-culture", "extra"];

// ── Reading an answer ────────────────────────────────────────────────────────────────────────────

const YES = /^\s*(yes|yeah|yep|yup|sure|please|ok|okay|definitely|absolutely|of course|i would|that would|i.d like that|i.d love that|sounds good)\b/i;
const NO = /^\s*(no|nah|nope|not really|no thanks|no thank you|no preference|none|nothing|(it )?doesn.t matter|(i )?don.t mind|(i )?don.t care|not (at all|particularly|really|fussed|bothered))\b/i;
const LEAD = /^\s*(yes|yeah|yep|yup|sure|please|ok|okay|definitely|absolutely|of course|no|nah|nope|not really|no thanks|no thank you|no preference|none|nothing)\b[,.!:;—–\- ]*/i;
/** After a yes, words that say nothing more: "that would be helpful", "please", "thanks". */
const FILLER = /^\s*(that|this|it)('s| is| would be| will be|'d be)?\s*(really |very |totally )?(helpful|great|good|fine|ok|okay|nice|perfect|ideal|lovely|wonderful)( with me| by me)?[.!]?\s*$|^\s*(please|thanks|thank you|thanks a lot|i think so|i guess so)[.!]?\s*$/i;
/** A yes that opens a request of its own is not an answer to the question ("Yes, please find me a GP near Penrith who bulk bills"). */
const ASKS_ANEW = /\b(find me|please find|i want|i need|i'?m looking for|looking for|i'?d like|i'?d still like|can you find|could you find|do you know (of |any )?(a |an |some |any )?(clinician|gp|doctor|psychologist|psychiatrist|coach|therapist|counsellor|someone|anyone)|know of (a |an |any )?(clinician|gp|doctor|psychologist|someone|anyone))\b/i;
/** After a no, the rest is kept only where it turns into an ask ("no, but I'd like a woman"); "no particular language matters" restates the no. */
const NO_THEN_ASK = /\b(but|however|although|though|i want|i need|i'?d like|i would like|i prefer|prefer|preferably|ideally|someone who|somebody who|a woman|a man|looking for|find me|do you know)\b/i;
/** "English is fine", "just English", "no, English" as the whole answer: the roster speaks it. */
const ENGLISH_ONLY = /^\s*(no[,.]?\s*)?(just |only )?english( is| would be| works| will do)?( fine| ok| okay| only| please| good| great)?[.!]?\s*$/i;
/** A clause that asks the assistant something ("what does bulk billing mean?", "do you mean …?") is a question, not a request part. */
const QUESTION_TO_ASSISTANT = /^\s*(what|how|why|which|who|when|where|do you|does|did|is it|is that|is there|are you|are there|can you|could you|would you|will you|should i|would it|do i|am i|isn'?t|don'?t you|what'?s|how'?s)\b/i;
/** Asking for the question again: answered with the question, and no part of the request (the call of 2026-09-30 08:00 wrote "Sorry, I didn't catch what you just said" into one). */
const REPEAT =
  /^\s*((sorry|pardon|excuse me|wait|um+|uh+|hang on)[,.!? ]*)*((what|huh|sorry|pardon|come again|eh)\s*[?.!]*\s*$|(what|sorry what) (was that|did you (say|ask)|do you mean)|(can|could|would) you (please )?(say|repeat|ask) (that|it|the question)|(say|repeat|ask) (that|it) again|one more time|i (didn'?t|did not|couldn'?t|could not) (quite )?(catch|hear|get|understand) (that|it|you|what you|the question)|i missed that|what'?s the question)/i;
/** Asking for the matches now: the call ends, and the words are no part of the request. */
const SHOW_ME = /\b((just |please |okay,? |ok,? )?(show|give) me (who fits|the matches|my matches|the list|the results|who you have|who you'?ve got|them)|(can|could) i see (the matches|the list|the results|who fits)|i'?m done|skip the rest|that'?s enough questions|no more questions)\b/i;
/** The same, said to the last question, where it is also the answer. */
const NOTHING_MORE = /^\s*((no|nope|nah)[,.! ]*)?(that'?s (all|everything|it)|nothing (else|more)|i think that'?s (all|everything|it))\b/i;

const readable = (text: string) => /[a-z]{2,}/i.test(text);
const wordsOf = (text: string) => text.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);

/** Written mostly in English letters: a person answering in Vietnamese or Arabic is read through an English rendering instead. */
export function mostlyEnglish(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return true;
  const plain = letters.filter((letter) => /[a-z]/i.test(letter)).length;
  return plain / letters.length >= 0.9;
}

/** The clauses of an answer that ask the assistant something. */
function questionsIn(text: string): string[] {
  const clauses = text.match(/[^.;?!]+[.;?!]*/g) ?? [text];
  return clauses.filter((clause) => clause.trim().endsWith("?") && QUESTION_TO_ASSISTANT.test(clause.replace(/^[\s—–\-,;]+/, "")) && !ASKS_ANEW.test(clause));
}

/** The person's answer without the questions they asked the assistant in it, clause by clause. */
export function withoutQuestions(text: string): string {
  const asked = new Set(questionsIn(text));
  const clauses = text.match(/[^.;?!]+[.;?!]*/g) ?? [text];
  return clauses
    .filter((clause) => !asked.has(clause))
    .map((clause) => clause.trim().replace(/[\s.;:!?—–\-]+$/, ""))
    .filter(Boolean)
    .join(". ");
}

/**
 * The microphone hearing the finder's own voice: every word of what came back is in the sentence just
 * said, in its order. Three words or more, so "telehealth" to a question with telehealth in it is still
 * an answer; any number of words when the sound is the one that cut the sentence short (`least` 1),
 * since nobody answers a question with its own first words.
 */
export function echoes(text: string, sentence: string, least = 3): boolean {
  const heard = wordsOf(text);
  if (heard.length < least) return false;
  const spoken = wordsOf(sentence);
  let at = 0;
  for (const word of heard) {
    const found = spoken.indexOf(word, at);
    if (found < 0) return false;
    at = found + 1;
  }
  return true;
}

export type Heard =
  /** The finder's own sentence come back through the microphone: nobody's answer. */
  | { kind: "echo" }
  /** They spoke and nothing readable came through. */
  | { kind: "unclear" }
  /** They asked for the question again. */
  | { kind: "repeat" }
  /** They asked for the matches; `text` is what else they said with it. */
  | { kind: "finish"; text: string }
  /** An answer; `asks` when they also asked the assistant something. */
  | { kind: "answer"; text: string; asks: boolean };

/** What one turn of the person's is, given the question it answers and the sentence last said. */
export function hear(text: string, question: QuestionId, lastSaid: string): Heard {
  const words = text.trim();
  if (!words || !readable(words)) return { kind: "unclear" };
  if (lastSaid && echoes(words, lastSaid)) return { kind: "echo" };
  if (REPEAT.test(words) && words.split(/\s+/).length <= 12) return { kind: "repeat" };
  const asks = questionsIn(words).length > 0;
  const rest = withoutQuestions(words);
  if (SHOW_ME.test(rest)) return { kind: "finish", text: rest.replace(SHOW_ME, " ").replace(LEAD, "").replace(/^[\s,.;:!?—–\-]+|[\s,.;:!?—–\-]+$/g, "").replace(/\s+/g, " ") };
  if (question === "extra" && NOTHING_MORE.test(rest)) return { kind: "finish", text: "" };
  return { kind: "answer", text: rest, asks };
}

// ── What has been said so far ────────────────────────────────────────────────────────────────────

const keysOf = (text: string) => new Set(readNeeds(text).map((need) => facetKey(need.facet)));
const textOf = (answers: readonly Answer[], question?: QuestionId) =>
  answers.filter((answer) => !question || answer.question === question).map((answer) => answer.text).join(". ");

/** The languages a person may name, beyond the ones the finder can match on, so a named one is heard as a language. */
const LANGUAGES: readonly string[] = [
  ...MATCHABLE_LANGUAGES,
  "Cantonese", "Shanghainese", "Portuguese", "Greek", "Italian", "Korean", "Japanese", "Filipino", "Tagalog", "Nepali",
  "Persian", "Farsi", "Dari", "Turkish", "Bengali", "Sinhalese", "Gujarati", "Telugu", "Marathi", "Thai", "Indonesian",
  "Malay", "German", "French", "Russian", "Ukrainian", "Serbian", "Croatian", "Macedonian", "Polish", "Samoan",
  "Tongan", "Khmer", "Burmese", "Swahili", "Somali", "Amharic", "Hebrew", "Dutch", "Auslan",
];
export function languagesNamed(text: string): string[] {
  const words = new Set(wordsOf(text));
  return LANGUAGES.filter((language) => words.has(language.toLowerCase()));
}

/** A place named in passing: "near Hornsby", "I'm in Marrickville", a postcode. Words that follow "in" and are no place are left. */
const NOT_A_PLACE = new Set(["australia", "english", "adhd", "person", "general", "particular", "january", "february", "march", "april", "may", "june", "july", "august", "september", "october", "november", "december", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday", ...LANGUAGES.map((language) => language.toLowerCase())]);
const LOCATED = /\b(?:in|near|around|from|at|outside|close to|based in|live in|living in)\s+((?:[A-Z][a-z'’]+)(?:\s+[A-Z][a-z'’]+){0,2})/g;
const STATE = /\b(NSW|VIC|QLD|SA|WA|TAS|ACT|NT|New South Wales|Victoria|Queensland|South Australia|Western Australia|Tasmania|Northern Territory)\b\.?/gi;

/** The suburb or postcode in what was said, or "". */
export function placeIn(text: string): string {
  const postcode = /(?:^|[^\d])(\d{4})(?:[^\d]|$)/.exec(text)?.[1];
  if (postcode && resolvePlace(postcode)) return resolvePlace(postcode)!.suburb;
  // A name the finder knows, wherever it stands, as long as it is written as a name.
  const words = text.replace(/[.,;:!?]/g, " ").split(/\s+/).filter(Boolean);
  for (let size = 3; size >= 1; size--) {
    for (let at = 0; at + size <= words.length; at++) {
      const run = words.slice(at, at + size);
      if (!run.every((word) => /^[A-Z]/.test(word))) continue;
      const known = resolvePlace(run.join(" "));
      if (known) return known.suburb;
    }
  }
  for (const found of text.matchAll(LOCATED)) {
    const name = found[1]!.replace(STATE, "").trim();
    if (name && !NOT_A_PLACE.has(name.toLowerCase().split(/\s+/)[0]!)) return name;
  }
  return "";
}

/** The suburb or postcode alone, from the answer to the place question. */
export function placeOf(value: unknown): string {
  if (typeof value !== "string") return "";
  const named = placeIn(value);
  if (named) return named;
  const first = value.split(/,|;|\bor\b|\band\b|\bbut\b/i)[0] ?? "";
  const cleaned = first.replace(/^\s*(i'?m |i am |we'?re |we are |i live |we live )?(in|near|around|at|from)\s+/i, "").replace(STATE, "").replace(/[.!?]+$/, "").replace(/\s+/g, " ").trim();
  // A short name, written as one: "Parramatta", "Surry Hills". A sentence is no place.
  const words = cleaned.split(/\s+/).filter(Boolean);
  if (words.length === 0 || words.length > 3 || !words.every((word) => /^[A-Z]/.test(word))) return "";
  if (YES.test(cleaned) || NO.test(cleaned) || /telehealth|online|video|phone/i.test(cleaned)) return "";
  return cleaned.slice(0, 80);
}

/** True when the words ask for a clinician who has ADHD themselves. */
const asksLived = (text: string) => LIVED.test(text) || keysOf(text).has("pref:lived-experience");
const TELEHEALTH = /\b(telehealth|tele-health|online|video|zoom|over the phone|by phone|phone (call|appointment)s?|remote(ly)?)\b/i;
const LIVED = /\b(has|have|with|got) adhd (them|her|him)sel(f|ves)\b|\blived experience\b|\badhd from the inside\b/i;

// ── The detail question: what is hard, in the part of life they named ────────────────────────────

/**
 * The part of life a first answer names, and the sentence that asks what is hard in it. A part of life
 * is named by the finder's reading of it, or by the plain mention: "getting things done at work" asks
 * for nothing the lexicon will rank on (a place in a story is no ask), and it is reason enough to ask.
 */
const DOMAINS: readonly { key: string; say: SayId; mentioned: RegExp }[] = [
  { key: "care:work-career", say: "detail-work", mentioned: /\b(at work|my work|my job|workplace|my career|my boss|my manager|the office|in my role)\b/i },
  { key: "care:study-school", say: "detail-study", mentioned: /\b(at school|at uni|at university|at tafe|my studies|my study|studying|my exams?|my assignments?|my degree|my course)\b/i },
  { key: "care:parenting", say: "detail-home", mentioned: /\b(parenting|as a (parent|mum|mom|dad|mother|father)|with my kids|with the kids|with my children|at home)\b/i },
  { key: "care:relationships", say: "detail-relationship", mentioned: /\b(my relationship|my marriage|with my (partner|husband|wife|boyfriend|girlfriend))\b/i },
  { key: "care:social-connection", say: "detail-social", mentioned: /\b(my friendships?|with friends|making friends|socially|social situations|fitting in)\b/i },
];
const DOMAIN_KEYS = new Set(DOMAINS.map((domain) => domain.key));
/** The part of life each detail question asks about. */
const DOMAIN_OF = new Map(DOMAINS.map((domain) => [domain.say, domain.key]));

/**
 * The follow-up to the first answer, or null when it needs none. A part of life named ("help at work")
 * is asked about, unless the answer already names two things that are hard in it; an answer that names
 * no help at all is asked what help; anything else (an assessment, scripts, a dose) says what it wants.
 */
export function detailFor(opening: string): SayId | null {
  const keys = [...keysOf(opening)];
  const care = keys.filter((key) => key.startsWith("care:"));
  const domain = DOMAINS.find((entry) => care.includes(entry.key)) ?? DOMAINS.find((entry) => entry.mentioned.test(opening));
  if (!domain) return care.length === 0 ? "help" : null;
  return care.filter((key) => !DOMAIN_KEYS.has(key)).length >= 2 ? null : domain.say;
}

/**
 * What a person names when asked what is hardest: bare words, which the finder's lexicon rightly refuses
 * in free text ("deadlines" in a story is no ask) and which here are the answer to the question asked.
 * Read ONLY from the answer to a detail question. For a morning it was read from "anything else a
 * clinician should know" too, and thirteen simulated calls showed why not: "he gets overwhelmed easily"
 * (a boy in a waiting room) became "help with stress and overwhelm", and a mention of sleep deprivation
 * became "help with sleep". What a person tells a clinician is kept as they said it, and nothing is added.
 */
const NAMED: readonly { key: string; words: RegExp }[] = [
  { key: "care:executive-function", words: /\b(focus\w*|concentrat\w*|attention|distract\w*|deadlines?|procrastinat\w*|getting started|get started|starting (things|tasks|work)|finishing (things|tasks|work)|finish (things|tasks|anything)|organis\w*|organiz\w*|planning|prioriti[sz]\w*|time management|managing (my )?time|running late|being late|on time|forget\w*|memory|emails?|admin|paperwork|tasks?|follow(ing)? through|keeping up|keep up|staying on top|routines?|motivat\w*|getting things done|switching tasks|multitask\w*)\b/i },
  { key: "care:emotional-regulation", words: /\b(stress\w*|overwhelm\w*|burn(t|ed)? ?out|burnout|anger|angry|frustrat\w*|emotions?|emotional\w*|moods?|mood swings|rejection|criticism|meltdowns?|temper|irritab\w*|snapping|shame|losing it|blow(ing)? up)\b/i },
  { key: "care:social-connection", words: /\b(colleagues?|co-?workers?|workmates?|small talk|conversations?|interrupt\w*|friends?|friendships?|fitting in|social\w*|lonel\w*|classmates?|making friends|reading people|talking to people)\b/i },
  { key: "care:work-career", words: /\b(boss|manager|supervisor|disclos\w*|telling (work|my work|them)|adjustments?|accommodations?|performance review|losing my job|keeping a job|hold(ing)? down a job|career|promotion|workload|meetings?)\b/i },
  { key: "care:study-school", words: /\b(exams?|assignments?|homework|studying|lectures?|essays?|teachers?|classes|grades|marks)\b/i },
  { key: "care:parenting", words: /\b(the kids|my kids|the children|my children|my son|my daughter|tantrums?|bedtimes?|school run|mornings with|behaviou?r)\b/i },
  { key: "care:relationships", words: /\b(my partner|my husband|my wife|my boyfriend|my girlfriend|arguments?|arguing|fighting|fights|intimacy|chores|housework|listening to (him|her|them))\b/i },
  { key: "care:sleep", words: /\b(sleep\w*|insomnia|tired(ness)?|exhaust\w*|fatigue|waking up|getting up|getting out of bed)\b/i },
  { key: "care:anxiety", words: /\b(anxiety|anxious|panic\w*|worry\w*|worries|worried|nervous\w*)\b/i },
  { key: "care:depression", words: /\b(depress\w*|low mood|feeling low|feel low|feeling flat|feel flat|hopeless\w*)\b/i },
];

/** The finder's own words for each thing named: each reads as exactly that ask (plan.test.ts holds them to it). */
export const NEED_PHRASE: Record<string, string> = {
  "care:executive-function": "help with focus and getting things done",
  "care:emotional-regulation": "help with stress and overwhelm",
  "care:social-connection": "help with friendships and social situations",
  "care:work-career": "help at work",
  "care:study-school": "help with school and study",
  "care:parenting": "help as a parent",
  "care:relationships": "help with my relationship",
  "care:sleep": "help with sleep",
  "care:anxiety": "help with anxiety",
  "care:depression": "help with depression",
};

/** A thing named and refused in the same breath: "not the deadlines", "sleep is fine", "no problem with focus". */
const refused = (text: string, at: number, length: number) =>
  /\b(not|no|never|isn'?t|aren'?t|without|don'?t have|no (problem|trouble|issue)s? with)\s+(the |my |any |really |a |an )?$/i.test(text.slice(Math.max(0, at - 40), at)) ||
  /^\s+(is|are|'s|has been|have been)\s+(fine|okay|ok|good|great|no problem|not (a|the) problem|not an issue)\b/i.test(text.slice(at + length, at + length + 40));

/** The asks a detail answer names, as keys. */
export function namedIn(answer: string): string[] {
  const keys: string[] = [];
  for (const entry of NAMED) {
    const found = entry.words.exec(answer);
    if (found && !refused(answer, found.index, found[0].length)) keys.push(entry.key);
  }
  return keys;
}

// ── The plan ─────────────────────────────────────────────────────────────────────────────────────

/** The sentence a question is asked in now, or null when what has been said already answers it. */
function sayFor(question: QuestionId, answers: readonly Answer[]): SayId | null {
  const all = textOf(answers);
  switch (question) {
    case "opening":
      return "opening";
    case "detail":
      return detailFor([textOf(answers, "opening"), textOf(answers, "carry-on")].filter(Boolean).join(". "));
    case "place":
      return TELEHEALTH.test(all) || placeIn(all) ? null : "place";
    case "lived":
      return asksLived(all) ? null : "lived";
    case "culture":
      return readsCulture(all) ? null : "culture";
    case "which-culture": {
      // Asked only of a yes that named nothing: "yes", "yes please", "that would be great".
      const said = textOf(answers, "culture");
      return said !== "" && YES.test(said) && !rest(said) && cultureParts(said, "culture").length === 0 ? "which-culture" : null;
    }
    case "extra":
      return "extra";
    case "carry-on":
      return null;
  }
}

/** The next question, given the answers so far and the questions finished with; null when there is none. */
export function nextQuestion(answers: readonly Answer[], done: readonly QuestionId[]): Line | null {
  for (const question of ORDER) {
    if (done.includes(question)) continue;
    const say = sayFor(question, answers);
    if (say) return { say, question };
  }
  return null;
}

// ── The request ──────────────────────────────────────────────────────────────────────────────────

export const LIVED_ASK = "someone who has ADHD themselves";
export const CULTURE_ASK = "someone from my own culture";
export const TELEHEALTH_ASK = "telehealth is fine";

/** The answer without its yes or no, when what is left says something. */
function rest(text: string): string {
  const left = text.replace(LEAD, "").replace(/^(but|and|though|although)\s+/i, "").trim();
  if (FILLER.test(left)) return "";
  const no = NO.test(text);
  return left.split(/\s+/).filter(Boolean).length >= 3 && (!no || NO_THEN_ASK.test(left)) ? left : "";
}

/** The words around a name in a short answer: "my background is Indian", "someone who speaks Hindi please". */
const AROUND_A_NAME = /\b(and|or|a|an|the|my|own|our|culture|cultural|background|language|languages|someone|somebody|who|speaks?|speaking|from|is|i'?m|i am|we'?re|we are|family|heritage|please|would|be|good|great|ideal|preferably|if possible|maybe|probably|mainly|mostly|just|thanks)\b/gi;

/**
 * A culture or a language named in a short answer, in the finder's words; nothing when it names neither.
 * A name is written as one ("Indian", "Lebanese Australian"); to "Which culture or language?" any word
 * or two is the name, however it was written down.
 */
function cultureParts(text: string, question: QuestionId): string[] {
  const left = text.replace(LEAD, "").trim();
  const languages = languagesNamed(left).filter((language) => language !== "English");
  const parts = languages.map((language) => `someone who speaks ${language}`);
  const named = left
    .replace(new RegExp(`\\b(${LANGUAGES.join("|")}|english)\\b`, "gi"), " ")
    .replace(AROUND_A_NAME, " ")
    .replace(/[^\p{L}\s-]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  const names = named.split(" ").filter(Boolean);
  const written = names.every((name) => /^\p{Lu}/u.test(name));
  if (names.length >= 1 && names.length <= 3 && (written || question === "which-culture")) {
    parts.unshift(`${CULTURE_ASK}, ${names.map((name) => name.charAt(0).toUpperCase() + name.slice(1)).join(" ")}`);
  }
  return parts;
}

/** True when the words ask for a culture or a language in a way the finder reads. */
function readsCulture(text: string): boolean {
  const keys = keysOf(text);
  return keys.has("care:cultural-background") || keys.has("manner:culturally_attuned") || languagesNamed(text).length > 0;
}

/** What the answers ask for, as the finder reads it: the person's words, each answer its own sentence. */
export function compose(answers: readonly Answer[]): { request: string; place: string } {
  const parts: string[] = [];
  let place = "";
  for (const answer of answers) {
    const text = withoutQuestions(answer.text.trim());
    if (!readable(text)) continue;
    const yes = YES.test(text);
    const no = NO.test(text);
    const more = rest(text);
    switch (answer.question) {
      case "opening":
        parts.push(text);
        break;
      case "detail":
        if (!(no && !more)) parts.push(yes || no ? more || text : text);
        break;
      case "place": {
        const named = placeOf(text);
        if (named && !place) place = named;
        if (yes && !more && !named) parts.push(TELEHEALTH_ASK);
        else if (!no || more || named) parts.push(yes || no ? more || text : text);
        break;
      }
      case "lived":
        // A yes that goes on to ask for something else is that ask, not this one.
        if (yes && ASKS_ANEW.test(more) && !asksLived(more)) parts.push(more);
        // Their own words for it, where they gave them ("yes, I'd prefer someone who has ADHD themselves"); the finder's where they did not.
        else if (yes) parts.push(...(more && asksLived(more) ? [more] : [LIVED_ASK, ...(more ? [more] : [])]));
        else if (!no) parts.push(text);
        else if (more) parts.push(more);
        break;
      case "culture":
      case "which-culture": {
        if (ENGLISH_ONLY.test(text) || (no && !more)) break;
        const named = cultureParts(text, answer.question);
        const theirs = yes || no ? more : text;
        if (theirs.split(/\s+/).filter(Boolean).length > 3) {
          // Their own sentence, and the ask in the finder's words where theirs does not read as one.
          parts.push(theirs);
          if ((yes || named.length > 0) && !readsCulture(theirs)) parts.push(named[0] ?? CULTURE_ASK);
        } else if (named.length) parts.push(...named);
        else if (yes && answer.question === "culture") parts.push(CULTURE_ASK);
        else if (theirs) parts.push(theirs);
        break;
      }
      case "extra":
      case "carry-on":
        if (yes || no) {
          if (more) parts.push(more);
        } else parts.push(text);
        break;
    }
  }
  // Each part once; the bare culture ask goes when the same ask carries a name.
  const named = parts.some((part) => part.startsWith(`${CULTURE_ASK}, `));
  const unique = parts
    .map((part) => part.replace(/[\s.,;:!?]+$/, ""))
    .filter((part, at, all) => part && all.indexOf(part) === at && !(named && part === CULTURE_ASK));
  if (!place) place = placeIn(textOf(answers));
  // What they named as hard, in the finder's words, where their own words do not already read as it.
  const readSoFar = keysOf(unique.join(". "));
  for (const answer of answers) {
    if (answer.question !== "detail") continue;
    const text = withoutQuestions(answer.text);
    if (!readable(text) || saysNo(text)) continue;
    // An answer to "what's hardest at work?" is about work, whatever it names.
    const about = DOMAIN_OF.get(answer.say);
    for (const key of [...(about ? [about] : []), ...namedIn(text)]) {
      if (readSoFar.has(key)) continue;
      readSoFar.add(key);
      unique.push(NEED_PHRASE[key]!);
    }
  }
  return { request: unique.join(". ").slice(0, MAX_REQUEST), place };
}

export const MAX_REQUEST = 2000;

/** True when the answer is a no and nothing else: the question is answered, and the request gains nothing. */
export function saysNo(text: string): boolean {
  return NO.test(text) && !rest(text);
}
/** True when the answer is a yes and nothing else. */
export const saysYes = (text: string) => YES.test(text) && !NO.test(text);
