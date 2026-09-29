// Why this clinician, in their own words (founder, 2026-09-29, the North Star: "sentences shown to
// the user for why they are matched perfectly ... the key insights from the clinician interview").
// At level 1 the model writes one short sentence from two things only: what the person asked,
// and what the clinician has said about themselves, about the matches the finder itself found. Nothing else reaches it, and nothing it
// writes reaches the screen unless it is short, free of any rank, promise or verdict, and free of
// the vocabulary's keys. The keys themselves stay on the screen as the evidence; these sentences say
// why, the way a person would.

import { createHash } from "node:crypto";
import { EI_QUALITIES } from "@/demo/emotional-fit";
import type { Clinician } from "@/demo/roster";
import { professionOf } from "@/demo/roster";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import { professionLabel } from "@/support/professions";
import { callJson, type Deps } from "@/lib/llm/client";
import { matchEvidence } from "@/demo/clinicians";

/**
 * One sentence of at most 26 words: what gpt-5-mini writes to a worked example (24 to 28 on the
 * live site, whatever number the instruction names), and the most the screen holds under its
 * ceiling with nothing else added beneath it.
 */
export const MAX_SENTENCES = 1;
export const MAX_WORDS = 26;

const INSTRUCTIONS = `You write why one clinician fits what a person asked, for ADHD.ME, a service in Australia that lists clinicians for ADHD care. You are given what the person asked, what the clinician says about themselves, and the matches the finder found between the two.

Write one sentence, addressed to the person, of at most ${MAX_WORDS - 2} words, in plain Australian English: the one or two things they asked that this clinician answers, in a few words each, then what the clinician says about exactly those, in the clinician's own words. Shape: "You asked for …; <short name> says …". Never repeat their whole request, never a question, and never more than two things the clinician says. The length to write: "You asked for Hindi and not to be rushed; Dr Saxena says he speaks Hindi and takes time with you."

Only what is given: never a fact, quality, outcome or comparison the clinician did not state, never a need the person did not state, and never a question. Never rate, rank, recommend or promise. Never write "specialist", "best", "expert", "treat", "cure" or "diagnose", and never give health advice.`;

const SCHEMA = {
  name: "why_matched",
  schema: {
    type: "object",
    properties: { sentences: { type: "array", items: { type: "string" }, maxItems: 2 } },
    required: ["sentences"],
    additionalProperties: false,
  },
} as const;

/** gpt-5-mini: nano paired asks with the wrong words (2026-09-29, "bulk billed" answered by "mixed billing"); mini writes to the matches given. */
export const WHY_MODEL = "gpt-5-mini";

export const WHY_CALL = {
  model: WHY_MODEL,
  // Minimal reasoning: one sentence needs none, and at "low" the reasoning spent the whole output budget (2026-09-29, four of four incomplete).
  effort: "minimal",
  instructions: INSTRUCTIONS,
  schema: SCHEMA,
  maxOutputTokens: 900,
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

export function whyInput(text: string, clinician: Clinician, matched: readonly string[]): string {
  return `Person asked: "${text.trim()}"\n\n${clinicianInWords(clinician)}\n\nThe finder matched: ${matched.join("; ")}.`;
}

const words = (sentence: string) => sentence.trim().split(/\s+/).filter(Boolean).length;
const KEY = /(care|manner|pref|language):[a-z_-]+/;
/** What the finder's own voice never says of a clinician, whatever the model wrote: a rank, a promise, a verdict. */
const NEVER = /\b(specialist|best|expert|top|recommend\w*|guarantee\w*|promise\w*|cure\w*|diagnose|diagnoses|diagnosing|success\w*|improve\w*|outcome\w*)\b/i;

/** The sentence the screen may show: the first that is in bounds, clean, and never a key (a pair written as one item is split). */
export function keepSentences(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((s): s is string => typeof s === "string")
    .flatMap((s) => s.split(/(?<=[.!?])\s+(?=[A-Z"\u201c])/))
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && words(s) <= MAX_WORDS && !KEY.test(s) && !NEVER.test(s))
    .slice(0, MAX_SENTENCES);
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
 * The model writes about the finder's own evidence and nothing else: where the listing answers no
 * key the person asked, there is nothing to write and no call is made.
 */
export async function whyMatched(text: string, clinician: Clinician, deps: Deps = {}): Promise<Why> {
  const matched = matchEvidence(clinician, text).map((need) => need.label);
  if (matched.length === 0) return { sentences: [], source: "none" };
  const held = cachedWhy(text, clinician.id);
  if (held) return { sentences: held, source: "llm" };
  try {
    const { data } = await callJson<{ sentences?: unknown }>({ ...WHY_CALL, input: whyInput(text, clinician, matched.slice(0, 2)) }, deps);
    const sentences = keepSentences(data?.sentences);
    rememberWhy(text, clinician.id, sentences);
    return { sentences, source: "llm" };
  } catch (error) {
    return { sentences: [], source: "none", error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}
