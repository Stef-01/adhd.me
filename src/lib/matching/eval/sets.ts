// What the matching evals run on: the reach corpus plus a few probes for shapes it lacks, split
// once by a hash of the text (60% dev, 40% holdout), each entry in one complexity class C1 to C10.

import { createHash } from "node:crypto";
import { rankingProfile, type Clinician } from "@/demo/clinicians";
import { REACH_CORPUS, type CorpusEntry } from "@/matching/corpus";
import { MATCHABLE_LANGUAGES } from "@/matching/languages";
import { needForKey } from "@/matching/needs";
import PROBE_ENTRIES from "./probes.json";

/**
 * A probe may also pin `mentions`: keys the lexicon hears that the text names without asking for
 * them (someone else's condition, a question, a refusal the lexicon misses). The lexicon keeps
 * them by construction, so they measure whether the model can overrule it.
 */
export type ProbeEntry = CorpusEntry & { mentions?: readonly string[] };

/** C6 (150+ words), C8 (instructions in the text), C10 (one word, emoji) and adversarial asks the corpus lacks. */
export const PROBES: readonly ProbeEntry[] = PROBE_ENTRIES;

export const CLASSES = ["C1", "C2", "C3", "C4", "C5", "C6", "C7", "C8", "C9", "C10"] as const;
export type ComplexityClass = (typeof CLASSES)[number];

export function splitOf(text: string): "dev" | "holdout" {
  return createHash("sha256").update(text).digest().readUInt32BE(0) / 2 ** 32 < 0.6 ? "dev" : "holdout";
}

const INSTRUCTION = /\b(ignore|disregard|system|rank)\b/i;
const NEGATION = /\b(not|no|without|don't|dont|won't)\b/i;
const PRIORITY = /\b(ideally|rather|prefer|but|fine|if (at all )?possible|matters more|later|instead)\b/i;
const LANGUAGE = new RegExp(`\\b(${[...MATCHABLE_LANGUAGES, "speaks?", "language"].join("|")})\\b`, "i");
const LOCALE = /\b(medicare|bulk|healthcare card|pension)/i;

/**
 * From the pins and the text alone, first rule wins. C4 is negation that can flip a care or access
 * key (manner asks said with "won't" are not); C10 is a request with nothing in the vocabulary to
 * read; C1 names its one facet in the facet's own words, C2 does not.
 */
export function classify(entry: CorpusEntry): ComplexityClass {
  const { text } = entry;
  const gold = [...new Set([...(entry.reaches ?? []), ...(entry.aspires ?? [])])];
  const words = text.match(/[\p{L}\p{N}']+/gu)?.length ?? 0;
  if (words <= 1) return "C10";
  if (words >= 150) return "C6";
  if (INSTRUCTION.test(text)) return "C8";
  if (NEGATION.test(text) && (entry.never?.length || gold.some((key) => !key.startsWith("manner:")))) return "C4";
  if (gold.length === 0) return LANGUAGE.test(text) ? "C9" : "C10";
  if (PRIORITY.test(text)) return "C5";
  if (entry.aspires?.length) return "C7";
  if (gold.length >= 2) return "C3";
  if (LANGUAGE.test(text) || LOCALE.test(text)) return "C9";
  const own = `${gold[0]!.split(":")[1]} ${needForKey(gold[0]!)?.label}`.toLowerCase().match(/[a-z]{4,}/g) ?? [];
  return own.some((word) => text.toLowerCase().includes(word.slice(0, 5))) ? "C1" : "C2";
}

export type EvalEntry = ProbeEntry & { split: "dev" | "holdout"; cls: ComplexityClass };

/** Every entry, in class order and then corpus order, so a run meets the classes in order. */
export function evalEntries(): EvalEntry[] {
  const all = [...REACH_CORPUS, ...PROBES].map((entry) => ({ ...entry, split: splitOf(entry.text), cls: classify(entry) }));
  return CLASSES.flatMap((cls) => all.filter((entry) => entry.cls === cls));
}

/**
 * The oracle: the tiered ranker fed gold keys, at the weights every reader's keys are ranked at
 * (`needForKey`'s). Each clinician's gain is 1 / (band + 1), a band being one tier profile in the
 * oracle's order, and 0 for a clinician who answers no gold key.
 */
export function oracleGains(gold: readonly string[], roster: readonly Clinician[]): Map<string, number> {
  const needs = gold.flatMap((key) => needForKey(key) ?? []);
  const tiers = roster.map((clinician) => {
    const p = rankingProfile(clinician, needs);
    return { id: clinician.id, answers: p.coverage > 0, tier: [p.constraintCoverage, p.constraintScore, p.scopeScore, p.careScore, p.mannerScore, p.coverage] };
  });
  const bands = [...new Set(tiers.filter((t) => t.answers).map((t) => t.tier.join()))]
    .map((joined) => joined.split(",").map(Number))
    .sort((a, b) => b.map((value, i) => value - a[i]!).find((d) => d !== 0) ?? 0);
  const band = new Map(bands.map((tier, index) => [tier.join(), index]));
  return new Map(tiers.map((t) => [t.id, t.answers ? 1 / (band.get(t.tier.join())! + 1) : 0]));
}
