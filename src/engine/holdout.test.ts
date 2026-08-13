import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type { Practice } from "@/domain/types";
import { generatePractice } from "@/synthetic/generate";
import { DEFAULT_CONFIG, evaluateEligibility } from "./eligibility";
import { assignArm, assignHoldout, assignmentUnit } from "./holdout";

const TODAY = "2026-08-08";
const AT = `${TODAY}T08:00:00Z`;

function synthetic(patientCount = 12_000) {
  return generatePractice({
    seed: 42,
    patientCount,
    clinicianCount: 10,
    scheduleWeeks: 1,
    todayIso: TODAY,
  });
}

describe("W8 holdout engine", () => {
  it("assignment is deterministic and order-independent", () => {
    const { practice, patients } = synthetic(2_000);
    const a = assignHoldout(patients, practice, AT);
    const b = assignHoldout([...patients].reverse(), practice, AT);
    const armOf = new Map(a.patients.map((p) => [p.id, p.holdout]));
    for (const p of b.patients) expect(p.holdout).toBe(armOf.get(p.id));
    expect(assignHoldout(patients, practice, AT).patients).toEqual(a.patients);
  });

  it("holdout share matches the configured rate (binomial 4-sigma) at several rates", () => {
    const { practice, patients } = synthetic();
    for (const rate of [0.1, 0.2, 0.5]) {
      const { patients: assigned } = assignHoldout(patients, { ...practice, holdoutRate: rate }, AT);
      const share = assigned.filter((p) => p.holdout).length / assigned.length;
      const fourSigma = 4 * Math.sqrt((rate * (1 - rate)) / assigned.length);
      expect(Math.abs(share - rate)).toBeLessThan(fourSigma);
    }
  });

  it("edge rates are exact: 0 holds out nobody, 1 holds out everybody", () => {
    const { practice, patients } = synthetic(1_000);
    const none = assignHoldout(patients, { ...practice, holdoutRate: 0 }, AT);
    expect(none.patients.every((p) => !p.holdout)).toBe(true);
    const all = assignHoldout(patients, { ...practice, holdoutRate: 1 }, AT);
    expect(all.patients.every((p) => p.holdout)).toBe(true);
  });

  it("arms are balanced on observable covariates (4-sigma two-proportion bound)", () => {
    const { practice, patients } = synthetic();
    const { patients: assigned } = assignHoldout(patients, practice, AT);
    const holdout = assigned.filter((p) => p.holdout);
    const invite = assigned.filter((p) => !p.holdout);
    const covariates: Array<(p: (typeof assigned)[0]) => boolean> = [
      (p) => p.chronicCare,
      (p) => p.smsConsent,
      (p) => p.activeRecall,
      (p) => p.futureBookingAt !== null,
      (p) => p.lastAttendedAt !== null && p.lastAttendedAt < "2025-08-08", // >12m overdue
    ];
    for (const covariate of covariates) {
      const pH = holdout.filter(covariate).length / holdout.length;
      const pI = invite.filter(covariate).length / invite.length;
      const pooled = (holdout.filter(covariate).length + invite.filter(covariate).length) / assigned.length;
      const fourSigma =
        4 * Math.sqrt(pooled * (1 - pooled) * (1 / holdout.length + 1 / invite.length));
      expect(Math.abs(pH - pI)).toBeLessThan(fourSigma);
    }
  });

  it("raising the rate only adds holdouts, never releases one (threshold monotonicity)", () => {
    const { practice, patients } = synthetic(3_000);
    const low = assignHoldout(patients, { ...practice, holdoutRate: 0.1 }, AT);
    const high = assignHoldout(low.patients, { ...practice, holdoutRate: 0.3 }, AT);
    const heldAtLow = new Set(low.patients.filter((p) => p.holdout).map((p) => p.id));
    for (const p of high.patients) {
      if (heldAtLow.has(p.id)) expect(p.holdout).toBe(true);
    }
    expect(high.patients.filter((p) => p.holdout).length).toBeGreaterThan(heldAtLow.size);
  });

  it("practice salt decorrelates arms across practices", () => {
    const { practice, patients } = synthetic(3_000);
    const other: Practice = { ...practice, id: "prac-2" as Practice["id"] };
    const a = assignHoldout(patients, practice, AT).patients;
    const b = assignHoldout(patients, other, AT).patients;
    const flipped = a.filter((p, i) => p.holdout !== b[i]?.holdout).length;
    // Independent 20% draws agree ~68% of the time; identical salts would flip zero.
    expect(flipped / a.length).toBeGreaterThan(0.2);
  });

  it("audit trail records every arm change once, and a re-run is silent", () => {
    const { practice, patients } = synthetic(2_000);
    const first = assignHoldout(patients, practice, AT);
    const held = first.patients.filter((p) => p.holdout).length;
    // Generator starts everyone invitable, so first assignment audits exactly the holdouts.
    expect(first.auditEvents.length).toBe(held);
    for (const event of first.auditEvents) {
      expect(event.kind).toBe("holdout_assigned");
      expect(event.practiceId).toBe(practice.id);
      expect(event.detail).toContain("rate=0.2");
    }
    const again = assignHoldout(first.patients, practice, AT);
    expect(again.auditEvents).toEqual([]);
    expect(again.patients).toEqual(first.patients);
  });

  it("holdout patients are excluded from eligibility with an audited reason", () => {
    const { practice, patients, clinicians } = synthetic(2_000);
    const { patients: assigned } = assignHoldout(patients, practice, AT);
    const heldOut = assigned.find((p) => p.holdout && !p.optedOut && p.smsConsent);
    const clinician = clinicians.find((c) => c.participating);
    if (!heldOut || !clinician) throw new Error("synthetic panel missing fixture");
    const result = evaluateEligibility(heldOut, clinician, DEFAULT_CONFIG, TODAY, 0);
    expect(result).toEqual({ eligible: false, reason: "holdout_arm" });
  });

  it("assignmentUnit is uniform enough for thresholding (decile spread on 12k ids)", () => {
    const { practice, patients } = synthetic();
    const deciles = new Array(10).fill(0) as number[];
    for (const p of patients) deciles[Math.floor(assignmentUnit(practice.id, p.id) * 10)]!++;
    const expected = patients.length / 10;
    for (const count of deciles) {
      expect(Math.abs(count - expected)).toBeLessThan(4 * Math.sqrt(expected));
    }
  });

  it("migration 0002 admits the holdout_assigned audit kind", () => {
    const sql = readFileSync(
      path.resolve(__dirname, "../../supabase/migrations/0002_holdout_audit.sql"),
      "utf8",
    );
    expect(sql).toContain("'holdout_assigned'");
    expect(sql).toContain("audit_events_kind_check");
  });
});
