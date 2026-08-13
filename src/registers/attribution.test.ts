// W72 verify gate: fixtures for per-condition incrementality.
//
// The fixtures are hand-built rather than drawn from the sim so the expected arithmetic is
// visible in the test: 60 invite / 40 holdout on the diabetes register, with attendance
// chosen to make the incremental figure a round number.

import { describe, expect, it } from "vitest";
import type {
  Appointment,
  AppointmentId,
  ConditionCode,
  Patient,
  PatientId,
  Practice,
  PracticeId,
  RegisterMembership,
} from "@/domain/types";
import {
  MIN_ARM_PATIENTS,
  attributionByCondition,
  explainWithheld,
} from "./attribution";

const PRACTICE_ID = "prac-1" as PracticeId;
const DIABETES = "cond_diabetes" as ConditionCode;
const CKD = "cond_ckd" as ConditionCode;
const WINDOW = { fromIso: "2026-01-01", toIso: "2026-06-30" };

const practice: Practice = {
  id: PRACTICE_ID,
  name: "Fixture Practice",
  timezone: "Australia/Sydney",
  holdoutRate: 0.4,
};

function patient(id: string, holdout: boolean): Patient {
  return {
    id: id as PatientId,
    practiceId: PRACTICE_ID,
    usualClinicianId: null,
    smsConsent: true,
    optedOut: false,
    lastAttendedAt: null,
    futureBookingAt: null,
    activeRecall: false,
    chronicCare: true,
    holdout,
  };
}

function attended(id: string, patientId: string, dateIso: string): Appointment {
  return {
    id: id as AppointmentId,
    practiceId: PRACTICE_ID,
    clinicianId: "clin-1" as Appointment["clinicianId"],
    startsAt: `${dateIso}T09:00:00Z`,
    status: "attended",
    patientId: patientId as PatientId,
    generatedByInvitation: false,
  };
}

function membership(patientId: string, conditionCode: ConditionCode): RegisterMembership {
  return {
    practiceId: PRACTICE_ID,
    patientId: patientId as PatientId,
    conditionCode,
    source: "pms_condition_flag",
    addedAt: "2025-12-01T00:00:00Z",
    removedAt: null,
  };
}

/** 60 invite + 40 holdout on the diabetes register; 30 invite attend, 10 holdout attend. */
function diabetesFixture() {
  const patients: Patient[] = [];
  const memberships: RegisterMembership[] = [];
  const appointments: Appointment[] = [];

  for (let i = 0; i < 60; i += 1) {
    const id = `inv-${i}`;
    patients.push(patient(id, false));
    memberships.push(membership(id, DIABETES));
    if (i < 30) appointments.push(attended(`a-inv-${i}`, id, "2026-03-01"));
  }
  for (let i = 0; i < 40; i += 1) {
    const id = `hold-${i}`;
    patients.push(patient(id, true));
    memberships.push(membership(id, DIABETES));
    if (i < 10) appointments.push(attended(`a-hold-${i}`, id, "2026-03-01"));
  }

  return { patients, memberships, appointments };
}

describe("W72 condition attribution", () => {
  it("measures a cohort against its own holdout arm", () => {
    const f = diabetesFixture();
    const report = attributionByCondition(
      practice,
      f.patients,
      f.appointments,
      f.memberships,
      WINDOW,
    );

    expect(report.conditions).toHaveLength(1);
    const diabetes = report.conditions[0]!;
    expect(diabetes.conditionCode).toBe(DIABETES);

    // 30/60 = 500 per 1000; 10/40 = 250 per 1000; incremental 250 per 1000.
    expect(diabetes.cohort.inviteArm).toEqual({ patients: 60, attended: 30, attendedPer1000: 500 });
    expect(diabetes.cohort.holdoutArm).toEqual({ patients: 40, attended: 10, attendedPer1000: 250 });
    expect(diabetes.claim).toEqual({ incrementalPer1000: 250, incrementalAttended: 15 });
    expect(diabetes.withheld).toBeNull();
  });

  it("counts only appointments inside the window", () => {
    const f = diabetesFixture();
    f.appointments.push(attended("a-late", "inv-59", "2026-12-01"));

    const report = attributionByCondition(practice, f.patients, f.appointments, f.memberships, WINDOW);
    expect(report.conditions[0]!.cohort.inviteArm.attended).toBe(30);
  });

  it("excludes patients who are not on the register", () => {
    const f = diabetesFixture();
    // A patient of the practice with an attended visit, but on no register.
    f.patients.push(patient("outsider", false));
    f.appointments.push(attended("a-outsider", "outsider", "2026-03-01"));

    const report = attributionByCondition(practice, f.patients, f.appointments, f.memberships, WINDOW);
    expect(report.conditions[0]!.cohort.inviteArm.patients).toBe(60);
    expect(report.conditions[0]!.cohort.inviteArm.attended).toBe(30);
  });

  it("treats a removed membership as history, not a cohort member", () => {
    const f = diabetesFixture();
    const removed = f.memberships[0]!;
    f.memberships[0] = { ...removed, removedAt: "2026-02-01T00:00:00Z" };

    const report = attributionByCondition(practice, f.patients, f.appointments, f.memberships, WINDOW);
    expect(report.conditions[0]!.cohort.inviteArm.patients).toBe(59);
  });
});

describe("W72 withheld claims", () => {
  it("withholds the claim when the cohort has no holdout arm", () => {
    const patients = Array.from({ length: 80 }, (_, i) => patient(`inv-${i}`, false));
    const memberships = patients.map((p) => membership(p.id, DIABETES));

    const report = attributionByCondition(practice, patients, [], memberships, WINDOW);
    const diabetes = report.conditions[0]!;

    expect(diabetes.claim).toBeNull();
    expect(diabetes.withheld).toBe("no_holdout_arm");
    // The counts are still there — only the claim is withheld.
    expect(diabetes.cohort.inviteArm.patients).toBe(80);
  });

  it("withholds the claim when either arm is below the minimum", () => {
    // 40 invite / 5 holdout: a real holdout, but far too thin to extrapolate from.
    const patients = [
      ...Array.from({ length: 40 }, (_, i) => patient(`inv-${i}`, false)),
      ...Array.from({ length: 5 }, (_, i) => patient(`hold-${i}`, true)),
    ];
    const memberships = patients.map((p) => membership(p.id, CKD));
    const appointments = [attended("a1", "inv-0", "2026-03-01")];

    const report = attributionByCondition(practice, patients, appointments, memberships, WINDOW);
    const ckd = report.conditions[0]!;

    expect(ckd.withheld).toBe("cohort_too_small");
    expect(ckd.claim).toBeNull();
    // The raw arithmetic still exists underneath — it is simply not claimed.
    expect(ckd.cohort.incrementalPer1000).not.toBeNull();
  });

  it("the minimum is a stated option, not a hidden constant", () => {
    const patients = [
      ...Array.from({ length: 10 }, (_, i) => patient(`inv-${i}`, false)),
      ...Array.from({ length: 10 }, (_, i) => patient(`hold-${i}`, true)),
    ];
    const memberships = patients.map((p) => membership(p.id, CKD));

    expect(
      attributionByCondition(practice, patients, [], memberships, WINDOW, { minArmPatients: 5 })
        .conditions[0]!.withheld,
    ).toBeNull();
    expect(
      attributionByCondition(practice, patients, [], memberships, WINDOW).conditions[0]!.withheld,
    ).toBe("cohort_too_small");
  });

  it("explains a withheld cohort in plain words, without inventing a figure", () => {
    for (const reason of ["no_holdout_arm", "cohort_too_small"] as const) {
      const text = explainWithheld(reason);
      expect(text.length).toBeGreaterThan(20);
      expect(text).not.toMatch(/\bincremental\b|per 1,?000/i);
    }
    expect(explainWithheld("cohort_too_small")).toContain(String(MIN_ARM_PATIENTS));
  });
});

describe("W72 overlapping cohorts", () => {
  it("counts a dual-register patient in both cohorts and reports the overlap", () => {
    const patients = [
      ...Array.from({ length: 40 }, (_, i) => patient(`inv-${i}`, false)),
      ...Array.from({ length: 40 }, (_, i) => patient(`hold-${i}`, true)),
    ];
    const memberships = [
      ...patients.map((p) => membership(p.id, DIABETES)),
      // The first ten invite patients are on the CKD register too.
      ...patients.slice(0, 10).map((p) => membership(p.id, CKD)),
    ];
    const appointments = [attended("a1", "inv-0", "2026-03-01")];

    const report = attributionByCondition(practice, patients, appointments, memberships, WINDOW);

    expect(report.overlapCount).toBe(10);
    const diabetes = report.conditions.find((c) => c.conditionCode === DIABETES)!;
    const ckd = report.conditions.find((c) => c.conditionCode === CKD)!;

    // inv-0's attended appointment is counted in BOTH cohorts — which is correct per
    // cohort and exactly why cohort figures must never be summed to a practice total.
    expect(diabetes.cohort.inviteArm.attended).toBe(1);
    expect(ckd.cohort.inviteArm.attended).toBe(1);
    expect(diabetes.cohort.inviteArm.patients + ckd.cohort.inviteArm.patients).toBeGreaterThan(
      patients.filter((p) => !p.holdout).length,
    );
  });

  it("reports conditions in a stable order", () => {
    const patients = [patient("inv-0", false), patient("hold-0", true)];
    const memberships = [
      membership("inv-0", CKD),
      membership("hold-0", DIABETES),
      membership("inv-0", DIABETES),
      membership("hold-0", CKD),
    ];

    const codes = attributionByCondition(practice, patients, [], memberships, WINDOW).conditions.map(
      (c) => c.conditionCode,
    );
    expect(codes).toEqual([...codes].sort());
  });
});
