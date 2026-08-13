import { describe, expect, it } from "vitest";
import type {
  Appointment,
  AppointmentId,
  AppointmentStatus,
  ClinicianId,
  Patient,
  PatientId,
  PracticeId,
} from "@/domain/types";
import { DEFAULT_SIM_CONFIG, runSim } from "@/sim/harness";
import { continuityReport, DEFAULT_CONTINUITY_CONFIG, upcIndex } from "./continuity";

const PRACTICE = "prac-1" as PracticeId;

function patient(id: string, usual: string | null): Patient {
  return {
    id: id as PatientId,
    practiceId: PRACTICE,
    usualClinicianId: usual as ClinicianId | null,
    smsConsent: true,
    optedOut: false,
    lastAttendedAt: null,
    futureBookingAt: null,
    activeRecall: false,
    chronicCare: false,
    holdout: false,
  };
}

let seq = 0;
function visit(
  patientId: string | null,
  clinician: string,
  opts: { status?: AppointmentStatus; generated?: boolean; practiceId?: string } = {},
): Appointment {
  return {
    id: `apt-${seq++}` as AppointmentId,
    practiceId: (opts.practiceId ?? PRACTICE) as PracticeId,
    clinicianId: clinician as ClinicianId,
    startsAt: "2026-08-01T09:00:00+10:00",
    status: opts.status ?? "attended",
    patientId: patientId as PatientId | null,
    generatedByInvitation: opts.generated ?? false,
  };
}

// The fixture panel the arithmetic is pinned on:
//   A (usual c1): attended c1, c1, c1(generated), c2 → share 3/4, UPC 0.75
//   B (usual c2): attended c2, c2(generated)        → share 2/2, UPC 1.0
//   C (no usual): attended c1, c3                   → no affinity rows, UPC 0.5
//   D (usual c1): attended c1 once                  → share row, below UPC minimum
const PATIENTS = [patient("A", "c1"), patient("B", "c2"), patient("C", null), patient("D", "c1")];
const VISITS = [
  visit("A", "c1"),
  visit("A", "c1"),
  visit("A", "c1", { generated: true }),
  visit("A", "c2"),
  visit("B", "c2"),
  visit("B", "c2", { generated: true }),
  visit("C", "c1"),
  visit("C", "c3"),
  visit("D", "c1"),
];

describe("W24 continuity — fixtures", () => {
  const report = continuityReport(PRACTICE, PATIENTS, VISITS, DEFAULT_CONTINUITY_CONFIG);

  it("usual-GP share overall: 6 of 7 affinity visits (C excluded — no usual GP)", () => {
    expect(report.overall).toEqual({ appointments: 7, withUsualGp: 6, share: 6 / 7 });
  });

  it("generated vs organic split: both generated visits hit the usual GP", () => {
    expect(report.generated).toEqual({ appointments: 2, withUsualGp: 2, share: 1 });
    expect(report.organic).toEqual({ appointments: 5, withUsualGp: 4, share: 4 / 5 });
  });

  it("panel UPC: A=0.75, B=1.0, C=0.5 qualify (D below minimum) → mean 0.75", () => {
    expect(report.panel.qualifyingPatients).toBe(3);
    expect(report.panel.meanUpc).toBeCloseTo((0.75 + 1 + 0.5) / 3, 10);
  });

  it("never counts: non-attended, unknown patients, other practices", () => {
    const noisy = [
      ...VISITS,
      visit("A", "c1", { status: "booked" }),
      visit("A", "c1", { status: "dna" }),
      visit("stranger", "c1"),
      visit("A", "c1", { practiceId: "prac-other" }),
      visit(null, "c1", { status: "open" }),
    ];
    expect(continuityReport(PRACTICE, PATIENTS, noisy, DEFAULT_CONTINUITY_CONFIG)).toEqual(report);
  });

  it("empty world yields nulls, not zeros pretending to be measurements", () => {
    const empty = continuityReport(PRACTICE, PATIENTS, [], DEFAULT_CONTINUITY_CONFIG);
    expect(empty.overall.share).toBeNull();
    expect(empty.panel.meanUpc).toBeNull();
    expect(empty.panel.qualifyingPatients).toBe(0);
  });

  it("upcIndex: concentration of visits, not affinity", () => {
    expect(upcIndex([])).toBeNull();
    expect(upcIndex(["c1"])).toBe(1);
    expect(upcIndex(["c1", "c2", "c1", "c1"])).toBe(0.75);
    expect(upcIndex(["c1", "c2"])).toBe(0.5);
  });
});

describe("W24 continuity — sim integration", () => {
  it("with usual-GP-only eligibility, every generated visit preserves continuity", () => {
    const result = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6 });
    const report = continuityReport(
      result.practice.id,
      result.patients,
      result.appointments,
      DEFAULT_CONTINUITY_CONFIG,
    );
    // The W4 rule usualClinicianOnly=true makes this exact by construction.
    expect(report.generated.appointments).toBeGreaterThan(0);
    expect(report.generated.share).toBe(1);
    expect(report.panel.qualifyingPatients).toBeGreaterThan(0);
    expect(report.panel.meanUpc).toBeGreaterThan(0.9); // sim organic visits also go to the usual GP
  });
});
