// W178: the order-dependence defects, as a permanent corpus.
//
// W167 made the REGISTER mechanical — every fold site declared, with a tie-break test or a
// written rationale. That stops a new fold from arriving undeclared. It does not stop an old
// fix from being undone, and it says nothing about whether the fixtures that caught these
// defects still catch them.
//
// This is the other half. For each historical defect the corpus holds the tied input that
// exposed it, the PRE-FIX fold reconstructed from the fix's own commentary, and a call to the
// REAL shipped function. Three things are then asserted for every entry, and all three matter:
//
//   THE PRE-FIX FOLD STILL FAILS ON ITS OWN FIXTURE. This is the unit's gate — "proven by
//   reverting each fix once" — made permanent rather than done once by hand. A regression
//   corpus whose fixtures no longer discriminate has quietly stopped testing anything, and it
//   goes on passing while it does, which is the failure mode every register in this tree exists
//   to prevent.
//
//   THE SHIPPED FUNCTION IS ORDER-INDEPENDENT ON THAT SAME INPUT. Imported, never copied: a
//   corpus holding its own copy of the fix tests the copy, and the real code is then free to
//   drift away from it without anything going red.
//
//   AND THE SHIPPED ANSWER IS THE SAFE ONE. Order-independence alone is satisfied by returning
//   the same wrong answer every time — Y3-1's fix could have been "always false" and passed a
//   stability check. So each entry names the answer it must give, and why that direction is the
//   safe one.
//
// ON THE COUNT. `docs/FIVE-YEAR-PLAN.md` §Y3 says the class has been found "eight times
// (W123, W129, W137, W142, and the two here, plus two caught pre-emptively during Q11)". That
// attribution does not survive being checked. W123's and W137's ledger rows describe no fold
// tie — W123's self-caught defect was a seed helper doing a bulk replace, W137's was erasure
// not reaching the referral rail — and the "two caught pre-emptively during Q11" were tie
// SENSITIVITIES fixed before anything shipped wrong, which is a different thing from a defect
// with pre-fix behaviour to reproduce. Meanwhile the count predates Q13 entirely and so omits
// W168's consent defect and W128's `pathwayAt`.
//
// So the corpus holds SEVEN entries, each one a defect that shipped, was found, and was fixed,
// with its pre-fix behaviour recoverable from the fix's own commentary. Building it to the
// number in the plan would have meant inventing two and dropping two real ones, and a corpus
// assembled to match a count nobody re-derived is exactly the fiction it exists to prevent.
// The three tie-sensitivities W167 caught pre-emptively keep their tie-break tests in the
// register where they belong; they are not regressions, because nothing regressed.
//
// TWO THINGS THIS FOUND ON ITS FIRST RUN, both recorded rather than fixed here.
//
//   `pathwayAt` IS STILL ORDER-DEPENDENT ON A TIE. W128 removed the null; it did not make two
//   same-instant publications resolve the same way both times, and nothing at the time claimed
//   it had. The entry carries `residual` and the suite pins the current behaviour, so a future
//   fix announces itself as a test that must be updated. Full argument on the entry.
//
//   AND W167'S REGISTER DOES NOT WATCH REPLAYS. Its detector matches folds that pick ONE
//   ELEMENT — `.reduce(`, `.at(-1)`, `[length - 1]`. Two of these defects lived in sort-then-
//   replay code (`acceptanceStatus`, `replayReferral`), which folds a collection into one answer
//   just as much and matches none of those patterns. Not widened here — that is W168's unit
//   again, and a replay is a genuinely different shape, with no last element to tie on because
//   the whole iteration order IS the answer. The test names the two so the omission is written
//   down rather than invisible.
//
// Not every entry failed the same way, which the shape has to allow for: W128's fold returned
// null in BOTH orders. It was consistently wrong on a tie rather than resolving it badly, so
// running it the other way round — the check that catches the other five — would have passed.
// A mutation check found that one. `preFixSymptom` records which, so the corpus never asserts a
// property an entry never had.

import { type AcceptanceAct, acceptanceStatus } from "@/referrals/acceptance";
import type { PatientId, PracticeId } from "@/domain/types";
import { type ConsentRecord, consentFor } from "@/pathways/consent";
import { type ReferralEvent, replayReferral } from "@/referrals/leakage";
import {
  type PathwayCriteria,
  type PathwayEvent,
  pathwayAt,
  versionHash,
} from "@/pathways/versioning";
import type { ConsentRecord as PmsConsentRecord, PmsReadAdapter } from "@/pms/adapter";
import { emptyIngestState, ingestFromAdapter, platformPatientId } from "@/pms/ingest";
import type { Patient } from "@/domain/types";
import type { ReturnReport } from "@/referrals/return-report";

/**
 * One historical defect, reproducible.
 *
 * `fold` is deliberately typed over `unknown[]`: the entries fold different collections, and a
 * generic parameter here would buy type safety inside each entry at the cost of a single loop
 * being able to run them all — which is the property that makes this a corpus rather than seven
 * separate tests somebody can forget to add the eighth to.
 */
export interface OrderRegression {
  /** Where it was written up. */
  id: string;
  /** The module and function it lived in. */
  site: string;
  /** What tied, in one line. */
  tie: string;
  /** Why the shipped answer is the safe side of the tie. */
  safeBecause: string;
  /** The records that tie. Fed in both orders. */
  tied: readonly unknown[];
  /**
   * How the pre-fix fold failed.
   *
   * Not every one of these was order-VARYING. W128's fold returned null in both orders — it was
   * consistently wrong on a tie, which is why re-running it in the other order would not have
   * caught it and why a mutation check did. Recording the symptom stops the corpus from
   * asserting a property two of its entries never had.
   */
  preFixSymptom: "order_dependent" | "wrong_either_way";
  /** The fold as it was BEFORE the fix, reconstructed from the fix's own commentary. */
  preFix: (records: readonly unknown[]) => unknown | Promise<unknown>;
  /** The real shipped function. Imported, never copied. */
  shipped: (records: readonly unknown[]) => unknown | Promise<unknown>;
  /** The answer the shipped fold must give, whichever order it is handed. Absent on a residual. */
  expected?: unknown;
  /**
   * Set when the ORIGINAL symptom is fixed but the underlying tie is not.
   *
   * A corpus that quietly asserted "fixed" here would be the register failure it exists to
   * prevent, so the entry says what is still open and the suite pins the current behaviour —
   * a future fix therefore shows up as a test that has to be updated, deliberately.
   */
  residual?: string;
}

/** Run a fold over a collection and over its reverse. The async analogue of W167's helper —
 *  needed because one of these defects lives behind an adapter and its fold is a Promise. */
export async function bothOrders(
  fold: (records: readonly unknown[]) => unknown | Promise<unknown>,
  tied: readonly unknown[],
): Promise<{ stable: boolean; forward: unknown; reversed: unknown }> {
  const forward = await fold(tied);
  const reversed = await fold([...tied].reverse());
  return { stable: JSON.stringify(forward) === JSON.stringify(reversed), forward, reversed };
}

// ---------------------------------------------------------------------------
// Fixtures. Each is the smallest input that ties on the fold's real sort key.
// ---------------------------------------------------------------------------

const consent = (over: Partial<ConsentRecord>): ConsentRecord =>
  ({
    patientId: "pat-1",
    practiceId: "prac-1",
    pathwayId: "cardio",
    versionHash: "h1",
    decision: "given",
    statement: "Discussed and agreed.",
    decidedAt: "2026-03-01",
    recordedBy: "clin-1",
    withdrawnAt: null,
    ...over,
  }) as ConsentRecord;

/** Q10-1: `withdrawConsent` returns a copy with the SAME `decidedAt`, so both live in the set. */
const Q10_1_TIED: ConsentRecord[] = [
  consent({}),
  consent({ withdrawnAt: "2026-03-09" }),
];

/** Q13-1: the patient decided twice on one day and day dates cannot order them. */
const Q13_1_TIED: ConsentRecord[] = [
  consent({ decision: "given" }),
  consent({ decision: "refused", statement: "Changed their mind." }),
];

const act = (kind: AcceptanceAct["kind"], at: string): AcceptanceAct =>
  kind === "sent"
    ? {
        kind: "sent",
        referralId: "ref-1",
        at,
        by: "clin-1",
        fromPracticeId: "prac-1" as PracticeId,
        toPracticeId: "prac-2" as PracticeId,
        patientId: "pat-1" as PatientId,
      }
    : kind === "declined"
      ? { kind: "declined", referralId: "ref-1", at, by: "clin-2", byPracticeId: "prac-2" as PracticeId, reason: "Out of scope." }
      : kind === "handed_back"
        ? { kind: "handed_back", referralId: "ref-1", at, by: "clin-2", byPracticeId: "prac-2" as PracticeId, reason: "Returned." }
        : { kind: "accepted", referralId: "ref-1", at, by: "clin-2", byPracticeId: "prac-2" as PracticeId };

/** Q11-1: a practice answered and corrected itself the same morning. Ordinary administration. */
const Q11_1_TIED: AcceptanceAct[] = [
  act("sent", "2026-03-01"),
  act("accepted", "2026-03-05"),
  act("declined", "2026-03-05"),
];

const report = (over: Partial<ReturnReport>): ReturnReport =>
  ({
    referralId: "ref-1",
    fromPracticeId: "prac-1" as PracticeId,
    toPracticeId: "prac-2" as PracticeId,
    patientId: "pat-1" as PatientId,
    outcome: "seen_care_returned",
    reportedAt: "2026-03-05",
    reportedBy: "clin-2",
    seenOn: "2026-03-04",
    narrative: null,
    ...over,
  }) as ReturnReport;

/** Q11-2: a report corrected and re-filed, both carrying the same date. */
const Q11_2_TIED: ReturnReport[] = [
  report({ outcome: "seen_care_returned" }),
  report({ outcome: "seen_care_retained" }),
];

const pmsConsent = (smsConsent: boolean): PmsConsentRecord => ({
  patientId: "p-1",
  smsConsent,
  capturedAt: "2026-03-01T09:00:00.000Z",
  source: "pms:intake-form",
});

/** Y3-1: a batch export stamping every row with the export time produces exactly this. */
const Y3_1_TIED: PmsConsentRecord[] = [pmsConsent(true), pmsConsent(false)];

const pmsPatient: Patient = {
  id: "p-1" as PatientId,
  practiceId: "prac-1" as PracticeId,
  usualClinicianId: null,
  smsConsent: false,
  optedOut: false,
  lastAttendedAt: null,
  futureBookingAt: null,
  activeRecall: false,
  chronicCare: false,
  holdout: false,
};

/** The smallest adapter that can carry a tied consent pair into the real ingest. */
const adapterFor = (consents: readonly PmsConsentRecord[]): PmsReadAdapter => ({
  name: "corpus",
  practiceId: "prac-1",
  listPatients: async () => [pmsPatient],
  listOpenSlots: async () => [],
  listCancellations: async () => [],
  listConsents: async () => [...consents],
});

const referralEvent = (kind: ReferralEvent["kind"], at: string): ReferralEvent => ({
  practiceId: "prac-1" as PracticeId,
  patientId: "pat-1" as PatientId,
  referralId: "ref-1",
  kind,
  at,
});

/** Y3-2: the patient books at reception on the way out, so both land on one date. */
const Y3_2_TIED: ReferralEvent[] = [
  referralEvent("referral_written", "2026-03-01"),
  referralEvent("appointment_recorded", "2026-03-01"),
];

const criteriaFor = (factCode: string): PathwayCriteria => ({
  inclusion: [{ factCode, requires: "present", rationale: "Corpus fixture." }],
  exclusion: [],
  escalation: [],
});

// Hashes are COMPUTED, not written down: `replayPathway` recomputes and rejects a draft whose
// hash does not describe its own criteria, so a hand-written "v1" is silently dropped and the
// fixture then proves nothing. Found the hard way — the first version of this fixture used
// literal hashes and empty criteria, and every draft was rejected as `missing_criteria`.
const C1 = criteriaFor("fact_a");
const C2 = criteriaFor("fact_b");
const H1 = versionHash(C1);
const H2 = versionHash(C2);

const pathwayEvent = (
  kind: PathwayEvent["kind"],
  hash: string,
  at: string,
  criteria?: PathwayCriteria,
): PathwayEvent => ({
  pathwayId: "cardio",
  kind,
  versionHash: hash,
  at,
  byEmail: "reviewer@demo.practice.example",
  ...(criteria ? { criteria } : {}),
});

/** W128: two versions published at the SAME instant. Drafted at different times, so only the
 *  publication ties — which is the tie the defect was about. */
const W128_TIED: PathwayEvent[] = [
  pathwayEvent("version_drafted", H1, "2026-01-01T00:00:00.000Z", C1),
  pathwayEvent("version_drafted", H2, "2026-01-02T00:00:00.000Z", C2),
  pathwayEvent("version_published", H1, "2026-02-01T00:00:00.000Z"),
  pathwayEvent("version_published", H2, "2026-02-01T00:00:00.000Z"),
];

// ---------------------------------------------------------------------------
// The corpus.
// ---------------------------------------------------------------------------

export const ORDER_REGRESSIONS: readonly OrderRegression[] = [
  {
    id: "Q10-1 (W129)",
    site: "src/pathways/consent.ts :: consentFor",
    tie: "A withdrawal copy carries the same `decidedAt` as the decision it withdraws, so an append-only set holds both and 'the last one by date' is whichever was stored last.",
    safeBecause:
      "A withdrawal reading as agreement is the exact inverse of W125's thesis that consent is never inferred. A withdrawal suppresses every decision made at or before it, stated over the whole set.",
    tied: Q10_1_TIED,
    preFixSymptom: "order_dependent",
    preFix: (records) => {
      // Sort by `decidedAt`, take the last, and read THAT ROW's `withdrawnAt`.
      const sorted = [...(records as ConsentRecord[])].sort((a, b) =>
        a.decidedAt.localeCompare(b.decidedAt),
      );
      const last = sorted.at(-1)!;
      return last.withdrawnAt !== null ? "withdrawn" : last.decision;
    },
    shipped: (records) =>
      consentFor(records as ConsentRecord[], "pat-1", "prac-1", "cardio", "h1").status,
    expected: "withdrawn",
  },
  {
    id: "Q13-1 (W168)",
    site: "src/pathways/consent.ts :: consentFor",
    tie: "Two decisions on one day. Day-granular dates cannot order two events within a day, so 'the latest decision' resolved by array position.",
    safeBecause:
      "Between a same-day yes and no there is no principled winner, so the answer is the one that does not treat an unresolved question as permission.",
    tied: Q13_1_TIED,
    preFixSymptom: "order_dependent",
    preFix: (records) => {
      const sorted = [...(records as ConsentRecord[])].sort((a, b) =>
        a.decidedAt.localeCompare(b.decidedAt),
      );
      const last = sorted.at(-1)!;
      return last.withdrawnAt !== null ? "withdrawn" : last.decision;
    },
    shipped: (records) =>
      consentFor(records as ConsentRecord[], "pat-1", "prac-1", "cardio", "h1").status,
    expected: "refused",
  },
  {
    id: "Q11-1 (W142)",
    site: "src/referrals/acceptance.ts :: acceptanceStatus",
    tie: "`Array.sort` is stable, so acts sharing a date kept input order and the last written won — accept-then-decline gave `declined`, decline-then-accept gave `accepted`.",
    safeBecause:
      "Among same-day acts the one that leaves the referring practice WATCHING wins. Not knowing whether a practice took a patient on must never resolve to 'they did'.",
    tied: Q11_1_TIED,
    preFixSymptom: "order_dependent",
    preFix: (records) => {
      const sorted = [...(records as AcceptanceAct[])].sort((a, b) => a.at.localeCompare(b.at));
      return sorted.at(-1)!.kind === "accepted" ? "accepted" : "declined";
    },
    shipped: (records) => acceptanceStatus(records as AcceptanceAct[], "ref-1").state,
    expected: "declined",
  },
  {
    id: "Y3-1 (W155)",
    site: "src/pms/ingest.ts :: effective consent",
    tie: "Two observations at the same `capturedAt` with opposite values, resolved by a comparator that returned 1 rather than 0 for equal keys — and step 3 had already filed the disagreement as a conflict that step 4 never read.",
    safeBecause:
      "This is the flag that decides whether a real person is contacted. An undecidable latest capture resolves to no contact: absence of a clear yes is not a yes.",
    tied: Y3_1_TIED,
    preFixSymptom: "order_dependent",
    preFix: (records) => {
      // The inconsistent comparator, verbatim: `1` for equal keys rather than `0`.
      const sorted = [...(records as PmsConsentRecord[])].sort((a, b) =>
        a.capturedAt < b.capturedAt ? -1 : 1,
      );
      return sorted.at(-1)!.smsConsent;
    },
    shipped: async (records) => {
      // Driven through the real `ingestFromAdapter` rather than reimplemented. This entry is the
      // reason `bothOrders` is async: the fold sits behind an adapter, and a corpus that copied
      // the fix here to keep itself synchronous would be testing its own copy — the exact thing
      // this module's header says it must not do.
      const state = await ingestFromAdapter(
        adapterFor(records as PmsConsentRecord[]),
        emptyIngestState(),
        "2026-03-02T00:00:00.000Z",
      );
      return state.patients.get(platformPatientId("corpus", "p-1"))?.smsConsent ?? null;
    },
    expected: false,
  },
  {
    id: "Y3-2 (W155)",
    site: "src/referrals/leakage.ts :: replayReferral",
    tie: "A referral written and an appointment booked the same day. The sort was stable and therefore deterministic on STORAGE order, which nothing guarantees matches the order things happened.",
    safeBecause:
      "The state machine already declares a referral must exist before anything can happen to it, so breaking the tie on chain position states a constraint the model holds rather than inventing a sequence.",
    tied: Y3_2_TIED,
    preFixSymptom: "order_dependent",
    preFix: (records) => {
      // Stable sort by `at`, ties left alone; the booking then arrives first and is rejected.
      const sorted = [...(records as ReferralEvent[])].sort((a, b) =>
        a.at < b.at ? -1 : a.at > b.at ? 1 : 0,
      );
      let stage = "not_written";
      for (const event of sorted) {
        if (event.kind === "referral_written") stage = "written_no_appointment";
        else if (event.kind === "appointment_recorded") {
          if (stage === "not_written") continue; // rejected as out_of_order
          stage = "attended_no_completion";
        }
      }
      return stage;
    },
    shipped: (records) =>
      replayReferral("ref-1", records as ReferralEvent[], "prac-1" as PracticeId).stage,
    expected: "attended_no_completion",
  },
  {
    id: "W128",
    site: "src/pathways/versioning.ts :: pathwayAt",
    tie: "Two versions published at the same instant. The fold picked the one published most recently at or before the instant, then discarded it if superseded by then — so it returned null for a pathway that plainly had a version in force.",
    safeBecause:
      "Returning null said 'no pathway was in force', which is a different and worse answer than 'we cannot tell which'. The rule is now asked of the replay's own state, and a mutation check proved the supersession guard had been compensating for the wrong selection rather than expressing the rule.",
    tied: W128_TIED,
    preFixSymptom: "wrong_either_way",
    preFix: (records) => {
      // "Most recently published at or before the instant", then dropped if superseded.
      const published = (records as PathwayEvent[]).filter((e) => e.kind === "version_published");
      const sorted = [...published].sort((a, b) => a.at.localeCompare(b.at));
      const pick = sorted.at(-1);
      if (!pick) return null;
      const superseded = published.some((e) => e.at >= pick.at && e.versionHash !== pick.versionHash);
      return superseded ? null : pick.versionHash;
    },
    shipped: (records) =>
      pathwayAt(records as PathwayEvent[], "cardio", "2026-03-01T00:00:00.000Z")?.versionHash ?? null,
    residual:
      "FOUND BY THIS CORPUS ON ITS FIRST RUN, and not fixed here. W128 removed the null — the fold now returns a version rather than claiming none was in force — but it did NOT make the tie order-independent, and nothing at the time claimed it had. `replayPathway` sorts with a comparator returning 0 for equal `at`, which is stable, so which of two same-instant publications supersedes the other is decided by the order the events were stored in. This corpus feeds the same events both ways and gets a different version each time. Latent: SHIPPED_PATHWAYS is empty behind G5, so no real pathway has two publications at one instant. It is still the version identity a verdict cites, which is why it is written down rather than left as a passing test. Per W142's rule the answer is probably to REPORT the ambiguity rather than resolve it, which changes `pathwayAt`'s return type and every caller — a hardening unit's work (W181), not a corpus unit's.",
  },
];

/**
 * Q11-2 is held separately: `returnFor` reads a module-level store rather than taking a
 * collection, so its fold cannot be expressed as `(records) => answer` without the test seeding
 * the store first. Exported so the suite runs it explicitly rather than leaving it out — the
 * shape of a function is not a reason to stop testing the defect that was in it.
 */
export const Q11_2 = {
  id: "Q11-2 (W142)",
  site: "src/referrals/store.ts :: returnFor",
  tie: "`.find()` takes the FIRST match, so a report corrected and re-filed on the same date was shown or hidden depending on storage order.",
  safeBecause:
    "A return report is clinical communication, and a superseded one shown as current is worse than showing none. Two different reports on the latest date are reported as AMBIGUOUS rather than resolved by position (W111).",
  tied: Q11_2_TIED,
  preFix: (records: readonly ReturnReport[]) =>
    records.find((r) => r.referralId === "ref-1")?.outcome ?? null,
} as const;
