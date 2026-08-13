// W110: the verification workflow — how a credential gets the verifier and date W108 demands.
//
// W108 made `verifiedBy` and `verifiedOn` required by the type, which guarantees the fields
// are present and says nothing about whether they were earned. This is where they are earned:
// submitted → checked → verified, each step recorded as an event, with the whole history
// replayable. The log is the state. Nothing is stored alongside it that could disagree with
// it.
//
// Three decisions carry this unit.
//
//   SELF-VERIFICATION IS UNREACHABLE, NOT DISCOURAGED. A clinician cannot check or verify
//   their own credential — the transition is refused, so no log can contain it and no replay
//   can produce a credential verified by its subject. That is W69's rule (an author cannot
//   review their own content) applied to the case it matters most in.
//
//   ONE PERSON DOING BOTH STEPS IS RECORDED, NOT REFUSED. Submitting and checking are
//   different jobs and ideally different people. But a two-clinician practice where the owner
//   collects the documents AND confirms them is the ordinary case, not an abuse, and a rule
//   that blocks it buys a second pair of eyes by inviting a second account. So `singleHandled`
//   is derived and carried in the replayed state for W115's provenance report to surface. The
//   rule that stops the actual fraud — the subject verifying themselves — is absolute; the
//   weaker segregation concern is made VISIBLE instead of enforced into a workaround.
//
//   EXPIRY IS COMPUTED, NEVER TRANSITIONED. There is deliberately no "expire" event. If
//   expiry were something a job had to apply, then a credential whose job did not run would
//   read as verified — the failure mode where the safe answer depends on a cron. Instead
//   `replayVerification` takes `asOf` and derives it, so an expired credential is expired the
//   moment it expires, in every reader, with nothing to run. W88 charged staleness this way
//   for competence; the same argument applies here and for the same reason.
//
// What this module does NOT do: re-attestation, and enforcing that an expired credential is
// absent from downstream outputs rather than shown as weak evidence. Both are W112. This
// gives W112 the honest status to build on.

export type VerificationEvent =
  /** Lodged for checking. Carries who lodged it, which is not who confirms it. */
  | {
      kind: "submitted";
      at: string;
      credentialId: string;
      subjectClinicianId: string;
      submittedBy: string;
      /**
       * W112 re-attestation: the credential this renews. A renewal is a NEW credential that
       * names its predecessor rather than a re-opening of it — the old verification really
       * did happen, and rewriting its dates would erase any gap between the two, which is
       * precisely what an auditor asks about.
       */
      supersedes?: string;
    }
  /** Someone examined the evidence — the documents, the register lookup, or both. */
  | {
      kind: "checked";
      at: string;
      credentialId: string;
      checkedBy: string;
      /** W109 refs and/or a W111 register read. What was actually looked at. */
      examined: readonly string[];
    }
  /** The practice accepts it. This is the event that produces W108's verifier and date. */
  | {
      kind: "verified";
      at: string;
      credentialId: string;
      verifiedBy: string;
      expiresOn: string | null;
    }
  /** Checked and not accepted. Terminal — a fresh submission starts a new credential. */
  | { kind: "rejected"; at: string; credentialId: string; rejectedBy: string; reason: string }
  /** Pulled by the practice or the clinician. Terminal. */
  | { kind: "withdrawn"; at: string; credentialId: string; withdrawnBy: string; reason: string };

export type VerificationLogEntry = VerificationEvent & { readonly seq: number };
export type VerificationLog = readonly VerificationLogEntry[];

export const EMPTY_VERIFICATION_LOG: VerificationLog = Object.freeze([]);

/**
 * The lifecycle states a credential can be IN.
 *
 * `expired` is absent on purpose: it is not a state the log records, it is what `verified`
 * becomes when a date passes. See the module note.
 */
export type LifecycleState = "none" | "submitted" | "checked" | "verified" | "rejected" | "withdrawn";

/** What replay reports, which includes the derived states the log does not hold. */
export type VerificationStatus = LifecycleState | "expired";

/**
 * Which event kinds each state accepts. Declared as a table rather than as a chain of `if`s
 * so the machine can be read — and so the test can assert the table IS the behaviour by
 * driving every state through every event.
 */
export const ALLOWED_TRANSITIONS: Record<LifecycleState, readonly VerificationEvent["kind"][]> = {
  none: ["submitted"],
  submitted: ["checked", "rejected", "withdrawn"],
  // No "verified" here: verification requires a check, and that is the whole point of having
  // two steps rather than one.
  checked: ["verified", "rejected", "withdrawn"],
  verified: ["withdrawn"],
  rejected: [],
  withdrawn: [],
};

export type TransitionRefusal =
  | "out_of_order"
  | "self_verification"
  | "terminal"
  | "timestamp_before_previous"
  | "credential_missing";

export type AppendResult =
  | { ok: true; log: VerificationLog }
  | { ok: false; reason: TransitionRefusal };

interface Tracked {
  state: LifecycleState;
  subjectClinicianId: string;
  submittedBy: string;
  lastAt: string;
}

/** Fold the log into per-credential lifecycle facts. The only reader of raw entries. */
function track(log: VerificationLog): Map<string, Tracked> {
  const tracked = new Map<string, Tracked>();
  for (const entry of log) {
    const current = tracked.get(entry.credentialId);
    if (entry.kind === "submitted") {
      tracked.set(entry.credentialId, {
        state: "submitted",
        subjectClinicianId: entry.subjectClinicianId,
        submittedBy: entry.submittedBy,
        lastAt: entry.at,
      });
      continue;
    }
    if (!current) continue; // unreachable through appendVerification; replay stays total.
    const next: LifecycleState =
      entry.kind === "checked"
        ? "checked"
        : entry.kind === "verified"
          ? "verified"
          : entry.kind === "rejected"
            ? "rejected"
            : "withdrawn";
    tracked.set(entry.credentialId, { ...current, state: next, lastAt: entry.at });
  }
  return tracked;
}

/**
 * Append an event, refusing any transition the machine does not allow.
 *
 * Validating here rather than at replay is what keeps the log honest: an append-only log that
 * accepts nonsense forces every future reader to decide what the nonsense meant, and they
 * will not all decide the same thing.
 */
export function appendVerification(log: VerificationLog, event: VerificationEvent): AppendResult {
  if (event.credentialId.trim() === "") return { ok: false, reason: "credential_missing" };

  const current = track(log).get(event.credentialId);
  const state: LifecycleState = current?.state ?? "none";

  if (state === "rejected" || state === "withdrawn") return { ok: false, reason: "terminal" };
  if (!ALLOWED_TRANSITIONS[state].includes(event.kind)) return { ok: false, reason: "out_of_order" };

  // The W69 rule. Refused rather than flagged: a credential verified by its own subject is
  // the paper trail of a check that never happened, and it looks exactly like one that did.
  const actor =
    event.kind === "checked" ? event.checkedBy : event.kind === "verified" ? event.verifiedBy : null;
  if (actor !== null && current && actor.trim() === current.subjectClinicianId.trim()) {
    return { ok: false, reason: "self_verification" };
  }

  // A "verified" dated before the check it rests on is not a record anyone can rely on.
  if (current && event.at < current.lastAt) {
    return { ok: false, reason: "timestamp_before_previous" };
  }

  const entry = Object.freeze({ ...event, seq: log.length }) as VerificationLogEntry;
  return { ok: true, log: Object.freeze([...log, entry]) as VerificationLog };
}

export interface CredentialLifecycle {
  credentialId: string;
  subjectClinicianId: string;
  status: VerificationStatus;
  submittedBy: string;
  /** Present once checked. */
  checkedBy: string | null;
  checkedOn: string | null;
  examined: readonly string[];
  /** Present once verified — and these ARE W108's required fields. */
  verifiedBy: string | null;
  verifiedOn: string | null;
  expiresOn: string | null;
  /** Same person lodged and checked it. Not refused (see the module note) — surfaced. */
  singleHandled: boolean;
  /** Why it ended, for the terminal states. */
  endedReason: string | null;
  /** W112: the credential this one renews, if it is a re-attestation. */
  supersedes: string | null;
}

export interface ReplayedVerification {
  asOf: string;
  credentials: CredentialLifecycle[];
}

/**
 * Rebuild every credential's lifecycle from the log alone.
 *
 * `asOf` is required rather than defaulted to the clock: a replay whose answer depends on when
 * it happens to run is not a replay, and every golden built on one drifts silently.
 */
export function replayVerification(log: VerificationLog, asOf: string): ReplayedVerification {
  const byId = new Map<string, CredentialLifecycle>();

  for (const entry of log) {
    if (entry.kind === "submitted") {
      // W116 finding: this used to overwrite unconditionally. `appendVerification` refuses a
      // second `submitted`, so it is unreachable today — but `replayVerification` is exported
      // and total over ANY log, including one rehydrated from storage later, and the failure
      // mode of a reset is silent loss of a verification's provenance. Ignoring degrades
      // safely; resetting destroys the record the log exists to keep.
      if (byId.has(entry.credentialId)) continue;
      byId.set(entry.credentialId, {
        credentialId: entry.credentialId,
        subjectClinicianId: entry.subjectClinicianId,
        status: "submitted",
        submittedBy: entry.submittedBy,
        checkedBy: null,
        checkedOn: null,
        examined: [],
        verifiedBy: null,
        verifiedOn: null,
        expiresOn: null,
        singleHandled: false,
        endedReason: null,
        supersedes: entry.supersedes ?? null,
      });
      continue;
    }
    const record = byId.get(entry.credentialId);
    if (!record) continue;

    switch (entry.kind) {
      case "checked":
        record.status = "checked";
        record.checkedBy = entry.checkedBy;
        record.checkedOn = entry.at;
        record.examined = entry.examined;
        record.singleHandled = entry.checkedBy.trim() === record.submittedBy.trim();
        break;
      case "verified":
        record.status = "verified";
        record.verifiedBy = entry.verifiedBy;
        record.verifiedOn = entry.at;
        record.expiresOn = entry.expiresOn;
        break;
      case "rejected":
        record.status = "rejected";
        record.endedReason = entry.reason;
        break;
      case "withdrawn":
        record.status = "withdrawn";
        record.endedReason = entry.reason;
        break;
    }
  }

  const today = asOf.slice(0, 10);
  for (const record of byId.values()) {
    // Derived, not transitioned. Nothing has to run for this to become true.
    if (record.status === "verified" && record.expiresOn !== null && record.expiresOn < today) {
      record.status = "expired";
    }
  }

  return { asOf, credentials: [...byId.values()] };
}

/**
 * The provenance W108 requires, available ONLY from a completed workflow.
 *
 * Returns null for anything not currently verified — including expired, which is the point:
 * an expired credential does not hand back a weaker verifier and date, it hands back nothing.
 * W112 carries that through the rest of the product.
 */
export function verifiedProvenance(
  lifecycle: CredentialLifecycle,
): { verifiedBy: string; verifiedOn: string } | null {
  if (lifecycle.status !== "verified") return null;
  if (lifecycle.verifiedBy === null || lifecycle.verifiedOn === null) return null;
  return { verifiedBy: lifecycle.verifiedBy, verifiedOn: lifecycle.verifiedOn };
}

/** Plain-English refusal, for whoever hit it. */
export function explainRefusal(reason: TransitionRefusal): string {
  switch (reason) {
    case "out_of_order":
      return "That step cannot happen yet — a credential is submitted, then checked, then verified.";
    case "self_verification":
      return "A clinician cannot check or verify their own credential. Someone else has to.";
    case "terminal":
      return "This credential was rejected or withdrawn. Start a new submission instead.";
    case "timestamp_before_previous":
      return "This step is dated before the one it follows — check the date.";
    case "credential_missing":
      return "Say which credential this step belongs to.";
  }
}
