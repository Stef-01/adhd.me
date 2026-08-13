// W121: escalation rules as data, shipping empty.
//
// W120 tells you that a pathway's escalation criterion is satisfied by the record. It
// deliberately stops there, because "and therefore do X" is a different kind of statement.
// This unit is that step, and it is built to W68's posture for W68's reason:
//
// 1. THE RULES ARE DATA, AND THE DATA IS EMPTY. Deciding what an escalation means — who needs
//    to see it, how soon, whether it interrupts anything — is clinical authorship, which is
//    founder gate G5. So this ships the MECHANISM and an empty rule set (W55/W56/W60/W68/W114
//    pattern), and a test pins the emptiness so rules cannot arrive without the ruling.
//
// 2. AN ESCALATION IS ROUTED, NEVER DROPPED — AND AN ESCALATION WITH NO RULE IS ROUTED TOO.
//    This is the part worth arguing. W68 established that a safety rail producing silence is
//    worse than no rail. The same trap sits here in a subtler form: today the rule set is
//    empty, so if an unmatched escalation simply produced nothing, the entire escalation
//    mechanism would be a no-op that LOOKS like it is working. Instead an escalation with no
//    rule comes back as `unrouted`, naming the pathway and the trigger, which is the honest
//    state — "this fired and nobody has said what to do about it" — and is exactly what a
//    practice should be shown while G5 is pending.
//
// The action vocabulary carries NO URGENCY AND NO CLINICAL INSTRUCTION. It says what the
// SOFTWARE does — who gets told, what gets flagged — never how sick anybody is or how fast
// somebody should be seen. There is deliberately no timeframe field: a timeframe attached to a
// clinical escalation is a judgement about urgency, and that judgement belongs in content the
// founder signs off, not in a shape this module invents. W114 drew the same line for what a
// credential permits.
//
// Rules are pinned to a version HASH, so editing a pathway invalidates its escalation rules
// exactly as it invalidates its attestations (W118/W119). A rule written against criteria that
// have since changed is a rule nobody reviewed.

import type { PathwayCriterion } from "./versioning";
import { escalationsFlagged, type PathwayVerdict } from "./evaluation";

/**
 * What the software does when an escalation fires.
 *
 * Operational only. No member says anything about urgency, severity or clinical action — see
 * the module note. A test asserts that.
 */
export type EscalationAction =
  /** Tell the patient's usual GP that this pathway's escalation criterion is recorded. */
  | "notify_usual_gp"
  /** Put it on the practice's review list. */
  | "flag_for_practice_review";

export const ALL_ESCALATION_ACTIONS: readonly EscalationAction[] = [
  "notify_usual_gp",
  "flag_for_practice_review",
];

/**
 * "For this exact version of this pathway, an escalation on this fact does X."
 *
 * `rationale` is required for W68's reason: a rule nobody can explain is a rule nobody can
 * review, and this rule set exists to be reviewed by someone with clinical standing.
 */
export interface EscalationRule {
  pathwayId: string;
  /** W118's content hash. An edited pathway has a different hash and therefore no rules. */
  versionHash: string;
  factCode: string;
  action: EscalationAction;
  rationale: string;
}

/**
 * The shipped rule set. EMPTY pending the G5 ruling — pinned by a test, so clinical content
 * cannot arrive by the back door.
 *
 * Note what empty means here, because it is not "escalation is off": every escalation a
 * pathway flags comes back `unrouted`. The mechanism is live and visibly undecided.
 */
export const SHIPPED_ESCALATION_RULES: readonly EscalationRule[] = [];

export interface RoutedEscalation {
  pathwayId: string;
  versionHash: string;
  criterion: PathwayCriterion;
  action: EscalationAction;
  rationale: string;
}

export interface UnroutedEscalation {
  pathwayId: string;
  versionHash: string;
  criterion: PathwayCriterion;
  /** Why nothing was routed. Never merely absent. */
  reason: "no_rule_for_this_trigger" | "rules_written_against_another_version";
}

export interface EscalationOutcome {
  /** The disclaimer travels with the value (W58/W120). */
  readonly notAClinicalRecommendation: true;
  routed: RoutedEscalation[];
  /** Fired, and nobody has said what to do. Surfaced, never dropped. */
  unrouted: UnroutedEscalation[];
}

/**
 * Route the escalations a verdict flagged.
 *
 * Takes the verdict rather than facts, so this cannot become a second evaluator — W120 owns
 * what the record says, and this owns only what happens next.
 */
export function routeEscalations(
  verdict: PathwayVerdict,
  rules: readonly EscalationRule[] = SHIPPED_ESCALATION_RULES,
): EscalationOutcome {
  const routed: RoutedEscalation[] = [];
  const unrouted: UnroutedEscalation[] = [];

  for (const criterion of escalationsFlagged(verdict)) {
    const forPathway = rules.filter(
      (rule) => rule.pathwayId === verdict.pathwayId && rule.factCode === criterion.factCode,
    );
    const match = forPathway.find((rule) => rule.versionHash === verdict.versionHash);

    if (match) {
      routed.push({
        pathwayId: verdict.pathwayId,
        versionHash: verdict.versionHash,
        criterion,
        action: match.action,
        rationale: match.rationale,
      });
      continue;
    }
    unrouted.push({
      pathwayId: verdict.pathwayId,
      versionHash: verdict.versionHash,
      criterion,
      // Distinguished because they need different fixes: one needs a rule written, the other
      // needs the existing rules re-reviewed against the edited pathway.
      reason:
        forPathway.length > 0
          ? "rules_written_against_another_version"
          : "no_rule_for_this_trigger",
    });
  }

  return { notAClinicalRecommendation: true, routed, unrouted };
}

/** Operator-facing wording. Says what will happen, never what it means clinically. */
export function describeAction(action: EscalationAction): string {
  switch (action) {
    case "notify_usual_gp":
      return "Tell the patient's usual GP that this pathway's escalation criterion is recorded.";
    case "flag_for_practice_review":
      return "Add it to the practice's review list.";
  }
}

export function describeUnrouted(reason: UnroutedEscalation["reason"]): string {
  switch (reason) {
    case "no_rule_for_this_trigger":
      return "This pathway's escalation fired and no rule says what to do with it. Nothing has been actioned automatically.";
    case "rules_written_against_another_version":
      return "Escalation rules exist for this trigger but were written against a different version of the pathway, so they do not apply. They need re-reviewing against the current criteria.";
  }
}
