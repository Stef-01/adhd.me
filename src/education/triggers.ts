// W148: case-trigger rules as data.
//
// W144's boundary document put step 2 — "show it when a patient with that condition is booked" —
// firmly inside curation, and this is that step. The distinction it rests on is small and
// load-bearing:
//
//   CASE-TRIGGERED IS NOT CASE-SPECIFIC. A trigger decides WHEN material is offered. It does not
//   change WHAT the material is, and it must not become a way of deciding what a clinician is
//   shown about a particular patient. The trigger fires; W145 then orders the whole in-scope
//   library without withholding any of it.
//
// Two rules follow, and both are the W68/W121 posture rather than anything new:
//
//   THE RULES ARE DATA, AND THE DATA IS EMPTY. Deciding that a particular recorded fact is a
//   moment to put material in front of a clinician is a clinical judgement about that condition,
//   so `SHIPPED_TRIGGERS` is empty and a test pins it. Loading real triggers is a data change
//   after a G5 ruling, not a code change.
//
//   TRIGGERS READ RECORDED FACTS AND NEVER DERIVE THEM. A trigger matches W120's `RecordedFact`
//   codes — things somebody wrote down — and there is no member of the fact vocabulary a symptom
//   could arrive under, and no path from free text to a trigger. That is W57's rule and W120's,
//   and it is the whole of the G7 posture here: the software notices that a record says
//   something, and never that a patient seems to be something.
//
// A note on what empty means, learned from W121: an empty rule set must not make this module a
// no-op that looks like it works. With no triggers, `triggersFor` returns nothing and says so —
// and because the education surface offers the practice's whole in-scope library anyway (W145),
// no trigger firing means "no extra prompt", not "no material".

import type { RecordedFact } from "@/pathways/evaluation";

/**
 * "For this register, a patient with this recorded fact is a moment to offer material."
 *
 * `factCode` is a W120 fact code — something recorded. `rationale` is required for W68's reason:
 * a rule nobody can explain is a rule nobody can review, and this rule set exists to be reviewed
 * by somebody with clinical standing.
 */
export interface CaseTrigger {
  conditionCode: string;
  factCode: string;
  /** Which recorded state fires it. Absent is a legitimate trigger — a gap is a teaching moment. */
  requires: "recorded_present" | "recorded_absent";
  rationale: string;
}

/**
 * The shipped rule set: none.
 *
 * Deciding that a recorded fact is a moment to teach is a clinical judgement about a condition,
 * which is G5. Mechanism ships, content does not — the W55/W56/W60/W68/W114/W121/W123 pattern,
 * and a test pins the emptiness so triggers cannot arrive by the back door.
 */
export const SHIPPED_TRIGGERS: readonly CaseTrigger[] = [];

export interface FiredTrigger {
  conditionCode: string;
  factCode: string;
  rationale: string;
  /** What the record actually says. Carried so a reader can check the trigger against it. */
  matched: "recorded_present" | "recorded_absent";
}

export interface TriggerOutcome {
  fired: FiredTrigger[];
  /**
   * Triggers whose fact the record says NOTHING about.
   *
   * Reported rather than dropped, and it is the W120 distinction: nothing recorded is not
   * "recorded absent". A trigger that wanted to fire on an absent fact has not fired, because
   * silence is not a recorded absence — and a practice may want to know which teaching moments
   * it cannot detect because it does not record the fact.
   */
  undetectable: Array<{ conditionCode: string; factCode: string }>;
}

/**
 * Which triggers a patient's recorded facts fire.
 *
 * Takes facts and returns triggers — never the other way round, and never any material. What is
 * shown is W145's job, and keeping them apart is what stops a trigger becoming a filter.
 */
export function triggersFor(
  facts: readonly RecordedFact[],
  practiceConditionCodes: readonly string[],
  triggers: readonly CaseTrigger[] = SHIPPED_TRIGGERS,
): TriggerOutcome {
  const runs = new Set(practiceConditionCodes);
  const byCode = new Map(facts.map((fact) => [fact.code, fact]));

  const fired: FiredTrigger[] = [];
  const undetectable: Array<{ conditionCode: string; factCode: string }> = [];

  for (const trigger of triggers) {
    if (!runs.has(trigger.conditionCode)) continue;
    const recorded = byCode.get(trigger.factCode);
    if (!recorded) {
      // W120's rule: nothing recorded is not "recorded absent". A trigger cannot fire on silence.
      undetectable.push({ conditionCode: trigger.conditionCode, factCode: trigger.factCode });
      continue;
    }
    if (recorded.state === trigger.requires) {
      fired.push({
        conditionCode: trigger.conditionCode,
        factCode: trigger.factCode,
        rationale: trigger.rationale,
        matched: recorded.state,
      });
    }
  }

  return { fired, undetectable };
}

/** Operator-facing wording. Says what the record shows, never what it means. */
export function describeTriggers(outcome: TriggerOutcome): string[] {
  const lines: string[] = [];
  if (outcome.fired.length === 0) {
    lines.push(
      "Nothing in this patient's record matches a teaching trigger. The practice's usual material is available as always — this only affects whether anything was surfaced now.",
    );
  } else {
    lines.push(
      `${outcome.fired.length} recorded fact(s) match a teaching trigger. This says what is on the record, not what it means.`,
    );
  }
  if (outcome.undetectable.length > 0) {
    lines.push(
      `${outcome.undetectable.length} trigger(s) could not be checked because the record says nothing either way about the fact they watch. That is not the same as the fact being absent.`,
    );
  }
  return lines;
}
