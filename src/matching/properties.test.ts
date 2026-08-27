// W232 (O54) verify gate: the pipeline's invariants, asserted for ALL inputs (year plan Q2
// item 5). The O-units pinned these by example; fast-check asserts them over generated input.
//
// THE GENERATOR IS THE POINT. Sentences are composed from the lexicon's own vocabulary plus
// the fillers, negators and punctuation that the O40 (negation), O45 (collapse) and O53
// (tight-negator) rules live among — so every run walks the exact seams those rules cut.
// A second generator produces raw string soup, because totality ("arbitrary garbage never
// throws, and reads as nothing rather than something") is its own invariant.
//
// SEEDED, SO A FAILURE IS AN ARTIFACT, NOT AN ANECDOTE: fast-check prints the seed and the
// shrunk counterexample; re-running with that seed reproduces it exactly. The fixed seed
// below keeps CI deterministic — change it deliberately, never to make a failure go away.

import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import fc from "fast-check";
import {
  clinicians,
  matchEvidence,
  matchQuality,
  needsFor,
  rankBands,
  rankClinicians,
  roundScore,
  scoreAgainst,
  type Clinician,
} from "@/demo/clinicians";
import { facetKey, LEXICON_CUES, readNeeds } from "./needs";
import { MAX_RAW_TOKENS, MAX_READ_TOKENS, tokenise, tokeniseKeepingStopwords } from "./read";
import type { CareArea } from "@/demo/care-archetypes";

const SEED = 20260819;

/** Words the lexicon knows, split back out of its own phrases. */
const CUE_WORDS = [...new Set(LEXICON_CUES.flatMap((cue) => cue.phrase.split(/\s+/)))];

/** The connective tissue of real requests — where the negation and collapse rules operate. */
const FILLERS = [
  "please", "really", "honestly", "somewhere", "someone", "a", "the", "my", "for", "and",
  "i", "want", "need", "don't", "not", "no", "never", "without", "just", "but", "maybe",
  ".", ",", "?", "gp", "doctor", "appointment", "today",
];

const sentence = fc
  .array(fc.constantFrom(...CUE_WORDS, ...FILLERS), { minLength: 1, maxLength: 18 })
  .map((words) => words.join(" "));

const soup = fc.string({ maxLength: 300 });

const rosterPermutation = fc.shuffledSubarray([...clinicians], {
  minLength: clinicians.length,
  maxLength: clinicians.length,
});

const bandShape = (query: string, roster: readonly Clinician[]) =>
  rankBands(query, roster).map((band) => ({
    score: band.score,
    ids: [...band.clinicians.map((c) => c.id)].sort(),
  }));

describe("W232 the invariants, for all inputs", () => {
  it("determinism: the same text yields the same signals and the same order, every time", () => {
    fc.assert(
      fc.property(fc.oneof(sentence, soup), (text) => {
        const first = readNeeds(text).map((n) => `${facetKey(n.facet)}:${n.weight}`);
        const second = readNeeds(text).map((n) => `${facetKey(n.facet)}:${n.weight}`);
        expect(second).toEqual(first);
        expect(rankClinicians(text).map((c) => c.id)).toEqual(rankClinicians(text).map((c) => c.id));
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it("totality: arbitrary garbage never throws, and quality never claims an unearned order", () => {
    fc.assert(
      fc.property(soup, (text) => {
        const signals = readNeeds(text);
        const quality = matchQuality(text);
        // Nothing read means no claim of an informed order — the honesty invariant W221 pinned
        // by example, held for every string this generator can produce.
        if (signals.length === 0) expect(quality).not.toBe("informed");
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it("roster permutation-invariance: shuffling the roster never changes the band structure", () => {
    // BAND level on purpose: within a tied band the row order is explicitly not a ranking
    // (the tie is said out loud on the surface), so asserting row order across permutations
    // would pin the one thing the product refuses to claim.
    fc.assert(
      fc.property(sentence, rosterPermutation, (text, roster) => {
        expect(bandShape(text, roster)).toEqual(bandShape(text, clinicians));
      }),
      { seed: SEED, numRuns: 150 },
    );
  });

  it("monotonicity: adding a declared care area never lowers that clinician", () => {
    const areas: readonly CareArea[] = ["titration", "anxiety", "trauma-informed", "substance-history", "non-medication"];
    fc.assert(
      fc.property(
        sentence,
        fc.constantFrom(...clinicians.map((c) => c.id)),
        fc.constantFrom(...areas),
        (text, id, area) => {
          const base = clinicians.find((c) => c.id === id)!;
          fc.pre(!base.careAreas.includes(area) && !(base.careAreasSometimes ?? []).includes(area));
          const widened: Clinician = { ...base, careAreas: [...base.careAreas, area] };
          const roster = clinicians.map((c) => (c.id === id ? widened : c));
          const before = scoreAgainst(base, needsFor(text, clinicians));
          const after = scoreAgainst(widened, needsFor(text, roster));
          // Rarity discounts reweigh the ADDED facet (it just became more common), but they
          // cannot reach below zero and the clinician's other facets are untouched — so the
          // declaration can only help or do nothing. This is the property that makes honest
          // declaration safe for a GP: saying more about yourself never buries you.
          expect(after).toBeGreaterThanOrEqual(before);
        },
      ),
      { seed: SEED, numRuns: 150 },
    );
  });

  it("rounding stability: a score IS the sum of its own printed evidence (the W213 unity)", () => {
    fc.assert(
      fc.property(sentence, (text) => {
        for (const clinician of eachOf(clinicians, "the roster")) {
          const evidence = matchEvidence(clinician, text, clinicians);
          expect(scoreAgainst(clinician, needsFor(text, clinicians))).toBe(
            roundScore(evidence.reduce((sum, need) => sum + need.weight, 0)),
          );
        }
      }),
      { seed: SEED, numRuns: 200 },
    );
  });

  it("band coherence: bands partition the ranking, equal within, strictly descending across", () => {
    // M9: bands are no longer ordered by raw `score` alone (two bands can now share a total
    // while differing in the care/manner split that decided their order — that split IS the
    // fix). The tier vector `rankClinicians` actually sorts on — constraintCoverage,
    // constraintScore, careScore, mannerScore, coverage — is what must be strictly descending
    // across band boundaries; `score` (the sum) is asserted equal WITHIN a band only.
    const tierVector = (band: { constraintCoverage: number; constraintScore: number; careScore: number; mannerScore: number; coverage: number }) =>
      [band.constraintCoverage, band.constraintScore, band.careScore, band.mannerScore, band.coverage] as const;
    fc.assert(
      fc.property(sentence, (text) => {
        const bands = rankBands(text, clinicians);
        const needs = needsFor(text, clinicians);
        const flattened = bands.flatMap((band) => band.clinicians.map((c) => c.id));
        expect(flattened.sort()).toEqual(rankClinicians(text, clinicians).map((c) => c.id).sort());
        for (const band of bands) {
          for (const clinician of band.clinicians) {
            expect(scoreAgainst(clinician, needs)).toBe(band.score);
          }
        }
        for (let i = 1; i < bands.length; i++) {
          const current = tierVector(bands[i]!);
          const previous = tierVector(bands[i - 1]!);
          const firstDifference = current.findIndex((value, index) => value !== previous[index]);
          expect(firstDifference).toBeGreaterThanOrEqual(0);
          expect(current[firstDifference]!).toBeLessThan(previous[firstDifference]!);
        }
      }),
      { seed: SEED, numRuns: 200 },
    );
  });
});

/**
 * O55 (Q2 item 6): the reader fuzzed the way the plan lists it — token soups, emoji, mixed
 * scripts, essays — and the budget that makes the worst case a constant.
 */
describe("O55 the reader under abuse, within its budget", () => {
  const emojiSoup = fc
    .array(
      fc.oneof(
        fc.constantFrom(...CUE_WORDS),
        fc.constantFrom("😅", "🧠", "💊", "‽", "مرحبا", "你好", "नमस्ते", "🙃🙃🙃", "Ω≈ç√"),
        fc.string({ maxLength: 12 }),
      ),
      { minLength: 0, maxLength: 60 },
    )
    .map((parts) => parts.join(" "));

  it("emoji, mixed scripts and unicode junk never throw and stay deterministic", () => {
    fc.assert(
      fc.property(emojiSoup, (text) => {
        const first = readNeeds(text).map((n) => facetKey(n.facet));
        expect(readNeeds(text).map((n) => facetKey(n.facet))).toEqual(first);
        expect(() => rankBands(text, clinicians)).not.toThrow();
      }),
      { seed: SEED, numRuns: 300 },
    );
  });

  it("the budget holds for every input: token streams never exceed their caps", () => {
    fc.assert(
      fc.property(fc.oneof(sentence, soup, emojiSoup), fc.nat({ max: 30 }), (text, repeats) => {
        const monster = `${text} `.repeat(repeats + 1);
        expect(tokenise(monster).length).toBeLessThanOrEqual(MAX_READ_TOKENS);
        expect(tokeniseKeepingStopwords(monster).length).toBeLessThanOrEqual(MAX_RAW_TOKENS);
      }),
      { seed: SEED, numRuns: 150 },
    );
  });

  it("a ten-thousand-word essay completes inside a human moment, not proportional to its size", () => {
    // A generous single-case wall-clock bound rather than a per-run micro budget: CI machines
    // vary, but "under two seconds for the absurd case" holds by orders of magnitude once the
    // cap makes the read a constant — before the cap this input was the stall risk itself.
    const essay = "and then another thing happened to me that day which ".repeat(1200);
    const started = performance.now();
    readNeeds(essay);
    rankBands(essay, clinicians);
    expect(performance.now() - started).toBeLessThan(2000);
  });
});
