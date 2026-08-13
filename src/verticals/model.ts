// W157: a vertical — pathways, content, education material and intervals, versioned as one.
//
// Year 4's theme is assembling clinical verticals. Year 3 built four separate gates for the four
// kinds of thing a vertical contains, and the single most important property of this module is
// what it does NOT do:
//
//   IT NEVER DECIDES WHETHER A MEMBER IS USABLE. It asks. `UsableVertical` holds `UsablePathway`
//   (W119), `ApprovedContent` (W69) and `RenderableItem` (W152) — all branded, none constructible
//   without passing its own gate. So an unsigned pathway is not "rejected by a check here"; it
//   cannot be PUT IN the struct, because the caller cannot produce the value to put in. A test
//   asserts this module's source contains none of the vocabulary of sign-off — no reviewer, no
//   signatory, no attestation kind — because a fourth implementation of the G5 rule is a fourth
//   thing to keep in step, and the one that drifts is always the copy.
//
// Three consequences follow, and each is the reason to compose rather than re-implement.
//
//   WITHDRAWAL PROPAGATES WITHOUT ANYTHING NOTICING. Evidence is assembled from whatever is signed
//   off AT CALL TIME (W152's observation, which it inherited from W119, which inherited it from
//   W118's content-hash identity). Revoke a specialist review and the pathway leaves
//   `usablePathways()`; the vertical citing it stops being usable that instant. No invalidation
//   step exists because none is needed.
//
//   AN EMPTY VERTICAL IS REFUSED, and this is not tidiness. "Every member is usable" is VACUOUSLY
//   TRUE of a vertical with no members, so without this rule the gate could be passed by shipping
//   nothing — the exact failure shape this tree has hit repeatedly, where a check is green because
//   it had nothing to check. A vertical with no members is not an empty vertical; it is not a
//   vertical.
//
//   THE VERTICAL'S IDENTITY IS ITS MEMBERSHIP. `verticalHash` is computed from the member refs,
//   so "versioned as one" is structural rather than a convention: swap a member and you have a
//   different vertical version, which is what W160's migration rules will need to be about.
//
// ONE HONEST ASYMMETRY, named rather than papered over. Three of the four member kinds are gated
// by a BRAND; guideline intervals (W56) are gated by VALIDATION — `loadIntervals` returns a
// catalogue with a `rejected` list, and `GuidelineInterval` is a plain type anyone can construct.
// So this module takes the CATALOGUE rather than an array and requires membership of it, which is
// the strongest thing available without changing W56. It is weaker than the other three and it is
// recorded as such: branding intervals touches the module whose VALUES are blocked on G5 (W163),
// and unilaterally reshaping it from here would be this unit deciding that unit's design.

import { createHash } from "node:crypto";
import {
  blockingContradictions,
  contradictionsIn,
  reviewContradictions,
  type Contradiction,
} from "./consistency";
import type { ApprovedContent } from "@/registers/authoring";
import type { IntervalCatalogue } from "@/registers/intervals";
import type { RenderableItem } from "@/education/provenance";
import type { UsablePathway } from "@/pathways/approval";

export type VerticalMemberKind = "pathway" | "content" | "education_item" | "interval";

/**
 * A member, named the way its own registry names it.
 *
 * A ref is a POINTER, never the thing: a pathway version hash, a content record id, an education
 * item id, an interval id. A spec that carried the member itself would be a second copy of
 * content whose first copy is already gated, and the two would drift.
 */
export interface VerticalMemberRef {
  kind: VerticalMemberKind;
  ref: string;
}

export interface VerticalSpec {
  verticalId: string;
  name: string;
  members: readonly VerticalMemberRef[];
}

/**
 * What is signed off right now.
 *
 * Every field is either a branded type or a validated catalogue. There is no field here that a
 * caller can populate without having already passed the corresponding gate.
 */
export interface VerticalEvidence {
  pathways: readonly UsablePathway[];
  content: readonly ApprovedContent[];
  educationItems: readonly RenderableItem[];
  intervals: IntervalCatalogue;
}

declare const W157_VERTICAL_COMPLETE: unique symbol;

/**
 * A vertical every one of whose members is usable.
 *
 * The members are the branded values themselves, not their refs — so holding an `UsableVertical`
 * is holding proof that each member passed its own gate, rather than proof that something once
 * checked.
 */
export interface UsableVertical {
  readonly [W157_VERTICAL_COMPLETE]: true;
  verticalId: string;
  name: string;
  /** Identity of the bundle, derived from its membership. See the module note. */
  verticalHash: string;
  pathways: UsablePathway[];
  content: ApprovedContent[];
  educationItems: RenderableItem[];
  intervals: IntervalCatalogue["intervals"][number][];
  /**
   * W159 findings that need a human but do not block: one member takes a patient on for a fact
   * another escalates on. Carried WITH the vertical rather than recomputed by whoever remembers,
   * and `review` by construction — a blocking finding would have refused above.
   */
  contradictions: Contradiction[];
}

export type VerticalRefusal =
  /** A named member is not usable, or does not exist. Both look the same from here — see below. */
  | "member_not_usable"
  /** No members at all. "Every member is usable" would be vacuously true. */
  | "no_members"
  /**
   * W159: members that cannot be reconciled — two versions of one pathway, two cadences for one
   * condition, a pathway that excludes everyone it includes.
   *
   * This reason exists so the detection is WIRED INTO the resolver rather than offered to it.
   * Y3-1's corollary: filing a conflict and then returning usable anyway is worse than not
   * detecting it, because the conflict record makes the system look careful.
   */
  | "members_contradict"
  /** The same ref twice: a bundle that cannot say how many of something it contains. */
  | "duplicate_member"
  | "unnamed";

export interface UnusableMember {
  member: VerticalMemberRef;
  /**
   * Deliberately one reason, not two.
   *
   * "Not signed off" and "does not exist" are indistinguishable from here, because evidence is
   * assembled at call time and both are simply absent from it. W152 drew the same line for the
   * same reason: inventing the difference would mean guessing.
   */
  reason: "absent_from_signed_off_evidence";
}

export type VerticalResult =
  | { usable: true; vertical: UsableVertical }
  | {
      usable: false;
      reasons: VerticalRefusal[];
      unusable: UnusableMember[];
      contradictions: Contradiction[];
    };

/**
 * The bundle's identity, from its membership.
 *
 * Canonicalised by sorting, so the same set of members in a different order is the same vertical —
 * a version that changed because somebody reordered a list would make W160's migration rules fire
 * on nothing.
 */
export function verticalHash(members: readonly VerticalMemberRef[]): string {
  const canonical = [...members]
    .map((m) => `${m.kind}:${m.ref}`)
    .sort()
    .join("\n");
  return createHash("sha256").update(canonical, "utf8").digest("hex");
}

function refsIn(evidence: VerticalEvidence, kind: VerticalMemberKind): Set<string> {
  switch (kind) {
    case "pathway":
      return new Set(evidence.pathways.map((p) => p.version.versionHash));
    case "content":
      return new Set(evidence.content.map((c) => c.record.id));
    case "education_item":
      return new Set(evidence.educationItems.map((i) => i.item.itemId));
    case "interval":
      return new Set(evidence.intervals.intervals.map((i) => i.id as string));
  }
}

/**
 * May this vertical be used?
 *
 * Returns EVERY unusable member, not the first — the W6/W145 posture: a refusal that names one
 * problem sends somebody round the loop once per member, and the person fixing a vertical needs
 * the list.
 */
export function usableVertical(spec: VerticalSpec, evidence: VerticalEvidence): VerticalResult {
  const reasons: VerticalRefusal[] = [];
  if (spec.verticalId.trim() === "" || spec.name.trim() === "") reasons.push("unnamed");
  if (spec.members.length === 0) reasons.push("no_members");

  const seen = new Set<string>();
  for (const member of spec.members) {
    const key = `${member.kind}:${member.ref}`;
    if (seen.has(key)) {
      reasons.push("duplicate_member");
      break;
    }
    seen.add(key);
  }

  const unusable: UnusableMember[] = [];
  for (const member of spec.members) {
    if (!refsIn(evidence, member.kind).has(member.ref)) {
      unusable.push({ member, reason: "absent_from_signed_off_evidence" });
    }
  }
  if (unusable.length > 0) reasons.push("member_not_usable");

  // Members must exist before they can be compared, so contradictions are checked only once
  // every member resolved. A vertical missing a member has a different problem first.
  if (reasons.length > 0) return { usable: false, reasons, unusable, contradictions: [] };

  const wanted = (kind: VerticalMemberKind) =>
    new Set(spec.members.filter((m) => m.kind === kind).map((m) => m.ref));
  const pathwayRefs = wanted("pathway");
  const contentRefs = wanted("content");
  const itemRefs = wanted("education_item");
  const intervalRefs = wanted("interval");

  const members = {
    pathways: evidence.pathways.filter((p) => pathwayRefs.has(p.version.versionHash)),
    intervals: evidence.intervals.intervals.filter((i) => intervalRefs.has(i.id as string)),
  };
  const contradictions = contradictionsIn(members);
  const blocking = blockingContradictions(contradictions);
  if (blocking.length > 0) {
    return { usable: false, reasons: ["members_contradict"], unusable: [], contradictions };
  }

  return {
    usable: true,
    vertical: {
      verticalId: spec.verticalId,
      name: spec.name,
      verticalHash: verticalHash(spec.members),
      pathways: members.pathways,
      content: evidence.content.filter((c) => contentRefs.has(c.record.id)),
      educationItems: evidence.educationItems.filter((i) => itemRefs.has(i.item.itemId)),
      intervals: members.intervals,
      contradictions: reviewContradictions(contradictions),
    } as UsableVertical,
  };
}

export const VERTICAL_REFUSAL_COPY: Record<VerticalRefusal, string> = {
  member_not_usable:
    "Something this vertical is built from has not cleared sign-off, or is no longer signed off. The members are listed; each has to clear its own gate before the vertical can be used.",
  no_members:
    "This vertical contains nothing. An empty bundle would pass every check it has — there is nothing in it to fail — so it is refused rather than treated as complete.",
  duplicate_member:
    "The same member is listed twice, so the vertical cannot say how much of anything it contains.",
  unnamed: "A vertical needs an identifier and a name before anything can refer to it.",
  members_contradict:
    "Members of this vertical contradict each other in a way that has no answer — two versions of one pathway, two monitoring cadences for one condition, or a pathway that excludes everyone it includes. Each is listed; the bundle cannot be used until one side of each is removed.",
};
