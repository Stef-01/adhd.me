// W132 verify gate: "a recorded return closes W93's attended_no_completion stage on replay."
//
// Tested through W93's own replay rather than by asserting on the event this module builds —
// the gate is about the STAGE changing, and checking the event shape instead would pass even
// if the two modules disagreed about what a completion looks like.
//
// Following W129's method note: where a collection is folded into one answer, the tests build
// two of the thing and check both orders.

import { describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import { replayReferral, type ReferralEvent } from "./leakage";
import {
  ALL_RETURN_OUTCOMES,
  CARE_HOLDER_COPY,
  completionEvent,
  explainReturnRejection,
  ongoingCareAfter,
  recordReturn,
  RETURN_OUTCOME_COPY,
  type ReturnInput,
  type ReturnOutcome,
  type ReturnRejection,
} from "./return-report";

const PRACTICE = "prac-a" as PracticeId;
const PATIENT = "pat-1" as PatientId;

const input = (over: Partial<ReturnInput> = {}): ReturnInput => ({
  referralId: "ref-1",
  fromPracticeId: "prac-a",
  toPracticeId: "prac-b",
  patientId: "pat-1",
  outcome: "seen_care_returned",
  reportedAt: "2026-03-10",
  reportedBy: "clin-b",
  seenOn: "2026-03-05",
  narrative: {
    text: "Placeholder return note written by the receiving GP — fixture only.",
    authoredBy: "clin-b",
    authoredAt: "2026-03-10",
  },
  referralWrittenOn: "2026-02-01",
  ...over,
});

function report(over: Partial<ReturnInput> = {}) {
  const result = recordReturn(input(over));
  if (!result.ok) throw new Error(`fixture rejected: ${result.errors.join(", ")}`);
  return result.report;
}

const ev = (kind: ReferralEvent["kind"], at: string): ReferralEvent => ({
  practiceId: PRACTICE,
  patientId: PATIENT,
  referralId: "ref-1",
  kind,
  at,
});

/** The stage a referral sits at after these events — through W93's own replay. */
const stageAfter = (events: readonly ReferralEvent[]) =>
  replayReferral("ref-1", events, PRACTICE).stage;

describe("W132 a recorded return closes attended_no_completion", () => {
  const seenButNothingBack = [ev("referral_written", "2026-02-01"), ev("appointment_recorded", "2026-03-05")];

  it("sits at attended_no_completion until a return is recorded", () => {
    expect(stageAfter(seenButNothingBack)).toBe("attended_no_completion");
  });

  it("closes on replay once the return's completion event is appended", () => {
    // The gate, checked through W93's replay rather than on the event's shape — asserting the
    // shape would pass even if the two modules disagreed about what a completion looks like.
    const completion = completionEvent(report());
    expect(completion).not.toBeNull();
    expect(stageAfter([...seenButNothingBack, completion!])).toBe("completed");
  });

  it.each<ReturnOutcome>(["seen_care_returned", "seen_care_retained", "seen_shared_care"])(
    "closes it for outcome %s",
    (outcome) => {
      // Every outcome where the patient was SEEN closes the loop, whoever ends up holding care.
      const completion = completionEvent(report({ outcome }));
      expect(stageAfter([...seenButNothingBack, completion!])).toBe("completed");
    },
  );

  it("does NOT close it when the patient was not seen", () => {
    // The sharpest edge. A report saying they never attended is a real return report — the
    // receiving practice did their part by telling somebody — but the loop is the patient being
    // SEEN, and a completion here would delete the referral from the exact report a practice
    // uses to find people who fell through.
    expect(completionEvent(report({ outcome: "not_seen", seenOn: null }))).toBeNull();
    expect(stageAfter(seenButNothingBack)).toBe("attended_no_completion");
    expect(RETURN_OUTCOME_COPY.not_seen).toContain("still open");
  });

  it("the completion is attributed to the REFERRING practice's chain", () => {
    // W93 replays per practice: an event filed under the receiving practice would close nothing
    // in the referrer's leakage report, which is the report that exists.
    expect(completionEvent(report())?.practiceId).toBe("prac-a");
  });

  it("two returns for one referral leave it completed, in either order", () => {
    // W129's rule: where a fold happens, test two of the thing in both orders.
    const first = completionEvent(report({ reportedAt: "2026-03-10" }))!;
    const second = completionEvent(report({ reportedAt: "2026-03-20" }))!;
    expect(stageAfter([...seenButNothingBack, first, second])).toBe("completed");
    expect(stageAfter([...seenButNothingBack, second, first])).toBe("completed");
  });
});

describe("W132 who holds ongoing care is derived, never recorded twice", () => {
  it("is a function of the outcome, so the two cannot contradict", () => {
    // Two fields that can disagree eventually do, and 'seen, care returned to you' next to
    // 'receiving practice retains' is worse than either alone: a reader has to guess, and the
    // guess decides whether anybody follows the patient up.
    expect(ongoingCareAfter("seen_care_returned")).toBe("referring_practice");
    expect(ongoingCareAfter("seen_care_retained")).toBe("receiving_practice");
    expect(ongoingCareAfter("seen_shared_care")).toBe("both_practices");
  });

  it("returns care to the referring practice when the patient was not seen", () => {
    // An appointment that did not happen transfers nothing.
    expect(ongoingCareAfter("not_seen")).toBe("referring_practice");
  });

  it("has no field on the report that could disagree with it", () => {
    const keys = Object.keys(report());
    expect(keys).not.toContain("ongoingCareWith");
    expect(keys).not.toContain("careHolder");
    expect(keys).toEqual([
      "referralId",
      "fromPracticeId",
      "toPracticeId",
      "patientId",
      "outcome",
      "reportedAt",
      "reportedBy",
      "seenOn",
      "narrative",
    ]);
  });

  it("answers for every outcome — no gap a default would fill", () => {
    for (const outcome of ALL_RETURN_OUTCOMES) {
      expect(CARE_HOLDER_COPY[ongoingCareAfter(outcome)], outcome).toBeTruthy();
    }
  });
});

describe("W132 what a return must carry", () => {
  it.each<[Partial<ReturnInput>, ReturnRejection]>([
    [{ referralId: " " }, "referral_missing"],
    [{ toPracticeId: "" }, "practice_missing"],
    [{ patientId: "" }, "patient_missing"],
    [{ reportedBy: " " }, "reporter_missing"],
    [{ reportedAt: "soon" }, "date_missing_or_unreadable"],
    [{ outcome: "went_fine" }, "unknown_outcome"],
    [{ seenOn: null }, "seen_without_date"],
    [{ outcome: "not_seen", seenOn: "2026-03-05" }, "not_seen_with_date"],
    [{ seenOn: "2026-01-01" }, "seen_before_referral"],
  ])("refuses %o with %s", (over, expected) => {
    const result = recordReturn(input(over));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.errors).toContain(expected);
  });

  it("requires attribution on the narrative, and writes none of it", () => {
    // W131's rule, unchanged: one prose field, attributed, and nothing in this product
    // generates or templates clinical correspondence.
    expect(recordReturn(input({ narrative: { text: "note", authoredBy: "", authoredAt: "2026-03-10" } })).ok).toBe(false);
    expect(recordReturn(input({ narrative: { text: "  ", authoredBy: "clin-b", authoredAt: "2026-03-10" } })).ok).toBe(false);
    // And a report with no narrative at all is valid — structure carries the safety-critical part.
    expect(recordReturn(input({ narrative: null })).ok).toBe(true);
  });

  it("reports every problem at once", () => {
    const result = recordReturn(input({ referralId: "", reportedBy: "", outcome: "nope" }));
    expect(!result.ok && result.errors.sort()).toEqual([
      "referral_missing",
      "reporter_missing",
      "unknown_outcome",
    ]);
  });

  it("explains every refusal it can produce", () => {
    const reasons: ReturnRejection[] = [
      "referral_missing", "practice_missing", "patient_missing", "reporter_missing",
      "date_missing_or_unreadable", "unknown_outcome", "seen_without_date",
      "not_seen_with_date", "seen_before_referral", "narrative_unattributed", "narrative_empty",
    ];
    for (const reason of reasons) {
      expect(explainReturnRejection(reason).length, reason).toBeGreaterThan(15);
    }
  });

  it("keeps the outcome vocabulary about the encounter, never about the patient", () => {
    for (const outcome of ALL_RETURN_OUTCOMES) {
      expect(outcome).not.toMatch(/improv|worse|stable|resolved|deteriorat|severity/i);
    }
    for (const copy of Object.values(RETURN_OUTCOME_COPY)) {
      expect(copy.toLowerCase()).not.toMatch(/diagnos|symptom|suffers|presents with/);
    }
  });
});
