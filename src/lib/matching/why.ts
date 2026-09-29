// Why this clinician, in their own words (founder, 2026-09-29, the North Star: "sentences shown to
// the user for why they are matched perfectly ... the key insights from the clinician interview").
// One sentence under "Why matched" at level 1: "You asked for …; <name> says …". The finder writes
// the first half itself, from the strongest ask this clinician answers, so it is never wrong; the
// model writes only the second half, in at most twelve words, from what the clinician has said
// about themselves, and nothing it writes reaches the screen unless it is short, free of any rank,
// promise or verdict, and free of the vocabulary's keys. (Asked for the whole sentence, gpt-5-mini
// wrote 25 to 32 words whatever number the instruction named, 2026-09-29.)

import { createHash } from "node:crypto";
import { clinicians as roster, labelInSentence, matchEvidence } from "@/demo/clinicians";
import { EI_QUALITIES } from "@/demo/emotional-fit";
import type { Clinician } from "@/demo/roster";
import { professionOf } from "@/demo/roster";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import type { NeedSignal } from "@/matching/needs";
import { professionLabel } from "@/support/professions";
import { callJson, type Deps } from "@/lib/llm/client";

/** The clinician's half of the sentence, at most this many words; the whole sentence, at most MAX_WORDS. */
export const MAX_CLAUSE_WORDS = 12;
export const MAX_WORDS = 26;

const INSTRUCTIONS = `You finish one sentence about a clinician, for ADHD.ME, a service in Australia that lists clinicians for ADHD care. You are given what a person asked, what the clinician says about themselves, and the one thing the person asked that the clinician's listing answers.

The sentence begins "You asked for <that thing>; <clinician> says". Return only the words that follow "says", beginning with "he", "she" or "they": what the clinician says about exactly that thing, in their own words, in plain Australian English, in at most ${MAX_CLAUSE_WORDS} words. For example: "he books a longer first appointment and takes time with you", or "she works with pregnancy, postpartum and new parents".

Only what is given: never a fact, quality, outcome or comparison the clinician did not state, never a question, never the clinician's name. Never rate, rank, recommend or promise. Never write "specialist", "best", "expert", "treat", "cure" or "diagnose", and never give health advice.`;

const SCHEMA = {
  name: "why_matched",
  schema: { type: "object", properties: { says: { type: "string" } }, required: ["says"], additionalProperties: false },
} as const;

/** gpt-5-mini: nano paired asks with the wrong words (2026-09-29, "bulk billed" answered by "mixed billing"). */
export const WHY_MODEL = "gpt-5-mini";

export const WHY_CALL = {
  model: WHY_MODEL,
  // Minimal reasoning: a clause needs none, and at "low" the reasoning spent the whole output budget (2026-09-29, four of four incomplete).
  effort: "minimal",
  instructions: INSTRUCTIONS,
  schema: SCHEMA,
  maxOutputTokens: 600,
  cacheKey: "adhdme-l1-why",
  cacheRetention: "24h",
} as const;

const careLabel = (id: string) => CARE_AREA_LABELS.find((row) => row.id === id)?.label ?? id;

/** What the clinician has said about themselves, as the model reads it: their listing, and nothing inferred. */
export function clinicianInWords(clinician: Clinician): string {
  const lines = [
    `Clinician: ${clinician.name} (${clinician.shortName}), ${professionLabel(professionOf(clinician))}, ${clinician.suburb}.`,
    `Focus: ${clinician.focus}`,
    `About: ${clinician.summary} ${clinician.about}`.trim(),
    clinician.experience.length ? `Experience: ${clinician.experience.join("; ")}.` : "",
    clinician.fitSignals.length ? `They say: ${clinician.fitSignals.join("; ")}.` : "",
    clinician.careAreas.length ? `They list care for: ${clinician.careAreas.map(careLabel).join("; ")}.` : "",
    clinician.careAreasSometimes?.length ? `Sometimes: ${clinician.careAreasSometimes.map(careLabel).join("; ")}.` : "",
    clinician.manner.length ? `How they work, in their words: ${clinician.manner.map((trait) => EI_QUALITIES[trait].label).join("; ")}.` : "",
    `Languages: ${clinician.languages.join(", ")}. Telehealth for a first appointment: ${clinician.telehealthFirstAppointment ? "yes" : "not stated"}. Appointments: ${clinician.appointmentLength}. ${clinician.practicalSignals.join("; ")}. Reach: ${clinician.reach}.`,
  ];
  return lines.filter(Boolean).join("\n");
}

/** The ask, as the sentence says it: a manner as someone who does it, a language as someone who speaks it. */
export function askedFor(need: NeedSignal): string {
  const facet = need.facet;
  if (facet.kind === "manner") return `someone who ${EI_QUALITIES[facet.trait].matchLine}`;
  if (facet.kind === "language") return `someone who speaks ${facet.language}`;
  return labelInSentence(need);
}

export function whyInput(text: string, clinician: Clinician, asked: string): string {
  return `Person asked: "${text.trim()}"\n\n${clinicianInWords(clinician)}\n\nThe thing they asked that this listing answers: ${asked}.\nFinish: "You asked for ${asked}; ${clinician.shortName} says"`;
}

const words = (sentence: string) => sentence.trim().split(/\s+/).filter(Boolean).length;
const KEY = /(care|manner|pref|language):[a-z_-]+/;
/** What the finder's own voice never says of a clinician, whatever the model wrote: a rank, a promise, a verdict. */
const NEVER = /\b(specialist|best|expert|top|recommend\w*|guarantee\w*|promise\w*|cure\w*|diagnose|diagnoses|diagnosing|success\w*|improve\w*|outcome\w*)\b/i;
const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** The clinician's half as the screen may show it: short, clean, never a key, without a name or "says" the model repeated. */
export function keepClause(raw: unknown, clinician: Pick<Clinician, "shortName" | "name">): string | null {
  if (typeof raw !== "string") return null;
  let clause = raw.trim().replace(/^["“”']+|["“”'.]+$/g, "").trim();
  for (const lead of [clinician.name, clinician.shortName]) clause = clause.replace(new RegExp(`^${escape(lead)}\\s+`, "i"), "");
  clause = clause.replace(/^says\s+/i, "").trim();
  if (!clause || words(clause) > MAX_CLAUSE_WORDS || KEY.test(clause) || NEVER.test(clause)) return null;
  return clause;
}

/** The whole sentence, or nothing where the two halves together would not fit the screen. */
export function whySentence(asked: string, clinician: Pick<Clinician, "shortName">, clause: string): string | null {
  const sentence = `You asked for ${asked}; ${clinician.shortName} says ${clause}.`;
  return words(sentence) <= MAX_WORDS && !KEY.test(sentence) ? sentence : null;
}

export type Why = { sentences: string[]; source: "llm" | "none"; error?: string };

/** Remembered per (words, clinician) on this instance, under a hash, for a day; at most MAX. */
const MAX = 500;
const TTL_MS = 24 * 60 * 60 * 1000;
const holder = globalThis as { __adhdMeWhyCache?: Map<string, { sentences: string[]; at: number }> };
const cache = () => (holder.__adhdMeWhyCache ??= new Map());
const keyOf = (text: string, clinicianId: string) =>
  createHash("sha256").update(`${clinicianId}\n${text.trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!]+$/, "")}`).digest("hex");

export function cachedWhy(text: string, clinicianId: string, now = Date.now()): string[] | null {
  const held = cache().get(keyOf(text, clinicianId));
  if (!held) return null;
  if (now - held.at > TTL_MS) {
    cache().delete(keyOf(text, clinicianId));
    return null;
  }
  return held.sentences;
}

export function rememberWhy(text: string, clinicianId: string, sentences: readonly string[], now = Date.now()): void {
  const map = cache();
  const key = keyOf(text, clinicianId);
  map.delete(key);
  map.set(key, { sentences: [...sentences], at: now });
  if (map.size > MAX) map.delete(map.keys().next().value!);
}

/** Registered in src/lib/stores.ts, so a reset of every store clears it too. */
export function resetWhyCache(): void {
  cache().clear();
}

/**
 * One paid call, or the cached answer; any failure is `none`, and the screen keeps the keys alone.
 * The sentence rests on the finder's own strongest evidence: where the listing answers no key the
 * person asked, there is nothing to say and no call is made.
 */
export async function whyMatched(text: string, clinician: Clinician, deps: Deps = {}): Promise<Why> {
  const [strongest] = matchEvidence(clinician, text, roster);
  if (!strongest) return { sentences: [], source: "none" };
  const held = cachedWhy(text, clinician.id);
  if (held) return { sentences: held, source: "llm" };
  const asked = askedFor(strongest);
  try {
    const { data } = await callJson<{ says?: unknown }>({ ...WHY_CALL, input: whyInput(text, clinician, asked) }, deps);
    const clause = keepClause(data?.says, clinician);
    const sentence = clause ? whySentence(asked, clinician, clause) : null;
    const sentences = sentence ? [sentence] : [];
    // An empty answer is not remembered: the next tap may draw a clause that fits.
    if (sentences.length) rememberWhy(text, clinician.id, sentences);
    return { sentences, source: "llm" };
  } catch (error) {
    return { sentences: [], source: "none", error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}
