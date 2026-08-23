// M5 (F7, Q-M Phase 2): a roster-size-invariant separation metric.
//
// THE DEFECT THIS REPLACES. `tieQualityReport`'s `separationRate` (W234) rose 62.2% -> 67.1%
// (`tie-quality.test.ts`'s M3 note) purely because Dr Yadav's departure (O179) shrank the roster
// from three to two, and `partialTie` became structurally impossible at N=2 — nobody's
// declarations changed, and the scalar moved anyway. A KPI that rises when the roster shrinks
// cannot tell "the reader is heard better" from "there are fewer people left to tie with".
//
// THE FIX: an effect size against a permuted null, not a bigger formula. For K shuffles, the
// SAME roster has every declaration DIMENSION (gender, telehealth, bulk billing, languages,
// manner, the care-area pair) independently reassigned across its N clinicians — so a
// clinician's manner set, say, lands on a different roster slot each shuffle, while the set
// itself and every other dimension's own shape survive untouched. Because each dimension is
// permuted as a block, every dimension's own marginal rate is exactly preserved (reshuffling
// changes WHO has what, never HOW MANY have it, and any roster-wide aggregate — rarity's
// `declaredMass` sum included — is therefore identical before and after); what the shuffle
// destroys is the CROSS-dimension correlation a compound query's score depends on, i.e. one
// clinician happening to declare both X and Y together, which is what let them stand alone at
// the top. `separationRate` computed against that shuffled roster is what chance alone would
// produce at this exact roster size and these exact declaration rates; the real roster's own
// rate minus the mean of K such shuffles is the effect the declarations earned, net of the
// roster-size artefact the raw scalar could not separate out.
//
// NAMED WEAKNESS, NOT HIDDEN. At N=2 there is only one non-identity ordering per dimension (a
// swap or not), so the permutation space is tiny and the null is nearly degenerate — its own
// standard deviation across K shuffles is reported alongside the effect rather than folded into
// it (never divided through, which would blow up exactly where the null is thinnest), so a
// reader can see how much of a two-person effect to trust rather than a single number that
// hides it.

import { clinicians, type Clinician } from "@/demo/clinicians";
import { corpusRun, tieQualityReport } from "./tie-quality";

/**
 * Deterministic draw in [0, 1) — the same FNV-1a construction `scale-fixture.ts` uses for its
 * own synthetic declarations, so a permutation seed is reproducible for the same reason a
 * synthetic-roster seed already is: a pin over a random fixture is a flake with a test id.
 */
function draw(seed: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash / 0x100000000;
}

/** Fisher-Yates over `n` slots, deterministic from `seed`. */
function shuffledOrder(n: number, seed: string): number[] {
  const order = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i -= 1) {
    const j = Math.floor(draw(`${seed}:${i}`) * (i + 1));
    [order[i], order[j]] = [order[j]!, order[i]!];
  }
  return order;
}

/**
 * The declaration dimensions `facetStrength`/`holdsPreference` (`@/demo/clinicians`,
 * `@/matching/needs`) read — every field either function touches, one block per clinician per
 * dimension, so a dimension's own internal shape (a whole manner set, a whole language list, the
 * paired careAreas/careAreasSometimes) survives the shuffle and only its OWNER moves.
 */
const DIMENSIONS = ["gender", "telehealth", "bulk", "languages", "manner", "care"] as const;
type Dimension = (typeof DIMENSIONS)[number];

function bulkBills(clinician: Clinician): boolean {
  return clinician.practicalSignals.some((signal) => /bulk/i.test(signal));
}

/** One shuffled roster: every dimension independently reassigned across the N slots. */
function permuteRoster(roster: readonly Clinician[], seed: string): Clinician[] {
  const n = roster.length;
  const orders = Object.fromEntries(
    DIMENSIONS.map((dim) => [dim, shuffledOrder(n, `${seed}:${dim}`)]),
  ) as Record<Dimension, number[]>;

  return roster.map((clinician, slot) => {
    const genderFrom = roster[orders.gender[slot]!]!;
    const telehealthFrom = roster[orders.telehealth[slot]!]!;
    const bulkFrom = roster[orders.bulk[slot]!]!;
    const languagesFrom = roster[orders.languages[slot]!]!;
    const mannerFrom = roster[orders.manner[slot]!]!;
    const careFrom = roster[orders.care[slot]!]!;

    const shuffled: Clinician = {
      ...clinician,
      gender: genderFrom.gender,
      telehealthFirstAppointment: telehealthFrom.telehealthFirstAppointment,
      practicalSignals: bulkBills(bulkFrom)
        ? [...clinician.practicalSignals.filter((s) => !/bulk/i.test(s)), "Bulk billing"]
        : clinician.practicalSignals.filter((s) => !/bulk/i.test(s)),
      languages: languagesFrom.languages,
      manner: mannerFrom.manner,
      careAreas: careFrom.careAreas,
    };
    delete shuffled.careAreasSometimes;
    if (careFrom.careAreasSometimes) shuffled.careAreasSometimes = careFrom.careAreasSometimes;
    return shuffled;
  });
}

export interface SeparationEffectReport {
  rosterSize: number;
  k: number;
  total: number;
  observedSeparationRate: number;
  nullMeanSeparationRate: number;
  nullStdSeparationRate: number;
  /** Observed minus the null mean — the effect size a raw scalar cannot report. */
  effect: number;
}

/**
 * The roster's separation rate against chance: K shuffles of its own declarations, each scored
 * by the same `tieQualityReport` the raw scalar uses, netted against the real observed rate.
 */
export function separationEffect(
  sentences: readonly string[],
  roster: readonly Clinician[],
  k = 50,
  seed = "M5",
): SeparationEffectReport {
  const observed = tieQualityReport(sentences, roster).separationRate;
  const nullRates = Array.from(
    { length: k },
    (_, i) => tieQualityReport(sentences, permuteRoster(roster, `${seed}:${i}`)).separationRate,
  );
  const nullMean = nullRates.reduce((sum, r) => sum + r, 0) / k;
  const variance = nullRates.reduce((sum, r) => sum + (r - nullMean) ** 2, 0) / k;
  return {
    rosterSize: roster.length,
    k,
    total: sentences.length,
    observedSeparationRate: observed,
    nullMeanSeparationRate: Math.round(nullMean * 1000) / 1000,
    nullStdSeparationRate: Math.round(Math.sqrt(variance) * 1000) / 1000,
    // `+ 0` folds a `-0` result (observed exactly equal to the mean of an all-equal null, e.g.
    // the degenerate N=2/N=3 case below) to `0`, so a pinned `0` and a computed `-0` compare
    // equal — Object.is, which `toBe`/`toEqual` use, treats them as distinct otherwise.
    effect: Math.round((observed - nullMean) * 1000) / 1000 + 0,
  };
}

/**
 * The smallest tolerance a monotonicity check is allowed, even where a measured `nullStd` rounds
 * to exactly zero. `stdMultiplier` sets how many null standard deviations of headroom a drop
 * gets before it disqualifies the metric — this is NOT "always pass": the real defect (the raw
 * scalar's 62.2% -> 67.1% jump on a roster shrink, W234/M3) is an order of magnitude larger than
 * any tolerance this produces, so it would still fail loudly.
 */
const MIN_STD_FLOOR = 0.005;

/**
 * Whether a size->effect curve is non-decreasing in roster size, ALLOWING for the sampling noise
 * a single synthetic-roster draw carries at each size (reported as `nullStdSeparationRate` on
 * each point) — the property the raw scalar violated outright (it rose as the roster SHRANK, by
 * multiple points, not by noise). A hard zero-tolerance comparison would fail on this test's own
 * measured curve (N=5→N=10 dips ~0.011 against a null std of 0.006) for a reason that has
 * nothing to do with the metric's design: `syntheticRoster` draws ONE roster per size, and that
 * single draw's own distance from its population mean does not shrink with more shuffles K —
 * only genuine, larger drift should disqualify the metric, and that is what the multiplier is for.
 */
export function isMonotonicNonDecreasing(
  curve: readonly { effect: number; nullStdSeparationRate: number }[],
  stdMultiplier = 3,
): boolean {
  for (let i = 1; i < curve.length; i += 1) {
    const current = curve[i]!;
    const previous = curve[i - 1]!;
    const tolerance = stdMultiplier * Math.max(current.nullStdSeparationRate, previous.nullStdSeparationRate, MIN_STD_FLOOR);
    if (current.effect < previous.effect - tolerance) return false;
  }
  return true;
}

/** The real roster's own effect, at whatever size it currently is (two, post-O179). */
export function realRosterSeparationEffect(k = 50, seed = "M5-real"): SeparationEffectReport {
  return separationEffect(corpusRun(), clinicians, k, seed);
}
