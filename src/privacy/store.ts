// W33: privacy store (mock, synthetic only — same globalThis posture as the other
// console stores). Holds the practice's retention config, deletion records and the
// suppression list; the patient-touching dataset itself lives in the rail store.

import { getStore } from "@/booking/store";
import { complaintsForPatient, scrubPatientFromComplaints } from "@/complaints/store";
import { scrubPatientFromReferrals } from "@/referrals/store";
import type { ComplaintRecord } from "@/complaints/workflow";
import {
  applyRetention,
  deletePatient,
  exportPatientData,
  isSuppressed,
  type DeletionRecord,
  type PatientExport,
  type PrivacyDataset,
} from "./privacy";
import { getPrivacy } from "./state";

export { getPrivacy, resetPrivacy, type PrivacyState } from "./state";

function railDataset(): PrivacyDataset {
  const rail = getStore();
  return {
    invitations: rail.state.invitations,
    appointments: rail.state.appointments,
    auditEvents: rail.state.auditEvents,
    outcomes: [], // W15 outcome records are stored de-identified (patient labels, not ids)
  };
}

export interface ConsoleExport extends PatientExport {
  suppressed: boolean;
  /** W51: complaints live in their own store; an access request covers them too. */
  complaints: ComplaintRecord[];
}

export function exportForPatient(patientId: string, nowIso: string): ConsoleExport {
  const railExport = exportPatientData(railDataset(), patientId, nowIso);
  const complaints = complaintsForPatient(patientId);
  return {
    ...railExport,
    held: railExport.held || complaints.length > 0,
    complaints,
    suppressed: isSuppressed(getPrivacy().suppressions, patientId),
  };
}

export function deletePatientEverywhere(patientId: string, nowIso: string): DeletionRecord {
  const rail = getStore();
  const result = deletePatient(railDataset(), patientId, nowIso);
  rail.state = {
    invitations: result.dataset.invitations,
    appointments: result.dataset.appointments,
    auditEvents: result.dataset.auditEvents,
  };
  // W51: "delete everywhere" means everywhere. The complaints store keeps its own
  // records, so the pure rail deletion is composed with a complaints scrub here —
  // otherwise a raw patientId survives an erasure the console reports as complete.
  const complaints = scrubPatientFromComplaints(patientId, nowIso);
  // W137: the GP-to-GP rail holds patient-linked records on BOTH sides of a handover, so
  // "everywhere" has to include the referrals another practice was sent. Composed here for the
  // same reason complaints were: a store that erasure does not reach is a store the console
  // reports as clean while a raw patientId survives in it.
  const referrals = scrubPatientFromReferrals(patientId);
  const deletion: DeletionRecord = {
    ...result.deletion,
    removed: { ...result.deletion.removed, complaints, referrals: referrals.documents },
  };
  const privacy = getPrivacy();
  privacy.deletions.push(deletion);
  privacy.suppressions.push(result.suppression);
  return deletion;
}

export function runRetention(nowIso: string): void {
  const rail = getStore();
  const pruned = applyRetention(railDataset(), getPrivacy().retention, nowIso);
  rail.state = {
    invitations: pruned.invitations,
    appointments: pruned.appointments,
    auditEvents: pruned.auditEvents,
  };
}
