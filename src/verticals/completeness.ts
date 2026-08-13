// W158: what a vertical would need before it could ship.
//
// W157 answers "can this ship now" and answers it in one bit. That is the right shape for a gate
// and the wrong shape for the only question anyone actually asks about a half-built vertical:
// what stands between here and shipping, and who has to do each part.
//
// So this report decomposes by OUTSTANDING ACT rather than by member, because the blockers have
// different owners and a flat list of member ids hides that. An unsigned pathway needs two people
// in order — a specialist, then the founder. Content already reviewed needs the founder alone. A
// missing interval needs the G5 values ruling, so nobody can act at all until it lands. A broken
// education reference needs an author and no gate whatsoever. Reading "4 members not usable" tells
// you none of that; reading "3 of these are waiting on one ruling and the fourth is a typo" is a
// plan.
//
// TWO THINGS IT REFUSES TO GUESS.
//
//   1. From W157's evidence alone, "exists but is not signed off" and "names nothing" are
//      INDISTINGUISHABLE — deliberately so, since evidence is assembled at call time from what
//      cleared its gate. A report that picked one would be inventing the more flattering answer
//      roughly half the time. So distinguishing them requires a SECOND input: the pool of what
//      exists at all, signed off or not. It is optional, and when it is absent the report says
//      the blocker is indeterminate rather than assuming.
//   2. It never says which STAGE of a gate a member is stuck at. Knowing a pathway exists and is
//      not usable does not tell you whether the specialist has looked; W119 holds that, and
//      asking here would mean a second implementation of the sign-off vocabulary that W157 went
//      out of its way to avoid. The report names the whole remaining chain for the kind, which is
//      true of every member of that kind and cannot drift.
//
// The coverage statement is not a footnote. W94 learned it on barriers and W96 put it next to the
// chart: a completeness figure whose basis is invisible gets read as a measurement. This one says
// which member kinds it could assess, whether it had the pool, and — carried forward from W157's
// own note — that "usable" is a weaker word for intervals, which are gated by validation rather
// than by a brand.

import type { IntervalCatalogue } from "@/registers/intervals";
import {
  type VerticalEvidence,
  type VerticalMemberKind,
  type VerticalMemberRef,
  type VerticalSpec,
  usableVertical,
} from "./model";

/** Everything that exists, signed off or not. Optional — see the module note. */
export interface KnownMembers {
  pathwayVersionHashes: readonly string[];
  contentIds: readonly string[];
  educationItemIds: readonly string[];
  intervalIds: readonly string[];
}

export type MemberStatus =
  /** Passed its own gate. Nothing outstanding. */
  | "ready"
  /** It exists, and something in its gate is still outstanding. Which stage is not asked. */
  | "awaiting_gate"
  /** The ref names nothing that exists. Somebody has to write it. */
  | "not_authored"
  /** No pool was supplied, so the two above cannot be told apart. */
  | "indeterminate";

/** Who has to act, per member kind. Static, because it is a property of the kind. */
export const REMAINING_CHAIN: Record<VerticalMemberKind, string> = {
  pathway: "a specialist review and then a founder sign-off (G5)",
  content: "a specialist review and then a founder sign-off (G5)",
  education_item: "an author, and a signed-off source for it to cite",
  interval: "the G5 ruling on guideline values — nobody can act before it",
};

export interface MemberAssessment {
  member: VerticalMemberRef;
  status: MemberStatus;
}

export interface CompletenessReport {
  verticalId: string;
  name: string;
  shippable: boolean;
  totalMembers: number;
  readyMembers: number;
  members: MemberAssessment[];
  /** Blockers grouped by what has to happen, worst-populated first. */
  outstanding: Array<{ kind: VerticalMemberKind; count: number; chain: string }>;
  /** True when nothing in this vertical has cleared a clinical sign-off. */
  noSignedOffClinicalContent: boolean;
  coverage: {
    poolSupplied: boolean;
    /** Kinds present in the spec — the report says nothing about kinds not asked about. */
    kindsAssessed: VerticalMemberKind[];
  };
}

function knownRefs(known: KnownMembers, kind: VerticalMemberKind): readonly string[] {
  switch (kind) {
    case "pathway":
      return known.pathwayVersionHashes;
    case "content":
      return known.contentIds;
    case "education_item":
      return known.educationItemIds;
    case "interval":
      return known.intervalIds;
  }
}

function readyRefs(evidence: VerticalEvidence): ReadonlySet<string> {
  const refs = new Set<string>();
  for (const p of evidence.pathways) refs.add(p.version.versionHash);
  for (const c of evidence.content) refs.add(c.record.id);
  for (const e of evidence.educationItems) refs.add(e.item.itemId);
  for (const i of intervalsOf(evidence.intervals)) refs.add(i);
  return refs;
}

/** Interval ids from the validated catalogue, tolerating a catalogue with no rows. */
function intervalsOf(catalogue: IntervalCatalogue): string[] {
  return catalogue.intervals.map((row) => (row as { id?: string }).id ?? "");
}

export function assessCompleteness(
  spec: VerticalSpec,
  evidence: VerticalEvidence,
  known?: KnownMembers,
): CompletenessReport {
  const ready = readyRefs(evidence);

  const members: MemberAssessment[] = spec.members.map((member) => {
    if (ready.has(member.ref)) return { member, status: "ready" as const };
    if (!known) return { member, status: "indeterminate" as const };
    return {
      member,
      status: knownRefs(known, member.kind).includes(member.ref)
        ? ("awaiting_gate" as const)
        : ("not_authored" as const),
    };
  });

  const blocked = members.filter((m) => m.status !== "ready");
  const byKind = new Map<VerticalMemberKind, number>();
  for (const m of blocked) byKind.set(m.member.kind, (byKind.get(m.member.kind) ?? 0) + 1);

  const readyMembers = members.length - blocked.length;

  return {
    verticalId: spec.verticalId,
    name: spec.name,
    // Asked of W157 rather than recomputed here. A second opinion on shippability is a second
    // rule to keep in step, and the one that drifts is always the copy.
    shippable: usableVertical(spec, evidence).usable,
    totalMembers: members.length,
    readyMembers,
    members,
    outstanding: [...byKind.entries()]
      .map(([kind, count]) => ({ kind, count, chain: REMAINING_CHAIN[kind] }))
      .sort((a, b) => b.count - a.count || a.kind.localeCompare(b.kind)),
    // Computed, not asserted. The claim is only worth making if something checked it.
    noSignedOffClinicalContent: readyMembers === 0,
    coverage: {
      poolSupplied: known !== undefined,
      kindsAssessed: [...new Set(spec.members.map((m) => m.kind))].sort(),
    },
  };
}

const STATUS_COPY: Record<MemberStatus, string> = {
  ready: "ready",
  awaiting_gate: "written, not yet through its gate",
  not_authored: "nothing exists under this reference",
  indeterminate: "cannot tell — see coverage",
};

/** The report as one document. Structured object first, rendered from it (the W20 pattern). */
export function renderCompletenessReport(report: CompletenessReport): string {
  const lines: string[] = [
    `# ${report.name} — what it needs before it can ship`,
    ``,
    report.shippable
      ? `Every member of this vertical is usable. It can ship.`
      : `${report.readyMembers} of ${report.totalMembers} members are ready. It cannot ship yet.`,
    ``,
  ];

  if (report.outstanding.length > 0) {
    lines.push(
      `## What is outstanding`,
      ``,
      `Grouped by what has to happen, not by member — the members in one group are all waiting`,
      `on the same act, and several of these groups are waiting on the same person.`,
      ``,
      `| Members | Kind | What it needs |`,
      `|---|---|---|`,
      ...report.outstanding.map((o) => `| ${o.count} | ${o.kind} | ${o.chain} |`),
      ``,
    );
  }

  lines.push(
    `## Members`,
    ``,
    `| Reference | Kind | Status |`,
    `|---|---|---|`,
    ...report.members.map((m) => `| ${m.member.ref} | ${m.member.kind} | ${STATUS_COPY[m.status]} |`),
    ``,
    `## Clinical content`,
    ``,
    report.noSignedOffClinicalContent
      ? `No member of this vertical has cleared a clinical sign-off, so it contains no clinical content. That is the state of the product, not a gap in this report.`
      : `${report.readyMembers} member(s) have cleared their sign-off and carry clinical content.`,
    ``,
    `## What this report could and could not see`,
    ``,
    report.coverage.poolSupplied
      ? `A list of everything that exists was supplied, so a reference that names nothing is told apart from one that is written but not yet signed off.`
      : `No list of what exists was supplied, so a reference that names nothing CANNOT be told apart from one written but not yet signed off. Both read as "cannot tell" above.`,
    ``,
    `Kinds assessed: ${report.coverage.kindsAssessed.join(", ") || "none"}. Nothing is said about kinds this vertical does not contain.`,
    ``,
    `"Usable" is a weaker word for intervals than for the other three kinds: pathways, content and education items are gated by a type that cannot be forged, while intervals are gated by validation and could in principle be constructed by hand (W157's own note).`,
    ``,
    `This report never says which stage of a gate a member is stuck at. Knowing a pathway is not usable does not say whether a specialist has looked, and asking here would mean a second copy of the sign-off rules.`,
    ``,
  );

  return lines.join("\n");
}
