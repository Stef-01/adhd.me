// W43: complaints store (mock, synthetic only — same globalThis posture as the other
// console stores). The opt-out side effect goes through the rail store so a complaint
// that says "stop contacting me" closes every outstanding offer immediately, and the
// audit trail records it. Open complaints ARE the practice notification: the console
// banner and the W16 guardrail monitor both read the same count.
// W51: the opt-out also writes a privacy suppression (durable across PMS re-ingest)
// and reports what it actually did; complaints expose scrub/export hooks so patient
// erasure and access requests reach this store too.

import { getStore } from "@/booking/store";
import { getConsole } from "@/console/store";
import type { AuditEvent } from "@/domain/types";
import { patientRef } from "@/privacy/privacy";
import { getPrivacy } from "@/privacy/state";
import {
  intakeComplaint,
  resolveComplaint,
  triageComplaint,
  validateIntake,
  type ComplaintRecord,
  type ComplaintSeverity,
  type FieldErrors,
  type IntakeInput,
} from "./workflow";

export interface ComplaintsState {
  complaints: ComplaintRecord[];
  seq: number;
}

const globalStore = globalThis as { __careyieldComplaints?: ComplaintsState };

export function getComplaints(): ComplaintsState {
  globalStore.__careyieldComplaints ??= { complaints: [], seq: 1 };
  return globalStore.__careyieldComplaints;
}

export function resetComplaints(): ComplaintsState {
  globalStore.__careyieldComplaints = { complaints: [], seq: 1 };
  return globalStore.__careyieldComplaints;
}

/**
 * Open complaints for ONE practice.
 *
 * W206: took no practice and counted the whole store. The console home rendered the result as
 * "N open complaints — review now" to whichever practice was signed in, so a practice with none
 * of its own was told to review somebody else's. The same shape as W181's ops queue, on a store
 * that also holds a patient identifier.
 */
export function openComplaintCount(practiceId: string): number {
  return complaintsFor(practiceId).filter((c) => c.status === "open").length;
}

/**
 * Complaints belonging to one practice.
 *
 * Filtered as the query rather than afterwards — W123's rule, and the reason W91/W103/W181 all
 * gave: a later filter is a line somebody can delete, and the deletion looks like a tidy-up.
 */
export function complaintsFor(practiceId: string): ComplaintRecord[] {
  return getComplaints().complaints.filter((c) => c.practiceId === practiceId);
}

interface OptOutOutcome {
  /** Outstanding offers closed right now. */
  closed: number;
  /** Did the practice hold ANY record under this identifier? */
  matched: boolean;
}

/** Terminal opt-out through the rail: every queued/sent offer for the patient closes. */
function applyOptOutToRail(patientId: string, at: string): OptOutOutcome {
  const rail = getStore();
  let closed = 0;
  const invitations = rail.state.invitations.map((inv) => {
    if (inv.patientId === patientId && (inv.status === "queued" || inv.status === "sent")) {
      closed++;
      return { ...inv, status: "opted_out" as const };
    }
    return inv;
  });
  const matched =
    rail.state.invitations.some((i) => i.patientId === patientId) ||
    rail.state.appointments.some((a) => a.patientId === patientId);
  const auditEvents: AuditEvent[] = [
    ...rail.state.auditEvents,
    {
      // W51: the console practice owns this event; the first invitation in the rail
      // is not necessarily (and in a multi-practice rail, is not) the right one.
      practiceId: (getConsole().practices[0]?.practice.id ??
        rail.state.invitations[0]?.practiceId ??
        "prac-demo") as AuditEvent["practiceId"],
      kind: "patient_opted_out",
      at,
      subjectId: patientId,
      detail: matched
        ? "opt-out via complaint intake"
        : "opt-out via complaint intake — identifier matched no held record",
    },
  ];
  rail.state = { ...rail.state, invitations, auditEvents };
  return { closed, matched };
}

/**
 * W51: make "no further contact" durable. Closing today's offers is not the promise
 * the complainant was given — a later PMS re-ingest would re-invite them. The privacy
 * suppression list is the one mechanism that survives re-ingest, so the opt-out
 * writes there too, keyed by the same one-way patient reference erasure uses.
 */
function suppressPatient(patientId: string, at: string): void {
  const privacy = getPrivacy();
  const ref = patientRef(patientId);
  if (!privacy.suppressions.some((s) => s.ref === ref)) {
    privacy.suppressions.push({ ref, at });
  }
}

/**
 * Take a complaint for a named practice.
 *
 * W206 made `practiceId` an argument. It was stamped `"prac-console"` inside `intakeComplaint`,
 * an id no console ever mints, so every complaint in the store belonged to nobody and every read
 * had to be unscoped to show anything at all.
 */
export function submitComplaint(input: IntakeInput, at: string, practiceId: string): FieldErrors {
  const errors = validateIntake(input);
  if (Object.keys(errors).length > 0) return errors;
  const state = getComplaints();
  const record = intakeComplaint(input, `cmp-${state.seq++}`, at, practiceId);
  if (input.wantsOptOut && record.patientId) {
    const { closed, matched } = applyOptOutToRail(record.patientId, at);
    suppressPatient(record.patientId, at);
    record.optOutApplied = true;
    record.optOutMatchedPatient = matched;
    // The timeline states what actually happened. An identifier that matched nothing
    // is suppressed all the same, but staff are told — because the real patient is
    // still receiving messages until the identifier is corrected.
    record.timeline.push({
      at,
      event: matched
        ? `opt-out applied — no further contact (${closed} outstanding offer(s) closed)`
        : "opt-out recorded, but the identifier matched no held record — check it",
      byEmail: null,
    });
  }
  state.complaints.push(record);
  return {};
}

/** W51: complaints held under a patient identifier, for an APP 12 access request. */
export function complaintsForPatient(patientId: string): ComplaintRecord[] {
  return getComplaints().complaints.filter((c) => c.patientId === patientId);
}

/**
 * W51: drop the patient link from every complaint held under this identifier. The
 * complaint itself is the practice's own handling record and stays (as an attended
 * appointment's slot history stays); the person does not. Returns the count scrubbed.
 */
export function scrubPatientFromComplaints(patientId: string, at: string): number {
  const state = getComplaints();
  let scrubbed = 0;
  state.complaints = state.complaints.map((c) => {
    if (c.patientId !== patientId) return c;
    scrubbed++;
    return {
      ...c,
      patientId: null,
      timeline: [...c.timeline, { at, event: "patient identifier erased on request", byEmail: null }],
    };
  });
  return scrubbed;
}

export function triageInStore(id: string, severity: ComplaintSeverity, at: string, byEmail: string): void {
  const state = getComplaints();
  state.complaints = state.complaints.map((c) =>
    c.id === id ? triageComplaint(c, severity, at, byEmail) : c,
  );
}

export function resolveInStore(id: string, resolution: string, at: string, byEmail: string): FieldErrors {
  const state = getComplaints();
  const target = state.complaints.find((c) => c.id === id);
  if (!target) return { form: "Unknown complaint." };
  const result = resolveComplaint(target, resolution, at, byEmail);
  if (!result.ok) return result.errors;
  state.complaints = state.complaints.map((c) => (c.id === id ? result.complaint : c));
  return {};
}
