// M5 (F7) verify gate: the effect-size metric, measured against a permuted null, PROVEN to
// resist the exact defect it replaces rather than merely trusted to.
//
// THE NUMBERS BELOW ARE MEASURED, 2026-08-24 (re-measured by M9 — the tiered comparator changes
// how ties resolve at N=3 and N=5, moving the pin exactly where the ranking semantics changed and
// nowhere else; N=2, N=10, N=25 and the real roster are untouched), k=50 shuffles, the full
// 447-sentence reaching corpus (`corpusRun()`), against `syntheticRoster`'s deterministic draw.
// Move them ONLY with a re-measured run in the commit that moves them, same law as
// `tie-quality.test.ts`'s own pin.
import { describe, expect, it } from "vitest";
import { clinicians } from "@/demo/clinicians";
import { corpusRun, tieQualityReport } from "./tie-quality";
import { syntheticRoster } from "./scale-fixture";
import {
  isMonotonicNonDecreasing,
  realRosterSeparationEffect,
  separationEffect,
  type SeparationEffectReport,
} from "./separation-effect";

const SIZES = [2, 3, 5, 10, 25] as const;
const K = 50;

/**
 * The curve M5 asks for: the same corpus against synthetic rosters of increasing size. Built
 * HERE rather than in `separation-effect.ts` because `scale-fixture.ts`'s own hard law
 * (`scale-fixture.test.ts`) is that no non-test module under `app/` or `src/` may import it —
 * a synthetic clinician must never be one import away from a patient screen. Test files may.
 */
function separationEffectCurve(sizes: readonly number[], sentences: readonly string[], k: number): SeparationEffectReport[] {
  return sizes.map((size) => separationEffect(sentences, syntheticRoster(size), k));
}

const PINNED_CURVE: SeparationEffectReport[] = [
// O210: every `total` below moves 448 -> 451 and three rates move with it, because that unit added
// three corpus sentences (one per cue it closed: "with patience", "hears me out", "hear me out").
// The SHAPE is untouched — N=2's null is still exactly degenerate, N=3's effect is still -0.001, the
// N=5 -> N=10 dip is still 0.011 — which is the point of re-pinning rather than relaxing: the metric
// is supposed to move when the corpus grows and to keep its shape when nothing about the model
// changed. Re-derived in the commit that earned it.
  { rosterSize: 2, k: K, total: 451, observedSeparationRate: 0.348, nullMeanSeparationRate: 0.348, nullStdSeparationRate: 0, effect: 0 },
  { rosterSize: 3, k: K, total: 451, observedSeparationRate: 0.135, nullMeanSeparationRate: 0.136, nullStdSeparationRate: 0.001, effect: -0.001 },
  { rosterSize: 5, k: K, total: 451, observedSeparationRate: 0.146, nullMeanSeparationRate: 0.141, nullStdSeparationRate: 0.005, effect: 0.005 },
  { rosterSize: 10, k: K, total: 451, observedSeparationRate: 0.004, nullMeanSeparationRate: 0.015, nullStdSeparationRate: 0.006, effect: -0.011 },
  { rosterSize: 25, k: K, total: 451, observedSeparationRate: 0.002, nullMeanSeparationRate: 0.004, nullStdSeparationRate: 0.003, effect: -0.002 },
];

const PINNED_REAL: SeparationEffectReport = {
  rosterSize: 2,
  k: K,
  total: 451, // O210
  observedSeparationRate: 0.674,
  nullMeanSeparationRate: 0.674,
  nullStdSeparationRate: 0,
  effect: 0,
};

describe("M5 the separation effect size, over synthetic rosters", () => {
  const curve = separationEffectCurve(SIZES, corpusRun(), K);

  it("holds the measured curve exactly, in both directions", () => {
    expect(curve).toEqual(PINNED_CURVE);
  });

  it(
    "REPRODUCES THE DEFECT ON THE RAW SCALAR, using nothing but the fixture already in the tree: " +
      "shrinking the synthetic roster 3 -> 2 (zero real declaration change — `syntheticRoster` " +
      "draws every facet independently, no correlation is planted) more than doubles the naive " +
      "separationRate, 0.134 -> 0.344, exactly the shape W234/M3's real 62.2% -> 67.1% jump had " +
      "when Dr Yadav's departure shrank the real roster the same way",
    () => {
      const naive3 = tieQualityReport(corpusRun(), syntheticRoster(3)).separationRate;
      const naive2 = tieQualityReport(corpusRun(), syntheticRoster(2)).separationRate;
      expect(naive3).toBe(0.135); // O210: +3 corpus sentences
      expect(naive2).toBe(0.348); // O210
      expect(naive2).toBeGreaterThan(naive3);
    },
  );

  it(
    "AND THE EFFECT SIZE MOSTLY DOES NOT: netted against a permuted null computed at the SAME " +
      "size, the same 3 -> 2 shrink shows the naive jump was almost entirely the size artefact " +
      "this metric exists to remove — N=2's null is exactly degenerate (effect exactly 0) and " +
      "N=3's own effect is -0.001, an order of magnitude below the 0.206 naive jump this metric " +
      "was built to see through, not a revival of the size artefact it removes",
    () => {
      const size3 = curve.find((point) => point.rosterSize === 3)!;
      const size2 = curve.find((point) => point.rosterSize === 2)!;
      expect(size3.effect).toBe(-0.001);
      expect(size2.effect).toBe(0);
      expect(Math.abs(size3.effect)).toBeLessThan(0.01);
    },
  );

  it("is monotonic non-decreasing in roster size within the null's own noise floor", () => {
    expect(isMonotonicNonDecreasing(curve)).toBe(true);
  });

  it(
    "NON-VACUOUS, FIRST WAY: the tolerance is doing real work, not passing by construction. " +
      "This exact measured curve dips 0.011 from N=5 to N=10 (a single synthetic roster's own " +
      "sampling noise, not a defect) — a ZERO-tolerance check on this SAME curve fails, so the " +
      "default's `true` above is the tolerance correctly absorbing named noise, not a check that " +
      "cannot fail",
    () => {
      const size5 = curve.find((point) => point.rosterSize === 5)!;
      const size10 = curve.find((point) => point.rosterSize === 10)!;
      expect(size10.effect).toBeLessThan(size5.effect);
      expect(isMonotonicNonDecreasing(curve, 0)).toBe(false);
    },
  );

  it(
    "NON-VACUOUS, SECOND WAY: a real disqualifying regression — a drop far larger than any " +
      "measured null std — still fails at the default tolerance. Mutates ONE point of the real " +
      "curve to reproduce the raw scalar's own magnitude of jump (naive 0.134 -> 0.344, i.e. a " +
      "drop of 0.208 if read in the shrinking direction) and confirms the checker catches it",
    () => {
      const mutated = curve.map((point, index) => (index === 3 ? { ...point, effect: point.effect - 0.208 } : point));
      expect(isMonotonicNonDecreasing(mutated)).toBe(false);
    },
  );

  it("reports the named weakness rather than hiding it: the null is degenerate at N=2, and thin at N=3", () => {
    // At N=2 every one of the K shuffles reproduced the SAME separationRate as the unshuffled
    // roster (std 0) — the permutation space is genuinely this thin, not a bug that happens to
    // look clean. M9's tiered comparator (care and manner compared as separate steps rather than
    // summed) resolves a handful of the corpus's N=3 ties differently across shuffles that used
    // to land identically, so N=3 is no longer perfectly degenerate — its std moved from exactly
    // 0 to 0.001, still small enough to change nothing this metric concludes, and asserted at its
    // new value rather than re-widened to "roughly zero" so a further drift is still visible.
    const size2 = curve.find((point) => point.rosterSize === 2)!;
    const size3 = curve.find((point) => point.rosterSize === 3)!;
    expect(size2.nullStdSeparationRate).toBe(0);
    expect(size3.nullStdSeparationRate).toBe(0.001);
  });
});

describe("M5 the real roster's own effect (post-O179, two clinicians)", () => {
  it("holds the measured baseline exactly", () => {
    expect(realRosterSeparationEffect(K)).toEqual(PINNED_REAL);
  });

  it(
    "reads as: the M3 declaration (F6) separates through a SINGLE dimension (manner), which a " +
      "permutation of that same dimension cannot un-separate at N=2 — exactly one of two people " +
      "holds it either way — so this permutation test correctly reports zero EXTRA, cross-" +
      "dimension synergy beyond what a single true fact already earns. It is not saying the " +
      "declaration is worthless; it is saying this specific test measures a different thing " +
      "(compound cross-dimension correlation) than M3 supplied, and says so rather than " +
      "reporting a number that would be read as disagreeing with M3",
    () => {
      expect(realRosterSeparationEffect(K).effect).toBe(0);
    },
  );

  it("is deterministic: two independent calls at the same k and seed agree exactly", () => {
    expect(realRosterSeparationEffect(K)).toEqual(separationEffect(corpusRun(), clinicians, K, "M5-real"));
  });
});
