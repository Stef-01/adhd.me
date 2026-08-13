// W28: recorded PMS API fixtures — synthetic, hand-authored to mirror each vendor's
// published response structure. No real patient data (G2), no real endpoints (G1).
// Both fixtures describe the same practice-week so the contract exercises identical
// invariants across two different raw shapes. Anchor date 2026-09-01.

import type { BpRawResponses, HaloRawResponses } from "@/pms/vendors";

export const FIXTURE_RANGE = {
  populated: { fromIso: "2026-09-01", toIso: "2026-09-07" },
  empty: { fromIso: "2000-01-01", toIso: "2000-01-31" },
};

export const BEST_PRACTICE_FIXTURE: BpRawResponses = {
  patients: [
    { PatientId: "bp-1", UsualProviderId: "bp-gp-1", MobileConsent: true, OptedOut: false, LastVisitDate: "2026-01-10", NextAppointmentDate: null, ActiveRecall: false, ChronicDiseaseRegister: true },
    { PatientId: "bp-2", UsualProviderId: "bp-gp-1", MobileConsent: false, OptedOut: false, LastVisitDate: "2025-11-02", NextAppointmentDate: "2026-10-01", ActiveRecall: false, ChronicDiseaseRegister: false },
    { PatientId: "bp-3", UsualProviderId: "bp-gp-2", MobileConsent: true, OptedOut: true, LastVisitDate: "2026-03-20", NextAppointmentDate: null, ActiveRecall: true, ChronicDiseaseRegister: false },
    { PatientId: "bp-4", UsualProviderId: null, MobileConsent: true, OptedOut: false, LastVisitDate: null, NextAppointmentDate: null, ActiveRecall: false, ChronicDiseaseRegister: false },
  ],
  slots: [
    { AppointmentId: "bp-a1", ProviderId: "bp-gp-1", StartTime: "2026-09-01T09:00:00+10:00", Status: "Available", AppointmentType: "Standard" },
    { AppointmentId: "bp-a2", ProviderId: "bp-gp-1", StartTime: "2026-09-01T09:15:00+10:00", Status: "Available", AppointmentType: "Long" },
    { AppointmentId: "bp-a3", ProviderId: "bp-gp-2", StartTime: "2026-09-02T14:00:00+10:00", Status: "Available", AppointmentType: "Telehealth" },
    { AppointmentId: "bp-a4", ProviderId: "bp-gp-2", StartTime: "2026-09-02T14:30:00+10:00", Status: "Booked", AppointmentType: "Standard" },
  ],
  cancellations: [
    { AppointmentId: "bp-c1", ProviderId: "bp-gp-1", PatientId: "bp-2", StartTime: "2026-09-03T11:00:00+10:00", CancelledAt: "2026-09-02T08:00:00+10:00" },
  ],
  consents: [
    { PatientId: "bp-1", SmsConsent: true, ConsentDate: "2025-06-01T09:00:00+10:00", ConsentSource: "bp:intake" },
    { PatientId: "bp-2", SmsConsent: false, ConsentDate: "2025-06-01T09:00:00+10:00", ConsentSource: "bp:intake" },
    { PatientId: "bp-3", SmsConsent: true, ConsentDate: "2025-06-01T09:00:00+10:00", ConsentSource: "bp:intake" },
    { PatientId: "bp-4", SmsConsent: true, ConsentDate: "2025-06-01T09:00:00+10:00", ConsentSource: "bp:intake" },
  ],
};

export const HALO_FIXTURE: HaloRawResponses = {
  members: [
    { member_id: "h-1", regular_gp: "h-gp-1", sms_ok: true, unsubscribed: false, last_seen: "2026-02-01", next_booking: null, recall_open: false, care_plan: true },
    { member_id: "h-2", regular_gp: "h-gp-2", sms_ok: false, unsubscribed: false, last_seen: "2025-12-15", next_booking: "2026-10-05", recall_open: true, care_plan: false },
    { member_id: "h-3", regular_gp: null, sms_ok: true, unsubscribed: false, last_seen: null, next_booking: null, recall_open: false, care_plan: false },
  ],
  openings: [
    { id: "h-o1", gp: "h-gp-1", start: "2026-09-01T10:00:00+10:00", state: "open", duration_min: 15, mode: "in_person" },
    { id: "h-o2", gp: "h-gp-2", start: "2026-09-03T16:00:00+10:00", state: "open", duration_min: 20, mode: "video" },
    { id: "h-o3", gp: "h-gp-1", start: "2026-09-04T10:00:00+10:00", state: "filled", duration_min: 15, mode: "in_person" },
  ],
  voids: [
    { id: "h-v1", gp: "h-gp-2", member_id: "h-2", start: "2026-09-05T09:00:00+10:00", voided_at: "2026-09-04T18:00:00+10:00" },
  ],
  consents: [
    { member_id: "h-1", sms: true, at: "2025-05-01T09:00:00+10:00", via: "halo:portal" },
    { member_id: "h-2", sms: false, at: "2025-05-01T09:00:00+10:00", via: "halo:portal" },
    { member_id: "h-3", sms: true, at: "2025-05-01T09:00:00+10:00", via: "halo:portal" },
  ],
};
