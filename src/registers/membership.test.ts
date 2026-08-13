// W57 verify gate: unit tests including EXPLICIT non-inference. The non-inference block is
// the G7/TGA boundary — the point of the unit — so it is tested as a property of the module's
// surface, not just of one call: a patient with every symptom-shaped signal a naive
// implementation might key off, and no condition flag, must not be a member.

import { describe, expect, it } from "vitest";
import type { ConditionCode, Patient, PatientId, PracticeId, RegisterMembership } from "@/domain/types";
import {
  currentMembers,
  deriveMemberships,
  explain,
  reconcileMemberships,
  type MembershipInputs,
} from "./membership";

const PRACTICE = "prac-1" as PracticeId;
const DIABETES = "placeholder_register_a" as ConditionCode;
const CKD = "placeholder_register_b" as ConditionCode;
const T0 = "2026-08-10T06:00:00Z";
const T1 = "2026-09-10T06:00:00Z";

function patient(id: string, over: Partial<Patient> = {}): Patient {
  return {
    id: id as PatientId,
    practiceId: PRACTICE,
    usualClinicianId: null,
    smsConsent: true,
    optedOut: false,
    lastAttendedAt: "2026-01-10",
    futureBookingAt: null,
    activeRecall: false,
    chronicCare: false,
    holdout: false,
    ...over,
  };
}

function inputs(over: Partial<MembershipInputs> = {}): MembershipInputs {
  return {
    practiceId: PRACTICE,
    patients: [patient("pat-1"), patient("pat-2")],
    conditionFlags: [],
    confirmations: [],
    enabledConditions: [DIABETES, CKD],
    ...over,
  };
}

describe("W57 membership derives from PMS condition flags", () => {
  it("a flagged patient is a member, sourced to the flag", () => {
    const rows = deriveMemberships(
      inputs({ conditionFlags: [{ patientId: "pat-1" as PatientId, conditionCode: DIABETES, present: true }] }),
      T0,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ patientId: "pat-1", conditionCode: DIABETES, source: "pms_condition_flag", removedAt: null });
  });

  it("a flag set to false is not membership", () => {
    const rows = deriveMemberships(
      inputs({ conditionFlags: [{ patientId: "pat-1" as PatientId, conditionCode: DIABETES, present: false }] }),
      T0,
    );
    expect(rows).toEqual([]);
  });

  it("a practice confirmation is the second sanctioned source", () => {
    const rows = deriveMemberships(
      inputs({ confirmations: [{ patientId: "pat-2" as PatientId, conditionCode: CKD, confirmed: true, byEmail: "gp@x" }] }),
      T0,
    );
    expect(rows[0]).toMatchObject({ patientId: "pat-2", source: "practice_confirmed" });
  });

  it("a PMS flag wins over a confirmation for the same pair — the clinical record is the stronger source", () => {
    const rows = deriveMemberships(
      inputs({
        conditionFlags: [{ patientId: "pat-1" as PatientId, conditionCode: DIABETES, present: true }],
        confirmations: [{ patientId: "pat-1" as PatientId, conditionCode: DIABETES, confirmed: true, byEmail: "gp@x" }],
      }),
      T0,
    );
    expect(rows).toHaveLength(1);
    expect(rows[0]?.source).toBe("pms_condition_flag");
  });

  it("a disabled register has no members even when patients are flagged", () => {
    const rows = deriveMemberships(
      inputs({
        enabledConditions: [CKD],
        conditionFlags: [{ patientId: "pat-1" as PatientId, conditionCode: DIABETES, present: true }],
      }),
      T0,
    );
    expect(rows).toEqual([]);
  });

  it("never invents a patient the practice does not hold", () => {
    const rows = deriveMemberships(
      inputs({ conditionFlags: [{ patientId: "ghost" as PatientId, conditionCode: DIABETES, present: true }] }),
      T0,
    );
    expect(rows).toEqual([]);
  });

  it("is deterministic and stably ordered", () => {
    const i = inputs({
      conditionFlags: [
        { patientId: "pat-2" as PatientId, conditionCode: CKD, present: true },
        { patientId: "pat-1" as PatientId, conditionCode: DIABETES, present: true },
      ],
    });
    expect(deriveMemberships(i, T0)).toEqual(deriveMemberships(i, T0));
    expect(deriveMemberships(i, T0).map((m) => m.patientId)).toEqual(["pat-1", "pat-2"]);
  });
});

describe("W57 G7 boundary: membership is never inferred", () => {
  // The patient below carries every signal a symptom- or pattern-based implementation
  // might be tempted to key off. None of them is a condition flag, so none of them is
  // membership. If this test ever fails, the TGA boundary has been crossed in code.
  const suggestive = patient("pat-1", {
    chronicCare: true, // ongoing-care marker — coarse, and NOT a condition flag
    activeRecall: true, // the practice is already recalling them for something
    lastAttendedAt: "2026-08-01", // frequent recent attendance
    futureBookingAt: "2026-08-20",
  });

  it("no combination of clinical-looking patient attributes creates membership", () => {
    const rows = deriveMemberships(inputs({ patients: [suggestive] }), T0);
    expect(rows).toEqual([]);
    expect(explain(inputs({ patients: [suggestive] }), "pat-1" as PatientId, DIABETES)).toBe(
      "no_condition_flag_and_no_confirmation",
    );
  });

  it("chronicCare alone is not a register: the coarse marker and a condition flag are different facts", () => {
    const withChronic = inputs({ patients: [patient("pat-1", { chronicCare: true })] });
    expect(deriveMemberships(withChronic, T0)).toEqual([]);
  });

  it("the source union admits only the two sanctioned origins", () => {
    const rows = deriveMemberships(
      inputs({
        conditionFlags: [{ patientId: "pat-1" as PatientId, conditionCode: DIABETES, present: true }],
        confirmations: [{ patientId: "pat-2" as PatientId, conditionCode: CKD, confirmed: true, byEmail: "gp@x" }],
      }),
      T0,
    );
    // Exhaustive over what the engine can ever emit — a third source would fail here.
    expect([...new Set(rows.map((m) => m.source))].sort()).toEqual([
      "pms_condition_flag",
      "practice_confirmed",
    ]);
  });

  it("explains a refusal by naming the missing input, never by guessing", () => {
    const i = inputs();
    expect(explain(i, "ghost" as PatientId, DIABETES)).toBe("unknown_patient");
    expect(explain({ ...i, enabledConditions: [] }, "pat-1" as PatientId, DIABETES)).toBe("register_not_enabled");
    expect(explain(i, "pat-1" as PatientId, DIABETES)).toBe("no_condition_flag_and_no_confirmation");
  });
});

describe("W57 reconciliation keeps history", () => {
  const derived = (over: Partial<MembershipInputs> = {}) =>
    deriveMemberships(
      inputs({ conditionFlags: [{ patientId: "pat-1" as PatientId, conditionCode: DIABETES, present: true }], ...over }),
      T0,
    );

  it("a persisting membership keeps its original addedAt", () => {
    const first = derived();
    const again = deriveMemberships(
      inputs({ conditionFlags: [{ patientId: "pat-1" as PatientId, conditionCode: DIABETES, present: true }] }),
      T1,
    );
    const out = reconcileMemberships(first, again, T1, PRACTICE);
    expect(out).toHaveLength(1);
    expect(out[0]?.addedAt).toBe(T0); // not reset by the later ingest
  });

  it("a membership whose flag disappears is closed, not deleted", () => {
    const out = reconcileMemberships(derived(), [], T1, PRACTICE);
    expect(out).toHaveLength(1);
    expect(out[0]?.removedAt).toBe(T1);
    expect(currentMembers(out, PRACTICE, DIABETES)).toEqual([]);
  });

  it("a rejoining patient opens a fresh row beside the closed one", () => {
    const closed = reconcileMemberships(derived(), [], T1, PRACTICE);
    const rejoined = reconcileMemberships(closed, derived(), T1, PRACTICE);
    expect(rejoined).toHaveLength(2);
    expect(rejoined.filter((m) => m.removedAt === null)).toHaveLength(1);
    expect(currentMembers(rejoined, PRACTICE, DIABETES)).toHaveLength(1);
  });

  it("repeated close/rejoin cycles never produce two live rows", () => {
    // Regression: reopening once per CLOSED row gave a patient N live memberships after N
    // cycles, which double-counted the register and emitted duplicate care gaps.
    let rows = derived();
    for (let cycle = 0; cycle < 3; cycle++) {
      rows = reconcileMemberships(rows, [], T1, PRACTICE); // basis disappears
      rows = reconcileMemberships(rows, derived(), T1, PRACTICE); // and comes back
      expect(rows.filter((m) => m.removedAt === null)).toHaveLength(1);
      expect(currentMembers(rows, PRACTICE, DIABETES)).toHaveLength(1);
    }
  });

  it("W103: one practice's derivation cannot close another practice's row", () => {
    // The bug this replaced was a WRITE, not a stale read. `existing` spanning two practices
    // — what a store query naturally returns — collided on a shared patient id, so practice
    // A's derivation (which of course does not contain B's patient) closed B's open row.
    const OTHER = "prac-2" as PracticeId;
    const mine = derived();
    const theirs = mine.map((m) => ({ ...m, practiceId: OTHER }));

    const out = reconcileMemberships([...mine, ...theirs], mine, T1, PRACTICE);

    const other = out.filter((m) => m.practiceId === OTHER);
    expect(other).toHaveLength(1);
    expect(other[0]?.removedAt, "another practice's row must not be closed").toBeNull();
    // And this practice's own row is untouched, so the fix did not simply stop reconciling.
    expect(out.filter((m) => m.practiceId === PRACTICE && m.removedAt === null)).toHaveLength(1);
  });

  it("W103: currentMembers ignores another practice's rows", () => {
    const OTHER = "prac-2" as PracticeId;
    const mine = derived();
    const theirs = mine.map((m) => ({ ...m, practiceId: OTHER }));

    expect(currentMembers([...mine, ...theirs], PRACTICE, DIABETES)).toHaveLength(1);
    expect(currentMembers(theirs, PRACTICE, DIABETES)).toEqual([]);
  });

  it("closed history is left alone on later runs", () => {
    const closed = reconcileMemberships(derived(), [], T1, PRACTICE);
    expect(reconcileMemberships(closed, [], "2026-10-10T06:00:00Z", PRACTICE)).toEqual(closed);
  });

  it("a new membership arriving later is added", () => {
    const out = reconcileMemberships([] as RegisterMembership[], derived(), T0, PRACTICE);
    expect(out).toHaveLength(1);
  });
});
