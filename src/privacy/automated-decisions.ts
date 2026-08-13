// W201: what the software decides about a patient, enumerated and checked against the tree.
//
// The ADM-transparency page (APP 1.7, commencing 10 December 2026) was written at W33 and revised
// at W102, which found it materially out of date and said so in a comment: *keep this page in the
// same commit as any change to what the software decides.* That instruction was ignored for three
// years, which is what instructions in comments are for. Y3 and Y4 added a pathway engine, a
// GP-to-GP referral rail, outcome verdicts and a directory, and the published statement still
// described the Year 2 product.
//
// So the list stops being prose on a page and becomes a register the page renders, checked against
// the source in both directions. A module that decides something about a patient and is not
// declared here fails the suite. That is the difference the unit's gate asks for — "checked
// against the source rather than written from memory" — and writing it found three things memory
// had lost.
//
// THE HOLDOUT ARM WAS NEVER DISCLOSED AT ALL. W8 assigns every patient to an arm by hashing
// (practice, patient) at the practice's configured rate, and patients in the holdout arm are not
// invited — that is how the practice can tell whether any of this works. It is a decision, taken
// automatically, that withholds an offer of an appointment from a specific person, and it has been
// live since Year 1 and absent from the statement since Year 1. Everything else here is a decision
// that was disclosed late; this one is a decision that was never disclosed. It is first in the
// list for that reason.
//
// ESCALATION TO A HUMAN WAS NOT DISCLOSED EITHER. W73 ships four live triggers — a free-text
// reply, a complaint, repeated non-attendance, an opt-out carrying a message — each of which
// routes the patient to their usual GP. It is the most benign automated decision in the product
// and it is still one: something a patient did caused software to put them in front of a clinician.
//
// AND THE PATHWAY ENGINE IS BUILT BUT NOT IN USE, which is worth saying precisely rather than
// omitting. W120 evaluates recorded facts against criteria a practice has signed off, including
// escalation criteria. No pathway has been signed off — `SHIPPED_PATHWAYS` is empty behind G5 — so
// the decision is not being taken about anybody today. A notice that omitted it would be accurate
// now and wrong the day the gate opens; a notice that described it as live would be wrong now. So
// status is a field, and the test READS THE REGISTRY to check it: a decision claiming to be
// dormant whose content registry has filled up fails.
//
// The detector's bound, stated because a register that hides its bound is worse than no register:
// "touches a patient" is the union of two scans — modules naming `PatientId`/`patientId`, and
// modules exporting a decision-outcome union (`*Reason`, `*Refusal`, `*Exclusion`, `*Verdict`).
// Neither alone is sound. The union scan misses `registers/escalation.ts`, which names its
// outcomes `EscalationRoute`; the identifier scan misses `engine/eligibility.ts`, which takes ids
// as plain strings. Together they caught both, and every module either implements a declared
// decision or is declared as not being one.

/** Whether the decision is actually being taken about anybody today. */
export type DecisionStatus =
  /** Live: this is happening now, wherever a practice has the feature on. */
  | "in_use"
  /** Built, and taking no decisions, because the content it needs is gated and empty. */
  | "built_not_in_use";

/**
 * The content registry that makes a decision live, if it has one.
 *
 * Read by the test rather than trusted: `built_not_in_use` must point at an EMPTY registry and
 * `in_use` at a non-empty one. This is the check that makes `status` a fact about the tree instead
 * of a claim in a document.
 */
export interface ContentRegistry {
  module: string;
  exportName: string;
}

export interface AutomatedDecision {
  id: string;
  /** The bold lead-in on the page. */
  title: string;
  /** What is decided, addressed to the patient it is decided about. Rendered verbatim. */
  what: string;
  /** The modules that take it, as the tree spells them. */
  decidedBy: readonly string[];
  status: DecisionStatus;
  /** Null when the decision needs no signed-off content to run. */
  registry: ContentRegistry | null;
}

export const AUTOMATED_DECISIONS: readonly AutomatedDecision[] = [
  {
    id: "holdout-arm",
    title: "Whether you are in the group we deliberately leave alone.",
    what: "To know whether any of this helps, a share of patients at each practice is set aside and not sent availability messages at all. Which group you are in is worked out by a calculation on your patient number that always gives the same answer, not by anything about you or your health, and your practice sets the size of the group. Being in it does not change your care or your ability to book an appointment in the usual way; it means the practice is not messaging you about spare slots.",
    decidedBy: ["src/engine/holdout.ts"],
    status: "in_use",
    registry: null,
  },
  {
    id: "eligibility-filtering",
    title: "Whether you may be offered an available appointment.",
    what: "Deterministic rules your practice configures: how recently you attended, appointments you already have, how often you have been contacted, consent and opt-out status. The rules are versioned and every exclusion is recorded with its reason, so your practice can ask why any single patient was or was not included.",
    decidedBy: [
      "src/engine/eligibility.ts",
      "src/engine/pool.ts",
      "src/engine/backfill.ts",
    ],
    status: "in_use",
    registry: null,
  },
  {
    id: "register-membership",
    title: "Whether you are on a register your practice runs.",
    what: "Membership is taken from the flag your practice has already recorded on your file, or added by the practice itself. It is never worked out from symptoms, medicines or anything else about you, and the source of every membership is recorded.",
    decidedBy: ["src/registers/membership.ts"],
    status: "in_use",
    registry: null,
  },
  {
    id: "care-gap-timing",
    title: "When a scheduled appointment comes round.",
    what: "A calendar calculation against the interval your practice has set for that register — the time elapsed since a recorded date, not a judgement about whether you need to be seen. Your practice can also require this before anybody is contacted, which narrows who is messaged rather than widening it.",
    decidedBy: ["src/registers/caregap.ts", "src/registers/eligibility.ts"],
    status: "in_use",
    registry: null,
  },
  {
    id: "ordering-within-the-eligible-group",
    title: "Who is offered a slot first.",
    what: "Patients already found eligible are put in an order using simple, explainable factors — whether your practice has flagged you for ongoing care, and how long since your last visit. It decides the order of offers, never who is more unwell.",
    decidedBy: ["src/registers/ranking.ts"],
    status: "in_use",
    registry: null,
  },
  {
    id: "which-gp-the-offer-names",
    title: "Which GP the offer names.",
    what: "An offer normally names your usual GP. If your practice has turned this on for a particular register, and your usual GP does not meet the threshold that practice has set, the offer may name a different GP at the same practice instead. It never sends you outside your own practice, it never moves you when your usual GP does meet the threshold, and every such decision is recorded with its reason. Your practice sets a limit on how much of this can happen at all.",
    decidedBy: ["src/capability/routing.ts", "src/capability/experience.ts"],
    status: "in_use",
    registry: null,
  },
  {
    id: "decisions-not-to-contact",
    title: "Decisions not to contact you.",
    what: "Just as often the automated decision is silence: if your practice already has its own recall running for you, if you have had as many invitations as your practice allows, if the appointment would be gone before the hours you agreed to be contacted in, or if a practice-wide safety threshold has paused sending. Silence is recorded with its reason in the same way a message is.",
    decidedBy: [
      "src/registers/recalls.ts",
      "src/messaging/preferences.ts",
      "src/guardrails/condition-monitors.ts",
      "src/registers/safety-rails.ts",
    ],
    status: "in_use",
    registry: null,
  },
  {
    id: "send-mechanics",
    title: "How and when a message actually goes out.",
    what: "Batch sizes, the wording template your practice has approved, and expiry of an offer once the session fills. An offer that has lapsed cannot be booked, which is the only way software here ever closes a door — and the appointment was gone in any case.",
    decidedBy: [
      "src/booking/rail.ts",
      "src/messaging/adapter.ts",
      "src/messaging/approval.ts",
    ],
    status: "in_use",
    registry: null,
  },
  {
    id: "escalation-to-a-human",
    title: "Whether something you did is put in front of your GP.",
    what: "Four things take you out of the automated loop and to your usual GP: replying to a message in your own words, a complaint being logged, repeatedly not attending appointments the software offered, and opting out with a message attached. The software reads none of it. It notices that you wrote something or that something happened, and hands it to a person, because an automated loop is the wrong thing to be talking to.",
    decidedBy: ["src/registers/escalation.ts", "src/outcomes/escalation-monitor.ts"],
    status: "in_use",
    registry: { module: "src/registers/escalation.ts", exportName: "SHIPPED_TRIGGERS" },
  },
  {
    id: "referral-follow-up",
    title: "Whether you are reminded about a referral that has not completed.",
    what: "Where your practice has written you a referral and nothing has come back, the software can notice that and offer you an appointment with your own practice to sort it out. It is the same availability message as any other and says nothing about why. It never contacts the other practice about you and never chases you about your health.",
    decidedBy: [
      "src/referrals/capture.ts",
      "src/referrals/leakage.ts",
      "src/referrals/outreach.ts",
    ],
    status: "in_use",
    registry: null,
  },
  {
    id: "referral-outcome-verdict",
    title: "What the record shows happened to your referral.",
    what: "The software forms a verdict on each referral — whether the record contains an appointment, a completion, or nothing yet — so a practice can see what has not closed. The verdict is a statement about which facts were recorded, never about whether the care was right, and \"nothing recorded\" is kept distinct from \"nothing happened\" because they are different.",
    decidedBy: ["src/outcomes/model.ts"],
    status: "in_use",
    registry: null,
  },
  {
    id: "intervention-response-link",
    title: "Whether something in your record counts as an answer to something we did.",
    what: "Built and not in use. Where your practice sent you an availability message or wrote a referral, the software can link a later recorded fact — a booking, an attendance, a decline, an opt-out — to the thing that came before it, so the practice can see what its own actions led to. It links only facts somebody wrote down, only where the later fact comes after the earlier one, and only kinds it has been told to expect. Where nothing is recorded it says nothing is recorded: that is never read as you having declined, ignored us, or made any choice at all. Nothing in it is a judgement about you or your health, and no page in the product shows it yet.",
    decidedBy: ["src/outcomes/response.ts"],
    status: "built_not_in_use",
    registry: null,
  },
  {
    id: "pathway-criteria",
    title: "Whether the facts on your file match a pathway your practice signed off.",
    what: "Built and not in use. Where a practice adopts a care pathway, the software compares facts already recorded on your file against the criteria in that pathway and flags the pathway for the practice to look at, including criteria that ask a clinician to look sooner. It reaches no conclusion about your health, it reads nothing but facts somebody recorded, and where a fact is missing it says so rather than assuming. No pathway has been signed off for use, so this decision is not currently being taken about anybody.",
    decidedBy: ["src/pathways/evaluation.ts", "src/pathways/consent.ts"],
    status: "built_not_in_use",
    registry: { module: "src/pathways/versioning.ts", exportName: "SHIPPED_PATHWAYS" },
  },
];

/**
 * What the software will not do, rendered on the same page.
 *
 * Here rather than in the page because the two lists are read together and a claim about what is
 * never automated is only as good as the enumeration it sits beside.
 */
export const NEVER_AUTOMATED: readonly string[] = [
  "No clinical decision of any kind — no diagnosis, no triage, no assessment of symptoms.",
  "No decision to deny care: not being sent an availability message never affects your ability to book through the practice as usual.",
  "No inference about you. Nothing is concluded from your details that you or your practice did not record. Where a reason for something is held, somebody said it.",
  "No ordering of patients by need or by how unwell they are, and no list of who is most at risk. Meherr decides who has an appointment offered to them, never who most needs one.",
  "No decision that your care has moved to another clinician. When your GP refers you, the receiving practice must record that it has taken you on; silence is never read as a handover.",
  "Nothing you are sent reveals why you were selected. A message prompted by a register or by a referral is word for word the same as any other appointment invitation.",
  "No automated re-enabling of contact after you opt out. Opt-out is permanent.",
];

/** What is read, rendered on the page. Kept beside the decisions because it is the input to them. */
export const INFORMATION_USED: readonly string[] = [
  "Meherr reads what your practice has already recorded about you: when you last attended, appointments you have booked, whether you have opted out, the ongoing-care conditions your practice has flagged on your record, and referrals your practice has written. Some of that is health information. It is used to decide who to invite to an appointment and when — never to work anything out about your health.",
  "Meherr does not read your consultation notes, test results or clinical correspondence, and does not receive them.",
];

export const HUMAN_CONTROLS: readonly string[] = [
  "The practice configures and can change every eligibility rule at any time.",
  "Every register, and the routing described above, is off unless your practice turns it on.",
  "Practice staff can pause all sending instantly with one switch.",
  "Your practice approves the exact wording of every message before any of it can be sent, and an edit of a single character withdraws that approval.",
  "You can stop all messages by replying STOP, and can ask your practice to access or delete the information Meherr holds.",
  "Every automated action is written to an audit log the practice can inspect.",
];

/**
 * Modules the detector reaches that take no automated decision about a patient, with the reason.
 *
 * The other half of the register, and the half that does the work: without it "every decision is
 * declared" is unfalsifiable, because nothing says what the complete set of candidates was. A
 * module here is a module somebody looked at and ruled out.
 */
export const NOT_A_DECISION: Readonly<Record<string, string>> = {
  "src/booking/store.ts": "The store behind the booking pages. It records the transitions the rail decides; it decides nothing.",
  "src/complaints/store.ts": "Storage for complaints. The complaint is the practice's record and the store keeps it.",
  "src/complaints/workflow.ts": "Intake and resolution of a complaint by practice staff. Every step is a person acting.",
  "src/credentials/verification.ts": "A clinician's credential and who verified it. Nothing about a patient.",
  "src/directory/correction.ts": "What a clinician may change about their own directory profile.",
  "src/directory/fees.ts": "What a practice charges, as the practice states it.",
  "src/directory/membership.ts": "Which clinicians are in the network, on a basis the practice declares rather than one inferred.",
  "src/domain/types.ts": "The domain types. Declarations, no behaviour.",
  "src/education/provenance.ts": "Where a piece of education content came from.",
  "src/engine/arm-stability.ts": "A property check asserting a patient's arm survives a version change. It reads assignments and decides nothing.",
  "src/engine/attribution.ts": "Cohort arithmetic comparing the invited arm with the holdout arm. A statement about a group, never about a member of it.",
  "src/engine/continuity.ts": "Practice-level continuity measurement — what share of appointments were with a patient's usual GP.",
  "src/interest/types.ts": "The reasons a practice can pick on the interest form. Chosen by a person.",
  "src/loop/claims.ts": "Which build session may claim a ledger row. Engineering, not product.",
  "src/outcomes/counterfactual.ts": "W215's counterfactual. Cohort arithmetic over two arms — one measured rate applied to a known head count — and the same reason `src/engine/attribution.ts` gives applies here: a statement about a group, never about a member of it. It decides only whether the difference between the arms may be CLAIMED, which is a decision about arithmetic, and no exported function takes a patient.",
  "src/matching/explain.ts": "W213's explainability floor. It renders the reason a matching decision carries and REFUSES a plan that leaves anybody unaccounted for; it chooses nothing itself. The decision it constrains is W214's, and the projection here is what stops that decision from being able to read a clinical attribute at all.",
  "src/ops/store.ts": "Storage for the admin-operations console. It holds what staff did and what the rails recorded, and takes no view of its own.",
  "src/pathways/approval.ts": "The G5 sign-off workflow for pathway content. A decision about content, taken by people.",
  "src/pms/adapter.ts": "The read interface onto practice software.",
  "src/pms/contract.ts": "The contract every practice-software adapter must satisfy.",
  "src/pms/drift.ts": "Detects when a recorded fixture has drifted from the vendor's shape. Engineering.",
  "src/pms/fixtures.ts": "Synthetic recorded API responses used to test adapters.",
  "src/pms/ingest.ts": "Maps records read from practice software onto platform types. Reading is not deciding, and what is read is listed above.",
  "src/pms/synthetic.ts": "The synthetic practice-software adapter. No real patient exists behind it.",
  "src/pms/vendors.ts": "Vendor adapter skeletons behind a flag, with no credentials.",
  "src/privacy/privacy.ts": "Access, export and erasure. Executed when somebody asks, never on the software's initiative.",
  "src/privacy/record-classes.ts": "W106's register of where patient identity can live.",
  "src/privacy/store.ts": "Storage for access, correction and erasure requests and how they were answered. A record of what people asked for.",
  "src/quality/order-regressions.ts": "W178's corpus of past order-dependence defects. Engineering.",
  "src/referrals/acceptance.ts": "The opposite of an automated decision: it requires a receiving practice to record acceptance, and exists so that no handover is ever concluded by software.",
  "src/referrals/barriers.ts": "Records why a referral did not complete, from a reason a person entered.",
  "src/referrals/document.ts": "The referral document a GP writes. The product neither generates nor edits its clinical content.",
  "src/referrals/return-report.ts": "What the receiving practice sends back, as they sent it.",
  "src/referrals/store.ts": "Where referrals live for a running console.",
  "src/registers/analytics.ts": "Gap-closure rates by condition across a cohort. Group arithmetic.",
  "src/registers/attribution.ts": "Incrementality per register cohort, including when the cohort is too small to claim anything. Group arithmetic.",
  "src/registers/sim-registers.ts": "The register layer as the simulator sees it. Synthetic.",
  "src/outcomes/response-graph.ts": "W212 counts how interventions were answered, over the synthetic loop only. It aggregates facts already recorded and decides nothing about anybody; its `GraphRefusal` union is about whether a graph may be built at all, not about a patient.",
  "src/reporting/model.ts": "Figures about a practice that a commissioner could be told. Nothing is disclosed, and no figure can name a patient.",
  "src/reporting/suppression.ts": "Suppresses cells too small to disclose. It removes information rather than deciding anything about a person.",
  "src/security/audit-gate.ts": "The dependency-advisory gate. Engineering.",
  "src/sim/harness.ts": "The simulation harness. Synthetic patients only.",
  "src/spine/spine.ts": "The append-only event log every state change flows through. It records decisions; it takes none.",
  "src/synthetic/generate.ts": "Generates the synthetic practice. No real person is involved.",
  "src/synthetic/recalls.ts": "Generates synthetic practice-recall data so the coexistence rules can be exercised. No real recall and no real patient.",
  "src/synthetic/referrals.ts": "Generates synthetic referral histories for the outreach console and its end-to-end tests. Nobody in them exists.",
  "src/verticals/binding.ts": "Which version of a content bundle a practice is on.",
  "src/verticals/model.ts": "A content bundle, versioned as one thing.",
};

/** Every module the register accounts for, in either direction. */
export function declaredModules(): string[] {
  return [
    ...AUTOMATED_DECISIONS.flatMap((d) => d.decidedBy),
    ...Object.keys(NOT_A_DECISION),
  ].sort();
}

/** The page's own copy, as one string, for the compliance sweep. */
export function pageCopy(): string {
  return [
    ...INFORMATION_USED,
    ...AUTOMATED_DECISIONS.flatMap((d) => [d.title, d.what]),
    ...NEVER_AUTOMATED,
    ...HUMAN_CONTROLS,
  ].join("\n");
}
