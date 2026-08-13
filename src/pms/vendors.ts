// W28: Best Practice / Halo PMS adapter skeletons — behind a flag, NO credentials
// (founder gate G1). The gate is enforced in code, W31-style: the constructor
// refuses any live vendor endpoint, so an adapter can only ever read recorded
// fixtures or a sandbox until the founder opens the gate (the live HTTP client and
// real field reconciliation are the W38/W39 follow-up). Each vendor's raw API shape
// is mapped to the W27 PmsReadAdapter contract by a VendorMapping; both vendors then
// pass the SAME contract suite — that is the point of the mapping layer.

import type { Appointment, AppointmentType, Patient, PatientId, PracticeId } from "@/domain/types";
import type {
  Cancellation,
  ConsentRecord,
  DateRange,
  PmsReadAdapter,
} from "@/pms/adapter";
import { withinRange } from "@/pms/adapter";

// --- Raw vendor payloads (representative of each published API's structure) -----
// Field names mirror each vendor's documented style; exact reconciliation against
// live API responses is part of the gated integration (W38 fixture-drift tests).

export interface BpRawPatient {
  PatientId: string;
  UsualProviderId: string | null;
  MobileConsent: boolean;
  OptedOut: boolean;
  LastVisitDate: string | null; // ISO date
  NextAppointmentDate: string | null; // ISO date
  ActiveRecall: boolean;
  ChronicDiseaseRegister: boolean;
}
export interface BpRawSlot {
  AppointmentId: string;
  ProviderId: string;
  StartTime: string; // ISO datetime
  Status: "Available" | "Booked" | "Cancelled";
  AppointmentType: string | null;
}
export interface BpRawCancellation {
  AppointmentId: string;
  ProviderId: string;
  PatientId: string;
  StartTime: string;
  CancelledAt: string;
}
export interface BpRawConsent {
  PatientId: string;
  SmsConsent: boolean;
  ConsentDate: string;
  ConsentSource: string;
}
export interface BpRawResponses {
  patients: BpRawPatient[];
  slots: BpRawSlot[];
  cancellations: BpRawCancellation[];
  consents: BpRawConsent[];
}

// Halo uses snake_case and different enum spellings — a genuinely different shape,
// which is why normalising to one contract earns its keep.
export interface HaloRawResponses {
  members: Array<{
    member_id: string;
    regular_gp: string | null;
    sms_ok: boolean;
    unsubscribed: boolean;
    last_seen: string | null;
    next_booking: string | null;
    recall_open: boolean;
    care_plan: boolean;
  }>;
  openings: Array<{
    id: string;
    gp: string;
    start: string;
    state: "open" | "filled" | "void";
    duration_min: number;
    mode: "in_person" | "video";
  }>;
  voids: Array<{ id: string; gp: string; member_id: string; start: string; voided_at: string }>;
  consents: Array<{ member_id: string; sms: boolean; at: string; via: string }>;
}

// --- Transport (no live HTTP in this phase) ------------------------------------

export interface PmsApiClient<Raw> {
  fetchAll(): Promise<Raw>;
}

/** Serves a recorded fixture — the only client permitted before the gate opens. */
export class RecordedFixtureClient<Raw> implements PmsApiClient<Raw> {
  constructor(private readonly fixture: Raw) {}
  async fetchAll(): Promise<Raw> {
    return structuredClone(this.fixture);
  }
}

// --- Vendor mapping ------------------------------------------------------------

export interface VendorMapping<Raw> {
  vendor: string;
  toPatients(raw: Raw, practiceId: PracticeId): Patient[];
  toOpenSlots(raw: Raw, practiceId: PracticeId): Appointment[];
  toCancellations(raw: Raw): Cancellation[];
  toConsents(raw: Raw): ConsentRecord[];
}

function mapApptType(raw: string | null): AppointmentType | undefined {
  switch ((raw ?? "").toLowerCase()) {
    case "standard":
    case "in_person":
      return "standard";
    case "long":
      return "long";
    case "telehealth":
    case "video":
      return "telehealth";
    default:
      return undefined;
  }
}

export const bestPracticeMapping: VendorMapping<BpRawResponses> = {
  vendor: "best-practice",
  toPatients(raw, practiceId) {
    return raw.patients.map((p) => ({
      id: p.PatientId as PatientId,
      practiceId,
      usualClinicianId: (p.UsualProviderId as Patient["usualClinicianId"]) ?? null,
      smsConsent: p.MobileConsent,
      optedOut: p.OptedOut,
      lastAttendedAt: p.LastVisitDate,
      futureBookingAt: p.NextAppointmentDate,
      activeRecall: p.ActiveRecall,
      chronicCare: p.ChronicDiseaseRegister,
      holdout: false, // Meherr-internal; the PMS never sets this
    }));
  },
  toOpenSlots(raw, practiceId) {
    return raw.slots
      .filter((s) => s.Status === "Available")
      .map((s) => ({
        id: s.AppointmentId as Appointment["id"],
        practiceId,
        clinicianId: s.ProviderId as Appointment["clinicianId"],
        startsAt: s.StartTime,
        status: "open" as const,
        patientId: null,
        generatedByInvitation: false,
        appointmentType: mapApptType(s.AppointmentType),
      }));
  },
  toCancellations(raw) {
    return raw.cancellations.map((c) => ({
      appointmentId: c.AppointmentId,
      clinicianId: c.ProviderId,
      patientId: c.PatientId,
      startsAt: c.StartTime,
      cancelledAt: c.CancelledAt,
    }));
  },
  toConsents(raw) {
    return raw.consents.map((c) => ({
      patientId: c.PatientId,
      smsConsent: c.SmsConsent,
      capturedAt: c.ConsentDate,
      source: c.ConsentSource,
    }));
  },
};

export const haloMapping: VendorMapping<HaloRawResponses> = {
  vendor: "halo",
  toPatients(raw, practiceId) {
    return raw.members.map((m) => ({
      id: m.member_id as PatientId,
      practiceId,
      usualClinicianId: (m.regular_gp as Patient["usualClinicianId"]) ?? null,
      smsConsent: m.sms_ok,
      optedOut: m.unsubscribed,
      lastAttendedAt: m.last_seen,
      futureBookingAt: m.next_booking,
      activeRecall: m.recall_open,
      chronicCare: m.care_plan,
      holdout: false,
    }));
  },
  toOpenSlots(raw, practiceId) {
    return raw.openings
      .filter((o) => o.state === "open")
      .map((o) => ({
        id: o.id as Appointment["id"],
        practiceId,
        clinicianId: o.gp as Appointment["clinicianId"],
        startsAt: o.start,
        status: "open" as const,
        patientId: null,
        generatedByInvitation: false,
        appointmentType: mapApptType(o.mode),
      }));
  },
  toCancellations(raw) {
    return raw.voids.map((v) => ({
      appointmentId: v.id,
      clinicianId: v.gp,
      patientId: v.member_id,
      startsAt: v.start,
      cancelledAt: v.voided_at,
    }));
  },
  toConsents(raw) {
    return raw.consents.map((c) => ({
      patientId: c.member_id,
      smsConsent: c.sms,
      capturedAt: c.at,
      source: c.via,
    }));
  },
};

// --- Adapter -------------------------------------------------------------------

export interface VendorAdapterConfig {
  practiceId: string;
  /** Where the adapter WOULD talk to the PMS. Live vendor hosts are refused (G1). */
  baseUrl: string;
}

// Live production hosts that this phase must never reach.
const LIVE_HOST_PATTERNS = [/bpsoftware\.net$/i, /bestpractice/i, /halohealth/i, /haloconnect/i];

export class VendorPmsAdapter<Raw> implements PmsReadAdapter {
  readonly name: string;
  readonly practiceId: string;

  constructor(
    config: VendorAdapterConfig,
    private readonly mapping: VendorMapping<Raw>,
    private readonly client: PmsApiClient<Raw>,
  ) {
    const host = new URL(config.baseUrl).hostname;
    if (LIVE_HOST_PATTERNS.some((re) => re.test(host))) {
      throw new Error(
        `founder gate G1: live PMS endpoints are not permitted in this phase (${host})`,
      );
    }
    this.name = mapping.vendor;
    this.practiceId = config.practiceId;
  }

  async listPatients(): Promise<Patient[]> {
    return this.mapping.toPatients(await this.client.fetchAll(), this.practiceId as PracticeId);
  }

  async listOpenSlots(range: DateRange): Promise<Appointment[]> {
    const slots = this.mapping.toOpenSlots(await this.client.fetchAll(), this.practiceId as PracticeId);
    return slots.filter((s) => withinRange(s.startsAt, range));
  }

  async listCancellations(range: DateRange): Promise<Cancellation[]> {
    const cancellations = this.mapping.toCancellations(await this.client.fetchAll());
    return cancellations.filter((c) => withinRange(c.cancelledAt, range));
  }

  async listConsents(): Promise<ConsentRecord[]> {
    return this.mapping.toConsents(await this.client.fetchAll());
  }
}
