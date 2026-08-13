// W6: provider-agnostic SMS adapter. Mock only until founder gate G3 (live SMS).

import type { Invitation, Patient } from "@/domain/types";

export interface OutboundSms {
  to: string; // synthetic identifier in this phase — never a real phone number
  body: string;
  invitationId: string;
}

export interface SmsAdapter {
  send(message: OutboundSms): Promise<{ delivered: boolean }>;
  /**
   * Set ONLY by adapters whose send cannot fail, so a caller may discard the promise
   * without losing a delivery outcome. The synchronous sim harness fires-and-forgets
   * (`void sms.send(...)`) and records `invitation_sent` unconditionally; that is honest
   * for the mock and a lie for any real provider. Real adapters therefore never set this,
   * so wiring one into the sim throws instead of silently logging unsent messages as sent.
   * Removing this guard is part of opening founder gate G3 — see W51 audit finding A1:
   * the send path must become async and outcome-aware before live SMS.
   */
  readonly fireAndForgetSafe?: true;
}

export class MockSmsAdapter implements SmsAdapter {
  readonly sent: OutboundSms[] = [];
  /** In-memory and infallible — discarding the promise loses nothing. */
  readonly fireAndForgetSafe = true as const;
  async send(message: OutboundSms): Promise<{ delivered: boolean }> {
    this.sent.push(message);
    return { delivered: true };
  }
}

/**
 * STOP handling — terminal, in one place.
 * Returns updated copies: the patient is opted out forever; every outstanding
 * invitation for them is closed as opted_out. No pathway re-enables contact.
 */
export function handleStop(
  patient: Patient,
  invitations: Invitation[],
): { patient: Patient; invitations: Invitation[] } {
  return {
    patient: { ...patient, optedOut: true },
    invitations: invitations.map((inv) =>
      inv.patientId === patient.id && (inv.status === "queued" || inv.status === "sent")
        ? { ...inv, status: "opted_out" }
        : inv,
    ),
  };
}

/**
 * Guard for callers that discard the send promise. Throws for any adapter that has not
 * declared itself infallible — the fail-closed half of W51 audit finding A1.
 */
export function assertFireAndForgetSafe(adapter: SmsAdapter): void {
  if (adapter.fireAndForgetSafe !== true) {
    throw new Error(
      "sms adapter is not fire-and-forget safe: discarding its send promise would record " +
        "unsent messages as sent (W51 finding A1). Make the send path async and " +
        "outcome-aware before using a real provider (founder gate G3).",
    );
  }
}
