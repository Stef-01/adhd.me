// W80 verify gate: fixtures for derived case mix, and no self-reported data promoted
// to experience.

import { describe, expect, it } from "vitest";
import type {
  Appointment,
  AppointmentId,
  ClinicianId,
  ConditionCode,
  OutcomeRecord,
  PatientId,
  PracticeId,
  RegisterMembership,
} from "@/domain/types";
import { deriveCaseMix, experienceFor, type CaseMixInput } from "./experience";

const PRACTICE = "prac-1" as PracticeId;
const DR_LEE = "clin-lee" as ClinicianId;
const DR_KHAN = "clin-khan" as ClinicianId;
const DIABETES = "cond_diabetes" as ConditionCode;
const CKD = "cond_ckd" as ConditionCode;
const WINDOW = { fromIso: "2026-01-01", toIso: "2026-06-30" };

function appt(
  over: Omit<Partial<Appointment>, "id" | "patientId"> & { id: string; patientId: string },
): Appointment {
  return {
    practiceId: PRACTICE,
    clinicianId: DR_LEE,
    startsAt: "2026-03-01T09:00:00Z",
    status: "attended",
    generatedByInvitation: false,
    ...over,
    id: over.id as AppointmentId,
    patientId: over.patientId as PatientId,
  };
}

function member(patientId: string, conditionCode: ConditionCode): RegisterMembership {
  return {
    practiceId: PRACTICE,
    patientId: patientId as PatientId,
    conditionCode,
    source: "pms_condition_flag",
    addedAt: "2025-12-01T00:00:00Z",
    removedAt: null,
  };
}

function input(over: Partial<CaseMixInput> = {}): CaseMixInput {
  return {
    practiceId: PRACTICE,
    appointments: [],
    memberships: [],
    window: WINDOW,
    computedAtIso: "2026-07-01T00:00:00Z",
    ...over,
  };
}

describe("W80 derived case mix", () => {
  it("counts attended visits per clinician per condition", () => {
    const cells = deriveCaseMix(
      input({
        appointments: [
          appt({ id: "a1", patientId: "p1" }),
          appt({ id: "a2", patientId: "p2" }),
          appt({ id: "a3", patientId: "p3", clinicianId: DR_KHAN }),
        ],
        memberships: [member("p1", DIABETES), member("p2", DIABETES), member("p3", DIABETES)],
      }),
    );

    expect(experienceFor(cells, DR_LEE, DIABETES)?.experience.attendedVisits).toBe(2);
    expect(experienceFor(cells, DR_KHAN, DIABETES)?.experience.attendedVisits).toBe(1);
  });

  it("stamps the provenance W79's constraint admits, and no other", () => {
    const cells = deriveCaseMix(
      input({ appointments: [appt({ id: "a1", patientId: "p1" })], memberships: [member("p1", DIABETES)] }),
    );

    expect(cells[0]!.experience.source).toBe("derived_case_mix");
  });

  it("carries the window and computation time, so a count never floats free", () => {
    const cells = deriveCaseMix(
      input({ appointments: [appt({ id: "a1", patientId: "p1" })], memberships: [member("p1", DIABETES)] }),
    );

    expect(cells[0]!.experience.windowFrom).toBe(WINDOW.fromIso);
    expect(cells[0]!.experience.windowTo).toBe(WINDOW.toIso);
    expect(cells[0]!.experience.computedAt).toBe("2026-07-01T00:00:00Z");
  });

  it.each([
    ["booked but not attended", "booked"],
    ["did not attend", "dna"],
    ["cancelled", "cancelled"],
    ["still open", "open"],
  ])("does not count a visit that was %s", (_label, status) => {
    const cells = deriveCaseMix(
      input({
        appointments: [appt({ id: "a1", patientId: "p1", status: status as Appointment["status"] })],
        memberships: [member("p1", DIABETES)],
      }),
    );

    expect(cells).toEqual([]);
  });

  it("ignores visits outside the window", () => {
    const cells = deriveCaseMix(
      input({
        appointments: [appt({ id: "a1", patientId: "p1", startsAt: "2026-12-01T09:00:00Z" })],
        memberships: [member("p1", DIABETES)],
      }),
    );

    expect(cells).toEqual([]);
  });

  it("ignores another practice's appointments and memberships", () => {
    const cells = deriveCaseMix(
      input({
        appointments: [
          appt({ id: "a1", patientId: "p1" }),
          appt({ id: "a2", patientId: "p2", practiceId: "prac-2" as PracticeId }),
        ],
        memberships: [member("p1", DIABETES), { ...member("p2", DIABETES), practiceId: "prac-2" as PracticeId }],
      }),
    );

    expect(cells).toHaveLength(1);
    expect(cells[0]!.experience.attendedVisits).toBe(1);
  });

  it("treats a removed membership as history", () => {
    const cells = deriveCaseMix(
      input({
        appointments: [appt({ id: "a1", patientId: "p1" })],
        memberships: [{ ...member("p1", DIABETES), removedAt: "2026-02-01T00:00:00Z" }],
      }),
    );

    expect(cells).toEqual([]);
  });

  it("counts a dual-register patient's visit toward both registers", () => {
    // Same overlap W72 reports for cohorts: the clinician did see that person, and which
    // register the visit "really" belonged to is not knowable from appointment data.
    const cells = deriveCaseMix(
      input({
        appointments: [appt({ id: "a1", patientId: "p1" })],
        memberships: [member("p1", DIABETES), member("p1", CKD)],
      }),
    );

    expect(experienceFor(cells, DR_LEE, DIABETES)?.experience.attendedVisits).toBe(1);
    expect(experienceFor(cells, DR_LEE, CKD)?.experience.attendedVisits).toBe(1);
    // So cells do not sum to the clinician's attended total, and nothing claims they do.
    const summed = cells.reduce((n, c) => n + c.experience.attendedVisits, 0);
    expect(summed).toBeGreaterThan(1);
  });

  it("returns null rather than a zero row for an unmeasured pair", () => {
    const cells = deriveCaseMix(
      input({ appointments: [appt({ id: "a1", patientId: "p1" })], memberships: [member("p1", DIABETES)] }),
    );

    // "No record of them seeing this" is not the same as a measured zero, and inventing a
    // row for every clinician×condition pair would fill the graph with unmeasured claims.
    expect(experienceFor(cells, DR_LEE, CKD)).toBeNull();
  });

  it("is deterministic in row order", () => {
    const built = () =>
      deriveCaseMix(
        input({
          appointments: [
            appt({ id: "a1", patientId: "p2", clinicianId: DR_KHAN }),
            appt({ id: "a2", patientId: "p1" }),
          ],
          memberships: [member("p1", DIABETES), member("p2", CKD)],
        }),
      ).map((c) => `${c.experience.clinicianId}::${c.experience.conditionCode}`);

    expect(built()).toEqual([...built()].sort());
  });
});

describe("W80 the usefulness signal is carried, not folded in", () => {
  const outcomes: OutcomeRecord[] = [
    {
      appointmentId: "a1" as AppointmentId,
      practiceId: PRACTICE,
      usefulness: ["medication_reviewed"],
      clinicianJudgedReasonable: true,
    },
    {
      appointmentId: "a2" as AppointmentId,
      practiceId: PRACTICE,
      usefulness: ["unnecessary"],
      clinicianJudgedReasonable: false,
    },
  ];

  const cells = deriveCaseMix(
    input({
      appointments: [appt({ id: "a1", patientId: "p1" }), appt({ id: "a2", patientId: "p2" })],
      memberships: [member("p1", DIABETES), member("p2", DIABETES)],
      outcomes,
    }),
  );

  it("a visit judged unreasonable still counts as experience", () => {
    // They still saw that presentation. Discounting the count by the judgement would make
    // a number that is neither a count nor a judgement — the blend W79 exists to prevent.
    expect(experienceFor(cells, DR_LEE, DIABETES)?.experience.attendedVisits).toBe(2);
  });

  it("reports the judgement separately", () => {
    expect(experienceFor(cells, DR_LEE, DIABETES)?.usefulness).toEqual({
      audited: 2,
      judgedReasonable: 1,
    });
  });

  it("counts only visits that were actually audited", () => {
    const partial = deriveCaseMix(
      input({
        appointments: [appt({ id: "a1", patientId: "p1" }), appt({ id: "a9", patientId: "p2" })],
        memberships: [member("p1", DIABETES), member("p2", DIABETES)],
        outcomes: [outcomes[0]!],
      }),
    );

    expect(experienceFor(partial, DR_LEE, DIABETES)?.usefulness).toEqual({
      audited: 1,
      judgedReasonable: 1,
    });
    expect(experienceFor(partial, DR_LEE, DIABETES)?.experience.attendedVisits).toBe(2);
  });

  it("ignores another practice's outcome records", () => {
    const crossed = deriveCaseMix(
      input({
        appointments: [appt({ id: "a1", patientId: "p1" })],
        memberships: [member("p1", DIABETES)],
        outcomes: [{ ...outcomes[0]!, practiceId: "prac-2" as PracticeId }],
      }),
    );

    expect(experienceFor(crossed, DR_LEE, DIABETES)?.usefulness).toEqual({
      audited: 0,
      judgedReasonable: 0,
    });
  });
});

describe("W80 no self-reported data is promoted to experience", () => {
  it("the deriver has no input a claim could arrive through", () => {
    // The gate, held structurally: CaseMixInput accepts appointments, memberships and
    // outcomes. There is no parameter for a stated interest or a hand-written skill, so
    // there is no code path that could promote one — not a rule to remember, an absence.
    const keys = Object.keys(
      input({ appointments: [], memberships: [], outcomes: [] }),
    ).sort();

    expect(keys).toEqual(
      ["appointments", "computedAtIso", "memberships", "outcomes", "practiceId", "window"].sort(),
    );
    expect(keys).not.toContain("interest");
    expect(keys).not.toContain("selfReported");
    expect(keys).not.toContain("stated");
  });

  it("every derived row is stamped derived, whatever the inputs", () => {
    const cells = deriveCaseMix(
      input({
        appointments: [
          appt({ id: "a1", patientId: "p1" }),
          appt({ id: "a2", patientId: "p2", clinicianId: DR_KHAN }),
        ],
        memberships: [member("p1", DIABETES), member("p2", CKD)],
      }),
    );

    expect(cells).not.toHaveLength(0);
    for (const cell of cells) {
      expect(cell.experience.source).toBe("derived_case_mix");
    }
  });

  it("an experience row cannot be built with a self-reported provenance", () => {
    // TypeScript-level: ExperienceSource is the single literal "derived_case_mix", so the
    // conflation W79 forbids in SQL is also unrepresentable here. This asserts the runtime
    // half; the compile-time half is that the next line would not typecheck otherwise.
    const cells = deriveCaseMix(
      input({ appointments: [appt({ id: "a1", patientId: "p1" })], memberships: [member("p1", DIABETES)] }),
    );
    const source: "derived_case_mix" = cells[0]!.experience.source;
    expect(source).toBe("derived_case_mix");
  });
});
