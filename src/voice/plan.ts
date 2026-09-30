// The voice finder's questions: the sentences it says, the order it asks them in, and the request
// the answers make. The app asks; the model fills one small form for each answer (`Form`); this
// file decides what is asked next and writes the request. Pure, so a whole call is tested with no
// model and no microphone.
//
// WHY THE APP ASKS (O263, 2026-09-30). The model chose its own next question until then, and the
// calls on record show what that cost: it thought aloud, asked two questions before one was
// answered, put a city nobody had said into a question, and never asked what was hard at work of a
// person who had asked for help at work. A fixed sentence cannot drift.
//
// WHY A FORM (O264, the same day). For some hours each answer was read by rules written here: twenty
// patterns for yes, no, "say that again", "show me who fits", a culture's name, a place. The
// founder's next call broke them at once: the transcriber wrote his yes to the culture question as
// "ja ta pi grejda", the rules took it for an answer, and nobody asked him which culture. Rules for
// speech are the same whack-a-mole as a phrase lexicon. The model hears the answer itself and says
// what it holds, in fields with fixed names; the code reads the fields.

import { facetKey, readNeeds } from "@/matching/needs";
import { said as number } from "@/model/crisis-contacts";
import { MIDLIFE } from "@/finder/first-steps";
import { OPENING_QUESTION } from "./interviewer";

/** What a person can be asked. "detail" is one question said one of six ways. */
export type QuestionId = "opening" | "detail" | "age" | "raised" | "first-look" | "woman" | "place" | "lived" | "culture" | "which-culture" | "extra" | "carry-on";

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
  "detail-child",
  "age",
  "raised",
  "first-look",
  "woman",
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
  // For a parent (docs/matching/CHILD-FLOWS.md): the three facts every child pathway turns on.
  "detail-child": { text: "What's hardest for them right now?" },
  age: { text: "How old are they?" },
  raised: { text: "Has anyone raised ADHD with you before?" },
  // For a woman at midlife (docs/matching/MIDLIFE-FLOW.md).
  "first-look": { text: "A first look, or care you already have?" },
  woman: { text: "Would you prefer a woman clinician?" },
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

// ── The form ─────────────────────────────────────────────────────────────────────────────────────

/** What one answer holds, as the model heard it: a field is there only when the answer said it. */
export interface Form {
  /** False when the answer made no sense as an answer: garbled, in no language, the question come back. */
  understood: boolean;
  yes_no?: "yes" | "no";
  /** They asked to hear the question again. */
  again?: boolean;
  /** They asked for the matches now. */
  show_matches?: boolean;
  place?: string;
  telehealth?: boolean;
  culture?: string;
  language?: string;
  /** They named the culture most of the roster shares ("Australian", "just English"): nothing to ask for. */
  plain?: boolean;
}

/** What the person said, under the question it answers, with what the model heard in it. */
export interface Answer {
  question: QuestionId;
  /** The sentence the question was asked in: which of the six a detail answer is about. */
  say: SayId;
  text: string;
  form: Form;
}

const readable = (text: string) => /[a-z]{2,}/i.test(text);
const wordsOf = (text: string) => text.toLowerCase().replace(/[’']/g, "").replace(/[^a-z0-9 ]+/g, " ").split(/\s+/).filter(Boolean);
const named = (value: unknown) => (typeof value === "string" && !/^(none|null|n\/?a|unknown|nothing|not said|not specified|unspecified|no preference|not stated|not given|any)?$/i.test(value.trim()) ? value.trim().replace(/[.!?]+$/, "") : "");
const lettersOf = (text: string) => text.replace(/[^\p{L}]+/gu, "");

/** "my culture", "their own": a culture asked for and not named. */
const NO_NAME = /\b(my|your|their|our|own|same|culture|cultural|background|heritage)\b/gi;
/**
 * The culture most of the roster shares. An answer that names it asks for nothing the list can use,
 * and "works with cultural background" on a listing means other cultures than this one. Aboriginal and
 * Torres Strait Islander cultures are asked for by their own names.
 */
const PLAIN_CULTURE = /\b(australian|aussie|anglo-?(celtic|saxon|australian)|anglicised|anglicized|anglo|british|english|western|white|caucasian)\b/gi;
const FIRST_PEOPLES = /\b(aboriginal|indigenous|torres strait|first nations|koori|murri|noongar|wiradjuri)\b/i;

/** True when the words name the culture most of the roster shares and no other. */
const isPlain = (said: string) => Boolean(said) && !FIRST_PEOPLES.test(said) && Boolean(lettersOf(said.replace(NO_NAME, ""))) && !lettersOf(said.replace(PLAIN_CULTURE, "").replace(NO_NAME, ""));

/** The culture named, or "" when the words name none, or name the one most of the roster shares. */
function cultureOf(value: unknown): string {
  const said = named(value);
  return !said || !lettersOf(said.replace(NO_NAME, "")) || isPlain(said) ? "" : said;
}

/** The language named other than English. */
function languageOf(value: unknown): string {
  const said = named(value).replace(/\b(if possible|please|preferably|ideally|speaking|language)\b/gi, "").replace(/\s+/g, " ").trim();
  return /^english$/i.test(said) ? "" : said;
}

/** "the city", "here", "my area": a place meant and not named. */
const NO_PLACE = /^(the |my |our )?(city|town|suburb|area|here|home|place|local|nearby|australia)$/i;

/** The suburb or postcode alone: "near Sydney", "Hornsby, NSW" and "Parramatta or telehealth" are each one name. */
export function placeOf(value: unknown): string {
  const first = named(value).split(/,|;|\bor\b|\band\b|\bbut\b/i)[0] ?? "";
  const place = first
    .replace(/^\s*(i'?m |i am |we'?re |we are |i live |we live )?(in|near|around|at|from|close to)\s+/i, "")
    .replace(/\b(NSW|VIC|QLD|SA|WA|TAS|ACT|NT)\b\.?/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return NO_PLACE.test(place) ? "" : place;
}

/** A form as the model gave it, held to its fields: anything else is dropped, and a name that names nothing is no name. */
export function formOf(value: unknown): Form | null {
  if (!value || typeof value !== "object") return null;
  const given = value as Record<string, unknown>;
  const form: Form = { understood: given.understood !== false };
  if (given.yes_no === "yes" || given.yes_no === "no") form.yes_no = given.yes_no;
  for (const flag of ["again", "show_matches"] as const) if (given[flag] === true) form[flag] = true;
  if (given.telehealth === true) form.telehealth = true;
  const place = placeOf(given.place);
  if (place) form.place = place;
  const language = languageOf(given.language);
  if (language) form.language = language;
  // "An Arabic-speaking clinician" names a language; written down as a culture too, it is still only the language.
  const culture = cultureOf(given.culture);
  if (culture && culture.toLowerCase() !== language.toLowerCase()) form.culture = culture;
  if (!form.culture && !language && (isPlain(named(given.culture)) || /^english$/i.test(named(given.language)))) form.plain = true;
  return form;
}

/** With no form (the model did not answer in time), the little the words alone say. */
export function formFrom(text: string): Form {
  const words = text.trim();
  if (!readable(words)) return { understood: false };
  const yes = /^\s*(yes|yeah|yep|yup|sure)\b/i.test(words);
  const no = /^\s*(no|nah|nope)\b/i.test(words);
  return { understood: true, ...(yes ? { yes_no: "yes" as const } : no ? { yes_no: "no" as const } : {}) };
}

/**
 * A yes or a no and nothing else, to a question that asks for one: the words say all there is, and the
 * next question need not wait on the model ("Yes.", "No thanks.", "Yeah, that'd be great.").
 */
const PLAIN = /^\s*(yes|yeah|yep|yup|sure|no|nope|nah)[,.!]?(\s+(please|thanks|thank you|not really|that would be (great|good|nice|lovely)|that'?d be (great|good|nice|lovely)|that'?s fine))?[.!]?\s*$/i;
const YES_OR_NO: readonly QuestionId[] = ["lived", "culture", "raised", "woman", "carry-on"];
export const plainAnswer = (question: QuestionId, text: string): Form | null => (YES_OR_NO.includes(question) && PLAIN.test(text) ? formFrom(text) : null);

const ASKS_YES_OR_NO: readonly QuestionId[] = ["place", "lived", "culture", "raised", "woman", "carry-on"];

/**
 * A form as it stands for the question it answers: a yes to "…or would telehealth suit you?" is
 * telehealth, and a yes or a no the model wrote against a question that asked for neither, and words
 * that said neither, is nothing ("deadlines" came back with a no beside it).
 */
export function formFor(question: QuestionId, form: Form, words = ""): Form {
  const { yes_no: _asked, ...rest } = form;
  const said: Form = ASKS_YES_OR_NO.includes(question) || /^\s*(yes|yeah|yep|yup|no|nope|nah)\b/i.test(words) ? form : rest;
  return question === "place" && said.yes_no === "yes" && !said.place ? { ...said, telehealth: true } : said;
}

// ── What is not an answer ────────────────────────────────────────────────────────────────────────

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

/** Written mostly in English letters: a person answering in Vietnamese or Arabic is read through an English rendering instead. */
export function mostlyEnglish(text: string): boolean {
  const letters = text.match(/\p{L}/gu) ?? [];
  if (letters.length === 0) return true;
  const plain = letters.filter((letter) => /[a-z]/i.test(letter)).length;
  return plain / letters.length >= 0.9;
}

/** True when the answer asks the assistant something: a clause that ends in a question mark. */
export const asksSomething = (text: string) => (text.match(/[^.;?!]+[.;?!]*/g) ?? []).some((clause) => clause.trim().endsWith("?"));

/** The person's answer without the questions in it, clause by clause: a question asks the assistant, and asks for nothing. */
export function withoutQuestions(text: string): string {
  const clauses = text.match(/[^.;?!]+[.;?!]*/g) ?? [text];
  return clauses
    .filter((clause) => !clause.trim().endsWith("?"))
    .map((clause) => clause.trim().replace(/[\s.;:!?—–\-]+$/, ""))
    .filter(Boolean)
    .join(". ");
}

// ── The plan ─────────────────────────────────────────────────────────────────────────────────────

/** The questions, in the order they are asked. "carry-on" is asked only after urgent help. */
const ORDER: readonly QuestionId[] = ["opening", "detail", "age", "raised", "first-look", "woman", "place", "lived", "culture", "which-culture", "extra"];

/**
 * The part of life a first answer names, by the plain mention of it, and the sentence that asks what is
 * hard there. "getting things done at work" asks for nothing the finder ranks on (a place in a story
 * is no ask), and it is reason enough to ask. Read from the words: asked of the model as a field of
 * the form, a part of life came back for "I think I might have ADHD" one time in three.
 */
const PARTS_OF_LIFE: readonly { say: SayId; mentioned: RegExp }[] = [
  { say: "detail-work", mentioned: /\b(at work|my work|my job|workplace|my career|my boss|my manager|the office|in my role|a job|at my job)\b/i },
  { say: "detail-study", mentioned: /\b(at school|at uni|at university|at tafe|with uni|to uni|to university|back to study|my studies|my study|studying|my exams?|my assignments?|my degree|my course)\b/i },
  { say: "detail-home", mentioned: /\b(parenting|as a (new |single |working )?(parent|mum|mom|dad|mother|father)|with my kids|with the kids|with my children|at home)\b/i },
  { say: "detail-relationship", mentioned: /\b(my relationship|my marriage|with my (partner|husband|wife|boyfriend|girlfriend))\b/i },
  { say: "detail-social", mentioned: /\b(my friendships?|with friends|making friends|socially|social situations|fitting in)\b/i },
];
/** How a detail answer is written into the request, so its reader knows what question it answers. */
export const HARDEST: Partial<Record<SayId, string>> = {
  "detail-work": "Hardest at work",
  "detail-study": "Hardest with school or study",
  "detail-home": "Hardest at home",
  "detail-relationship": "Hardest in my relationship",
  "detail-social": "Hardest with other people",
  "detail-child": "Hardest for my child",
  help: "I would like help with",
};

const careAsked = (text: string) => readNeeds(text).map((need) => facetKey(need.facet)).filter((key) => key.startsWith("care:"));
const LIVED = /\b(has|have|with|got) adhd (them|her|him)sel(f|ves)\b|\blived experience\b|\badhd from the inside\b/i;
const asksLived = (text: string) => LIVED.test(text) || readNeeds(text).some((need) => facetKey(need.facet) === "pref:lived-experience");
const of = (answers: readonly Answer[], ...questions: QuestionId[]) => answers.filter((answer) => questions.includes(answer.question));
/**
 * The yes or no a question was left with: the last understood answer to it that said either. "Yeah,
 * that'd be great" and then "Actually no, it doesn't matter" is a no (the founder's call, 2026-09-30 02:34).
 */
const settledOn = (answers: readonly Answer[], question: QuestionId): Form["yes_no"] => of(answers, question).filter((answer) => answer.form.understood && answer.form.yes_no).at(-1)?.form.yes_no;

/**
 * The first answer is about their child: "my son", "our daughter", "his teacher", "year 5". A parent
 * is asked the child's age, what is hardest for them, and whether ADHD was raised before; they are not
 * asked about a clinician with ADHD themselves.
 */
const CHILD = /\b(my|our) (?:\S+ ){0,3}(son|sons|daughter|daughters|boy|girl|kid|kids|child|children|teen|teenager|stepson|stepdaughter)('?s)?\b|\b(his|her) (teacher|school|class|kindy|daycare)\b|\b(year|grade) (\d{1,2}|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve)\b|\b(kindergarten|kindy|preschool|daycare|p(a)?ediatric\w*|child psychiatrist)\b|\bfor (a |my |our )?(kids|children|child|teens?|teenagers?)\b|\b(my|our) ((1[0-7]|[1-9]|one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)[-\u2011\s])(years?|yrs?)[-\u2011\s]olds?\b(?!\s+(husband|wife|partner|mum|mother|dad|father|brother|sister|friend))/i;
/** The person asking about ADHD in themselves: "I think I have ADHD", "I'm in year 12", "for me". */
const SELF = /\b(i'?m|i am) in (year|grade)\b|\bi (think i |might |may |probably )?(have|might have|may have) adhd\b|\bmyself\b|\bfor me\b|\bmy own\b/i;
export const aboutChild = (answers: readonly Answer[]) => of(answers, "opening").some((answer) => CHILD.test(answer.text) && !SELF.test(answer.text));
/** An age, a school year or a stage said: nothing to ask. */
const AGED = /\b\d{1,2}\b|\b(one|two|three|four|five|six|seven|eight|nine|ten|eleven|twelve|thirteen|fourteen|fifteen|sixteen|seventeen)\b|\b(toddler|kindy|kindergarten|preschool|daycare|primary|high school|teenager|teen)\b/i;
/** ADHD raised by someone, or a diagnosis, already said. */
const RAISED = /\b(teacher|school|daycare|kindy|paediatrician|pediatrician|psychologist|doctor|gp)\b.{0,40}\b(said|says|thinks|think|raised|mentioned|suggested|told|wants|reckons)\b|\b(diagnos\w*|assessed|medication|meds|tablets|dose|ritalin|vyvanse|concerta|dexamphetamine|dex)\b|\b(with|has|have) adhd\b/i;
/** Midlife heard in the first answer: the change itself, or an age in the late forties or fifties. */
export const atMidlife = (answers: readonly Answer[]) => !aboutChild(answers) && of(answers, "opening").some((answer) => MIDLIFE.test(answer.text));
/** Care she already has, or an assessment she asks for: a first look or not, already said. */
const KNOWN = /\b(diagnos\w*|(my|adhd) (medication|meds|dose|script|prescription|prescriber|psychiatrist)|vyvanse|ritalin|concerta|dexamphetamine|stimulants?|assess\w*|could (this|it) be adhd|is (this|it) adhd|might (have|be) adhd)\b/i;
/** A woman asked for, or said not to matter. */
const WOMAN = /\b(woman|women|female|lady|gender|man|male)\b/i;
const opening = (answers: readonly Answer[]) => of(answers, "opening", "carry-on").map((answer) => answer.text).join(". ");

/**
 * The follow-up to the first answer, or null when it needs none (the founder, 2026-09-30: "should
 * have asked for more detail about what the struggle at work is"). A part of life named is asked
 * about; an answer that names no help is asked what help; an assessment, scripts or a dose says
 * what it wants.
 */
export function detailFor(opening: readonly Answer[]): SayId | null {
  const said = opening.map((answer) => answer.text).join(". ");
  // A parent is asked what is hardest for their child, unless the first answer named it; one asking
  // for help with their own parenting is asked what is hardest at home, below.
  const parenting = PARTS_OF_LIFE.find((entry) => entry.say === "detail-home")!.mentioned.test(said);
  if (CHILD.test(said) && !SELF.test(said) && !parenting) return careAsked(said).some((key) => key !== "care:child-adolescent-adhd" && key !== "care:adhd-assessment") ? null : "detail-child";
  // The part of life named first is the one asked about ("as a new mother and also going back to uni").
  const part = PARTS_OF_LIFE.map((entry) => ({ say: entry.say, at: said.search(entry.mentioned) })).filter((entry) => entry.at >= 0).sort((a, b) => a.at - b.at)[0];
  if (part) return part.say;
  return careAsked(said).length === 0 ? "help" : null;
}

/** The sentence a question is asked in now, or null when what has been said already answers it. */
function sayFor(question: QuestionId, answers: readonly Answer[]): SayId | null {
  switch (question) {
    case "opening":
      return "opening";
    case "detail":
      return detailFor(of(answers, "opening", "carry-on"));
    case "age":
      return aboutChild(answers) && !AGED.test(opening(answers)) ? "age" : null;
    case "raised":
      return aboutChild(answers) && !RAISED.test(opening(answers)) ? "raised" : null;
    case "first-look":
      return atMidlife(answers) && !KNOWN.test(opening(answers)) ? "first-look" : null;
    case "woman":
      return atMidlife(answers) && !answers.some((answer) => WOMAN.test(answer.text)) ? "woman" : null;
    case "place":
      return answers.some((answer) => answer.form.place || answer.form.telehealth) ? null : "place";
    case "lived":
      return aboutChild(answers) || answers.some((answer) => asksLived(answer.text)) ? null : "lived";
    case "culture":
      return answers.some((answer) => answer.form.culture || answer.form.language) ? null : "culture";
    case "which-culture":
      // A yes that named none is asked which (the founder, 2026-09-30: "the ai didn't prompt to ask what the culture was").
      return settledOn(answers, "culture") === "yes" && !answers.some((answer) => answer.form.culture || answer.form.language || answer.form.plain) ? "which-culture" : null;
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
export const WOMAN_ASK = "a woman clinician";
export const TELEHEALTH_ASK = "telehealth is fine";
export const MAX_REQUEST = 2000;
/** An answer to a yes-or-no question this long says more than yes or no, and is kept as it was said. */
const SAYS_MORE = 6;

const tidy = (text: string) => withoutQuestions(text.trim()).replace(/[\s.,;:!?]+$/, "");

/**
 * What the answers ask for, as the finder reads it. What the person said in their own words stays
 * in their words; what they answered to a question of ours is written as that question's ask. An
 * answer nobody understood adds nothing.
 */
export function compose(answers: readonly Answer[]): { request: string; place: string } {
  const parts: string[] = [];
  for (const answer of answers) {
    const { form, question } = answer;
    if (!form.understood) continue;
    const text = tidy(answer.text);
    const more = readable(text) && text.split(/\s+/).length >= SAYS_MORE ? text : "";
    const names = Boolean(form.culture || form.language);
    /** The words as said go into the request: a name in them is not said again in the finder's words. */
    const said = (part: string) => parts.push(part);
    let theirs = false;
    switch (question) {
      case "opening":
        if (readable(text)) (theirs = true), said(text);
        break;
      case "detail":
        // A short answer that names a place or telehealth answered the next question, not this one.
        if (readable(text) && !(form.yes_no === "no" && !more) && !((form.place || form.telehealth) && !more)) (theirs = true), said(`${HARDEST[answer.say] ?? HARDEST.help}: ${text}`);
        break;
      case "age":
        if (readable(text) || /\d/.test(text)) (theirs = true), said(`My child's age: ${text}`);
        break;
      case "raised":
        if (readable(text) && !(form.yes_no === "no" && !more)) (theirs = true), said(form.yes_no === "yes" && !more ? "Someone has raised ADHD about my child before" : `Whether ADHD was raised before: ${text}`);
        break;
      case "first-look":
        if (readable(text)) (theirs = true), said(`A first look at ADHD, or care I already have: ${text}`);
        break;
      case "woman":
        if (form.yes_no === "yes" && settledOn(answers, "woman") === "yes") parts.push(...(more && WOMAN.test(more) ? [more] : [WOMAN_ASK, ...(more ? [more] : [])]));
        else if (more && form.yes_no !== "yes") parts.push(more);
        break;
      case "place":
        if (more && !form.place && !form.telehealth) parts.push(more);
        break;
      case "lived":
        // A yes counts only where the question was left at yes: a later "actually no" takes it back.
        if (form.yes_no === "yes" && settledOn(answers, "lived") === "yes") parts.push(...(more && asksLived(more) ? [more] : [LIVED_ASK, ...(more ? [more] : [])]));
        else if (more && form.yes_no !== "yes") parts.push(more);
        break;
      case "culture":
      case "which-culture":
        if (form.yes_no === "yes" && !names && settledOn(answers, "culture") === "yes") parts.push(CULTURE_ASK);
        else if (more && !names && form.yes_no !== "yes") parts.push(more);
        break;
      case "extra":
      case "carry-on":
        // A short answer that only names a language or a culture ("Indi is my first language", written
        // down as the transcriber heard it) is asked for in the finder's words below, not in those.
        if (readable(text) && !(form.yes_no && !more) && !(names && !more)) (theirs = true), said(text);
        break;
    }
    // Named in an answer, a culture, a language and telehealth are asked for in the finder's words,
    // unless the words already in the request name them ("someone who understands Hindi culture").
    const inTheirs = (name: string) => theirs && text.toLowerCase().includes(name.toLowerCase());
    if (form.culture && !inTheirs(form.culture)) said(`${CULTURE_ASK}, ${form.culture}`);
    if (form.language && !inTheirs(form.language)) said(`someone who speaks ${form.language}`);
    if (form.telehealth && (question === "place" || (question === "detail" && !theirs))) said(TELEHEALTH_ASK);
  }
  // The bare ask goes when the same ask carries a name, or when their own culture is the one most of the roster shares.
  const theirs = parts.some((part) => part.startsWith(`${CULTURE_ASK}, `)) || answers.some((answer) => answer.form.plain);
  const unique = parts.filter((part, at, all) => part && all.indexOf(part) === at && !(theirs && part === CULTURE_ASK));
  const place = answers.map((answer) => (answer.form.understood ? answer.form.place : "")).find(Boolean) ?? "";
  return { request: unique.join(". ").slice(0, MAX_REQUEST), place };
}
