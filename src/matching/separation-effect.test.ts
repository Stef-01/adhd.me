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
//
// O252: THE WHOLE CURVE MOVED, AND THE REASON IS WORTH STATING BECAUSE IT IS NOT OBVIOUS. Nothing
// in this file changed and no corpus sentence was added; nine clinicians joined the REAL roster.
// `syntheticRoster` draws each facet at the rate it is declared among real entries
// (`scale-fixture.ts`'s `rateAmongReal`), so the real roster is the distribution every synthetic
// roster at every size is sampled from — a wider, more varied real roster produces synthetic
// rosters whose declarations are spread differently at N=2 as much as at N=25. The SHAPE that
// matters is untouched: N=2's null is still exactly degenerate, every netted effect on the curve
// is still within 0.003 of zero, and the N=5 -> N=10 dip that makes the tolerance non-vacuous is
// still there (0.003 -> 0). Re-derived in the commit that earned it.
// R15: every `total` 451 -> 462 and the rates move with it: eleven perinatal sentences joined the
// corpus and a thirteenth care area joined the facet space the synthetic rosters draw from. The
// shape is as O252 left it: N=2's null exactly degenerate, every effect within 0.003 of zero, the
// N=5 -> N=10 dip still there.
// 2026-09-29: the real roster is 37 profiles (roster-network.ts), so every synthetic roster is drawn
// from new rates and the whole curve moved again. The shape holds: N=2's null exactly degenerate,
// every effect within 0.004 of zero, and a dip (N=2 -> N=3, 0 -> -0.001) that keeps the
// tolerance non-vacuous. Re-measured once more for the "new mums" sentence (462 -> 463), and
// again for O256 (463 -> 466: three continuation sentences added, three assessment reads gone),
// and for O257 (466 -> 470: four lived-experience sentences and a fifth preference; the synthetic
// roster draws gender at the real roster's rate, and seven profiles declared theirs the same day).
// O261 (2026-09-30): 471 -> 520 sentences and thirteen life-domain areas in the facet space; every rate
// moved, the shape held: N=2's null exactly degenerate, every effect within 0.005 of zero, the
// N=2 -> N=3 dip (0 -> -0.001) still there.
// O262 (2026-09-30): 520 -> 531 sentences (non-medication reads an explicit no to medication); every rate
// moved by a few thousandths and one effect by one (N=25, 0.005 -> 0.006).
  { rosterSize: 2, k: K, total: 531, observedSeparationRate: 0.286, nullMeanSeparationRate: 0.286, nullStdSeparationRate: 0, effect: 0 },
  { rosterSize: 3, k: K, total: 531, observedSeparationRate: 0.2, nullMeanSeparationRate: 0.201, nullStdSeparationRate: 0.001, effect: -0.001 },
  { rosterSize: 5, k: K, total: 531, observedSeparationRate: 0.313, nullMeanSeparationRate: 0.311, nullStdSeparationRate: 0.003, effect: 0.002 },
  { rosterSize: 10, k: K, total: 531, observedSeparationRate: 0.288, nullMeanSeparationRate: 0.286, nullStdSeparationRate: 0.002, effect: 0.002 },
  { rosterSize: 25, k: K, total: 531, observedSeparationRate: 0.266, nullMeanSeparationRate: 0.26, nullStdSeparationRate: 0.006, effect: 0.006 },
];

/*
 * O252: the real roster is eleven people, and this is the first time the metric has had anything
 * to measure. At two, the permutation null was EXACTLY degenerate — every one of the K shuffles
 * reproduced the unshuffled rate, std 0, so the effect was 0 by construction rather than by
 * finding, and the test below said so at length. At eleven the null has a real spread (0.008) and
 * the observed rate sits above its mean: effect 0.01, a little over one null standard deviation.
 * That is a small number and it is deliberately not dressed up — what it says is that the
 * roster's declarations now separate the corpus slightly better than the same declarations
 * shuffled between people, which is the smallest honest version of the claim M5 exists to test,
 * and it was not previously available at any size.
 */
// R15: 451 -> 462; the observed rate and the null's mean both rise by 0.017 and the effect holds at 0.01.
// 2026-09-29: thirty-seven profiles. The observed rate is 0.346, the null's mean 0.338 with a spread
// of 0.006, and the effect 0.008: still a little over one null standard deviation, still small,
// still measured rather than forced.
const PINNED_REAL: SeparationEffectReport = {
  rosterSize: 37,
  k: K,
  total: 531,
  // O262 (2026-09-30): 520 -> 531 sentences; 0.308/0.299/0.009 -> 0.303/0.295/0.008.
  // O261 (2026-09-30): 471 -> 520 sentences; 0.335/0.327/0.008 -> 0.308/0.299/0.009.
  // O260 (2026-09-29): 0.338/0.329/0.009 -> 0.335/0.327/0.008, the shared-care sentence reading one key.
  observedSeparationRate: 0.303,
  nullMeanSeparationRate: 0.295,
  nullStdSeparationRate: 0.006,
  effect: 0.008,
};

describe("M5 the separation effect size, over synthetic rosters", () => {
  const curve = separationEffectCurve(SIZES, corpusRun(), K);

  it("holds the measured curve exactly, in both directions", () => {
    expect(curve).toEqual(PINNED_CURVE);
  });

  it(
    "REPRODUCES THE DEFECT ON THE RAW SCALAR, using nothing but the fixture already in the tree: " +
      "shrinking the synthetic roster 40 -> 25 (zero real declaration change — `syntheticRoster` " +
      "draws every facet independently, no correlation is planted) multiplies the naive " +
      "separationRate five-fold, 0.04 -> 0.204, exactly the shape W234's real 67.4% -> 27.3% " +
      "move had when O252 grew the real roster the other way",
    () => {
      /*
       * O252 MOVED WHICH PAIR DEMONSTRATES THIS, AND THAT IS THE SHARPER VERSION OF THE POINT.
       * The demonstration used to be 3 -> 2, which more than doubled the naive rate. It does not
       * any more: at the declaration rates the eleven-person real roster now supplies, 3 -> 2
       * takes the naive rate DOWN, 0.215 -> 0.135. Nothing about the defect went away — the naive
       * scalar is still wildly sensitive to roster size with zero change in what anybody declares
       * — it is simply not monotone in size, so a fixed pair of sizes is not a fixed
       * demonstration. Both pairs are asserted: the one that shows the artefact and the one that
       * no longer does, because a reader who only saw the first would conclude that shrinking
       * always inflates the number, which is the neater and wronger story.
       */
      // 2026-09-29: redrawn from the 37-profile roster's rates. 40 -> 25 still inflates the naive
      // rate (0.154 -> 0.24), and 3 -> 2 inflates it again (0.173 -> 0.275), the direction O252
      // had seen reverse: the pair proves nothing fixed, which is the point.
      const naive = (size: number) => tieQualityReport(corpusRun(), syntheticRoster(size)).separationRate;
      expect(naive(40)).toBe(0.162); // O262: 0.165 -> 0.162. O261: 0.155 -> 0.165 over 520 sentences
      expect(naive(25)).toBe(0.266); // O262: 0.269 -> 0.266 over 531 sentences
      expect(naive(25)).toBeGreaterThan(naive(40));
      expect(naive(3)).toBe(0.2); // O262
      expect(naive(2)).toBe(0.286); // O262
      expect(naive(2)).toBeGreaterThan(naive(3));
    },
  );

  it(
    "AND THE EFFECT SIZE DOES NOT: netted against a permuted null computed at the SAME size, " +
      "every point on the curve sits within 0.003 of zero while the raw scalar it is computed " +
      "from swings between 0.04 and 0.224 across the same sizes — N=2's null is exactly " +
      "degenerate (effect exactly 0) and N=3's own effect is 0.001, two orders below the naive " +
      "swing this metric was built to see through",
    () => {
      const size3 = curve.find((point) => point.rosterSize === 3)!;
      const size2 = curve.find((point) => point.rosterSize === 2)!;
      expect(size3.effect).toBe(-0.001); // 2026-09-29: 0.001 -> -0.001, one null standard deviation below zero
      expect(size2.effect).toBe(0);
      // O252: stated over the whole curve rather than one pair, now that the pair that
      // demonstrates the raw artefact has moved once and may move again.
      for (const point of curve) expect(Math.abs(point.effect)).toBeLessThan(0.01);
    },
  );

  it("is monotonic non-decreasing in roster size within the null's own noise floor", () => {
    expect(isMonotonicNonDecreasing(curve)).toBe(true);
  });

  it(
    "NON-VACUOUS, FIRST WAY: the tolerance is doing real work, not passing by construction. " +
      "This exact measured curve dips 0.001 from N=2 to N=3 (a single synthetic roster's own " +
      "sampling noise, not a defect) — a ZERO-tolerance check on this SAME curve fails, so the " +
      "default's `true` above is the tolerance correctly absorbing named noise, not a check that " +
      "cannot fail",
    () => {
      const size2 = curve.find((point) => point.rosterSize === 2)!;
      const size3 = curve.find((point) => point.rosterSize === 3)!;
      expect(size3.effect).toBeLessThan(size2.effect);
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
    // O252: N=3's std moved 0.001 -> 0.002 with the redrawn fixture. Still thin, still asserted
    // at its measured value rather than widened to "roughly zero".
    const size2 = curve.find((point) => point.rosterSize === 2)!;
    const size3 = curve.find((point) => point.rosterSize === 3)!;
    expect(size2.nullStdSeparationRate).toBe(0);
    expect(size3.nullStdSeparationRate).toBe(0.001); // 2026-09-29: 0.002 -> 0.001 from the redrawn rates
  });
});

describe("M5 the real roster's own effect (37 real profiles)", () => {
  it("holds the measured baseline exactly", () => {
    expect(realRosterSeparationEffect(K)).toEqual(PINNED_REAL);
  });

  it(
    "reads as: the metric has stopped being degenerate. At two clinicians a permutation of the " +
      "roster's declarations could not un-separate anything — exactly one of two people holds a " +
      "facet either way — so the null had std 0 and the effect was 0 by construction, which the " +
      "old version of this test spent a paragraph explaining was not the same as 'the " +
      "declarations are worthless'. At eleven the shuffles genuinely disagree (std 0.008) and " +
      "the real arrangement beats their mean by 0.01, a little over one standard deviation: " +
      "small, real, and for the first time actually measured rather than forced",
    () => {
      const report = realRosterSeparationEffect(K);
      expect(report.effect).toBe(0.008); // O262 (2026-09-30): 0.009 -> 0.008. O261 (2026-09-30): 0.008 -> 0.009. O260 (2026-09-29): 0.009 -> 0.008. 2026-09-29: 0.01 -> 0.008 on the 37-profile roster
      expect(report.nullStdSeparationRate).toBeGreaterThan(0);
      expect(report.observedSeparationRate).toBeGreaterThan(report.nullMeanSeparationRate);
    },
  );

  it("is deterministic: two independent calls at the same k and seed agree exactly", () => {
    expect(realRosterSeparationEffect(K)).toEqual(separationEffect(corpusRun(), clinicians, K, "M5-real"));
  });
});
