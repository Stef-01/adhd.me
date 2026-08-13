// W7: booking rail (mock) — the state transition behind the booking page.
// Pure function over a state snapshot: book one invitation into the earliest open
// slot of its offered session; when the session fills, every other outstanding
// offer for that session expires (venture brief: offers lapse when capacity is gone).

import { expireOnFill } from "@/engine/pool";
import type { Appointment, AppointmentId, AuditEvent, Invitation } from "@/domain/types";

export interface RailState {
  appointments: Appointment[];
  invitations: Invitation[];
  auditEvents: AuditEvent[];
}

export type BookingRefusal =
  | "not_found"
  | "already_booked"
  | "expired"
  | "opted_out"
  | "session_full";

export type BookingResult =
  | { ok: true; state: RailState; appointmentId: AppointmentId }
  | { ok: false; state: RailState; reason: BookingRefusal };

function sessionSlots(
  state: RailState,
  invitation: Invitation,
  allowedSlotIds?: ReadonlySet<string>,
): Appointment[] {
  return state.appointments.filter(
    (a) =>
      a.clinicianId === invitation.clinicianId &&
      a.status === "open" &&
      a.startsAt.startsWith(invitation.sessionDate) &&
      (allowedSlotIds === undefined || allowedSlotIds.has(a.id)),
  );
}

/**
 * Book one invitation into its session. `allowedSlotIds`, when given, is the session's
 * offerable set fixed at pool time (W17 session config: fillable types, scheduling window,
 * protected capacity) — bookings may never land outside it, and the session counts as full
 * for expiry once that set is exhausted, even while protected slots remain open.
 */
export function bookInvitation(
  state: RailState,
  invitationId: string,
  at: string,
  allowedSlotIds?: ReadonlySet<string>,
): BookingResult {
  const invitation = state.invitations.find((i) => i.id === invitationId);
  if (!invitation) return { ok: false, state, reason: "not_found" };
  if (invitation.status === "booked") return { ok: false, state, reason: "already_booked" };
  if (invitation.status === "expired") return { ok: false, state, reason: "expired" };
  if (invitation.status === "opted_out") return { ok: false, state, reason: "opted_out" };

  const open = sessionSlots(state, invitation, allowedSlotIds).sort((a, b) =>
    a.startsAt < b.startsAt ? -1 : 1,
  );
  const slot = open[0];
  if (!slot) return { ok: false, state, reason: "session_full" };

  const appointments = state.appointments.map((a) =>
    a.id === slot.id
      ? { ...a, status: "booked" as const, patientId: invitation.patientId, generatedByInvitation: true }
      : a,
  );
  let invitations = state.invitations.map((i) =>
    i.id === invitation.id ? { ...i, status: "booked" as const } : i,
  );
  const auditEvents: AuditEvent[] = [
    ...state.auditEvents,
    {
      practiceId: invitation.practiceId,
      kind: "invitation_booked",
      at,
      subjectId: invitation.id,
      detail: `appointment ${slot.id}`,
    },
  ];

  if (open.length === 1) {
    // Last slot just filled — expire the session's other outstanding offers.
    const sameSession = (i: Invitation) =>
      i.clinicianId === invitation.clinicianId && i.sessionDate === invitation.sessionDate;
    const expired = new Map(
      expireOnFill(invitations.filter(sameSession), 0).map((i) => [i.id, i]),
    );
    invitations = invitations.map((i) => expired.get(i.id) ?? i);
    for (const i of invitations) {
      if (sameSession(i) && i.status === "expired") {
        auditEvents.push({
          practiceId: i.practiceId,
          kind: "invitation_expired",
          at,
          subjectId: i.id,
          detail: "session filled",
        });
      }
    }
  }

  return { ok: true, state: { appointments, invitations, auditEvents }, appointmentId: slot.id };
}
