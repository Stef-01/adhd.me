// W125: what the patient agreed to — recorded, never inferred.
//
// Everything else in this stack decides what the practice may do. This is the one place the
// patient's own decision lives, and it is the place where a convenient default does the most
// damage. A system that treats silence as agreement has not obtained consent; it has recorded
// that nobody said no, which is a different fact wearing the same word.
//
// So the shape refuses to help:
//
//   THERE IS NO BOOLEAN. A `consented: boolean` field has a default, and whatever that default
//   is, it is wrong — `false` quietly blocks care that was actually agreed to, and `true` is
//   the failure this unit exists to prevent. A consent record exists or it does not, and the
//   query returns `given`, `refused`, `withdrawn` or `not_recorded`.
//
//   `not_recorded` IS NOT `refused`. A refusal is a decision the patient MADE, and it must be
//   honoured and visible rather than re-asked as though nothing happened. Nothing recorded is
//   the absence of a decision. Collapsing them loses the difference between "they said no" and
//   "nobody asked", which are opposite instructions to whoever picks the record up next.
//
//   CONSENT IS TO A VERSION, NOT TO A NAME. It is pinned to W118's content hash, so consent to
//   version 3 is not consent to version 4 — the same rule as attestations (W119), escalation
//   rules (W121) and bindings (W123). "Consent for the diabetes pathway" that survives an edit
//   to the pathway is consent to something the patient never saw. An earlier version's consent
//   reads as `not_recorded` for the current one, with a reason saying which case it is,
//   because "re-consent to the change" and "consent from scratch" are different conversations.
//
//   THE RECORD SAYS WHAT WAS AGREED TO. `statement` is required and non-empty: a consent
//   record that cannot say what was put to the patient is a signature on a blank page.
//
// Nothing here derives consent from behaviour. There is no source member for attending an
// appointment, not objecting, or continuing to receive messages, and no exported function
// whose name suggests one — asserted by an export-list test in the W120 shape.

export type ConsentDecision = "given" | "refused";

/**
 * Cannot be constructed outside this module: the brand is a `unique symbol` that is never
 * exported, so there is no object literal a caller can pass off as a recorded decision. Same
 * device as W109's vault grant and W112's live credential, and here it is the whole unit.
 */
declare const RECORDED_CONSENT: unique symbol;

export interface ConsentRecord {
  readonly [RECORDED_CONSENT]: true;
  readonly patientId: string;
  readonly practiceId: string;
  readonly pathwayId: string;
  /** W118's content hash. Consent to one version is not consent to another. */
  readonly versionHash: string;
  readonly decision: ConsentDecision;
  /** Exactly what was put to the patient, in the words used. */
  readonly statement: string;
  readonly decidedAt: string;
  /** The staff member who recorded it. A decision with no recorder is hearsay. */
  readonly recordedBy: string;
  /** Set when the patient withdraws. Terminal for this record — see `withdrawConsent`. */
  readonly withdrawnAt: string | null;
}

export type ConsentRejection =
  | "patient_missing"
  | "practice_missing"
  | "pathway_missing"
  | "version_missing"
  | "statement_missing"
  | "recorder_missing"
  | "date_missing_or_unreadable"
  | "recorded_in_the_future";

export type ConsentResult =
  | { ok: true; record: ConsentRecord }
  | { ok: false; errors: ConsentRejection[] };

export interface ConsentInput {
  patientId: string;
  practiceId: string;
  pathwayId: string;
  versionHash: string;
  decision: ConsentDecision;
  statement: string;
  decidedAt: string;
  recordedBy: string;
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Record a decision the patient actually made.
 *
 * The only producer of a `ConsentRecord`. Returns every problem rather than the first, for
 * W108's reason: a reviewer fixing a submission one error per round stops reviewing carefully.
 */
export function recordConsent(input: ConsentInput, todayIso: string): ConsentResult {
  const errors: ConsentRejection[] = [];
  if (input.patientId.trim() === "") errors.push("patient_missing");
  if (input.practiceId.trim() === "") errors.push("practice_missing");
  if (input.pathwayId.trim() === "") errors.push("pathway_missing");
  if (input.versionHash.trim() === "") errors.push("version_missing");
  // A record that cannot say what was agreed to is a signature on a blank page.
  if (input.statement.trim() === "") errors.push("statement_missing");
  if (input.recordedBy.trim() === "") errors.push("recorder_missing");
  if (!ISO_DATE.test(input.decidedAt)) errors.push("date_missing_or_unreadable");
  else if (input.decidedAt > todayIso.slice(0, 10)) errors.push("recorded_in_the_future");

  if (errors.length > 0) return { ok: false, errors };
  return {
    ok: true,
    record: { ...input, statement: input.statement.trim(), withdrawnAt: null } as unknown as ConsentRecord,
  };
}

/**
 * Withdraw a consent.
 *
 * Produces a new record rather than mutating: the decision really was made, and erasing its
 * date would lose the period during which it stood. Re-consenting is a fresh act, which is
 * W67's rule for approvals and W112's for credential renewal.
 */
export function withdrawConsent(record: ConsentRecord, atIso: string): ConsentRecord {
  return { ...record, withdrawnAt: atIso } as ConsentRecord;
}

export type ConsentStatus =
  | { status: "given"; record: ConsentRecord }
  /** The patient said no. A decision, not an absence — do not re-ask as though nothing happened. */
  | { status: "refused"; record: ConsentRecord }
  | { status: "withdrawn"; record: ConsentRecord }
  | {
      status: "not_recorded";
      /**
       * Which absence it is. "Re-consent to the change" and "consent from scratch" are
       * different conversations, so they are different answers.
       */
      because: "no_record_at_all" | "recorded_for_another_version";
    };

/**
 * What has the patient decided about THIS version of this pathway?
 *
 * Note what is absent: there is no argument that makes this default to anything, and no branch
 * that returns `given` without finding a record whose decision is `given`.
 */
export function consentFor(
  records: readonly ConsentRecord[],
  patientId: string,
  practiceId: string,
  pathwayId: string,
  versionHash: string,
): ConsentStatus {
  const forPathway = records.filter(
    (record) =>
      record.patientId === patientId &&
      record.practiceId === practiceId &&
      record.pathwayId === pathwayId,
  );
  const forVersion = forPathway.filter((record) => record.versionHash === versionHash);

  if (forVersion.length === 0) {
    return {
      status: "not_recorded",
      because: forPathway.length > 0 ? "recorded_for_another_version" : "no_record_at_all",
    };
  }

  // Latest decision wins, and a withdrawal is reported as itself rather than as an absence:
  // the patient did something, and the record should say so.
  //
  // W129 finding, and it was a bad one. This used to take the last record after sorting by
  // `decidedAt` and check ITS `withdrawnAt`. But `withdrawConsent` returns a NEW record with
  // the SAME `decidedAt` — which is the documented way to use it — so a set holding both the
  // original and the withdrawn copy resolved by ARRAY ORDER, and a withdrawn consent read as
  // `given` whenever the copies happened to be stored the other way round.
  //
  // The rule now is stated over the whole set rather than over one row: A WITHDRAWAL
  // SUPPRESSES EVERY DECISION MADE AT OR BEFORE IT. That is order-independent, it needs no
  // deduplication, and re-consent still works because a fresh decision dated AFTER the
  // withdrawal is not suppressed. A re-consent dated the SAME DAY as a withdrawal reads as
  // withdrawn — day-granularity dates cannot order two events within a day, and refusing to
  // guess is the safe direction for consent.
  const lastWithdrawal = forVersion
    .map((record) => record.withdrawnAt)
    .filter((at): at is string => at !== null)
    .sort()
    .at(-1);

  // W168. The withdrawal rule above is stated over the whole set for a reason this line used to
  // ignore: day-granularity dates cannot order two events within a day. Sorting by `decidedAt`
  // and taking the last one therefore resolved a SAME-DAY given/refused pair by array order —
  // consent decided by however the caller's store happened to return rows.
  //
  // The fix applies the sentence already written a dozen lines up: refusing to guess is the safe
  // direction for consent. Where the latest day's decisions DISAGREE, the refusal is the answer;
  // where they agree, there is nothing to guess about. No sort remains, so there is no comparator
  // and no position for a tie to be resolved by.
  const latestDay = forVersion.reduce(
    (max, r) => (r.decidedAt > max ? r.decidedAt : max),
    forVersion[0]!.decidedAt,
  );
  const onLatestDay = forVersion.filter((r) => r.decidedAt === latestDay);
  const latest = onLatestDay.find((r) => r.decision !== "given") ?? onLatestDay[0]!;
  if (lastWithdrawal !== undefined && latest.decidedAt <= lastWithdrawal) {
    const withdrawnRecord = forVersion.find((r) => r.withdrawnAt === lastWithdrawal) ?? latest;
    return { status: "withdrawn", record: withdrawnRecord };
  }
  return latest.decision === "given"
    ? { status: "given", record: latest }
    : { status: "refused", record: latest };
}

export class ConsentMissingError extends Error {
  constructor(readonly status: ConsentStatus["status"]) {
    super(`refusing to proceed: consent status is "${status}", which is not consent`);
    this.name = "ConsentMissingError";
  }
}

/**
 * The gate for call sites that must not proceed without consent.
 *
 * Throws rather than returning a boolean, for W67's reason: a boolean nobody reads is not a
 * gate. Every status other than `given` throws, including `withdrawn` and both flavours of
 * `not_recorded` — there is deliberately no "close enough".
 */
export function assertConsented(status: ConsentStatus): ConsentRecord {
  if (status.status !== "given") throw new ConsentMissingError(status.status);
  return status.record;
}

/** Plain-English wording, for whoever is looking at the record. */
export function describeConsent(status: ConsentStatus): string {
  switch (status.status) {
    case "given":
      return `Agreed on ${status.record.decidedAt}, recorded by ${status.record.recordedBy}.`;
    case "refused":
      return `Declined on ${status.record.decidedAt}. This is a decision the patient made — it is not a gap to fill in.`;
    case "withdrawn":
      return `Agreed on ${status.record.decidedAt} and withdrawn on ${status.record.withdrawnAt}.`;
    case "not_recorded":
      return status.because === "recorded_for_another_version"
        ? "There is a decision on file for a different version of this pathway. It does not carry over — the patient has not seen this version."
        : "Nothing has been recorded. That is not agreement, and it is not refusal either.";
  }
}

export function explainConsentRejection(reason: ConsentRejection): string {
  switch (reason) {
    case "patient_missing":
      return "Say whose decision this is.";
    case "practice_missing":
      return "Say which practice recorded it.";
    case "pathway_missing":
      return "Say what the decision was about.";
    case "version_missing":
      return "Record which version of the pathway was put to the patient.";
    case "statement_missing":
      return "Record what was actually put to the patient. A consent record that cannot say what was agreed to is a signature on a blank page.";
    case "recorder_missing":
      return "Record who took the decision down. A decision with no recorder is hearsay.";
    case "date_missing_or_unreadable":
      return "Record the date it was decided, as YYYY-MM-DD.";
    case "recorded_in_the_future":
      return "The decision date is in the future — check it.";
  }
}
