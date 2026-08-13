// W123: which clinicians a pathway may be offered under.
//
// W119 says a pathway may be used at all. W120 says whether a patient's record meets its
// criteria. Neither says who at the practice may deliver it, and that is a different question
// with a different failure mode: offering a pathway under a clinician who was never meant to
// carry it is not a bookkeeping error, it is the product routing care to the wrong person.
//
// Three decisions carry this unit.
//
//   NO BINDING MEANS NOBODY, NOT EVERYONE. A pathway with no binding returns `no_binding` —
//   not an empty eligible list, and certainly not the whole panel. Those are three different
//   claims and only one of them is true: "nobody has said who may deliver this". An empty list
//   would read as "we checked and nobody qualifies", which is a statement about the clinicians
//   rather than about the absent decision. This is `authorize()`'s deny-by-default and W120's
//   `cannot_determine`, applied where the cost of guessing is highest.
//
//   IN-PANEL ONLY, BY CONSTRUCTION. Candidates are assembled from capability rows already
//   filtered to the practice, and the floor check is given the practice id as well, so a
//   foreign practice's record is ABSENT from the computation rather than filtered out of the
//   answer. W91/W103 found that distinction the hard way: a filter is a line somebody can
//   delete, and the deletion looks like a simplification.
//
//   THE RESULT IS A SET, NOT A RANKING. W82 owns ordering by capability, and it is deliberately
//   not used here. This unit answers "may this clinician be offered the pathway", which is a
//   yes or no per clinician; borrowing W82's ranking would attach an order to that answer, and
//   an ordered list of clinicians for a clinical pathway is a recommendation about who is
//   better — which is not this product's to make. Output is sorted by clinician id, stated in
//   the type's doc so nobody reads meaning into the order.

import type { ClinicianId, ConditionCode, PracticeId } from "@/domain/types";
import { getCapability } from "@/capability/graph";
import { clearsFloor, type Candidate, type CompetenceFloor, type FloorFailure } from "@/capability/threshold";
import type { UsablePathway } from "./approval";

/**
 * "For this exact version of this pathway, a clinician may deliver it if they clear this floor
 * for this condition."
 *
 * Pinned to the version hash for W118/W119/W121's reason: an edited pathway is a different
 * document, and a binding written against criteria that have since changed is a binding
 * nobody reviewed.
 */
export interface PathwayBinding {
  pathwayId: string;
  versionHash: string;
  conditionCode: ConditionCode;
  floor: CompetenceFloor;
  /** Required. A binding nobody can explain is a binding nobody can review (W68's rule). */
  rationale: string;
}

/**
 * The shipped bindings: none.
 *
 * Deciding what experience or credential a clinician needs before a pathway may be offered
 * under them is clinical governance, which is G5. Mechanism ships, content does not — and
 * because absence fails CLOSED, shipping empty makes pathways undeliverable rather than
 * universally deliverable, which is the right way round for an undecided question.
 */
export const SHIPPED_BINDINGS: readonly PathwayBinding[] = [];

export interface ExcludedClinician {
  clinicianId: ClinicianId;
  /** Every reason, not the first — W82 returns them all and W86 renders them. */
  failures: FloorFailure[];
}

export type BindingOutcome =
  /** Nobody has said who may deliver this. NOT the same as nobody qualifying. */
  | { kind: "no_binding"; pathwayId: string; versionHash: string }
  /** A binding exists but was written against different criteria, so it does not apply. */
  | { kind: "binding_for_another_version"; pathwayId: string; versionHash: string }
  | {
      kind: "resolved";
      pathwayId: string;
      versionHash: string;
      conditionCode: ConditionCode;
      /** Sorted by clinician id. NOT a ranking — see the module note. */
      eligible: ClinicianId[];
      excluded: ExcludedClinician[];
    };

/**
 * Build this practice's candidates for one condition, from this practice's rows only.
 *
 * Every read is filtered to `practiceId` before anything is assembled, so a foreign row never
 * enters the candidate set. There is no later step that removes one.
 */
function panelCandidates(practiceId: PracticeId, conditionCode: ConditionCode): Candidate[] {
  const state = getCapability();
  const mine = <T extends { practiceId: PracticeId; conditionCode: ConditionCode }>(rows: readonly T[]) =>
    rows.filter((row) => row.practiceId === practiceId && row.conditionCode === conditionCode);

  const interests = mine(state.interests);
  const experience = mine(state.experience);
  const competence = mine(state.competence);

  const clinicianIds = [
    ...new Set([...interests, ...experience, ...competence].map((row) => row.clinicianId)),
  ].sort();

  return clinicianIds.map((clinicianId) => ({
    clinicianId,
    experience: experience.find((row) => row.clinicianId === clinicianId) ?? null,
    competence: competence.find((row) => row.clinicianId === clinicianId) ?? null,
    interest: interests.find((row) => row.clinicianId === clinicianId) ?? null,
  }));
}

/**
 * Who at this practice may be offered this pathway.
 *
 * Takes the pathway (W119's usable form) rather than returning one — W120's direction rule
 * holds here too, and for the same G7 reason.
 */
export function cliniciansForPathway(
  pathway: UsablePathway,
  practiceId: PracticeId,
  todayIso: string,
  bindings: readonly PathwayBinding[] = SHIPPED_BINDINGS,
): BindingOutcome {
  const pathwayId = pathway.version.pathwayId;
  const versionHash = pathway.version.versionHash;

  const forPathway = bindings.filter((binding) => binding.pathwayId === pathwayId);
  if (forPathway.length === 0) return { kind: "no_binding", pathwayId, versionHash };

  const binding = forPathway.find((candidate) => candidate.versionHash === versionHash);
  if (!binding) return { kind: "binding_for_another_version", pathwayId, versionHash };

  const eligible: ClinicianId[] = [];
  const excluded: ExcludedClinician[] = [];
  for (const candidate of panelCandidates(practiceId, binding.conditionCode)) {
    // practiceId passed explicitly: W65's convention, and the thing W91/W103 found missing.
    const verdict = clearsFloor(candidate, binding.floor, todayIso, practiceId);
    if (verdict.clears) eligible.push(candidate.clinicianId);
    else excluded.push({ clinicianId: candidate.clinicianId, failures: verdict.failures });
  }
  return { kind: "resolved", pathwayId, versionHash, conditionCode: binding.conditionCode, eligible, excluded };
}

/** Operator-facing wording. Says what is known, never what anyone is good at. */
export function describeOutcome(outcome: BindingOutcome): string {
  switch (outcome.kind) {
    case "no_binding":
      return "Nobody has set who may be offered this pathway, so it cannot be offered under anyone. That is different from nobody qualifying.";
    case "binding_for_another_version":
      return "The rule for who may be offered this pathway was written against a different version of it, so it does not apply. It needs re-reviewing against the current criteria.";
    case "resolved":
      return outcome.eligible.length === 0
        ? "No clinician on this practice's panel currently meets the requirement set for this pathway."
        : `${outcome.eligible.length} clinician(s) on this practice's panel meet the requirement set for this pathway. The list is in id order and is not a ranking.`;
  }
}
