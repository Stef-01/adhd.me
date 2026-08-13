// W209: every exported function of every store, and what scopes it.
//
// WHY A REGISTRY RATHER THAN A RULE. PRIV-3 has been open since Year 2. It recorded that three
// modules assumed one practice, and it was read as scheduled-and-handled for two years while
// two of the three sat untouched. Then W166 made two practices real and the modelling gap became
// a disclosure: W181 found the ops queue, Y4-1 found complaints, and this unit found the
// usefulness audit and the CPD trail. Five findings, one class, four separate discoveries — each
// one somebody noticing, none of them mechanical.
//
// A rule ("scope your reads") does not survive that. What survives is a list the tree checks:
// every exported store function is here, classified, and anything not scoped by a practice has
// to SAY IN WRITING why that is correct. A new store function is a build failure until somebody
// writes the sentence, and the sentence is what a later reader argues with.
//
// CHECKED BOTH DIRECTIONS, and the second direction is the one that matters. Missing entries
// catch new code; stale entries catch a function that was deleted or renamed while its
// justification stayed behind, still reading as though somebody had thought about it. W102's
// route census, W106's record classes and W167's fold sites all failed correctly during Q16 for
// exactly this reason.
//
// WHAT THIS REGISTRY DOES NOT DO. It does not prove a scoped read is correct — `queueView` took
// a practice and would still be right or wrong on its own merits. It proves that no read is
// unscoped BY ACCIDENT, which is what every one of the five findings actually was.

/**
 * How an exported store function is kept from returning another practice's data.
 *
 * Ordered strongest to weakest, which is also the order to prefer when a new function could
 * honestly be classified two ways.
 */
export type ScopeKind =
  /** Takes a practice id and uses it as the query. Mechanically verified against the signature. */
  | "practice_scoped"
  /** Takes an email and resolves to exactly the practices that email is a member of. */
  | "membership_scoped"
  /**
   * Keyed by a patient identifier and DELIBERATELY not by a practice.
   *
   * Erasure and access must reach every practice a patient has touched, so adding a practice
   * filter here is the change that would break erasure silently (W106, W103, Y4-1's fix note).
   * Mechanically verified to take NO practice — the check runs in the opposite direction.
   */
  | "patient_keyed"
  /** Keyed by an id minted inside one practice; the id is the scope. Reason states which id. */
  | "record_keyed"
  /** The raw store accessor. Scoped reads are built from it; it names them. */
  | "store_handle"
  /** Global on purpose, across every practice. The rarest kind; the reason carries the weight. */
  | "deliberately_global"
  /** Touches nothing practice-identifiable: validators, product catalogues, the public waitlist. */
  | "no_practice_data";

export interface StoreRead {
  module: string;
  fn: string;
  kind: ScopeKind;
  /** Why this is not `practice_scoped`. Required for every other kind. */
  reason?: string;
  /** `store_handle` only: the scoped reads callers should use instead. May be empty — say why. */
  scopedAlternatives?: string[];
}

/** The modules this registry covers. A store outside this list is invisible to the check. */
export const STORE_MODULES: readonly string[] = [
  "src/audit/store.ts",
  "src/booking/store.ts",
  "src/capability/store.ts",
  "src/complaints/store.ts",
  "src/console/store.ts",
  "src/education/store.ts",
  "src/interest/store.ts",
  "src/ops/store.ts",
  "src/privacy/store.ts",
  "src/referrals/store.ts",
  "src/registers/store.ts",
  "src/verticals/store.ts",
];

export const STORE_READS: readonly StoreRead[] = [
  // ── src/audit/store.ts — the module this unit was claimed for ──────────────────────────────
  {
    module: "src/audit/store.ts",
    fn: "getAudit",
    kind: "store_handle",
    reason: "The raw queue. Every surface reads through the scoped pair below.",
    scopedAlternatives: ["pendingVisitsFor", "outcomesFor"],
  },
  {
    module: "src/audit/store.ts",
    fn: "resetAudit",
    kind: "store_handle",
    reason: "Synthetic reset for tests and the mock route; returns the seed, reads nothing live.",
    scopedAlternatives: [],
  },
  { module: "src/audit/store.ts", fn: "pendingVisitsFor", kind: "practice_scoped" },
  { module: "src/audit/store.ts", fn: "outcomesFor", kind: "practice_scoped" },
  { module: "src/audit/store.ts", fn: "recordOutcome", kind: "practice_scoped" },

  // ── src/booking/store.ts ───────────────────────────────────────────────────────────────────
  {
    module: "src/booking/store.ts",
    fn: "getStore",
    kind: "store_handle",
    reason:
      "The synthetic rail. Practice-scoped views over it live in other modules (ops `queueView`, referrals `sentBy`), which is why the scoped alternatives are named there rather than here.",
    scopedAlternatives: ["contactPreferencesFor"],
  },
  {
    module: "src/booking/store.ts",
    fn: "resetStore",
    kind: "store_handle",
    reason: "Reseeds the synthetic rail; no live read.",
    scopedAlternatives: [],
  },
  {
    module: "src/booking/store.ts",
    fn: "sessionAppointmentType",
    kind: "record_keyed",
    reason:
      "Keyed by the invitation's clinician and session date. NAMED RESIDUAL: clinician ids are minted per practice (W166), so this match is only sound while one rail seeds one practice's sessions. The CPD trail had the same shape and was a live cross-practice read — this one is not yet, because the seeded rail holds one practice's sessions, and that is a property of the fixture rather than of the code.",
  },
  { module: "src/booking/store.ts", fn: "saveContactPreferences", kind: "practice_scoped" },
  { module: "src/booking/store.ts", fn: "contactPreferencesFor", kind: "practice_scoped" },
  {
    module: "src/booking/store.ts",
    fn: "bookInStore",
    kind: "record_keyed",
    reason:
      "Keyed by an invitation id, reached only through W82's unguessable booking token. The patient holds the link; no console surface calls it.",
  },

  // ── src/capability/store.ts ────────────────────────────────────────────────────────────────
  {
    module: "src/capability/store.ts",
    fn: "getInterestState",
    kind: "store_handle",
    reason: "The raw interest state; `statedBy` is the scoped read.",
    scopedAlternatives: ["statedBy"],
  },
  {
    module: "src/capability/store.ts",
    fn: "resetInterestState",
    kind: "store_handle",
    reason: "Synthetic reset; no live read.",
    scopedAlternatives: [],
  },
  { module: "src/capability/store.ts", fn: "statedBy", kind: "practice_scoped" },

  // ── src/complaints/store.ts — Y4-1's module ────────────────────────────────────────────────
  {
    module: "src/complaints/store.ts",
    fn: "getComplaints",
    kind: "store_handle",
    reason:
      "The raw store. Y4-1 was two console surfaces reading it directly; both now go through the scoped reads named here.",
    scopedAlternatives: ["complaintsFor", "openComplaintCount"],
  },
  {
    module: "src/complaints/store.ts",
    fn: "resetComplaints",
    kind: "store_handle",
    reason: "Synthetic reset; no live read.",
    scopedAlternatives: [],
  },
  { module: "src/complaints/store.ts", fn: "openComplaintCount", kind: "practice_scoped" },
  { module: "src/complaints/store.ts", fn: "complaintsFor", kind: "practice_scoped" },
  { module: "src/complaints/store.ts", fn: "submitComplaint", kind: "practice_scoped" },
  {
    module: "src/complaints/store.ts",
    fn: "complaintsForPatient",
    kind: "patient_keyed",
    reason:
      "APP 12 access. A patient asking what is held about them is owed every practice's holding, so a practice filter here would answer the question wrongly and look like tightening.",
  },
  {
    module: "src/complaints/store.ts",
    fn: "scrubPatientFromComplaints",
    kind: "patient_keyed",
    reason:
      "Erasure must reach both sides of every practice the patient has touched. Adding a practice filter is exactly the change that would break erasure silently.",
  },
  {
    module: "src/complaints/store.ts",
    fn: "triageInStore",
    kind: "record_keyed",
    reason:
      "Keyed by a complaint id minted in one practice. The console reaches it only from `complaintsFor`, which is practice-scoped, so the id in hand is already this practice's.",
  },
  {
    module: "src/complaints/store.ts",
    fn: "resolveInStore",
    kind: "record_keyed",
    reason: "As `triageInStore` — the id comes from a practice-scoped list.",
  },

  // ── src/console/store.ts ───────────────────────────────────────────────────────────────────
  { module: "src/console/store.ts", fn: "practiceRecord", kind: "practice_scoped" },
  {
    module: "src/console/store.ts",
    fn: "practicesFor",
    kind: "membership_scoped",
    reason: "Returns exactly the practices this email is a member of. Membership is the grant.",
  },
  {
    module: "src/console/store.ts",
    fn: "activePracticeFor",
    kind: "membership_scoped",
    reason:
      "Honours the practice cookie only when the email is already a member (W166), so a tampered cookie picks among practices the caller already has and nothing else.",
  },
  {
    module: "src/console/store.ts",
    fn: "getConsole",
    kind: "store_handle",
    reason:
      "Holds every practice, and the surfaces that call it use it for memberships and audit events, both of which carry a practiceId and are queried across practices by design.",
    scopedAlternatives: ["practiceRecord"],
  },
  {
    module: "src/console/store.ts",
    fn: "resetConsole",
    kind: "store_handle",
    reason: "Synthetic reset; no live read.",
    scopedAlternatives: [],
  },
  {
    module: "src/console/store.ts",
    fn: "validateOnboarding",
    kind: "no_practice_data",
    reason: "Pure validation of a form input; touches no store.",
  },
  {
    module: "src/console/store.ts",
    fn: "onboardPractice",
    kind: "membership_scoped",
    reason: "Mints a practice and seats the signing email as its owner. There is nothing to scope to yet.",
  },
  {
    module: "src/console/store.ts",
    fn: "validateRules",
    kind: "no_practice_data",
    reason: "Pure validation of a config; touches no store.",
  },
  { module: "src/console/store.ts", fn: "updateRules", kind: "practice_scoped" },
  {
    module: "src/console/store.ts",
    fn: "validateClinicians",
    kind: "no_practice_data",
    reason: "Pure validation of roster inputs; touches no store.",
  },
  { module: "src/console/store.ts", fn: "saveClinicians", kind: "practice_scoped" },
  { module: "src/console/store.ts", fn: "saveSessionConfig", kind: "practice_scoped" },
  {
    module: "src/console/store.ts",
    fn: "setupReadiness",
    kind: "no_practice_data",
    reason: "Pure function of one record the caller already holds; reads no store.",
  },
  { module: "src/console/store.ts", fn: "acknowledgeSetupStep", kind: "practice_scoped" },
  { module: "src/console/store.ts", fn: "completeSetup", kind: "practice_scoped" },

  // ── src/education/store.ts — this unit's second finding ────────────────────────────────────
  {
    module: "src/education/store.ts",
    fn: "resetEducation",
    kind: "store_handle",
    reason: "Synthetic reset; no live read.",
    scopedAlternatives: [],
  },
  {
    module: "src/education/store.ts",
    fn: "addSignedOffContent",
    kind: "no_practice_data",
    reason: "Records content that cleared G5. Material is product-level, like a pathway (W127).",
  },
  {
    module: "src/education/store.ts",
    fn: "getSignedOffSources",
    kind: "no_practice_data",
    reason: "The signed-off source catalogue. Empty until G5; the same for every practice.",
  },
  {
    module: "src/education/store.ts",
    fn: "getLibrary",
    kind: "no_practice_data",
    reason:
      "The material catalogue. Per-practice copies would mean N versions of a document with no single answer to what was published.",
  },
  {
    module: "src/education/store.ts",
    fn: "getTriggers",
    kind: "no_practice_data",
    reason: "Case triggers are content, not a practice's data.",
  },
  {
    module: "src/education/store.ts",
    fn: "addLibraryItems",
    kind: "no_practice_data",
    reason: "Writes to the product-level catalogue.",
  },
  {
    module: "src/education/store.ts",
    fn: "addTriggers",
    kind: "no_practice_data",
    reason: "Writes to the product-level catalogue.",
  },
  {
    module: "src/education/store.ts",
    fn: "addCpdEntries",
    kind: "record_keyed",
    reason: "Each entry carries its own practice and clinician; the writer appends, it reads nothing across.",
  },
  { module: "src/education/store.ts", fn: "cpdEntriesFor", kind: "practice_scoped" },
  { module: "src/education/store.ts", fn: "scrubClinicianCpd", kind: "practice_scoped" },

  // ── src/interest/store.ts ──────────────────────────────────────────────────────────────────
  {
    module: "src/interest/store.ts",
    fn: "saveInterestSignup",
    kind: "no_practice_data",
    reason: "The public waitlist. Nobody who signs up belongs to a practice yet; there is nothing to scope to.",
  },
  {
    module: "src/interest/store.ts",
    fn: "listInterestSignups",
    kind: "no_practice_data",
    reason: "Waitlist, read by the founder-side console only. No practice exists on these rows.",
  },
  {
    module: "src/interest/store.ts",
    fn: "interestSignupsCsv",
    kind: "no_practice_data",
    reason: "The same waitlist rendered for export.",
  },
  {
    module: "src/interest/store.ts",
    fn: "interestSignupsFor",
    kind: "no_practice_data",
    reason: "Subject access, keyed by the signup email. No practice on the row to scope by.",
  },
  {
    module: "src/interest/store.ts",
    fn: "eraseInterestSignups",
    kind: "no_practice_data",
    reason: "Erasure, keyed by the signup email. No practice on the row.",
  },
  {
    module: "src/interest/store.ts",
    fn: "pruneInterestSignups",
    kind: "no_practice_data",
    reason: "Retention sweep over the waitlist.",
  },

  // ── src/ops/store.ts — W181's module ───────────────────────────────────────────────────────
  {
    module: "src/ops/store.ts",
    fn: "getOps",
    kind: "store_handle",
    reason: "Switches and the audit trail, both of which carry a practice on the row.",
    scopedAlternatives: ["queueView", "feedEvidenceFor"],
  },
  {
    module: "src/ops/store.ts",
    fn: "resetOps",
    kind: "store_handle",
    reason: "Synthetic reset; no live read.",
    scopedAlternatives: [],
  },
  { module: "src/ops/store.ts", fn: "queueView", kind: "practice_scoped" },
  {
    module: "src/ops/store.ts",
    fn: "applyKillSwitch",
    kind: "deliberately_global",
    reason:
      "The kill switch halts sending for EVERY practice, which is the whole point of having one. Scoping it would be the defect — a per-practice halt already exists as `applyPracticePause`.",
  },
  { module: "src/ops/store.ts", fn: "applyPracticePause", kind: "practice_scoped" },
  { module: "src/ops/store.ts", fn: "recordFeedEvidence", kind: "practice_scoped" },
  { module: "src/ops/store.ts", fn: "feedEvidenceFor", kind: "practice_scoped" },

  // ── src/privacy/store.ts ───────────────────────────────────────────────────────────────────
  {
    module: "src/privacy/store.ts",
    fn: "exportForPatient",
    kind: "patient_keyed",
    reason:
      "APP 12 access. The answer to 'what do you hold about me' is every practice's holding, so this must not take a practice.",
  },
  {
    module: "src/privacy/store.ts",
    fn: "deletePatientEverywhere",
    kind: "patient_keyed",
    reason:
      "The name is the specification. Erasure that stopped at one practice would leave the patient held somewhere and report success.",
  },
  {
    module: "src/privacy/store.ts",
    fn: "runRetention",
    kind: "deliberately_global",
    reason:
      "A retention sweep is a property of the product's policy, not of one practice's data. A per-practice sweep would let one practice's schedule keep records another practice's policy had expired.",
  },

  // ── src/referrals/store.ts ─────────────────────────────────────────────────────────────────
  {
    module: "src/referrals/store.ts",
    fn: "resetReferralRail",
    kind: "store_handle",
    reason: "Synthetic reset; no live read.",
    scopedAlternatives: [],
  },
  {
    module: "src/referrals/store.ts",
    fn: "addReferralDocuments",
    kind: "record_keyed",
    reason: "Each document names its sending and receiving practice; the writer appends only.",
  },
  {
    module: "src/referrals/store.ts",
    fn: "addAcceptanceActs",
    kind: "record_keyed",
    reason: "Each act carries its practice; the writer appends only.",
  },
  {
    module: "src/referrals/store.ts",
    fn: "addReferralEvents",
    kind: "record_keyed",
    reason: "Each event carries its practice; the writer appends only.",
  },
  {
    module: "src/referrals/store.ts",
    fn: "addReturnReports",
    kind: "record_keyed",
    reason: "Each report carries its referral, which carries its practices; the writer appends only.",
  },
  { module: "src/referrals/store.ts", fn: "actsFor", kind: "practice_scoped" },
  { module: "src/referrals/store.ts", fn: "eventsFor", kind: "practice_scoped" },
  { module: "src/referrals/store.ts", fn: "sentEventsFor", kind: "practice_scoped" },
  { module: "src/referrals/store.ts", fn: "sentBy", kind: "practice_scoped" },
  { module: "src/referrals/store.ts", fn: "sentTo", kind: "practice_scoped" },
  {
    module: "src/referrals/store.ts",
    fn: "scrubPatientFromReferrals",
    kind: "patient_keyed",
    reason:
      "W103's reasoning, unchanged: a referral spans two practices and erasure has to reach both sides of every one the patient touched.",
  },
  {
    module: "src/referrals/store.ts",
    fn: "returnFor",
    kind: "record_keyed",
    reason:
      "Keyed by a referral id. The console reaches it only from `sentBy`/`sentTo`, both practice-scoped, so the id in hand already belongs to a referral this practice is a party to.",
  },

  // ── src/registers/store.ts ─────────────────────────────────────────────────────────────────
  {
    module: "src/registers/store.ts",
    fn: "getRegisters",
    kind: "store_handle",
    reason: "Raw counts keyed by practice; `registersFor` is the read.",
    scopedAlternatives: ["registersFor"],
  },
  {
    module: "src/registers/store.ts",
    fn: "resetRegisters",
    kind: "store_handle",
    reason: "Synthetic reset; no live read.",
    scopedAlternatives: [],
  },
  { module: "src/registers/store.ts", fn: "seedCounts", kind: "practice_scoped" },
  { module: "src/registers/store.ts", fn: "registersFor", kind: "practice_scoped" },
  { module: "src/registers/store.ts", fn: "setRegisterEnabled", kind: "practice_scoped" },

  // ── src/verticals/store.ts ─────────────────────────────────────────────────────────────────
  {
    module: "src/verticals/store.ts",
    fn: "resetVerticals",
    kind: "store_handle",
    reason: "Synthetic reset; no live read.",
    scopedAlternatives: [],
  },
  {
    module: "src/verticals/store.ts",
    fn: "getVerticalSpecs",
    kind: "no_practice_data",
    reason: "A vertical is product machinery — the same declaration for every practice (W157).",
  },
  {
    module: "src/verticals/store.ts",
    fn: "addVerticalSpecs",
    kind: "no_practice_data",
    reason: "Writes product-level declarations.",
  },
  {
    module: "src/verticals/store.ts",
    fn: "assembleEvidence",
    kind: "no_practice_data",
    reason:
      "Reports which members of each vertical exist and which are missing. About the product's own completeness, never about a practice's data.",
  },
  {
    module: "src/verticals/store.ts",
    fn: "knownMembers",
    kind: "no_practice_data",
    reason: "Names the member kinds a vertical can have. Declaration, not data.",
  },
];
