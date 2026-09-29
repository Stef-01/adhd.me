// Why this clinician, in their own words (founder, 2026-09-29, the North Star: "sentences shown to
// the user for why they are matched perfectly ... the key insights from the clinician interview").
// At level 1 the model writes at most two short sentences from two things only: what the person
// asked, and what the clinician has said about themselves. Nothing else reaches it, and nothing it
// writes reaches the screen unless it is short, clean under the patient-copy rules and free of the
// vocabulary's keys. The keys themselves stay on the screen as the evidence; these sentences say
// why, the way a person would.

import { createHash } from "node:crypto";
import { lintLandingCopy } from "@/compliance/landing";
import { EI_QUALITIES } from "@/demo/emotional-fit";
import type { Clinician } from "@/demo/roster";
import { professionOf } from "@/demo/roster";
import { CARE_AREA_LABELS } from "@/onboarding/types";
import { professionLabel } from "@/support/professions";
import { callJson, type Deps } from "@/lib/llm/client";

/** How many sentences, and how long each may be: two of fourteen words keep the screen under its ceiling. */
export const MAX_SENTENCES = 2;
export const MAX_WORDS = 14;

const INSTRUCTIONS = `You write why one clinician fits what a person asked, for ADHD.ME, a service in Australia that lists clinicians for ADHD care. You are given what the person asked, and what the clinician has said about themselves.

Write at most two sentences, each under ${MAX_WORDS} words, in plain Australian English, to the person ("you"). Each sentence joins one thing the person asked to one thing the clinician said, in the clinician's own words where you can. Name the clinician by their short name at most once.

Only what is given: never a fact, a quality, an outcome or a comparison the clinician did not state, and never a need the person did not state. Never rate, rank, recommend or promise. Never write "specialist", "best", "expert", "treat", "cure" or "diagnose", and never give health advice.

If nothing the clinician said answers what the person asked, return no sentences.`;

const SCHEMA = {
  name: "why_matched",
  schema: {
    type: "object",
    properties: { sentences: { type: "array", items: { type: "string" }, maxItems: MAX_SENTENCES } },
    required: ["sentences"],
    additionalProperties: false,
  },
} as const;

export const WHY_CALL = {
  effort: "low",
  instructions: INSTRUCTIONS,
  schema: SCHEMA,
  maxOutputTokens: 500,
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

export function whyInput(text: string, clinician: Clinician): string {
  return `Person asked: "${text.trim()}"\n\n${clinicianInWords(clinician)}`;
}

const words = (sentence: string) => sentence.trim().split(/\s+/).filter(Boolean).length;
const KEY = /(care|manner|pref|language):[a-z_-]+/;
const NEVER = /\b(specialist|best|expert)\b/i;

/** The sentences the screen may show: short, in bounds, clean, and never a key. */
export function keepSentences(raw: unknown): string[] {
  const list = Array.isArray(raw) ? raw : [];
  return list
    .filter((s): s is string => typeof s === "string")
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && words(s) <= MAX_WORDS && !KEY.test(s) && !NEVER.test(s) && lintLandingCopy(s).length === 0)
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

/** One paid call, or the cached answer; any failure is `none`, and the screen keeps the keys alone. */
export async function whyMatched(text: string, clinician: Clinician, deps: Deps = {}): Promise<Why> {
  const held = cachedWhy(text, clinician.id);
  if (held) return { sentences: held, source: "llm" };
  try {
    const { data } = await callJson<{ sentences?: unknown }>({ ...WHY_CALL, input: whyInput(text, clinician) }, deps);
    const sentences = keepSentences(data?.sentences);
    rememberWhy(text, clinician.id, sentences);
    return { sentences, source: "llm" };
  } catch (error) {
    return { sentences: [], source: "none", error: error instanceof Error ? `${error.name}: ${error.message}` : String(error) };
  }
}
