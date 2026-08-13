// W112: expiry and re-attestation — W88's void-not-stale rule, applied to credentials.
//
// W110 derives `expired` at replay time, so the status is already honest. That is not enough
// on its own. The status being right only matters if every consumer acts on it, and "every
// consumer remembers to filter" is the shape of promise that fails: one report forgets, shows
// an expired credential greyed out with a caveat, and a lapsed qualification is back in front
// of a decision-maker as weak evidence rather than as nothing.
//
// So the gate — "an expired credential is ABSENT, never weak evidence" — is met by the type:
//
//   `LiveCredential` is branded and only `liveCredentials()` can produce one. There is no
//   variant of the output that carries an expired credential in a weakened form, because the
//   output type has no room for one. A consumer cannot render what it was never handed. This
//   is W59's move (the eligibility filter has NO branch producing `eligible: true`) pointed at
//   a different question.
//
// The second half of the gate is the sharper one. NO STATED EXPIRY DOES NOT MEAN NEVER
// EXPIRES. W108 refused to let `expiresOn: null` mean "forever" and W110 carried the null
// through without inventing a date. Something has to close it, or a credential verified once
// in 2026 is still being presented as current in 2040:
//
//   A credential with no stated expiry gets an EFFECTIVE expiry of `verifiedOn +
//   unstatedLifetimeDays`, and from then on it is treated exactly like a stated one — absent,
//   not weak. `effectiveExpiry` reports whether the date was stated or derived, so this is
//   never a silent disappearance, and `reattestationDue` gives notice ahead of it.
//
// On the default: `unstatedLifetimeDays` is practice ADMINISTRATION, not clinical content, so
// it is not a G5 item — but it is still a policy the founder should own, and the value here is
// a placeholder chosen to be safe under any ruling they make. Erring SHORT means more
// re-checking, which costs administrative time; erring long means a lapsed credential presented
// as current. The asymmetry decides it.

import type {
  CredentialLifecycle,
  ReplayedVerification,
  VerificationEvent,
} from "./verification";

export interface ExpiryPolicy {
  /**
   * How long a credential with NO stated expiry stands before it must be re-attested.
   * Three years: long enough not to be busywork, short enough that nothing sits unchecked
   * across a whole strategic cycle.
   */
  unstatedLifetimeDays: number;
  /** How far ahead of expiry re-attestation is raised, so nothing lapses without warning. */
  noticeDays: number;
}

export const DEFAULT_EXPIRY_POLICY: ExpiryPolicy = {
  unstatedLifetimeDays: 3 * 365,
  noticeDays: 90,
};

const DAY_MS = 24 * 60 * 60 * 1000;

function parseIso(date: string): number | null {
  if (!/^\d{4}-\d{2}-\d{2}/.test(date)) return null;
  const ms = Date.parse(`${date.slice(0, 10)}T00:00:00Z`);
  return Number.isNaN(ms) ? null : ms;
}

function addDays(date: string, days: number): string | null {
  const ms = parseIso(date);
  if (ms === null) return null;
  return new Date(ms + days * DAY_MS).toISOString().slice(0, 10);
}

export interface EffectiveExpiry {
  on: string;
  /** False when the date was derived from the policy rather than stated on the credential. */
  stated: boolean;
}

/**
 * When this credential actually stops counting.
 *
 * Returns null only when there is nothing to compute from — a credential that was never
 * verified has no expiry, which is different from having one far away.
 */
export function effectiveExpiry(
  lifecycle: CredentialLifecycle,
  policy: ExpiryPolicy = DEFAULT_EXPIRY_POLICY,
): EffectiveExpiry | null {
  if (lifecycle.verifiedOn === null) return null;
  if (lifecycle.expiresOn !== null) return { on: lifecycle.expiresOn, stated: true };
  const derived = addDays(lifecycle.verifiedOn, policy.unstatedLifetimeDays);
  return derived === null ? null : { on: derived, stated: false };
}

/**
 * A credential that is verified and has not expired, as of a stated date.
 *
 * The brand is a `unique symbol` this module never exports, so this type cannot be
 * constructed by a consumer that "knows" a credential is fine. W109 used the same device to
 * make authorization unforgeable; here it makes currency unforgeable.
 */
declare const LIVE_CREDENTIAL: unique symbol;

export interface LiveCredential {
  readonly [LIVE_CREDENTIAL]: true;
  readonly credentialId: string;
  readonly subjectClinicianId: string;
  readonly verifiedBy: string;
  readonly verifiedOn: string;
  /** The effective date, stated or derived — a consumer should show what it is acting on. */
  readonly expiresOn: string;
  readonly expiryStated: boolean;
}

/**
 * The only way to obtain credentials that count.
 *
 * Everything else is absent from the result: submitted, checked, rejected, withdrawn and
 * expired alike. Note what is NOT returned — an expired credential with a flag on it. There
 * is no such value in this module's vocabulary, which is the whole gate.
 */
export function liveCredentials(
  replayed: ReplayedVerification,
  policy: ExpiryPolicy = DEFAULT_EXPIRY_POLICY,
): LiveCredential[] {
  const today = replayed.asOf.slice(0, 10);
  const live: LiveCredential[] = [];

  for (const lifecycle of replayed.credentials) {
    // W110 already resolves a stated expiry into the `expired` status; this catches the
    // derived case as well, so both routes converge on one answer.
    if (lifecycle.status !== "verified") continue;
    if (lifecycle.verifiedBy === null || lifecycle.verifiedOn === null) continue;
    const expiry = effectiveExpiry(lifecycle, policy);
    if (expiry === null || expiry.on < today) continue;

    live.push({
      credentialId: lifecycle.credentialId,
      subjectClinicianId: lifecycle.subjectClinicianId,
      verifiedBy: lifecycle.verifiedBy,
      verifiedOn: lifecycle.verifiedOn,
      expiresOn: expiry.on,
      expiryStated: expiry.stated,
    } as unknown as LiveCredential);
  }
  return live;
}

export type ReattestationUrgency =
  /** Still live, but inside the notice window. */
  | "due_soon"
  /** Past its effective expiry and not replaced. Already absent from `liveCredentials`. */
  | "lapsed";

export interface ReattestationItem {
  credentialId: string;
  subjectClinicianId: string;
  urgency: ReattestationUrgency;
  /** The effective date it turns on. */
  expiresOn: string;
  expiryStated: boolean;
}

/**
 * What needs re-attesting, and by when.
 *
 * This is the counterweight to making expiry absolute. A credential that simply vanishes on a
 * date is a support ticket; a credential that was flagged ninety days out and then vanished is
 * a process. A credential already renewed by a live successor is not raised again.
 */
export function reattestationDue(
  replayed: ReplayedVerification,
  policy: ExpiryPolicy = DEFAULT_EXPIRY_POLICY,
): ReattestationItem[] {
  const today = replayed.asOf.slice(0, 10);
  const horizon = addDays(today, policy.noticeDays) ?? today;

  // A predecessor is settled once something that supersedes it is itself live.
  const renewed = new Set(
    liveCredentials(replayed, policy)
      .map((live) => replayed.credentials.find((c) => c.credentialId === live.credentialId))
      .map((lifecycle) => lifecycle?.supersedes)
      .filter((id): id is string => typeof id === "string"),
  );

  const due: ReattestationItem[] = [];
  for (const lifecycle of replayed.credentials) {
    if (lifecycle.status !== "verified" && lifecycle.status !== "expired") continue;
    if (renewed.has(lifecycle.credentialId)) continue;

    const expiry = effectiveExpiry(lifecycle, policy);
    if (expiry === null) continue;

    const urgency: ReattestationUrgency | null =
      expiry.on < today ? "lapsed" : expiry.on <= horizon ? "due_soon" : null;
    if (urgency === null) continue;

    due.push({
      credentialId: lifecycle.credentialId,
      subjectClinicianId: lifecycle.subjectClinicianId,
      urgency,
      expiresOn: expiry.on,
      expiryStated: expiry.stated,
    });
  }
  return due;
}

/**
 * The submission that renews a credential.
 *
 * A renewal is a NEW credential naming its predecessor, not a re-opening of the old one. The
 * old verification really did happen; re-opening it and stamping a fresh date would erase
 * whatever gap sat between the two, and a gap in credentialing is exactly what an audit asks
 * about. Building the event here rather than leaving it to a caller is what stops the link
 * being optional in practice.
 */
export function reattestationSubmission(input: {
  previous: CredentialLifecycle;
  newCredentialId: string;
  submittedBy: string;
  at: string;
}): Extract<VerificationEvent, { kind: "submitted" }> {
  return {
    kind: "submitted",
    at: input.at,
    credentialId: input.newCredentialId,
    subjectClinicianId: input.previous.subjectClinicianId,
    submittedBy: input.submittedBy,
    supersedes: input.previous.credentialId,
  };
}
