// W120: evaluating a pathway's criteria against RECORDED facts.
//
// The G7 boundary is a boundary about DIRECTION, and that is the whole design. A function
// that takes facts about a patient and returns a pathway is software deciding what care
// someone should have — regulated clinical decision support, and outside what this product
// is. A function that takes a pathway you have already chosen and reports whether its
// recorded criteria are met is bookkeeping about a record.
//
// So this module never returns a pathway. `evaluatePathway` takes one as its first argument,
// and there is no exported function that selects, matches, recommends or suggests one. The
// unit's gate is an export-list test, and the reason that is a sufficient test is that the
// only way to smuggle selection in is to add such a function — which the test then fails on,
// by name and by return type.
//
// The second design decision is the one that does real work:
//
//   "NOTHING RECORDED" IS NOT "RECORDED ABSENT". A practice's record is authoritative about
//   what the practice has recorded, not about the patient. If a criterion asks whether a fact
//   is present and the record has never said anything about it, the honest answer is that we
//   do not know — not "no". Collapsing the two would let silence become a clinical conclusion:
//   a patient nobody has assessed would satisfy every "absent" criterion and quietly clear an
//   exclusion designed to keep them out. That is W111's no-inference-from-absence rule, which
//   there kept an outage from reading as an unregistered practitioner, applied where the cost
//   is higher.
//
//   The verdict therefore has three outcomes and no boolean, and `cannot_determine` NAMES the
//   facts it is missing — which turns an unanswerable evaluation into a list of things to go
//   and record.
//
// Evaluating requires a `UsablePathway` (W119), so an unsigned pathway cannot be evaluated at
// all: G5 is enforced by the argument type rather than re-checked here.

import type { PathwayCriterion } from "./versioning";
import type { UsablePathway } from "./approval";

/**
 * Where a recorded fact came from. Every member is something somebody RECORDED.
 *
 * There is deliberately no member for a symptom, a patient's report of how they feel, or
 * anything derived by this system. W57 made the same union closed for register membership and
 * the reason is identical: an inferential member is not a slippery slope, it is the thing
 * itself.
 */
export type FactSource = "pms_condition_flag" | "practice_confirmed" | "recorded_result_category";

export const ALL_FACT_SOURCES: readonly FactSource[] = [
  "pms_condition_flag",
  "practice_confirmed",
  "recorded_result_category",
];

/**
 * What the record says about one fact.
 *
 * `recorded_absent` is a positive statement — somebody looked and wrote down that it is not
 * so. It is NOT the same as having no `RecordedFact` at all, and the whole module turns on
 * that difference.
 */
export type FactState = "recorded_present" | "recorded_absent";

export interface RecordedFact {
  code: string;
  state: FactState;
  source: FactSource;
  recordedAt: string;
  /** Who recorded it. A fact with no recorder is an assertion with a date on it. */
  recordedBy: string;
}

/**
 * A criterion is SATISFIED — status `met` — when the record matches its `requires`, and what
 * that then MEANS depends on which list it sits in:
 *
 *   - a satisfied INCLUSION contributes to the patient meeting the criteria;
 *   - a satisfied EXCLUSION excludes them;
 *   - a satisfied ESCALATION raises the pathway's own escalation flag.
 *
 * Spelled out because it is easy to read an exclusion the other way round — "exclude when this
 * is absent" — and author `requires: "absent"` for a rule meant to fire on presence. The
 * criteria then behave exactly backwards, and every test still passes because the fixture
 * carries the same misreading. This author made that mistake writing W120's own tests.
 */
export type CriterionStatus =
  /** The record says what the criterion requires. */
  | "met"
  /** The record says the opposite of what the criterion requires. */
  | "not_met"
  /** The record says nothing either way. Not a "no". */
  | "unknown";

export interface CriterionOutcome {
  criterion: PathwayCriterion;
  status: CriterionStatus;
}

/**
 * The verdict.
 *
 * No boolean anywhere: a two-valued answer would have to fold `unknown` into one side, and
 * whichever side it landed on would be a clinical conclusion drawn from silence.
 *
 * `notAClinicalRecommendation` is a literal type, so the disclaimer travels with the VALUE
 * rather than sitting in documentation next to it — W58's device, for the same reason.
 */
export type PathwayVerdict = {
  readonly notAClinicalRecommendation: true;
  pathwayId: string;
  /** Identity is the hash, not the ordinal — a verdict must name the exact criteria it read. */
  versionHash: string;
  inclusion: CriterionOutcome[];
  exclusion: CriterionOutcome[];
  /** Escalation criteria the record satisfies. A flag on the PATHWAY, not advice about care. */
  escalation: CriterionOutcome[];
} & (
  | { outcome: "criteria_met" }
  | { outcome: "criteria_not_met"; because: PathwayCriterion[] }
  /** Named so the practice knows what to go and record. */
  | { outcome: "cannot_determine"; missingFactCodes: string[] }
);

function statusFor(criterion: PathwayCriterion, facts: readonly RecordedFact[]): CriterionStatus {
  const recorded = facts.find((f) => f.code === criterion.factCode);
  if (!recorded) return "unknown";
  const wanted: FactState = criterion.requires === "present" ? "recorded_present" : "recorded_absent";
  return recorded.state === wanted ? "met" : "not_met";
}

/**
 * Evaluate one pathway against one patient's recorded facts.
 *
 * Takes the pathway. Never returns one. That asymmetry IS the G7 posture.
 *
 * Order of decision, and why:
 *   1. A definitively met EXCLUSION ends it. Exclusions exist to keep people out of a
 *      pathway, so a definite exclusion is safe to act on even when other criteria are
 *      unknown — the unknowns could only ever have included them.
 *   2. Otherwise any `unknown` anywhere yields `cannot_determine`. Including an unknown
 *      exclusion: not knowing whether someone should be kept out is not permission.
 *   3. Only then are inclusions decided.
 */
export function evaluatePathway(
  pathway: UsablePathway,
  facts: readonly RecordedFact[],
): PathwayVerdict {
  const criteria = pathway.version.criteria;
  const evaluate = (list: readonly PathwayCriterion[]): CriterionOutcome[] =>
    list.map((criterion) => ({ criterion, status: statusFor(criterion, facts) }));

  const inclusion = evaluate(criteria.inclusion);
  const exclusion = evaluate(criteria.exclusion);
  const escalation = evaluate(criteria.escalation);

  const base = {
    notAClinicalRecommendation: true,
    pathwayId: pathway.version.pathwayId,
    versionHash: pathway.version.versionHash,
    inclusion,
    exclusion,
    escalation,
  } as const;

  const excludedBy = exclusion.filter((o) => o.status === "met").map((o) => o.criterion);
  if (excludedBy.length > 0) {
    return { ...base, outcome: "criteria_not_met", because: excludedBy };
  }

  const missing = [...inclusion, ...exclusion, ...escalation]
    .filter((o) => o.status === "unknown")
    .map((o) => o.criterion.factCode);
  if (missing.length > 0) {
    return { ...base, outcome: "cannot_determine", missingFactCodes: [...new Set(missing)] };
  }

  const unmet = inclusion.filter((o) => o.status === "not_met").map((o) => o.criterion);
  if (unmet.length > 0) return { ...base, outcome: "criteria_not_met", because: unmet };

  return { ...base, outcome: "criteria_met" };
}

/** Escalation criteria the record satisfies. Says what the PATHWAY says, never what to do. */
export function escalationsFlagged(verdict: PathwayVerdict): PathwayCriterion[] {
  return verdict.escalation.filter((o) => o.status === "met").map((o) => o.criterion);
}

/** Plain-English rendering of a verdict, for a clinician reading a record. */
export function explainVerdict(verdict: PathwayVerdict): string {
  switch (verdict.outcome) {
    case "criteria_met":
      return "The recorded facts meet this pathway's criteria. This is a statement about the record, not a recommendation about care.";
    case "criteria_not_met":
      return `The recorded facts do not meet this pathway's criteria: ${verdict.because
        .map((c) => c.factCode)
        .join(", ")}.`;
    case "cannot_determine":
      return `Nothing is recorded either way for: ${verdict.missingFactCodes.join(", ")}. That is not a "no" — it means these have not been recorded.`;
  }
}
