// W96 verify gate: a golden leakage report.

import { describe, expect, it } from "vitest";
import type { PatientId, PracticeId } from "@/domain/types";
import type { BarrierRecord } from "./barriers";
import { detectLeakage, type ReferralEvent, type ReferralEventKind } from "./leakage";
import { buildLeakageReport, renderLeakageReport } from "./report";

const PRACTICE = "prac-1" as PracticeId;
const WINDOW = "1 Jan – 30 Jun 2026";

let n = 0;
function ev(referralId: string, kind: ReferralEventKind): ReferralEvent {
  n += 1;
  return {
    practiceId: PRACTICE,
    patientId: `p-${referralId}` as PatientId,
    referralId,
    kind,
    at: `2026-03-${String((n % 27) + 1).padStart(2, "0")}T09:00:00Z`,
  };
}

function barrier(referralId: string, code: BarrierRecord["code"]): BarrierRecord {
  return {
    practiceId: PRACTICE,
    patientId: `p-${referralId}` as PatientId,
    referralId,
    code,
    source: "patient_stated",
    recordedAt: "2026-07-01T09:00:00Z",
    note: null,
  };
}

/** Five referrals: two stuck unbooked, one lost, one stuck unreturned, one completed. */
function fixture() {
  n = 0;
  const events: ReferralEvent[] = [
    ev("a", "referral_written"),
    ev("b", "referral_written"),
    ev("c", "referral_written"),
    ev("c", "appointment_recorded"),
    ev("c", "appointment_cancelled"),
    ev("d", "referral_written"),
    ev("d", "appointment_recorded"),
    ev("e", "referral_written"),
    ev("e", "appointment_recorded"),
    ev("e", "completion_recorded"),
  ];
  return detectLeakage(events, PRACTICE);
}

const GOLDEN = `# Referral follow-through — 1 Jan – 30 Jun 2026

4 of 5 referrals have no completion recorded.

This describes what is on file, not what patients did. A letter that never arrived and
an appointment that was never made look the same in the record, and this report does not
guess between them.

## Where they stopped

| Stage | Referrals | What that means |
|---|---|---|
| written no appointment | 2 | Referred, and no appointment with the service is recorded. |
| appointment lost | 1 | An appointment was recorded and then cancelled, with nothing recorded since. |
| attended no completion | 1 | An appointment is recorded and nothing has come back from the service. |
| completed | 1 | A completion is recorded — the chain finished. |

## Reasons people gave

| Reason | Referrals |
|---|---|
| Said the available times did not work | 2 |
| Said the cost was a problem | 1 |

Recorded for 3 of 4 referrals with no completion (75%). The rest have no reason on file — that is unknown, not "no reason". Nothing here is inferred from a patient's details.

This report is about the practice's follow-through process. It deliberately does not rank
or list patients.
`;

describe("W96 golden leakage report", () => {
  const report = buildLeakageReport(PRACTICE, WINDOW, fixture(), [
    barrier("a", "timing"),
    barrier("b", "timing"),
    barrier("c", "cost"),
  ]);

  it("renders the golden exactly", () => {
    expect(renderLeakageReport(report)).toBe(GOLDEN);
  });

  it("counts the stages from the replay, not from a status field", () => {
    expect(report.totalReferrals).toBe(5);
    expect(report.leaked).toBe(4);
  });

  it("puts the actionable stages before the finished ones", () => {
    const stages = report.stages.map((s) => s.stage);
    expect(stages.indexOf("written_no_appointment")).toBeLessThan(stages.indexOf("completed"));
  });
});

describe("W96 what the report refuses to do", () => {
  const report = buildLeakageReport(PRACTICE, WINDOW, fixture(), [barrier("a", "timing")]);
  const rendered = renderLeakageReport(report);

  it("never blames or describes a patient", () => {
    for (const banned of ["did not attend", "failed to", "non-compliant", "refused", "cannot afford"]) {
      expect(rendered.toLowerCase(), banned).not.toContain(banned);
    }
  });

  it("never lists or ranks patients — that would be triage by another name", () => {
    // The unit of the report is the practice's process.
    expect(rendered).not.toMatch(/p-[a-e]/);
    expect(rendered.toLowerCase()).not.toMatch(/most at risk|priority|highest|worst patient/);
    expect(rendered).toContain("does not rank");
  });

  it("states how much it does not know, next to the chart", () => {
    // Four bars over 6% of cases is not a finding, and the bars alone cannot say so.
    expect(rendered).toContain("Recorded for 1 of 4 referrals with no completion (25%)");
    expect(rendered).toContain('unknown, not "no reason"');
  });

  it("says plainly when no reasons were recorded, rather than showing an empty chart", () => {
    const bare = renderLeakageReport(buildLeakageReport(PRACTICE, WINDOW, fixture(), []));
    expect(bare).toContain("No reasons have been recorded");
    expect(bare).not.toContain("| Reason | Referrals |");
  });

  it("handles a period with no referrals without implying zero leakage is a result", () => {
    const empty = buildLeakageReport(PRACTICE, WINDOW, detectLeakage([], PRACTICE), []);
    expect(renderLeakageReport(empty)).toContain("No referrals were recorded in this period.");
  });

  it("ignores another practice's barrier records", () => {
    const foreign: BarrierRecord = { ...barrier("a", "cost"), practiceId: "prac-2" as PracticeId };
    const scoped = buildLeakageReport(PRACTICE, WINDOW, fixture(), [foreign]);
    expect(scoped.barriers).toEqual([]);
    expect(scoped.barrierCoverage.withBarrier).toBe(0);
  });
});
