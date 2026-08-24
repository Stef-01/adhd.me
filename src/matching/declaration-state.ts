// M8: express "we cannot tell" (F10).
//
// THE DEFECT. `facetStrength` returns `0` for two situations the reader experiences completely
// differently: a clinician who was ASKED and said no, and a clinician nobody has ever asked. Both
// score zero, both look identical to `matchQuality`'s roster-wide comparison, and a reader is
// never told which one happened — "they are equal on this" and "we do not know about one of
// them" are opposite claims about the SAME zero.
//
// THE FIX, AS SPECIFIED: a score INTERVAL per facet instead of a point score. A clinician who
// declared the facet has an EXACT value (no interval width — `[value, value]`, whether the
// declaration was "often" or "sometimes"; a "sometimes" declarer is not uncertain, they are
// certain about half). A clinician with a real recorded negative has `[0, 0]`. A clinician who
// was simply never asked has `[0, weight]` — anywhere from "does not do this" to "does this
// fully" is still consistent with silence. Two clinicians only "separate" on a facet when their
// intervals are DISJOINT: an unknown can never be proven different from anything, because it is
// consistent with any value in its range.
//
// THE MEASURED, NAMED RISK — F10's own text, checked before anything shipped on it. This
// roster's declaration schema was audited field by field (every field `facetStrength` reads:
// `careAreas`, `careAreasSometimes`, `manner`, `languages`, and the four fields `holdsPreference`
// reads). Every one of them is presence-in-a-list or an optional `true` flag — a clinician who
// does NOT do trauma-informed care has no way to say so, only a way to stay silent about it, and
// the two are indistinguishable in the data. Exactly ONE field in the whole schema is exempt:
// `gender`, which is a required, closed, three-valued field every clinician has an answer for —
// so failing to hold `woman-gp` (`gender !== "woman"`) is a real, always-present negative fact,
// never a gap. `declarationState` below encodes exactly that asymmetry rather than pretending
// the other facets have a "no" this product has never asked a clinician to give.
//
// THE CONSEQUENCE, MEASURED ON THE REAL CORPUS AND ROSTER, NOT ASSUMED: `declaration-state.test.ts`
// runs `auditSeparation` over the full 447-sentence reach corpus against the real two-clinician
// roster and pins the result. Of every facet-ask where today's `matchQuality` already treats the
// roster as differing, disjoint-interval separation — the property this unit was asked to build —
// holds for `pref:woman-gp` ONLY. Every other "difference" `matchQuality` currently rewards is a
// declared value sitting inside an undeclared clinician's `[0, weight]` range, which touches that
// range's own upper bound and can never be disjoint from it. This is the plan's own named risk
// (`docs/MATCHING-YEAR-PLAN.md` item 16: "with sparse profiles most pairs overlap, so the product
// may mostly say 'we cannot tell' — true, and possibly unshippable") arriving exactly as written.
//
// THE CALL, PER THE ITEM'S OWN ESCAPE CLAUSE. Wiring disjoint-interval separation into the live
// `matchQuality` grade this unit would flip nearly the entire "informed" population to "we cannot
// tell" — accurate about what this roster's declarations actually support, and an unshippable
// regression of the one number the product has always reported, on a measurement that is honest
// rather than a defect in this unit's arithmetic. So this unit ships the three-state machinery,
// the interval computation, a distinct sentence per state, and the measurement that proves the
// risk real — and refuses to change `matchQuality`'s live grade, the way O127 refused the
// score-line animation once its own measurement said not to. `matchQuality` is untouched; nothing
// downstream of it moves.

import { clinicians, facetStrength, labelInSentence, needsFor, roundScore, type Clinician } from "@/demo/clinicians";
import { facetKey, type NeedSignal } from "./needs";

/**
 * Whether a clinician's record settles a facet one way, settles it the other way, or says
 * nothing at all. Three states, because the schema genuinely supports three — see the module
 * header for the one field (`gender`) where "the other way" is real, and every other field
 * where it is not.
 */
export type DeclarationState = "declared" | "declared-no" | "undeclared";

/**
 * `facetStrength > 0` is a real declaration regardless of grade — "sometimes" is a certain
 * answer at half weight, not an uncertain one. A strength of `0` is ambiguous everywhere except
 * `pref:woman-gp`, whose underlying field (`gender`) every clinician answers by construction.
 */
export function declarationState(clinician: Clinician, facet: NeedSignal["facet"]): DeclarationState {
  if (facetStrength(clinician, facet) > 0) return "declared";
  if (facet.kind === "preference" && facet.preference === "woman-gp") return "declared-no";
  return "undeclared";
}

/** A facet's contribution to score, as a range rather than a point — M8's central artifact. */
export type ScoreInterval = {
  readonly lo: number;
  readonly hi: number;
  readonly state: DeclarationState;
};

/** The interval a clinician's declaration record supports for one asked need. */
export function scoreInterval(clinician: Clinician, need: NeedSignal): ScoreInterval {
  const state = declarationState(clinician, need.facet);
  const strength = facetStrength(clinician, need.facet);
  if (state === "declared") {
    const value = roundScore(need.weight * strength);
    return { lo: value, hi: value, state };
  }
  if (state === "declared-no") return { lo: 0, hi: 0, state };
  return { lo: 0, hi: roundScore(need.weight), state };
}

/**
 * Two intervals are disjoint only when one's upper bound sits strictly below the other's lower
 * bound. Touching at a shared endpoint is NOT disjoint — an undeclared clinician's `[0, w]` and a
 * declared clinician's `[w, w]` meet exactly at `w`, which is the ambiguity this unit exists to
 * name rather than paper over with a `<=`.
 */
export function intervalsDisjoint(a: ScoreInterval, b: ScoreInterval): boolean {
  return a.hi < b.lo || b.hi < a.lo;
}

/**
 * Whether ANY two clinicians on the roster are provably different on this one need — a fact no
 * interval-consistent assignment of the unknowns could contradict. `matchQuality`'s current
 * criterion (`facetStrength` values merely differing) is intentionally NOT this: it is checked
 * against separately in `auditSeparation` below, which is how the gap between them is measured
 * rather than assumed.
 */
export function intervalsSeparate(need: NeedSignal, roster: readonly Clinician[]): boolean {
  const intervals = roster.map((clinician) => scoreInterval(clinician, need));
  for (let i = 0; i < intervals.length; i += 1) {
    for (let j = i + 1; j < intervals.length; j += 1) {
      if (intervalsDisjoint(intervals[i]!, intervals[j]!)) return true;
    }
  }
  return false;
}

/** The one sentence each state is owed — never the same words for "no" as for "we don't know". */
export function declarationSentence(need: NeedSignal, state: DeclarationState): string {
  const label = labelInSentence(need);
  if (state === "declared") return `${label} — they told us where they stand on this.`;
  if (state === "declared-no") return `${label} — they told us this does not apply to them.`;
  return `${label} — they have not told us either way, so we cannot say.`;
}

/**
 * The measurement behind the module header's claim, over any text population and roster — so the
 * test can pin it against the real corpus and roster, and a future roster or corpus change
 * re-earns the number instead of inheriting it.
 *
 * `valueDiffers` is today's criterion (`matchQuality`'s own): the facet's `facetStrength` values
 * are not all equal across the roster. `intervalSeparates` is this unit's stricter one. Every
 * `valueDiffers` case that is not also `intervalSeparates` is the exact ambiguity this unit
 * names: a real declaration sitting inside another clinician's range of "could be anything,
 * nobody asked".
 */
export type SeparationAudit = {
  valueDiffers: number;
  intervalSeparates: number;
  ambiguous: number;
  /** Which facets ever produced a genuine disjoint separation, so the finding is checkable. */
  separatingFacetKeys: readonly string[];
};

export function auditSeparation(
  texts: readonly string[],
  roster: readonly Clinician[] = clinicians,
): SeparationAudit {
  let valueDiffers = 0;
  let intervalSeparatesCount = 0;
  const separatingFacetKeys = new Set<string>();
  for (const text of texts) {
    const needs = needsFor(text, roster);
    const askedNeeds = new Map<string, NeedSignal>();
    for (const need of needs) askedNeeds.set(facetKey(need.facet), need);
    for (const need of askedNeeds.values()) {
      const valuesDiffer = new Set(roster.map((clinician) => facetStrength(clinician, need.facet))).size > 1;
      if (!valuesDiffer) continue;
      valueDiffers += 1;
      if (intervalsSeparate(need, roster)) {
        intervalSeparatesCount += 1;
        separatingFacetKeys.add(facetKey(need.facet));
      }
    }
  }
  return {
    valueDiffers,
    intervalSeparates: intervalSeparatesCount,
    ambiguous: valueDiffers - intervalSeparatesCount,
    separatingFacetKeys: [...separatingFacetKeys].sort(),
  };
}
