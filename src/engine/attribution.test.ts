import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import type {
  Appointment,
  AppointmentId,
  AppointmentStatus,
  ClinicianId,
  Patient,
  PatientId,
  Practice,
  PracticeId,
} from "@/domain/types";
import { ATTRIBUTION_VERSION, countAttribution } from "./attribution";

const PRACTICE: Practice = {
  id: "prac-1" as PracticeId,
  name: "Golden Fixture Practice",
  timezone: "Australia/Sydney",
  holdoutRate: 0.2,
};
const WINDOW = { fromIso: "2026-07-01", toIso: "2026-07-31" };

function patient(id: string, holdout: boolean, practiceId = PRACTICE.id): Patient {
  return {
    id: id as PatientId,
    practiceId,
    usualClinicianId: "cli-0" as ClinicianId,
    smsConsent: true,
    optedOut: false,
    lastAttendedAt: "2025-01-01",
    futureBookingAt: null,
    activeRecall: false,
    chronicCare: false,
    holdout,
  };
}

let apptSeq = 0;
function appt(
  patientId: string | null,
  status: AppointmentStatus,
  dateIso: string,
  generated = false,
  practiceId = PRACTICE.id,
): Appointment {
  return {
    id: `apt-${apptSeq++}` as AppointmentId,
    practiceId,
    clinicianId: "cli-0" as ClinicianId,
    startsAt: `${dateIso}T09:00:00+10:00`,
    status,
    patientId: patientId as PatientId | null,
    generatedByInvitation: generated,
  };
}

// Panel shared by the golden fixtures: 8 invite-arm, 2 holdout-arm patients.
const PANEL = [
  ...Array.from({ length: 8 }, (_, i) => patient(`inv-${i}`, false)),
  patient("hold-0", true),
  patient("hold-1", true),
];

describe("W9 attribution v1 — golden fixtures", () => {
  it("golden: displacement — equal arm rates mean zero incremental despite generated bookings", () => {
    const appointments = [
      appt("inv-0", "attended", "2026-07-03", true),
      appt("inv-1", "attended", "2026-07-10", true),
      appt("inv-2", "attended", "2026-07-15"),
      appt("inv-3", "attended", "2026-07-20"),
      appt("hold-0", "attended", "2026-07-12"),
    ];
    const result = countAttribution(PRACTICE, PANEL, appointments, WINDOW);
    expect(result).toEqual({
      version: "v1",
      window: WINDOW,
      inviteArm: { patients: 8, attended: 4, attendedPer1000: 500 },
      holdoutArm: { patients: 2, attended: 1, attendedPer1000: 500 },
      incrementalPer1000: 0,
      incrementalAttended: 0,
      naiveGeneratedAttended: 2,
    });
  });

  it("golden: positive incrementality, naive still overcounts", () => {
    const appointments = [
      appt("inv-0", "attended", "2026-07-03", true),
      appt("inv-1", "attended", "2026-07-05", true),
      appt("inv-2", "attended", "2026-07-08", true),
      appt("inv-3", "attended", "2026-07-15"),
      appt("inv-4", "attended", "2026-07-20"),
      appt("inv-5", "attended", "2026-07-28"),
      appt("hold-1", "attended", "2026-07-18"),
    ];
    const result = countAttribution(PRACTICE, PANEL, appointments, WINDOW);
    expect(result.inviteArm).toEqual({ patients: 8, attended: 6, attendedPer1000: 750 });
    expect(result.holdoutArm).toEqual({ patients: 2, attended: 1, attendedPer1000: 500 });
    expect(result.incrementalPer1000).toBe(250);
    expect(result.incrementalAttended).toBe(2);
    expect(result.naiveGeneratedAttended).toBe(3);
  });

  it("golden: negative incrementality is reported as computed, never clamped", () => {
    const appointments = [
      appt("inv-0", "attended", "2026-07-03"),
      appt("hold-0", "attended", "2026-07-10"),
      appt("hold-1", "attended", "2026-07-11"),
    ];
    const result = countAttribution(PRACTICE, PANEL, appointments, WINDOW);
    expect(result.inviteArm.attendedPer1000).toBe(125);
    expect(result.holdoutArm.attendedPer1000).toBe(1000);
    expect(result.incrementalPer1000).toBe(-875);
    expect(result.incrementalAttended).toBe(-7);
  });

  it("golden: everything that never counts, counts as nothing", () => {
    const appointments = [
      appt("inv-0", "booked", "2026-07-05"), // not attended yet
      appt("inv-1", "dna", "2026-07-06"),
      appt("inv-2", "cancelled", "2026-07-07"),
      appt(null, "open", "2026-07-08"),
      appt("inv-3", "attended", "2026-06-30"), // day before window
      appt("inv-4", "attended", "2026-08-01"), // day after window
      appt("stranger", "attended", "2026-07-09"), // not in the panel
      appt("inv-5", "attended", "2026-07-10", false, "prac-other" as PracticeId),
      appt("hold-0", "dna", "2026-07-11"),
    ];
    const result = countAttribution(PRACTICE, PANEL, appointments, WINDOW);
    expect(result.inviteArm).toEqual({ patients: 8, attended: 0, attendedPer1000: 0 });
    expect(result.holdoutArm).toEqual({ patients: 2, attended: 0, attendedPer1000: 0 });
    expect(result.incrementalPer1000).toBe(0);
    expect(result.naiveGeneratedAttended).toBe(0);
  });

  it("golden: window endpoints are inclusive; each attended visit counts, not each patient", () => {
    const appointments = [
      appt("inv-0", "attended", "2026-07-01"), // first day
      appt("inv-0", "attended", "2026-07-31"), // last day, same patient again
    ];
    const result = countAttribution(PRACTICE, PANEL, appointments, WINDOW);
    expect(result.inviteArm.attended).toBe(2);
  });

  it("no holdout arm means null incrementality, not zero", () => {
    const inviteOnly = PANEL.filter((p) => !p.holdout);
    const result = countAttribution(
      PRACTICE,
      inviteOnly,
      [appt("inv-0", "attended", "2026-07-03", true)],
      WINDOW,
    );
    expect(result.holdoutArm.patients).toBe(0);
    expect(result.incrementalPer1000).toBeNull();
    expect(result.incrementalAttended).toBeNull();
    expect(result.naiveGeneratedAttended).toBe(1);
  });

  it("empty panel yields zero counts and no claim", () => {
    const result = countAttribution(PRACTICE, [], [], WINDOW);
    expect(result.inviteArm).toEqual({ patients: 0, attended: 0, attendedPer1000: 0 });
    expect(result.incrementalPer1000).toBeNull();
  });

  it("definitions doc exists, matches the code version, and states the core laws", () => {
    const doc = readFileSync(path.resolve(__dirname, "../../docs/ATTRIBUTION.md"), "utf8");
    expect(doc).toContain(`Attribution definitions — ${ATTRIBUTION_VERSION}`);
    expect(doc).toContain("Intention-to-treat");
    expect(doc).toContain("What counts");
    expect(doc).toContain("What never counts");
    expect(doc).toContain("only as a contrast figure");
  });
});
