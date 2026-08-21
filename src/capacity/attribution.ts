// W233: did opening the slots help?
//
// PREMISE, CHECKED BEFORE THIS WAS WRITTEN: the only arm anywhere in this tree is patient-level —
// W8's `Arm = "holdout" | "invite"`, keyed on (practice, patient) — and no session carries an arm
// at all. So this module refuses over everything the tree currently holds. That is the honest
// state of the question rather than a shortfall.
//
// THE WRONG ANSWER IS THE ONE EVERYBODY REACHES FOR, AND IT IS A TREND. "We opened two extra
// Thursday slots in June; June filled better than May; the slots helped." That comparison
// attributes to the decision every seasonal change, every staffing change and every shift in
// demand that happened in between — and it will usually agree with whoever opened the slots, which
// is what makes it dangerous rather than merely weak. W215 settled the same question for messaging
// with a one-member comparator union; the same settlement holds here or the lane has a back door.
//
// SO THE REFUSAL IS BY ABSENCE. No function computes a before-and-after, no parameter selects a
// baseline, and there is no date range to compare against another. The test checks the namespace
// AND the source, because `improvementSince(date)` passes any name check a reviewer would write.
//
// AND THE PATIENT-LEVEL ARM MAY NOT BE BORROWED. W9's holdout is right there, populated, and it
// answers "did MESSAGING help". Using it here would produce a confident number, from real
// randomisation, about an intervention that randomisation never touched — the most convincing
// wrong answer available in this repository. This module imports neither `@/engine/holdout` nor
// `@/engine/attribution`, and the test pins the import list.
//
// THE ARM THIS NEEDS IS ONE A PRACTICE HAS TO RUN DELIBERATELY: some sessions get the extra slots,
// comparable ones do not, and which is which is recorded BEFORE the fact. `SHIPPED_CAPACITY_ARMS`
// is empty and pinned empty, so the shape of the experiment is arguable now rather than invented
// the week somebody wants the answer — W56's posture, and W215's.

import type { RecordedBasis } from "@/reporting/model";
import type { SessionKey, SessionOccurrence } from "./model";
import { sessionKeyOf } from "./model";

/**
 * Where a capacity comparison may come from. One member, deliberately.
 *
 * W215's shape: a single-member union that quietly grows is the whole failure mode, so membership
 * is asserted by value in the test rather than left to the type.
 */
export type CapacityComparator = "recorded_session_arm";

export const ALL_CAPACITY_COMPARATORS: readonly CapacityComparator[] = ["recorded_session_arm"];

/** Which side of a deliberately run comparison a session was on. Recorded before the fact. */
export type SessionArm = "opened" | "held_back";

/**
 * One session's place in a capacity experiment, as the practice recorded it.
 *
 * `assignedOnIso` is required and is the point of the type: an arm assigned after the results are
 * in is not an arm, it is a story about which sessions went well.
 */
export interface CapacityArmAssignment {
  key: SessionKey;
  arm: SessionArm;
  assignedOnIso: string;
  /** Why this session was comparable to the others. The practice's argument, not ours. */
  comparableBecause: string;
}

/** PROPOSED FOR NOBODY — no practice has run a capacity experiment. Pinned empty by its test. */
export const SHIPPED_CAPACITY_ARMS: readonly CapacityArmAssignment[] = [];

export type CapacityAttributionRefusal =
  /** No session was assigned to either arm. The state of every practice today. */
  | "no_arm_recorded"
  /** One arm has no sessions, so there is nothing to compare against. */
  | "arm_empty"
  /** A session appears in both arms — the failure that presents as a bigger sample. */
  | "arms_overlap"
  /** An assignment carries no readable date, so it cannot be shown to precede the results. */
  | "assignment_undated";

export const CAPACITY_ATTRIBUTION_WITHHELD_COPY: Record<CapacityAttributionRefusal, string> = {
  no_arm_recorded:
    "No sessions have been set aside for comparison, so there is nothing to say about whether opening slots helped. Comparing these weeks with earlier ones would credit the decision with everything else that changed in between, and it would usually agree with whoever made it.",
  arm_empty:
    "One side of the comparison has no sessions in it. A difference needs two groups; with one, the figure would be a description of those weeks rather than a comparison.",
  arms_overlap:
    "At least one session appears on both sides of the comparison. That is not a larger sample — it is the same session compared with itself, which makes any difference between the groups partly an arithmetic artefact.",
  assignment_undated:
    "An assignment has no readable date, so there is no way to show it was made before the results were known. An arm chosen afterwards is not an arm; it is a description of which sessions went well.",
};

export interface CapacityArmCount {
  sessions: number;
  slotsOffered: number;
  slotsFilled: number;
  /** slotsFilled / slotsOffered. Only present with a non-zero denominator. */
  utilisation: number | null;
}

export interface CapacityAttributionFigure {
  comparator: CapacityComparator;
  opened: CapacityArmCount;
  heldBack: CapacityArmCount;
  /**
   * opened.utilisation − heldBack.utilisation, in percentage points.
   *
   * Not scaled to anything and not extrapolated. It is the difference between two measured rates
   * over groups a practice chose in advance, and it is the only figure this module will produce.
   */
  differenceInPoints: number;
  basis: RecordedBasis;
}

export type CapacityAttributionResult =
  | { attributed: true; figure: CapacityAttributionFigure }
  | {
      attributed: false;
      /** Every reason, not the first. */
      withheld: readonly CapacityAttributionRefusal[];
      copy: string;
    };

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function countArm(
  occurrences: readonly SessionOccurrence[],
  keys: readonly SessionKey[],
): CapacityArmCount {
  const wanted = new Set(keys.map(sessionKeyOf));
  let slotsOffered = 0;
  let slotsFilled = 0;
  for (const occurrence of occurrences) {
    if (!wanted.has(sessionKeyOf(occurrence))) continue;
    slotsOffered += occurrence.slotsOffered;
    slotsFilled += occurrence.slotsFilled;
  }
  return {
    sessions: wanted.size,
    slotsOffered,
    slotsFilled,
    utilisation: slotsOffered === 0 ? null : slotsFilled / slotsOffered,
  };
}

/**
 * The difference between the two arms of a capacity experiment — or the reasons there is none.
 *
 * Takes the assignments and the diary. There is no window parameter, no baseline and no "compared
 * with" argument: the comparison is between the arms, and offering any other axis would be
 * offering the trend by another name.
 */
export function capacityAttribution(
  assignments: readonly CapacityArmAssignment[],
  occurrences: readonly SessionOccurrence[],
  period: { fromIso: string; toIso: string },
): CapacityAttributionResult {
  const withheld: CapacityAttributionRefusal[] = [];

  if (assignments.length === 0) withheld.push("no_arm_recorded");
  if (assignments.some((a) => !ISO_DATE.test(a.assignedOnIso))) withheld.push("assignment_undated");

  const opened = assignments.filter((a) => a.arm === "opened").map((a) => a.key);
  const heldBack = assignments.filter((a) => a.arm === "held_back").map((a) => a.key);
  const openedKeys = new Set(opened.map(sessionKeyOf));
  if (heldBack.some((key) => openedKeys.has(sessionKeyOf(key)))) withheld.push("arms_overlap");
  if (assignments.length > 0 && (opened.length === 0 || heldBack.length === 0)) {
    withheld.push("arm_empty");
  }

  if (withheld.length > 0) {
    return {
      attributed: false,
      withheld,
      copy: withheld.map((reason) => CAPACITY_ATTRIBUTION_WITHHELD_COPY[reason]).join(" "),
    };
  }

  const openedCount = countArm(occurrences, opened);
  const heldBackCount = countArm(occurrences, heldBack);
  if (openedCount.utilisation === null || heldBackCount.utilisation === null) {
    return {
      attributed: false,
      withheld: ["arm_empty"],
      copy: CAPACITY_ATTRIBUTION_WITHHELD_COPY.arm_empty,
    };
  }

  return {
    attributed: true,
    figure: {
      comparator: "recorded_session_arm",
      opened: openedCount,
      heldBack: heldBackCount,
      differenceInPoints: (openedCount.utilisation - heldBackCount.utilisation) * 100,
      basis: {
        source: "sessions the practice set aside for comparison before the fact",
        recordedFacts: openedCount.slotsOffered + heldBackCount.slotsOffered,
        fromIso: period.fromIso,
        toIso: period.toIso,
      },
    },
  };
}
