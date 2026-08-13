// W27: synthetic PMS adapter — the reference implementation of PmsReadAdapter over
// the W3 synthetic practice. Credential-free and deterministic; it is what the
// contract suite runs against, and the stand-in every downstream Q3 unit reads from
// until a real (gated) PMS adapter is wired.

import type { Appointment, Patient } from "@/domain/types";
import { isoDaysFrom } from "@/lib/dates";
import { generatePractice, type SyntheticPractice } from "@/synthetic/generate";
import type { Cancellation, ConsentRecord, DateRange, PmsReadAdapter } from "@/pms/adapter";
import { withinRange } from "@/pms/adapter";

export interface SyntheticPmsOptions {
  seed: number;
  patientCount: number;
  clinicianCount: number;
  scheduleWeeks: number;
  todayIso: string;
}

export const DEFAULT_SYNTHETIC_PMS_OPTIONS: SyntheticPmsOptions = {
  seed: 20260809,
  patientCount: 300,
  clinicianCount: 4,
  scheduleWeeks: 4,
  todayIso: "2026-08-09",
};

/**
 * Derive cancellations from booked slots deterministically — every 10th booked
 * appointment is treated as recently cancelled, freeing its slot. This does NOT
 * touch the generator's RNG stream (it reads finished output), so seeded downstream
 * behaviour is unchanged.
 */
function deriveCancellations(data: SyntheticPractice): Cancellation[] {
  const booked = data.appointments.filter((a) => a.status === "booked" && a.patientId !== null);
  const out: Cancellation[] = [];
  for (let i = 0; i < booked.length; i += 10) {
    const appt = booked[i]!;
    const startDate = appt.startsAt.slice(0, 10);
    out.push({
      appointmentId: appt.id,
      clinicianId: appt.clinicianId,
      patientId: appt.patientId as string,
      startsAt: appt.startsAt,
      cancelledAt: `${isoDaysFrom(startDate, -1)}T12:00:00+10:00`,
    });
  }
  return out;
}

export class SyntheticPmsAdapter implements PmsReadAdapter {
  readonly name = "synthetic";
  readonly practiceId: string;
  private readonly data: SyntheticPractice;
  private readonly cancellations: Cancellation[];
  private readonly consentCapturedAt: string;

  constructor(options: SyntheticPmsOptions = DEFAULT_SYNTHETIC_PMS_OPTIONS) {
    this.data = generatePractice({
      seed: options.seed,
      patientCount: options.patientCount,
      clinicianCount: options.clinicianCount,
      scheduleWeeks: options.scheduleWeeks,
      todayIso: options.todayIso,
    });
    this.practiceId = this.data.practice.id;
    this.cancellations = deriveCancellations(this.data);
    this.consentCapturedAt = `${isoDaysFrom(options.todayIso, -365)}T09:00:00+10:00`;
  }

  async listPatients(): Promise<Patient[]> {
    return this.data.patients.map((p) => ({ ...p }));
  }

  async listOpenSlots(range: DateRange): Promise<Appointment[]> {
    return this.data.appointments
      .filter((a) => a.status === "open" && withinRange(a.startsAt, range))
      .map((a) => ({ ...a }));
  }

  async listCancellations(range: DateRange): Promise<Cancellation[]> {
    return this.cancellations.filter((c) => withinRange(c.cancelledAt, range)).map((c) => ({ ...c }));
  }

  async listConsents(): Promise<ConsentRecord[]> {
    return this.data.patients.map((p) => ({
      patientId: p.id,
      smsConsent: p.smsConsent,
      capturedAt: this.consentCapturedAt,
      source: "pms:intake-form",
    }));
  }
}
