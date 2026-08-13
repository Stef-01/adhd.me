// W3: synthetic practice engine — a realistic 10-GP mixed-billing practice, fully deterministic.
// Real patient data never enters this codebase (founder gate G2); this generator is the
// substrate for every downstream engine, test and demo.

import type {
  Appointment,
  AppointmentId,
  Clinician,
  ClinicianId,
  Patient,
  PatientId,
  Practice,
  PracticeId,
} from "@/domain/types";
import { isoDaysFrom } from "@/lib/dates";
import { chance, intBetween, mulberry32, pick, type Rng } from "./rng";

export interface GeneratorOptions {
  seed: number;
  patientCount: number; // ~12k for the reference practice
  clinicianCount: number; // 10
  scheduleWeeks: number; // upcoming weeks of appointment supply to generate
  todayIso: string; // anchor date, e.g. "2026-08-08" (passed in — no Date.now)
}

export interface SyntheticPractice {
  practice: Practice;
  clinicians: Clinician[];
  patients: Patient[];
  appointments: Appointment[]; // upcoming schedule (open/booked)
}

const CALIBRATION = {
  smsConsentRate: 0.85,
  optOutRate: 0.02,
  usualClinicianRate: 0.9,
  chronicCareRate: 0.3,
  activeRecallRate: 0.1,
  futureBookingRate: 0.15,
  participatingClinicians: 0.8,
  openSlotRate: 0.08, // share of upcoming capacity unfilled — the wedge
  slotsPerClinicianPerDay: 24,
  clinicDaysPerWeek: 5,
  maxMonthsSinceLastVisit: 36,
} as const;

function generatePatient(
  rng: Rng,
  i: number,
  practiceId: PracticeId,
  clinicians: Clinician[],
  todayIso: string,
): Patient {
  // Visit recency: weighted toward recent (60% within 6 months, long tail to 36).
  const monthsSince = chance(rng, 0.6)
    ? intBetween(rng, 0, 6)
    : intBetween(rng, 7, CALIBRATION.maxMonthsSinceLastVisit);
  const neverAttended = chance(rng, 0.05);
  return {
    id: `pat-${i}` as PatientId,
    practiceId,
    usualClinicianId: chance(rng, CALIBRATION.usualClinicianRate)
      ? pick(rng, clinicians).id
      : null,
    smsConsent: chance(rng, CALIBRATION.smsConsentRate),
    optedOut: chance(rng, CALIBRATION.optOutRate),
    lastAttendedAt: neverAttended
      ? null
      : isoDaysFrom(todayIso, -(monthsSince * 30 + intBetween(rng, 0, 29))),
    futureBookingAt: chance(rng, CALIBRATION.futureBookingRate)
      ? isoDaysFrom(todayIso, intBetween(rng, 1, 60))
      : null,
    activeRecall: chance(rng, CALIBRATION.activeRecallRate),
    chronicCare: chance(rng, CALIBRATION.chronicCareRate),
    holdout: false, // W8 assigns arms; generator leaves everyone invitable
  };
}

export function generatePractice(opts: GeneratorOptions): SyntheticPractice {
  const rng = mulberry32(opts.seed);
  const practiceId = "prac-1" as PracticeId;

  const practice: Practice = {
    id: practiceId,
    name: "Synthetic Family Practice",
    timezone: "Australia/Sydney",
    holdoutRate: 0.2,
  };

  const clinicians: Clinician[] = Array.from({ length: opts.clinicianCount }, (_, i) => ({
    id: `cli-${i}` as ClinicianId,
    practiceId,
    displayName: `Dr Synthetic ${i + 1}`,
    participating: i < Math.round(opts.clinicianCount * CALIBRATION.participatingClinicians),
  }));

  const patients: Patient[] = Array.from({ length: opts.patientCount }, (_, i) =>
    generatePatient(rng, i, practiceId, clinicians, opts.todayIso),
  );

  const appointments: Appointment[] = [];
  let apptSeq = 0;
  for (let week = 0; week < opts.scheduleWeeks; week++) {
    for (let day = 0; day < CALIBRATION.clinicDaysPerWeek; day++) {
      const dateIso = isoDaysFrom(opts.todayIso, week * 7 + day + 1);
      for (const clinician of clinicians) {
        for (let slot = 0; slot < CALIBRATION.slotsPerClinicianPerDay; slot++) {
          const open = chance(rng, CALIBRATION.openSlotRate);
          const hour = 8 + Math.floor(slot / 4);
          const minute = (slot % 4) * 15;
          // Type mix (W17 fillable-types) assigned deterministically from the slot
          // index — it must NOT draw from `rng`, or it would shift the seeded stream
          // every downstream unit relies on.
          const apptType = apptSeq % 8 === 0 ? "telehealth" : apptSeq % 3 === 0 ? "long" : "standard";
          appointments.push({
            id: `apt-${apptSeq++}` as AppointmentId,
            practiceId,
            clinicianId: clinician.id,
            startsAt: `${dateIso}T${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}:00+10:00`,
            status: open ? "open" : "booked",
            patientId: open ? null : pick(rng, patients).id,
            generatedByInvitation: false,
            appointmentType: apptType,
          });
        }
      }
    }
  }

  return { practice, clinicians, patients, appointments };
}

/** Summary stats used by tests and the (future) dashboard. */
export function practiceStats(data: SyntheticPractice) {
  const { patients, appointments } = data;
  const n = patients.length;
  const rate = (k: (p: Patient) => boolean) => patients.filter(k).length / n;
  const openSlots = appointments.filter((a) => a.status === "open").length;
  return {
    patientCount: n,
    smsConsentRate: rate((p) => p.smsConsent),
    optOutRate: rate((p) => p.optedOut),
    usualClinicianRate: rate((p) => p.usualClinicianId !== null),
    chronicCareRate: rate((p) => p.chronicCare),
    activeRecallRate: rate((p) => p.activeRecall),
    futureBookingRate: rate((p) => p.futureBookingAt !== null),
    openSlotRate: openSlots / appointments.length,
    openSlotsPerWeek: openSlots / 4,
  };
}
