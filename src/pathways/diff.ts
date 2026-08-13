// W122: what changed between two versions of a pathway, in clinician-readable form.
//
// A versioned clinical document that cannot be diffed is a document nobody re-reviews. The
// specialist who signed off version 3 will not read version 4 end to end; they will ask what
// moved. If the answer is "here is the whole thing again", the honest outcome is that the
// second review is shallower than the first, and the sign-off records a check that did not
// really happen.
//
// The unit's gate is that NO CHANGE IS RENDERABLE WITHOUT ITS AUTHOR AND DATE, and that is
// stronger than it first sounds. A diff is the artefact a reviewer forms an opinion from, and
// an unattributed change is one nobody can question — "who decided this and when" is the first
// thing a clinical reviewer asks and the last thing a diff format usually carries. So:
//
//   - `PathwayDiff` has `authoredBy` and `authoredAt` as required fields, taken from the AFTER
//     version's own draft record rather than passed in, so they cannot disagree with it.
//   - `renderDiff` THROWS on blank provenance rather than returning a string with a gap in it.
//     W67's rule: a boolean nobody reads is not a gate, and neither is a placeholder.
//
// Two smaller decisions worth stating.
//
//   A RATIONALE-ONLY EDIT IS A REAL CHANGE. W118 hashes the rationale along with the rule, so
//   changing why a criterion exists produces a new version. It would be easy to render that as
//   "no functional change" — and wrong, because the rationale is the part a clinical reviewer
//   actually reviews. It is shown as a change, with both texts.
//
//   A CRITERION MOVED BETWEEN LISTS IS A REMOVAL AND AN ADDITION, not a "move". Moving a rule
//   from inclusion to exclusion inverts what it does to a patient. Rendering that as one line
//   invites it to be skimmed as a tidy-up.

import type { PathwayCriterion, PathwayCriteria, PathwayVersion } from "./versioning";

export type CriteriaList = "inclusion" | "exclusion" | "escalation";

export const ALL_CRITERIA_LISTS: readonly CriteriaList[] = ["inclusion", "exclusion", "escalation"];

export type PathwayChange =
  | { list: CriteriaList; kind: "added"; after: PathwayCriterion }
  | { list: CriteriaList; kind: "removed"; before: PathwayCriterion }
  | {
      list: CriteriaList;
      kind: "requirement_changed";
      before: PathwayCriterion;
      after: PathwayCriterion;
    }
  | {
      list: CriteriaList;
      kind: "rationale_changed";
      before: PathwayCriterion;
      after: PathwayCriterion;
    };

export interface PathwayDiff {
  pathwayId: string;
  fromVersionHash: string;
  toVersionHash: string;
  fromOrdinal: number;
  toOrdinal: number;
  /** Required. Taken from the after-version's draft record — see the module note. */
  authoredBy: string;
  authoredAt: string;
  /** Ordered by list, then by fact code. Deterministic, so goldens hold. */
  changes: PathwayChange[];
}

function byFactCode(list: readonly PathwayCriterion[]): Map<string, PathwayCriterion> {
  return new Map(list.map((criterion) => [criterion.factCode, criterion]));
}

function diffList(
  list: CriteriaList,
  before: readonly PathwayCriterion[],
  after: readonly PathwayCriterion[],
): PathwayChange[] {
  const changes: PathwayChange[] = [];
  const beforeByCode = byFactCode(before);
  const afterByCode = byFactCode(after);
  const codes = [...new Set([...beforeByCode.keys(), ...afterByCode.keys()])].sort();

  for (const code of codes) {
    const was = beforeByCode.get(code);
    const now = afterByCode.get(code);
    if (!was && now) changes.push({ list, kind: "added", after: now });
    else if (was && !now) changes.push({ list, kind: "removed", before: was });
    else if (was && now) {
      // Requirement first: if a rule flipped from present to absent, that is the headline and
      // a rationale edit alongside it is detail.
      if (was.requires !== now.requires) {
        changes.push({ list, kind: "requirement_changed", before: was, after: now });
      } else if (was.rationale !== now.rationale) {
        changes.push({ list, kind: "rationale_changed", before: was, after: now });
      }
    }
  }
  return changes;
}

/**
 * Diff two versions of one pathway.
 *
 * Provenance comes from `after`'s own draft record, so a diff cannot be attributed to somebody
 * who did not draft it.
 */
export function diffPathwayVersions(before: PathwayVersion, after: PathwayVersion): PathwayDiff {
  const changes = ALL_CRITERIA_LISTS.flatMap((list) =>
    diffList(list, before.criteria[list as keyof PathwayCriteria], after.criteria[list as keyof PathwayCriteria]),
  );
  return {
    pathwayId: after.pathwayId,
    fromVersionHash: before.versionHash,
    toVersionHash: after.versionHash,
    fromOrdinal: before.ordinal,
    toOrdinal: after.ordinal,
    authoredBy: after.draftedBy,
    authoredAt: after.draftedAt,
    changes,
  };
}

/** Thrown rather than returned: an unattributed diff must not reach a reviewer at all. */
export class UnattributedDiffError extends Error {
  constructor(missing: string) {
    super(
      `refusing to render a pathway diff with no ${missing}: a change nobody can attribute is a change nobody can question`,
    );
    this.name = "UnattributedDiffError";
  }
}

const LIST_HEADING: Record<CriteriaList, string> = {
  inclusion: "Inclusion",
  exclusion: "Exclusion",
  escalation: "Escalation",
};

const REQUIRES_COPY = (criterion: PathwayCriterion) =>
  criterion.requires === "present" ? "must be recorded present" : "must be recorded absent";

function renderChange(change: PathwayChange): string[] {
  switch (change.kind) {
    case "added":
      return [
        `- **Added** \`${change.after.factCode}\` — ${REQUIRES_COPY(change.after)}.`,
        `  - Why: ${change.after.rationale}`,
      ];
    case "removed":
      return [
        `- **Removed** \`${change.before.factCode}\` — previously ${REQUIRES_COPY(change.before)}.`,
        `  - Its stated reason was: ${change.before.rationale}`,
      ];
    case "requirement_changed":
      return [
        `- **Changed** \`${change.after.factCode}\` — was ${REQUIRES_COPY(change.before)}, now ${REQUIRES_COPY(change.after)}.`,
        `  - Why: ${change.after.rationale}`,
      ];
    case "rationale_changed":
      return [
        `- **Reason rewritten** for \`${change.after.factCode}\` — the rule itself is unchanged (${REQUIRES_COPY(change.after)}).`,
        `  - Was: ${change.before.rationale}`,
        `  - Now: ${change.after.rationale}`,
      ];
  }
}

/**
 * Render for a clinician reviewing a new version.
 *
 * Refuses outright without provenance. Note also what it does when nothing changed: it says
 * so. A diff that renders an empty section reads as "nothing important", and the two are
 * different claims.
 */
export function renderDiff(diff: PathwayDiff): string {
  if (diff.authoredBy.trim() === "") throw new UnattributedDiffError("author");
  if (diff.authoredAt.trim() === "") throw new UnattributedDiffError("date");

  const lines = [
    `# Pathway changes — ${diff.pathwayId}, version ${diff.fromOrdinal} to ${diff.toOrdinal}`,
    ``,
    `Drafted by ${diff.authoredBy} on ${diff.authoredAt}.`,
    ``,
  ];

  if (diff.changes.length === 0) {
    lines.push(
      `**No criteria changed.** The two versions differ in record-keeping only.`,
      ``,
      `From \`${diff.fromVersionHash.slice(0, 12)}\` to \`${diff.toVersionHash.slice(0, 12)}\`.`,
      ``,
    );
    return lines.join("\n");
  }

  for (const list of ALL_CRITERIA_LISTS) {
    const forList = diff.changes.filter((change) => change.list === list);
    if (forList.length === 0) continue;
    lines.push(`## ${LIST_HEADING[list]}`, ``);
    for (const change of forList) lines.push(...renderChange(change));
    lines.push(``);
  }

  lines.push(
    `From \`${diff.fromVersionHash.slice(0, 12)}\` to \`${diff.toVersionHash.slice(0, 12)}\`.`,
    ``,
    `A criterion that moved between lists appears twice — once removed, once added — because`,
    `moving a rule from inclusion to exclusion inverts what it does to a patient, and one line`,
    `would invite that to be read as a tidy-up.`,
    ``,
  );
  return lines.join("\n");
}
