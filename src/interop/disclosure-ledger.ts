// W239: the outbound disclosure ledger — what left, to whom, and when.
//
// W204 declared what would have to exist the day G9 opens and deliberately did not build it. This
// builds the model and leaves the store shut, which is W204's argument and not mine to override: a
// store that exists is a store something can be written to, and G9 is unratified.
//
// THE OPEN QUESTION IS SETTLED BY ONE CONSTANT, WHICH IS THE ROW'S ACTUAL REQUIREMENT. W204 asked
// whether the log holds the FIGURES sent or only the FACT of sending, and left it to the founder.
// "Either answer is a one-line change" is not satisfied by an optional `figures?` field: that field
// would default to absent, the first caller would omit it, and the choice would have been made by
// whoever wrote the first call site rather than by anybody deciding. So `DISCLOSURE_PAYLOAD_POSTURE`
// is a declared constant, the entry type is DERIVED from it, and choosing the other answer is
// editing that one line — after which the type stops compiling anywhere the new answer is not
// honoured.
//
// THE LEDGER MUST NOT BE RECOMPUTABLE, and that is W204's whole argument. A product that recomputes
// cannot answer "what did we tell them in Q2" because the rails have moved on — and worse, it
// answers with today's figures and looks right doing it. So an entry is a record of what LEFT,
// stamped when it left, and nothing in this module can reach a live rail: no import of a store, no
// fetch, no query. Asserted by absence, because a ledger that quietly recomputed would pass every
// test anybody would think to write about its shape.
//
// AND THE LIFE IS CARRIED FROM W204, NOT RESTATED. Two constants for one retention period drift,
// and the drift is invisible — W177's rule, and the reason W223 carries W222's sentences verbatim.

import { PROPOSED_DISCLOSURE_LOG } from "@/reporting/retention";
import { mayDisclose, type DisclosureConsent } from "./disclosure-consent";

/**
 * Whether an entry records the figures that were sent, or only that a disclosure happened.
 *
 * W204'S OPEN QUESTION, AND THE FOUNDER'S TO ANSWER. Carried verbatim below rather than paraphrased.
 * Editing this constant is the whole change: `DisclosureEntry` is derived from it, so the other
 * answer stops compiling everywhere it is not honoured rather than quietly not being passed.
 */
export type DisclosurePayloadPosture = "fact_only" | "figures_included";

/**
 * `as const` is load-bearing, not style. Annotated with the union, `typeof` would be the union and
 * `DisclosureEntry` would resolve to the same shape whichever value was set — the derivation would
 * be decorative and the choice would fall back to call sites. As a literal, the entry type follows
 * the VALUE, which is what makes the change one line.
 */
export const DISCLOSURE_PAYLOAD_POSTURE = "fact_only" as const;

export const DISCLOSURE_OPEN_QUESTION = PROPOSED_DISCLOSURE_LOG.openQuestion;

export const DISCLOSURE_POSTURE_COPY: Record<DisclosurePayloadPosture, string> = {
  fact_only:
    "This ledger records that a disclosure happened, to whom and when, and not the figures that were in it. It answers who was told something and cannot answer what they were told.",
  figures_included:
    "This ledger records the figures that were disclosed as well as the fact of disclosing them. It answers what a recipient was told, and it is therefore a lasting copy of practice-identifiable data with a life of its own.",
};

/** The figures as they left, frozen. Present only under the `figures_included` posture. */
export interface DisclosedFigures {
  /** Keyed by whatever the report called them. Values as sent, never re-derived. */
  values: Readonly<Record<string, number | string | null>>;
}

interface DisclosureEntryBase {
  /** Unique per disclosure. The caller supplies it; this module mints nothing. */
  disclosureId: string;
  practiceId: string;
  /** Who it went to, as the practice would name them. */
  recipient: string;
  /** What kind of thing left — the report's own identifier, not its contents. */
  what: string;
  /** When it left. Stamped by the caller at the moment of sending, never by a clock read here. */
  disclosedAtIso: string;
  /** Under what authority. A disclosure with no recorded basis is the one nobody can defend. */
  basis: string;
  /**
   * The patient's own permission, as a branded value only W243's recorder can mint.
   *
   * REQUIRED, and that is W243's gate reaching this type. An entry that could be written without
   * one would record that a disclosure happened while saying nothing about whether it was allowed —
   * and the ledger exists to answer exactly that question afterwards. There is no `consent?` here
   * and no overload without it: a caller with no consent has nothing to pass.
   */
  consent: DisclosureConsent;
}

/**
 * One recorded disclosure.
 *
 * DERIVED FROM THE POSTURE. Under `fact_only` there is no `figures` member at all — not optional,
 * absent — so a caller cannot pass figures into a ledger that is not meant to hold them, and a
 * reader cannot find a field that would be empty for a different reason than "nothing was sent".
 */
export type DisclosureEntry = typeof DISCLOSURE_PAYLOAD_POSTURE extends "figures_included"
  ? DisclosureEntryBase & { figures: DisclosedFigures }
  : DisclosureEntryBase;

/** The same derivation, exposed so a test can check it follows the constant rather than a comment. */
export type EntryUnder<P extends DisclosurePayloadPosture> = P extends "figures_included"
  ? DisclosureEntryBase & { figures: DisclosedFigures }
  : DisclosureEntryBase;

/** PROPOSED FOR NOBODY — nothing has ever been disclosed. Pinned empty by this module's test. */
export const SHIPPED_DISCLOSURES: readonly DisclosureEntry[] = [];

export type DisclosureRejection =
  | "no_disclosure_id"
  | "duplicate_disclosure_id"
  | "no_recipient"
  | "no_basis"
  | "unreadable_timestamp"
  | "figures_under_fact_only"
  | "consent_not_current";

export const DISCLOSURE_REJECTION_COPY: Record<DisclosureRejection, string> = {
  no_disclosure_id: "The entry has no identifier, so there is no way to refer to this disclosure later.",
  duplicate_disclosure_id:
    "An entry with this identifier is already recorded. It is refused rather than overwritten: a ledger whose entries can be replaced is a ledger that cannot be relied on to say what left.",
  no_recipient: "The entry does not say who it went to, which is most of what a disclosure record is for.",
  no_basis:
    "The entry records no basis for the disclosure. A disclosure with no recorded authority is the one nobody can defend afterwards, and leaving the field blank makes that indistinguishable from a disclosure nobody thought about.",
  unreadable_timestamp:
    "The entry has no readable time of disclosure. When something left is half the record, and a ledger that cannot order its own entries cannot answer what was told first.",
  consent_not_current:
    "The patient's permission is not current for this recipient at the moment of disclosure. The entry is refused: a ledger that recorded the disclosure anyway would be evidence that it happened and evidence that nobody checked, which is worse than no record at all.",
  figures_under_fact_only:
    "The entry carries figures while this ledger is set to record only the fact of a disclosure. It is refused rather than trimmed: silently dropping the figures would leave a caller believing they were recorded.",
};

export type AppendResult =
  | { appended: true; ledger: readonly DisclosureEntry[] }
  | { appended: false; why: DisclosureRejection; copy: string };

// W247: anchored at BOTH ends. Unanchored, this accepted "2026-08-20T09:15 whatever else you like"
// — the trailing text carried into the ledger and into the `localeCompare` that orders it. Seconds
// and an offset are optional because both are optional in the timestamps the tree already stamps.
const ISO_DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(:\d{2}(\.\d+)?)?(Z|[+-]\d{2}:\d{2})?$/;

/**
 * Append one disclosure to a ledger — or refuse it, with a reason.
 *
 * TAKES THE LEDGER AS AN ARGUMENT AND RETURNS A NEW ONE. There is no module-level store, no
 * `globalThis` handle and no write side effect anywhere in this file: G9 is unratified, and a store
 * that exists is a store something can be written to. When G9 opens, the store is a separate unit
 * with its own record-class entry, and this function is what it appends through.
 */
export function appendDisclosure(
  ledger: readonly DisclosureEntry[],
  entry: DisclosureEntry,
): AppendResult {
  const refuse = (why: DisclosureRejection): AppendResult => ({
    appended: false,
    why,
    copy: DISCLOSURE_REJECTION_COPY[why],
  });

  if (typeof entry.disclosureId !== "string" || entry.disclosureId.trim().length === 0) {
    return refuse("no_disclosure_id");
  }
  if (ledger.some((e) => e.disclosureId === entry.disclosureId)) return refuse("duplicate_disclosure_id");
  if (typeof entry.recipient !== "string" || entry.recipient.trim().length === 0) return refuse("no_recipient");
  if (typeof entry.basis !== "string" || entry.basis.trim().length === 0) return refuse("no_basis");
  if (typeof entry.disclosedAtIso !== "string" || !ISO_DATETIME.test(entry.disclosedAtIso)) {
    return refuse("unreadable_timestamp");
  }
  // The posture is enforced at the boundary rather than trusted from the type: a value crossing a
  // module edge is `unknown` at runtime whatever the type said, and this is the one check that
  // stops figures reaching a fact-only ledger from a caller that was compiled against the other
  // answer.
  if (
    DISCLOSURE_PAYLOAD_POSTURE === "fact_only" &&
    Object.prototype.hasOwnProperty.call(entry, "figures")
  ) {
    return refuse("figures_under_fact_only");
  }

  // Checked AT THE MOMENT OF DISCLOSURE rather than at the moment of appending: a consent that was
  // current when the report left and lapsed before somebody wrote it down was a lawful disclosure,
  // and refusing it here would lose the record of a thing that actually happened. The date the
  // entry itself carries is the one that matters.
  //
  // W247 CARRIED FINDING. That makes the permission check read a value the CALLER supplies, which
  // is an authority decision resting on the caller being honest about when it sent the thing. The
  // exposure is narrower than it first looks — a disclosure backdated to before the consent existed
  // is already refused, because `disclosureConsentAt` returns `not_recorded` for any moment earlier
  // than the record — so what remains is backdating INTO a window where consent was live, to slip
  // past a later withdrawal or expiry. Not fixed here, because the alternative is worse: stamping
  // the time in this function would make the ledger record when somebody got around to writing the
  // entry rather than when the disclosure happened, which is the one fact it exists to hold.
  // THE TRIGGER: the first code path that actually sends something. The timestamp must come from
  // that send path, stamped where the transmission happens, rather than from a field a caller fills
  // in afterwards — and at that point this check reads a value no caller chose.
  const permission = mayDisclose(entry.consent, entry.recipient, entry.disclosedAtIso.slice(0, 10));
  if (!permission.permitted) {
    return {
      appended: false,
      why: "consent_not_current",
      copy: `${DISCLOSURE_REJECTION_COPY.consent_not_current} ${permission.copy}`,
    };
  }

  return { appended: true, ledger: [...ledger, entry] };
}

/**
 * What the ledger says about one recipient, in the order things left.
 *
 * W247 ADDED THE PRACTICE, AND IT IS NOT A CONVENIENCE PARAMETER. This read filtered on recipient
 * alone across whatever ledger it was handed. Every entry carries a `practiceId` and this was the
 * one function that ignored it, so the moment a ledger holds two practices' entries — which is what
 * a ledger is FOR — a caller asking "what did we send to this PHN" gets another practice's
 * disclosures back. That is Y4-1's shape exactly: the tree's own HIGH finding, a cross-tenant read
 * created not by a missing check but by a query that never took the tenant. W123's rule is that a
 * read takes the practice AS THE QUERY rather than filtering after the fact, so it is the first
 * parameter and there is no overload without it.
 *
 * Fixed while the ledger is still empty and the only callers are tests, which is the cheapest this
 * fix will ever be — and the only reason it is cheap is that nobody has written the store yet.
 */
export function disclosuresTo(
  ledger: readonly DisclosureEntry[],
  practiceId: string,
  recipient: string,
): readonly DisclosureEntry[] {
  return ledger
    .filter((entry) => entry.practiceId === practiceId && entry.recipient === recipient)
    .sort((a, b) => a.disclosedAtIso.localeCompare(b.disclosedAtIso));
}

/**
 * The life of an entry, carried from W204 rather than restated.
 *
 * Two constants for one retention period drift, and the drift is invisible — W177's rule, and the
 * reason W223 carries W222's sentences verbatim rather than paraphrasing them.
 */
export const DISCLOSURE_LIFE_DAYS = PROPOSED_DISCLOSURE_LOG.proposedLifeDays;
