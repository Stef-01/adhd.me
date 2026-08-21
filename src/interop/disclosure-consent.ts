// W243: consent to DISCLOSE — recorded, never inferred, and never granted by the clock.
//
// W125 holds consent to a PATHWAY, with a branded record no caller can fabricate. This is a
// different act: the patient is agreeing that something about them LEAVES the practice. It gets its
// own model rather than a reused one, because a consent to be treated is not a consent to be
// reported on, and collapsing them would be the most consequential synonym-substitution available
// in this tree.
//
// REFUSED BY TYPE, AND THE TYPE REACHES THE LEDGER. A model that merely returns `not_recorded` is
// refused by a check somebody has to remember to make. So `DisclosureConsent` carries a brand that
// is never exported — there is no object literal a caller can pass off as a recorded permission —
// and W239's ledger entry REQUIRES one. A disclosure cannot be recorded as having happened without
// the thing that made it allowed.
//
// TIME CAN ONLY EVER REMOVE CONSENT, NEVER CREATE IT. That is the property, and it is stronger than
// the two rules it subsumes. W135 says silence is never consent; W134 says no timeout grants it.
// Both are instances of: for any record and any later moment, if consent was not `given` when
// recorded, it is not `given` later. Stated as a property because a name-based check ("no function
// called `assumeConsent`") misses the shapes that actually occur — an expiry that wraps into
// renewal, a "pending" state that ages into acceptance, a grace period that starts counting from
// the wrong end.
//
// AND EXPIRY IS NOT REFUSAL, WHICH IS W125'S ARGUMENT IN A NEW PLACE. A consent that has run out is
// not a patient who said no and not a patient who was never asked. Three states where a careless
// model has one, because they are opposite instructions to whoever picks the record up next: ask
// again, do not ask, and nobody has asked yet.

/**
 * Cannot be constructed outside this module: the brand is a `unique symbol` that is never exported,
 * so there is no object literal a caller can pass off as recorded permission. W125's device, and
 * W109's before it — here it is what makes "refused by type" true rather than asserted.
 */
declare const RECORDED_DISCLOSURE_CONSENT: unique symbol;

export interface DisclosureConsent {
  readonly [RECORDED_DISCLOSURE_CONSENT]: true;
  readonly patientId: string;
  /** Who the patient agreed it could go to. Consent to one recipient is not consent to another. */
  readonly recipient: string;
  /** What they agreed could be disclosed, in the words put to them. */
  readonly statement: string;
  readonly recordedAtIso: string;
  /** When it runs out. Null means no stated expiry, NOT "never expires" — see `disclosureConsentAt`. */
  readonly expiresOnIso: string | null;
  readonly decision: "given" | "refused";
  readonly withdrawnAtIso: string | null;
}

export type ConsentRecordRejection =
  | "no_patient"
  | "no_recipient"
  | "no_statement"
  | "unreadable_date"
  | "expiry_before_record";

export const CONSENT_RECORD_REJECTION_COPY: Record<ConsentRecordRejection, string> = {
  no_patient: "The record does not say whose consent it is.",
  no_recipient:
    "The record does not say who the patient agreed it could go to. Consent to one recipient is not consent to another, so a record without one is a permission with no shape.",
  no_statement:
    "The record does not say what was put to the patient. A consent record that cannot say what was agreed to is a signature on a blank page.",
  unreadable_date: "The record has no readable date, so there is no way to say when the patient decided.",
  expiry_before_record:
    "The record expires before it was made. Refused rather than corrected: a date nobody can explain is a record nobody should rely on.",
};

export type ConsentRecordResult =
  | { recorded: true; consent: DisclosureConsent }
  | { recorded: false; why: ConsentRecordRejection; copy: string };

export interface DisclosureConsentInput {
  patientId: string;
  recipient: string;
  statement: string;
  recordedAtIso: string;
  expiresOnIso: string | null;
  decision: "given" | "refused";
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * The ONLY way a `DisclosureConsent` comes into existence.
 *
 * Note what is not a parameter: there is no `assume`, no `default`, no `graceDays`. A refusal is
 * recorded through the same door as a permission, because a refusal is a decision the patient made
 * and it has to be visible rather than re-asked as though nothing happened (W125).
 */
export function recordDisclosureConsent(input: DisclosureConsentInput): ConsentRecordResult {
  const refuse = (why: ConsentRecordRejection): ConsentRecordResult => ({
    recorded: false,
    why,
    copy: CONSENT_RECORD_REJECTION_COPY[why],
  });

  if (input.patientId.trim().length === 0) return refuse("no_patient");
  if (input.recipient.trim().length === 0) return refuse("no_recipient");
  if (input.statement.trim().length < 12) return refuse("no_statement");
  if (!ISO_DATE.test(input.recordedAtIso)) return refuse("unreadable_date");
  if (input.expiresOnIso !== null && !ISO_DATE.test(input.expiresOnIso)) return refuse("unreadable_date");
  if (input.expiresOnIso !== null && input.expiresOnIso < input.recordedAtIso) {
    return refuse("expiry_before_record");
  }

  return {
    recorded: true,
    consent: {
      patientId: input.patientId,
      recipient: input.recipient,
      statement: input.statement,
      recordedAtIso: input.recordedAtIso,
      expiresOnIso: input.expiresOnIso,
      decision: input.decision,
      withdrawnAtIso: null,
    } as DisclosureConsent,
  };
}

/**
 * Withdrawal is a patient decision and takes effect from when they made it.
 *
 * W247 FOUND TWO WAYS THIS FAILED OPEN, both of them the kind that leaves no trace.
 *
 * FIRST, THE DATE WAS NEVER CHECKED. `recordDisclosureConsent` validates every date it is given and
 * this took whatever it was handed. The comparison downstream is a STRING comparison, so a
 * withdrawal stamped `"not a date"` yields `"not a date" <= "2026-08-21"` === false — the
 * withdrawal simply does not take effect, silently, and the consent reads `given` forever. A
 * patient who withdrew is recorded as having withdrawn and disclosed about anyway. Note which way
 * it fails: garbage that sorts LOW (`""`) would have failed safe, so the bug only shows up for
 * some malformed inputs, which is how it survives a test that tries one.
 *
 * SECOND, IT COULD MOVE A WITHDRAWAL LATER. The function set `withdrawnAtIso` unconditionally, so
 * calling it again on an already-withdrawn consent with a later date re-granted permission for
 * everything in between. W243's stated property is MONOTONICITY — time can only ever remove
 * consent — and the one function that writes the field was the one thing able to break it. The
 * earliest withdrawal now wins, and a later one is a no-op rather than an error: a patient saying
 * "I withdraw" twice has not done anything wrong.
 */
export type WithdrawalResult =
  | { withdrawn: true; consent: DisclosureConsent }
  | { withdrawn: false; why: "unreadable_date"; copy: string };

export function withdrawDisclosureConsent(consent: DisclosureConsent, atIso: string): WithdrawalResult {
  if (!ISO_DATE.test(atIso)) {
    return {
      withdrawn: false,
      why: "unreadable_date",
      copy: `${CONSENT_RECORD_REJECTION_COPY.unreadable_date} A withdrawal with an unreadable date is refused rather than stored: the comparison that decides whether it has taken effect is a string comparison, so an unreadable date would leave the withdrawal recorded and inert.`,
    };
  }
  // Monotonic: the earliest withdrawal stands. A second, later withdrawal changes nothing.
  const effective =
    consent.withdrawnAtIso !== null && consent.withdrawnAtIso <= atIso ? consent.withdrawnAtIso : atIso;
  return { withdrawn: true, consent: { ...consent, withdrawnAtIso: effective } as DisclosureConsent };
}

export type DisclosureConsentStatus =
  /** Recorded, given, in date, not withdrawn, and for this recipient. */
  | "given"
  /** The patient said no. A decision, to be honoured and not re-asked as though nothing happened. */
  | "refused"
  /** They agreed and it has run out. Ask again — not the same as either of the two above. */
  | "expired"
  /** They agreed and then changed their mind. */
  | "withdrawn"
  /** They agreed, and to somebody else. Consent to one recipient is not consent to another. */
  | "for_another_recipient"
  /** Nobody has asked. The absence of a decision, never the presence of a refusal. */
  | "not_recorded";

export const DISCLOSURE_CONSENT_COPY: Record<DisclosureConsentStatus, string> = {
  given: "The patient agreed that this could be sent to this recipient, and that agreement is current.",
  refused:
    "The patient was asked and said no. That is a decision they made, and it stands until they change it — it is not a gap to be filled by asking again as though nothing had happened.",
  expired:
    "The patient agreed and that agreement has run out. It is not recorded as a refusal, because they did not say no — what the record holds is a permission that has lapsed, and a lapsed permission can be sought again where a refusal cannot.",
  withdrawn: "The patient agreed and has since withdrawn that agreement.",
  for_another_recipient:
    "The patient agreed to this going somewhere else. Consent to one recipient is not consent to another, so this counts as nothing having been agreed for this one.",
  not_recorded:
    "Nothing is recorded either way. Nobody has asked, which is the absence of a decision rather than the presence of a refusal — and it is never turned into agreement by time passing or by the patient not objecting.",
};

/**
 * What the record says, as at a given moment.
 *
 * `asOfIso` is required and there is no default: a status read against an unstated clock is a status
 * nobody can check. And note the ordering — withdrawal and refusal are read BEFORE expiry, because a
 * patient who said no and then let it lapse still said no, and reporting that as "expired" would
 * invite somebody to ask again.
 */
export function disclosureConsentAt(
  consent: DisclosureConsent | null,
  recipient: string,
  asOfIso: string,
): DisclosureConsentStatus {
  if (consent === null) return "not_recorded";
  // BEFORE THE RECORD EXISTED, NOTHING WAS RECORDED. Found by the property sweep reading every
  // state at every moment, including moments before the record was made: without this line a
  // withdrawn consent read "given" at a date a year before anybody was asked, which is time
  // creating consent — backwards, and exactly what this module exists to make impossible. A test
  // that only ever read "now" would never have looked.
  if (asOfIso < consent.recordedAtIso) return "not_recorded";
  if (consent.decision === "refused") return "refused";
  if (consent.withdrawnAtIso !== null && consent.withdrawnAtIso <= asOfIso) return "withdrawn";
  if (consent.recipient !== recipient) return "for_another_recipient";
  // A null expiry is "no stated expiry", not "never expires" — but with nothing stated there is
  // nothing to have run out, so it stays given. The distinction lives in the record rather than in
  // an invented default date.
  if (consent.expiresOnIso !== null && consent.expiresOnIso < asOfIso) return "expired";
  return "given";
}

/**
 * The one place a disclosure is permitted, and it takes a branded consent.
 *
 * There is no overload without one. That is the row's "refused by type": a caller with no consent
 * has nothing to pass, and `null` gets `not_recorded` rather than a permission.
 */
export function mayDisclose(
  consent: DisclosureConsent | null,
  recipient: string,
  asOfIso: string,
): { permitted: boolean; status: DisclosureConsentStatus; copy: string } {
  const status = disclosureConsentAt(consent, recipient, asOfIso);
  return { permitted: status === "given", status, copy: DISCLOSURE_CONSENT_COPY[status] };
}
