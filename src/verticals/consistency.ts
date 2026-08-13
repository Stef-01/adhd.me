// W159: two members of one vertical that disagree.
//
// A vertical claims to be one coherent care model. W157 checks every member cleared its own gate,
// which says nothing about whether the members agree with each other — and a bundle whose parts
// contradict is worse than a bundle with an unsigned part, because it looks complete.
//
// THE SHAPE OF THIS UNIT IS SET BY Y3-1, THE AUDIT FINDING FROM LAST WEEK. There, consent ingest
// detected a same-instant disagreement, filed it as a conflict, and then resolved the flag anyway
// by array position. The corollary the audit drew:
//
//   If code DETECTS an ambiguity, check that the code which RESOLVES it reads that detection.
//   Filing a conflict and then resolving it anyway is worse than not detecting it, because the
//   conflict record makes the system look careful.
//
// So this module does not produce a report that somebody might read. `usableVertical` CANNOT
// return a usable vertical while a blocking contradiction stands — the detection is wired into
// the resolver, not offered to it. That is the whole reason the severity split below exists.
//
// TWO SEVERITIES, AND THE LINE BETWEEN THEM IS "IS THERE A PRINCIPLED WINNER?"
//
//   BLOCKING — mechanically undecidable. Two versions of the same pathway in one bundle: which
//   one applies? Two monitoring intervals for one condition: which cadence? A pathway that
//   excludes everyone it includes: who is in it? None of these has an answer, from any amount of
//   clinical knowledge, because the bundle itself is malformed. These refuse.
//
//   REVIEW — a real disagreement with no answer THIS MODULE may give. One member treats a
//   recorded fact as grounds for inclusion and another treats it as grounds for escalation. That
//   may be perfectly correct (different scopes, different populations) or a serious authoring
//   error, and telling them apart is a clinical judgement — G5's, not the loop's. These are
//   reported and travel with the vertical; they never block and they are never auto-resolved.
//
// The second category is NOT the Y3-1 failure repeated. Y3-1 was resolving an ambiguity that had
// no principled winner; this is declining to. W142 drew the same line for return reports: where no
// winner exists, reporting the tie IS the answer, and picking one is the defect.
//
// NOTHING HERE READS CLINICAL MEANING. Every check is structural — the same code appearing twice,
// the same identifier with two values. This module cannot tell whether a criterion is medically
// sensible and does not try; that is what the two-person sign-off in W119 is for.

import type { GuidelineInterval } from "@/domain/types";
import type { UsablePathway } from "@/pathways/approval";
import type { PathwayCriterion } from "@/pathways/versioning";

export type ContradictionSeverity = "blocking" | "review";

export type ContradictionKind =
  /** Two different versions of one pathway. Which applies is undecidable. */
  | "two_versions_of_one_pathway"
  /** Two monitoring cadences for one condition. Which applies is undecidable. */
  | "two_intervals_for_one_condition"
  /** A pathway that excludes everyone it includes. Nobody can satisfy it. */
  | "pathway_unsatisfiable"
  /** In scope for one member, grounds for escalation in another. A judgement, not a defect. */
  | "included_here_escalated_there"
  /** Two members require the same fact with opposite polarity for entry. */
  | "opposite_entry_polarity";

export interface Contradiction {
  kind: ContradictionKind;
  severity: ContradictionSeverity;
  /** What the members disagree about: a pathway id, a condition code, or a fact code. */
  subject: string;
  /** The members involved, sorted — see the determinism note on `contradictionsIn`. */
  members: string[];
  detail: string;
}

export interface VerticalContents {
  pathways: readonly UsablePathway[];
  intervals: readonly GuidelineInterval[];
}

const BLOCKING: ReadonlySet<ContradictionKind> = new Set([
  "two_versions_of_one_pathway",
  "two_intervals_for_one_condition",
  "pathway_unsatisfiable",
]);

/** Group by a key, preserving nothing about input order — see the determinism note. */
function groupBy<T>(items: readonly T[], key: (item: T) => string): Map<string, T[]> {
  const out = new Map<string, T[]>();
  for (const item of items) out.set(key(item), [...(out.get(key(item)) ?? []), item]);
  return out;
}

function criteriaByCode(criteria: readonly PathwayCriterion[]): Map<string, PathwayCriterion[]> {
  return groupBy(criteria, (c) => c.factCode);
}

/**
 * Every disagreement between the members of a vertical.
 *
 * DETERMINISTIC BY CONSTRUCTION, and that is not incidental here. This module exists because of
 * an audit finding about order dependence; producing findings whose content or sequence depended
 * on member order would be the ninth instance of the class it cites. Every `members` list is
 * sorted, and the returned findings are sorted on a canonical key, so the same vertical yields
 * the same report whatever order its members arrive in. A test asserts it in both orders.
 */
export function contradictionsIn(contents: VerticalContents): Contradiction[] {
  const found: Contradiction[] = [];

  // Two versions of one pathway. The bundle cannot say which one it means.
  for (const [pathwayId, group] of groupBy(contents.pathways, (p) => p.version.pathwayId)) {
    const hashes = [...new Set(group.map((p) => p.version.versionHash))].sort();
    if (hashes.length > 1) {
      found.push({
        kind: "two_versions_of_one_pathway",
        severity: "blocking",
        subject: pathwayId,
        members: hashes,
        detail: `${hashes.length} versions of ${pathwayId} are in this vertical.`,
      });
    }
  }

  // Two cadences for one condition. Same shape, different registry.
  for (const [conditionCode, group] of groupBy(contents.intervals, (i) => i.conditionCode as string)) {
    const ids = [...new Set(group.map((i) => i.id as string))].sort();
    if (ids.length > 1) {
      found.push({
        kind: "two_intervals_for_one_condition",
        severity: "blocking",
        subject: conditionCode,
        members: ids,
        detail: `${ids.length} monitoring intervals apply to ${conditionCode}.`,
      });
    }
  }

  // A pathway that excludes everyone it includes. Note the polarity: inclusion "present" against
  // exclusion "absent" is ordinary and correct; it is the SAME requirement on both sides that
  // makes the pathway unsatisfiable.
  for (const pathway of contents.pathways) {
    const excl = criteriaByCode(pathway.version.criteria.exclusion);
    const clashes = new Set<string>();
    for (const inc of pathway.version.criteria.inclusion) {
      for (const ex of excl.get(inc.factCode) ?? []) {
        if (ex.requires === inc.requires) clashes.add(inc.factCode);
      }
    }
    for (const factCode of [...clashes].sort()) {
      found.push({
        kind: "pathway_unsatisfiable",
        severity: "blocking",
        subject: factCode,
        members: [pathway.version.versionHash],
        detail: `${pathway.version.pathwayId} both includes and excludes on ${factCode} with the same requirement, so nobody can satisfy it.`,
      });
    }
  }

  // Cross-member judgements. Reported, never resolved — no principled winner exists here.
  for (const a of contents.pathways) {
    for (const b of contents.pathways) {
      if (a.version.versionHash >= b.version.versionHash) continue; // each unordered pair once
      const aEntry = criteriaByCode(a.version.criteria.inclusion);
      const bEntry = criteriaByCode(b.version.criteria.inclusion);
      const bEscalate = criteriaByCode(b.version.criteria.escalation);
      const aEscalate = criteriaByCode(a.version.criteria.escalation);

      for (const [factCode, incs] of aEntry) {
        for (const esc of bEscalate.get(factCode) ?? []) {
          if (incs.some((i) => i.requires === esc.requires)) {
            found.push({
              kind: "included_here_escalated_there",
              severity: "review",
              subject: factCode,
              members: [a.version.versionHash, b.version.versionHash].sort(),
              detail: `${a.version.pathwayId} treats ${factCode} as grounds for inclusion; ${b.version.pathwayId} treats it as grounds for escalation.`,
            });
          }
        }
      }
      for (const [factCode, incs] of bEntry) {
        for (const esc of aEscalate.get(factCode) ?? []) {
          if (incs.some((i) => i.requires === esc.requires)) {
            found.push({
              kind: "included_here_escalated_there",
              severity: "review",
              subject: factCode,
              members: [a.version.versionHash, b.version.versionHash].sort(),
              detail: `${b.version.pathwayId} treats ${factCode} as grounds for inclusion; ${a.version.pathwayId} treats it as grounds for escalation.`,
            });
          }
        }
      }
      for (const [factCode, incs] of aEntry) {
        for (const other of bEntry.get(factCode) ?? []) {
          if (incs.some((i) => i.requires !== other.requires)) {
            found.push({
              kind: "opposite_entry_polarity",
              severity: "review",
              subject: factCode,
              members: [a.version.versionHash, b.version.versionHash].sort(),
              detail: `${a.version.pathwayId} and ${b.version.pathwayId} require ${factCode} with opposite polarity for entry.`,
            });
          }
        }
      }
    }
  }

  return found.sort(
    (x, y) =>
      x.kind.localeCompare(y.kind) ||
      x.subject.localeCompare(y.subject) ||
      x.members.join(",").localeCompare(y.members.join(",")) ||
      x.detail.localeCompare(y.detail),
  );
}

/** The findings that make a vertical unusable. `usableVertical` reads THIS, not the full list. */
export function blockingContradictions(found: readonly Contradiction[]): Contradiction[] {
  return found.filter((c) => BLOCKING.has(c.kind));
}

/** The findings a human has to weigh. They travel with the vertical rather than being dropped. */
export function reviewContradictions(found: readonly Contradiction[]): Contradiction[] {
  return found.filter((c) => !BLOCKING.has(c.kind));
}

export const CONTRADICTION_COPY: Record<ContradictionKind, string> = {
  two_versions_of_one_pathway:
    "This vertical contains two versions of the same pathway, so it cannot say which one applies. Remove one before the vertical can be used.",
  two_intervals_for_one_condition:
    "Two monitoring intervals apply to the same condition in this vertical, so it cannot say how often a review is due. Remove one before the vertical can be used.",
  pathway_unsatisfiable:
    "A pathway in this vertical includes and excludes on the same recorded fact with the same requirement, so nobody can ever satisfy it. It needs the authors to look again.",
  included_here_escalated_there:
    "One pathway treats a recorded fact as grounds for taking a patient on, and another treats the same fact as grounds for escalating. That may be right — the two may cover different populations — or it may be an authoring error. Meherr does not decide which; a reviewer does.",
  opposite_entry_polarity:
    "Two pathways in this vertical require the same recorded fact with opposite polarity to enter. That may be deliberate, and it may not. It is shown rather than resolved, because choosing between them would be a clinical judgement.",
};
