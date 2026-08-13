// W140: the referral layer's scoping triage, made mechanical.
//
// W103's sweep method is to walk the tree rather than the memory: list every read that could
// cross a practice boundary and decide about each one in writing. Done once, that is a document
// that is true on the day it is written. So this is the registry form, and the test checks it
// against the tree — a new exported function in `src/referrals/` fails the suite until somebody
// says which of three things it is.
//
// The three answers, and the reason there are exactly three:
//
//   `takes_practice_id` — it is scoped at the source. The practice is an argument and the
//   narrowing IS the query. This is the answer that needs no trust.
//
//   `scoped_by_argument` — it is pure and operates on data the caller already scoped. Safe, but
//   the safety lives in the caller, so the entry has to name what makes that true. These are the
//   entries a future reviewer should read first, because they are where a mistake would hide.
//
//   `no_practice_data` — it touches nothing practice-linked at all. Linters, copy tables,
//   validators over a single input.
//
// The sweep that produced this list found one real hit, recorded in the entry for `actsFor`.

export type ScopingAnswer = "takes_practice_id" | "scoped_by_argument" | "no_practice_data";

export interface ScopingEntry {
  module: string;
  fn: string;
  answer: ScopingAnswer;
  /** Why that answer is correct. Required — an untriaged export is the thing this prevents. */
  rationale: string;
}

export const REFERRAL_SCOPING: readonly ScopingEntry[] = [
  // --- store: the only module that holds state, so the only one that can leak by itself ---
  {
    module: "src/referrals/store.ts", fn: "sentBy", answer: "takes_practice_id",
    rationale: "Filters on fromPracticeId as the query. A practice sees only what it sent.",
  },
  {
    module: "src/referrals/store.ts", fn: "sentTo", answer: "takes_practice_id",
    rationale: "Filters on toPracticeId as the query. Separate from sentBy because the two sides have different jobs and a flag would be one argument from the wrong list.",
  },
  {
    module: "src/referrals/store.ts", fn: "actsFor", answer: "takes_practice_id",
    rationale: "THE HIT THIS SWEEP FOUND. Was `allActs()`, returning the whole rail with the console narrowing afterwards by referral id — correct in the path that existed, wrong in shape, because the safety depended on the PROVENANCE of the referral id rather than on a check. Now scoped to referrals the practice is party to on either side.",
  },
  {
    module: "src/referrals/store.ts", fn: "eventsFor", answer: "takes_practice_id",
    rationale: "Same finding and same fix as actsFor: chain events narrowed to referrals the practice is party to.",
  },
  {
    module: "src/referrals/store.ts", fn: "sentEventsFor", answer: "takes_practice_id",
    rationale: "W181. Scoped to referrals this practice SENT, which is a narrower question than eventsFor's tenancy scope. The outcomes console asks 'did what we wrote go anywhere' and was using the party-to query, so an inbound referral was counted by both practices under descriptions that cannot both be true. Kept separate from eventsFor rather than added as a flag, for sentBy/sentTo's reason.",
  },
  {
    module: "src/referrals/store.ts", fn: "returnFor", answer: "scoped_by_argument",
    rationale: "Keyed by referral id alone. Every caller obtains that id from sentBy/sentTo, so it is already this practice's referral. Deliberately not re-scoped: a return report belongs to the referral, and both practices are entitled to it.",
  },
  {
    module: "src/referrals/store.ts", fn: "scrubPatientFromReferrals", answer: "no_practice_data",
    rationale: "Erasure is deliberately NOT practice-scoped: a patient's erasure must reach both sides of every handover, and scoping it would leave the receiving practice's copy behind — which is the W51 failure in a new place.",
  },
  {
    module: "src/referrals/store.ts", fn: "resetReferralRail", answer: "no_practice_data",
    rationale: "Test and demo reset of the whole store, deliberately unscoped. Registered in W51's resetter registry so it cannot be forgotten.",
  },
  ...(["addReferralDocuments", "addAcceptanceActs", "addReferralEvents", "addReturnReports"] as const).map(
    (fn) => ({
      module: "src/referrals/store.ts", fn, answer: "no_practice_data" as const,
      rationale: "A write. The practice ids are fields on the rows being written, checked by W131/W134's constructors before they get here; a write cannot read across a boundary.",
    }),
  ),

  {
    module: "src/referrals/analytics.ts", fn: "buildReferralAnalytics", answer: "takes_practice_id",
    rationale: "W141: takes practiceId, counts only referrals whose fromPracticeId matches it, and passes it to detectLeakage. A referral sent TO this practice is the other one's process and is excluded by the same filter.",
  },
  {
    module: "src/referrals/analytics.ts", fn: "renderReferralAnalytics", answer: "scoped_by_argument",
    rationale: "Renders a report the caller already built for one practice, and the report itself carries no patient, referral or receiving-practice identifier to leak.",
  },

  // --- pure modules: no state, so they can only leak what a caller hands them ---
  {
    module: "src/referrals/tracking.ts", fn: "trackReferral", answer: "takes_practice_id",
    rationale: "Takes practiceId and passes it to replayReferral, so the clinical chain is scoped. The acts it receives are now scoped at the source by actsFor.",
  },
  {
    module: "src/referrals/tracking.ts", fn: "describeOutstanding", answer: "scoped_by_argument",
    rationale: "Renders a tracking result the caller already obtained for one practice. It performs no lookup of its own.",
  },
  {
    module: "src/referrals/acceptance.ts", fn: "acceptanceStatus", answer: "scoped_by_argument",
    rationale: "Folds the acts it is given, filtered by referral id. Safe because every caller now sources acts from actsFor — which is exactly the dependency this sweep made explicit rather than assumed.",
  },
  {
    module: "src/referrals/acceptance.ts", fn: "careHolderWhile", answer: "scoped_by_argument",
    rationale: "Pure function of one acceptance status value; it reads nothing and holds nothing.",
  },
  {
    module: "src/referrals/acceptance.ts", fn: "acceptedReferral", answer: "scoped_by_argument",
    rationale: "Pure function of one acceptance status value, producing the proof W134's obligations require.",
  },
  {
    module: "src/referrals/acceptance.ts", fn: "obligationsFor", answer: "scoped_by_argument",
    rationale: "Takes proof of acceptance and names the ACCEPTING practice from it, so it cannot attribute an obligation to a practice that did not accept.",
  },
  {
    module: "src/referrals/leakage.ts", fn: "replayReferral", answer: "takes_practice_id",
    rationale: "W93: filters events by referral id AND practice id before folding.",
  },
  {
    module: "src/referrals/leakage.ts", fn: "detectLeakage", answer: "takes_practice_id",
    rationale: "W93: scopes to one practice before summarising.",
  },
  {
    module: "src/referrals/outreach.ts", fn: "planOutreach", answer: "takes_practice_id",
    rationale: "W95: recipients, barriers, recalls and timelines are each filtered to input.practiceId before planning.",
  },
  {
    module: "src/referrals/outreach.ts", fn: "withheldCounts", answer: "scoped_by_argument",
    rationale: "Counts the refusals on a plan the caller already built for one practice; it performs no lookup of its own.",
  },
  {
    module: "src/referrals/barriers.ts", fn: "recordBarrier", answer: "no_practice_data",
    rationale: "A write. The practice id is a field on the row being written, so it cannot read across a boundary.",
  },
  {
    module: "src/referrals/barriers.ts", fn: "barriersFor", answer: "takes_practice_id",
    rationale: "W94: filters to the practice before returning.",
  },
  {
    module: "src/referrals/barriers.ts", fn: "tallyBarriers", answer: "scoped_by_argument",
    rationale: "Counts barrier records the caller already scoped to one practice; no lookup of its own.",
  },
  {
    module: "src/referrals/barriers.ts", fn: "coverage", answer: "scoped_by_argument",
    rationale: "Computes coverage over barrier records the caller already scoped to one practice.",
  },
  {
    module: "src/referrals/capture.ts", fn: "captureOutstanding", answer: "takes_practice_id",
    rationale: "W92: scopes to the practice before capturing.",
  },
  {
    module: "src/referrals/capture.ts", fn: "outstandingBySpecialty", answer: "scoped_by_argument",
    rationale: "Groups a capture the caller already scoped to one practice; it performs no lookup of its own.",
  },
  {
    module: "src/referrals/report.ts", fn: "buildLeakageReport", answer: "takes_practice_id",
    rationale: "W96: takes the practice it is reporting on.",
  },
  {
    module: "src/referrals/report.ts", fn: "renderLeakageReport", answer: "scoped_by_argument",
    rationale: "Renders a report the caller already built for one practice.",
  },
  {
    module: "src/referrals/document.ts", fn: "buildReferral", answer: "no_practice_data",
    rationale: "W131: validates one input and refuses a self-referral. Reads nothing.",
  },
  {
    module: "src/referrals/document.ts", fn: "explainReferralRejection", answer: "no_practice_data",
    rationale: "A copy table keyed by rejection reason. No data of any kind passes through it.",
  },
  {
    module: "src/referrals/return-report.ts", fn: "recordReturn", answer: "no_practice_data",
    rationale: "W132: validates one input. Reads nothing.",
  },
  {
    module: "src/referrals/return-report.ts", fn: "ongoingCareAfter", answer: "no_practice_data",
    rationale: "Pure function of one return outcome value; it reads nothing and holds nothing.",
  },
  {
    module: "src/referrals/return-report.ts", fn: "completionEvent", answer: "scoped_by_argument",
    rationale: "Builds a W93 event from a report, filing it under the REFERRING practice named on that report.",
  },
  {
    module: "src/referrals/return-report.ts", fn: "explainReturnRejection", answer: "no_practice_data",
    rationale: "A copy table keyed by rejection reason. No data of any kind passes through it.",
  },
  {
    module: "src/referrals/compliance.ts", fn: "lintReferralCopy", answer: "no_practice_data",
    rationale: "W139: lints a string. The conditions it takes are a catalogue, not patient data.",
  },
  {
    module: "src/referrals/compliance.ts", fn: "renderCompliantReferralCopy", answer: "no_practice_data",
    rationale: "As above, throwing instead of returning findings.",
  },
  {
    module: "src/referrals/compliance.ts", fn: "referralCopyRules", answer: "no_practice_data",
    rationale: "Returns the union of rule NAMES from three linters, so a caller can assert coverage. No data passes through it.",
  },
];

/** Entries whose safety lives in the caller — the ones a reviewer should read first. */
export function callerScoped(): ScopingEntry[] {
  return REFERRAL_SCOPING.filter((entry) => entry.answer === "scoped_by_argument");
}
