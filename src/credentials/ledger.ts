// W113: where a practice's verification log actually lives.
//
// W110 made the log a value and kept it pure, which is right — a state machine that reaches
// for storage is one you cannot test by replay. But a console needs somewhere to read it
// from, so this is that place and nothing more: a per-practice log, an append that goes
// through W110's transition rules, and reads that are SCOPED BY SUBJECT.
//
// The scoping is the point. W109 refused clinicians access to the evidence vault and said
// why: "clinician" is the role every clinical user holds, so a role-based grant hands every
// clinician every colleague's file. It also said what the right answer looks like — scope the
// read to the SUBJECT, not to the role — and this is that:
//
//   `ownCredentials(practiceId, clinicianId)` is the only read a clinician surface uses, and
//   it takes the subject as an argument rather than filtering afterwards. There is no
//   "everything, then narrow it" step for a future refactor to drop.
//
// The practice-wide read is separate and authorized separately. Two functions, because one
// function with a "showAll" flag is one `if` away from being the wrong one.

import {
  appendVerification,
  EMPTY_VERIFICATION_LOG,
  replayVerification,
  type CredentialLifecycle,
  type TransitionRefusal,
  type VerificationEvent,
  type VerificationLog,
} from "./verification";

interface LedgerState {
  /** One append-only log per practice. */
  logs: Record<string, VerificationLog>;
}

const globalStore = globalThis as { __meherrCredentialLedger?: LedgerState };

function state(): LedgerState {
  globalStore.__meherrCredentialLedger ??= { logs: {} };
  return globalStore.__meherrCredentialLedger;
}

export function resetLedger(): void {
  globalStore.__meherrCredentialLedger = { logs: {} };
}

export function logFor(practiceId: string): VerificationLog {
  return state().logs[practiceId] ?? EMPTY_VERIFICATION_LOG;
}

export type LedgerAppend = { ok: true } | { ok: false; reason: TransitionRefusal };

/** Append through W110's rules — so nothing reaches storage that the machine would refuse. */
export function recordEvent(practiceId: string, event: VerificationEvent): LedgerAppend {
  const result = appendVerification(logFor(practiceId), event);
  if (!result.ok) return { ok: false, reason: result.reason };
  state().logs[practiceId] = result.log;
  return { ok: true };
}

/**
 * One clinician's own credentials.
 *
 * Takes the subject as an argument and never sees anything else — the narrowing is the query,
 * not a filter applied to a wider answer.
 */
export function ownCredentials(
  practiceId: string,
  clinicianId: string,
  asOf: string,
): CredentialLifecycle[] {
  return replayVerification(logFor(practiceId), asOf).credentials.filter(
    (c) => c.subjectClinicianId === clinicianId,
  );
}

/**
 * Every credential at a practice. Deliberately a SEPARATE function rather than a flag on the
 * one above: a `showAll` boolean is one mistaken argument away from a clinician seeing the
 * whole roster's credentialing history, and the two calls have different authorization.
 */
export function practiceCredentials(practiceId: string, asOf: string): CredentialLifecycle[] {
  return replayVerification(logFor(practiceId), asOf).credentials;
}
