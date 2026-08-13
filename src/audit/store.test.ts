import { beforeEach, describe, expect, it } from "vitest";
import {
  AUDIT_SEED_PRACTICE_ID,
  getAudit,
  outcomesFor,
  pendingVisitsFor,
  recordOutcome,
  resetAudit,
} from "@/audit/store";
import type { PracticeId } from "@/domain/types";

const A = AUDIT_SEED_PRACTICE_ID;
const B = "prac-2" as PracticeId;

beforeEach(() => {
  resetAudit();
});

describe("audit store", () => {
  it("seeds three pending visits and no outcomes", () => {
    expect(pendingVisitsFor(A)).toHaveLength(3);
    expect(getAudit().outcomes).toHaveLength(0);
  });

  it("records a valid outcome and removes the visit from pending", () => {
    const first = getAudit().visits[0]!.appointmentId;
    const result = recordOutcome(
      {
        appointmentId: first,
        usefulness: ["medication_reviewed"],
        clinicianJudgedReasonable: true,
      },
      A,
    );
    expect(result).toEqual({ ok: true });
    expect(outcomesFor(A)).toHaveLength(1);
    expect(pendingVisitsFor(A).map((v) => v.appointmentId)).not.toContain(first);
  });

  it("refuses an unknown visit", () => {
    expect(
      recordOutcome({ appointmentId: "apt-nope", usefulness: [], clinicianJudgedReasonable: false }, A),
    ).toEqual({ ok: false, error: "unknown_visit" });
  });

  it("refuses a second record for the same visit", () => {
    const first = getAudit().visits[0]!.appointmentId;
    recordOutcome({ appointmentId: first, usefulness: ["preventive_care"], clinicianJudgedReasonable: true }, A);
    expect(
      recordOutcome({ appointmentId: first, usefulness: ["referral_made"], clinicianJudgedReasonable: true }, A),
    ).toEqual({ ok: false, error: "already_recorded" });
    expect(outcomesFor(A)).toHaveLength(1);
  });

  it("propagates validation errors from the submission rules", () => {
    const first = getAudit().visits[0]!.appointmentId;
    expect(
      recordOutcome(
        { appointmentId: first, usefulness: ["unnecessary", "referral_made"], clinicianJudgedReasonable: false },
        A,
      ),
    ).toEqual({ ok: false, error: "unnecessary_conflict" });
    expect(outcomesFor(A)).toHaveLength(0);
  });
});

describe("W209 the audit queue belongs to a practice", () => {
  it("shows another practice nothing, rather than everything", () => {
    // The defect, stated as a test. `AuditState` carried one `practiceId` — the literal
    // `"prac-console"`, which no console mints — so the queue belonged to nobody and the page
    // had to read the whole store to show anything at all.
    expect(pendingVisitsFor(A)).toHaveLength(3);
    expect(pendingVisitsFor(B)).toEqual([]);
  });

  it("refuses a write against another practice's visit", () => {
    // Worse than the read Y4-1 found: this is a WRITE across the boundary. A clinician at B
    // could record "this appointment was worthwhile" against A's patient visit, and A's own
    // tally would carry it.
    const first = getAudit().visits[0]!.appointmentId;
    expect(
      recordOutcome({ appointmentId: first, usefulness: ["preventive_care"], clinicianJudgedReasonable: true }, B),
    ).toEqual({ ok: false, error: "unknown_visit" });
    expect(getAudit().outcomes).toEqual([]);
  });

  it("refuses it as unknown, never as a visit that exists somewhere else", () => {
    // A distinct error here would confirm the appointment is real and held by another practice.
    // The error path is a disclosure surface; "not yours" and "not real" must read the same.
    const first = getAudit().visits[0]!.appointmentId;
    const foreign = recordOutcome({ appointmentId: first, usefulness: [], clinicianJudgedReasonable: false }, B);
    const absent = recordOutcome({ appointmentId: "apt-nope", usefulness: [], clinicianJudgedReasonable: false }, B);
    expect(foreign).toEqual(absent);
  });

  it("stamps the outcome with the visit's practice, so the tally is that practice's", () => {
    // The literal made every OutcomeRecord belong to `prac-console`, which meant a practice-scoped
    // read of outcomes — the correct read — would have returned nothing for anybody.
    const first = getAudit().visits[0]!.appointmentId;
    recordOutcome({ appointmentId: first, usefulness: ["preventive_care"], clinicianJudgedReasonable: true }, A);
    expect(getAudit().outcomes.map((o) => o.practiceId)).toEqual([A]);
    expect(outcomesFor(B)).toEqual([]);
  });

  it("holds no visit under a practice id no console mints", () => {
    // The anti-regression pin. `"prac-console"` is the shape of the bug, not the bug itself —
    // any id outside the console's `prac-${n}` minting is the same defect wearing a new name.
    for (const visit of getAudit().visits) {
      expect(visit.practiceId).toMatch(/^prac-\d+$/);
    }
  });
});
