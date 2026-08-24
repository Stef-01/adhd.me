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
    id: "invitation-volume-coupling",
    title: "Whether how full a session looks changes how many people are messaged.",
    what: "SWITCHED OFF, and nothing has ever been sent from here in any case. If it were switched on, a session that looked like it would run under-full would mean more invitations went out to cover the gap — so it would change how many people are contacted, though never which people or in what order. Your practice can only switch it on by recording who decided and why; there is no setting that turns it on quietly. It is written down while it is off so the shape of the decision can be argued with before anybody is affected by it. One thing your practice should know when weighing it: the order invitations go out in is the subject of an open contradiction in this product's own published notice (recorded as MATCH-1), and sending more of them sends more through whatever that ordering is doing.",
    decidedBy: ["src/capacity/coupling.ts"],
    status: "built_not_in_use",
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
  "No ordering of patients by need or by how unwell they are, and no list of who is most at risk. ADHD.ME decides who has an appointment offered to them, never who most needs one.",
  "No decision that your care has moved to another clinician. When your GP refers you, the receiving practice must record that it has taken you on; silence is never read as a handover.",
  "Nothing you are sent reveals why you were selected. A message prompted by a register or by a referral is word for word the same as any other appointment invitation.",
  "No automated re-enabling of contact after you opt out. Opt-out is permanent.",
];

/** What is read, rendered on the page. Kept beside the decisions because it is the input to them. */
export const INFORMATION_USED: readonly string[] = [
  "ADHD.ME reads what your practice has already recorded about you: when you last attended, appointments you have booked, whether you have opted out, the ongoing-care conditions your practice has flagged on your record, and referrals your practice has written. Some of that is health information. It is used to decide who to invite to an appointment and when — never to work anything out about your health.",
  "ADHD.ME does not read your consultation notes, test results or clinical correspondence, and does not receive them.",
];

export const HUMAN_CONTROLS: readonly string[] = [
  "The practice configures and can change every eligibility rule at any time.",
  "Every register, and the routing described above, is off unless your practice turns it on.",
  "Practice staff can pause all sending instantly with one switch.",
  "Your practice approves the exact wording of every message before any of it can be sent, and an edit of a single character withdraws that approval.",
  "You can stop all messages by replying STOP, and can ask your practice to access or delete the information ADHD.ME holds.",
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
  "src/voice/speech.ts": "Speech to text at the finder's microphone. The only thing it decides is whether the BROWSER can transcribe, which is a capability check about software rather than a decision about a person. It was caught by the detector for exporting a type ending in `Reason`, and the type is kept rather than renamed: renaming it to slip past a deliberately broad detector would be the exact evasion this register exists to make visible. No audio or transcript reaches this product.",
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
  "src/matching/allocation.ts": "W236's weighted pair-scoring machinery, caught by the detector for exporting `RefusalReason` — the type is kept rather than renamed, speech.ts's rule, because slipping a deliberately broad detector is the evasion this register exists to make visible. It is not currently a decision about anybody: it renders nowhere, no production path calls it, and its inputs are synthetic requests whose type has nowhere to put a name or a symptom (G2). What it computes is doctor-lists-per-patient from declared data with named refusals — it never orders patients against each other, which is the property the NEVER_AUTOMATED list's 'no ordering of patients by need' names. THE TRIGGER THAT CHANGES THIS CLASSIFICATION: the first surface that renders its output to a person, or the first call site fed by non-synthetic requests, makes it an automated decision within the meaning of this register and it must move to AUTOMATED_DECISIONS in the same unit.",
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
  "src/capacity/recommendation.ts": "W225 states a conditional about a practice's own diary — if N more slots were opened on this weekday, this is the range that filled in the weeks recorded. It is addressed to the PRACTICE, not about any patient: no patient can enter its signature, its type or its imports, and the practice supplies the number of slots rather than the module choosing one. THE TRIGGER THAT CHANGES THIS CLASSIFICATION: the first version that sizes a recommendation from who is waiting, or that names any group of patients it would be for, is a decision about people within the meaning of this register and must move to AUTOMATED_DECISIONS in the same unit.",
  "src/capacity/score.ts": "W224 scores W223's forecaster against what the practice's diary actually recorded. It is a measurement of a method, not a decision about anybody: no patient can enter it, and its only refusal is that too few weeks have been scored to report a rate.",
  "src/interop/referral-profile.ts": "W236 renders W131's structured referral to a FHIR profile and reads it back. It decides nothing: every value in the output comes from a field of the input, nothing is composed or defaulted, and the clinician's own words are carried character-identical because they are that clinician's professional responsibility rather than this product's. It carries a patient reference for the same reason W235 does, and sends nothing. THE TRIGGER: the first path that transmits a profiled referral makes G8 apply, and Q9 action 1 — whether credential detail may cross a practice boundary — is still the open question this document's shape deliberately does not answer.",
  "src/quality/gate-state.ts":
    "AR14's parser and claim guard for BUILD-STATE.md's gate-state line. It decides one thing — whether the BUILD LOOP may claim a new unit while the last gate run is red — and every part of that is about this tree's own process: its subjects are a commit sha, a timestamp and a failing check's name; no patient, clinician, practice or any person enters its inputs, its refusal blocks a machine session's claim rather than anything about anybody, and it retains nothing (it re-reads one line of the ledger every firing). Its outcome union (GateStatus) describes a test run, which is what the widening's *Verdict-shaped scan correctly noticed and this entry correctly classifies. THE TRIGGER THAT CHANGES THIS CLASSIFICATION: the first version that gates on anything beyond the tree's own test verdicts — an operator's identity, a practice's state, anything a person did — is a decision in this register's sense and moves to AUTOMATED_DECISIONS in the same unit.",
  "src/design/accepted-diffs.ts":
    "AR16's acceptance register for the visual baseline: which UNIT last moved qa/baselines/manifest.json's pixels, and why. It decides one thing — whether the build may keep a manifest edit that no unit id claimed — and its whole subject is this tree's own artefacts: a file hash, a unit id, a capture count. No patient, clinician, practice or person enters its inputs; its refusal fails a test suite, not anything about anybody; it retains nothing beyond the register file itself. Its outcome union (AcceptedDiffVerdict) describes a hash comparison, which is what the *Verdict-shaped scan correctly noticed and this entry correctly classifies. THE TRIGGER THAT CHANGES THIS CLASSIFICATION: the first entry or verdict that keys on anything beyond the tree's own files — who ran the acceptance, whose screens changed — moves this to AUTOMATED_DECISIONS in the same unit.",
  "src/quality/latent-findings.ts": "W210's register of findings that are not live YET, each carrying the condition that would make it so. Engineering. It decides nothing about anybody: its subjects are this tree's own defects, and its `FindingStatus` describes a finding rather than a person.",
  "src/quality/order-independence.ts": "W167's register of every place this tree folds a collection to one answer, with a disposition for each. Engineering. Its `Disposition` says how a tie is broken in code, not how anybody is treated.",
  "src/verticals/completeness.ts": "W158 reports what a vertical would need before it could ship, decomposed by who has to act — a reviewer, a signatory, an author, or nobody until a ruling lands. Its `MemberStatus` describes a MEMBER of a bundle (a pathway version, a content id) and never a patient: the report is about governance artefacts and their gates, and W158 bans the vocabulary of sign-off STAGES from its own output so it cannot drift into describing where a person is in a process.",
  "src/demo/clinicians.ts": "W258 CLASSIFIED THIS AND THE READING IS ARGUABLE, SO THE ARGUMENT IS HERE RATHER THAN THE CONCLUSION ALONE. `rankClinicians` takes a person\'s free-text request on `/finder` — a public, patient-facing surface — and returns an ORDERED LIST OF NAMED CLINICIANS. Nothing about that is out of this register\'s neighbourhood, and W201\'s detector misses it only because the module names no `patientId`: the person searching is not a patient of ours, which is exactly the case a patient-id proxy cannot see. Classified as not-a-decision because of WHO the decision is about and what survives it: it orders CLINICIANS rather than people, it concludes nothing about the searcher, it retains nothing, and its whole input is words that person typed seconds earlier and can retype differently — there is no record created, no profile built and nothing carried to a later visit. THE LINE IT SITS NEAREST is the published notice\'s \'No inference about you. Nothing is concluded from your details that you or your practice did not record\', and the honest reading is that a query IS something they just recorded, in the moment, about what they want rather than about their health. The module already knows it is near that line: its own comment refuses to build a general relevance model because that would be \'a quality ranking of named clinicians derived from inference\', which W83 refused internally and is worse in public. THE TRIGGER THAT CHANGES THIS CLASSIFICATION, and it is three separate things, any one of which is enough: the first ranking that reads anything the searcher did not just type; the first version that RETAINS a query, a result set or anything derived from either; or the first ordering of PEOPLE rather than of clinicians. At that point this becomes an automated decision affecting a person, it belongs in AUTOMATED_DECISIONS, and the published notice gains an entry — which is a founder decision under W217\'s precedent, not a builder\'s.",
  "src/matching/tie-quality.ts": "W234 measures how often the finder\'s ranking failed to separate the top candidates — a KPI about the PRODUCT\'s own behaviour, computed over results rather than over people. It decides nothing: no output of it reaches a person, and the number it produces is the one the clarifier exists to move.",
  "src/tenancy/tenancy.ts": "W18 is the authorization decision point for STAFF: which role may take which action in which practice, with deny as the default everywhere. It decides about a caller\'s access, never about a patient, and no patient can enter it — the same classification `src/platform/scope.ts` carries for the same reason. The SQL mirror enforces the same boundary at the row level.",
  "src/tenancy/multisite.ts": "W97 resolves a group-level membership DOWN to per-site access, and refuses to treat a group as one big practice — a membership at site A grants nothing at site B. Like W18 beside it, its subject is a staff member\'s access rather than any patient.",
  "src/pathways/binding.ts": "W123 decides which CLINICIANS a pathway may be offered under. Worth stating precisely rather than waving through, because the module\'s own header says the failure mode is \'the product routing care to the wrong person\': it governs who may deliver, and a patient is on the other end of that. It stays outside this register because the decision is about a clinician\'s scope of practice, taken from what the practice recorded about that clinician, and no patient enters it — the pathway is bound before anybody is matched to it. THE TRIGGER: a binding that varied by the patient it would be offered TO would be a decision about that patient and belongs in AUTOMATED_DECISIONS.",
  "src/onboarding/background.ts": "W221 holds the clinician background a reviewer works on and the metrics behind a match. Its subject is a CLINICIAN\'s reviewable state — facets, transcript, profile — and the audit trail of a human review, not any patient.",
  "src/credentials/ahpra.ts": "W111 reads the public Ahpra register to turn a clinician\'s typed claim into a checkable fact. Its own header states the posture: read-only, recorded, NEVER INFERRED. It concludes nothing and it is about a clinician\'s registration.",
  "src/messaging/twilio.ts": "W31\'s sandbox-only SMS adapter. It reports what a message transport said happened to a message — the same subject as `src/interop/exchange.ts` and the same answer. It decides nothing about anybody, and G3 is enforced in code: the constructor refuses any twilio.com endpoint, so it can only reach a sandbox until the gate opens.",
  "src/platform/refusals.ts": "Reached this register by exporting a `Refusal` union, the detector's signal. W255 decides nothing: it holds the sentences a refused caller is told, carried from the modules that produce them, and one function that renders a reason. Its whole subject is what a refusal must NOT contain — anything from the request, and any difference a caller could compare to learn whether another practice exists.",
  "src/platform/scopes.ts": "Reached this register by exporting a `Refusal` union, the detector's signal. W254 decides whether a caller's grant covers a particular kind of read — a decision about an integrator's ACCESS, taken automatically, and about a practice's own configuration and complaint counts rather than about any person. No patient can enter it: it sees a caller's email, a list of granted scopes and the scope a read requires. THE TRIGGER: any scope that grants a read of patient-level data makes an authorisation here a decision affecting a patient's information, and it moves.",
  "src/platform/scope.ts": "Reached this register by exporting a `Refusal` union, which is the detector's signal rather than anything about patients — and the classification is worth writing anyway. W253 decides whether a caller may read a named practice, by checking the practice they asked for against the memberships they hold. It IS a decision taken automatically, and saying otherwise would be the convenient answer — what puts it outside this register is WHO it is about: the subject is a staff caller and their access to their own practice's configuration, never a patient. No patient can enter it; the practice is the only thing it names. THE TRIGGER THAT CHANGES THIS CLASSIFICATION: the first scope resolved for or about a patient — a patient-facing API, a per-patient token — makes this a decision about a person within the meaning of this register, and it moves.",
  "src/interop/exchange.ts": "W244 records what another system said happened to something this product sent it. It decides nothing about anybody: its subject is a message and a response, and its only judgement is that a request completing without an error is not a thing having been received.",
  "src/interop/disclosure-consent.ts": "W243 records what a patient decided about their information leaving the practice, and reads that record back as at a stated moment. It takes no decision of its own — the decision in it is the PATIENT'S — and it derives nothing from behaviour: there is no source for attending an appointment, not objecting, or time passing, and a consent that was never given never becomes one.",
  "src/interop/credentials.ts": "W242 refuses to configure a live integration while G1 is shut. It takes no decision about anybody: its subject is a gate and a credential source, and it holds no credential of its own. What it decides is whether this PRODUCT may connect to a practice's software, which is a decision about the product rather than about a person.",
  "src/interop/fhir.ts": "W235 translates an appointment between this tree's vocabulary and FHIR R4. It takes no decision about anybody: it is a pure function over a record that already exists, and its refusals are about whether a resource can be read at all. It CAN carry a patient reference, because a FHIR Appointment's participant is the patient and a mapping that dropped it would be a mapping of nothing useful — but it sends nothing and there is no endpoint in this tree. THE TRIGGER: the first code path that transmits a mapped resource makes G8 apply and this stops being a pure function.",
  "src/capacity/attribution.ts": "W233 compares two arms of a capacity experiment a practice ran deliberately, and today refuses over everything because no session in this tree carries an arm. It decides nothing about anybody: an arm assignment names a session — a clinician and a weekday — and the figure is a difference between two utilisation rates. It cannot reach the patient-level holdout, which is a different question, and the import list is pinned so it stays that way.",
  "src/capacity/drift.ts": "W228 compares two halves of the practice's own scored record and reports whether they agree. It decides nothing and adjusts nothing — that refusal is the unit: a forecaster that has stopped tracking reality is reported, never recalibrated, because a range widened to fit its own misses destroys the evidence that anything changed. No patient can enter it; its inputs are W224's predictions, which hold a date, two counts and a range.",
  "src/capacity/forecast.ts": "W223 states the range a practice's own session has run at, applied to the slots it is thinking of opening. It is addressed to the practice about its own diary and decides nothing about any patient — no patient can enter it, because W222's occurrences have nowhere to put one — and it recommends no action: it reports a span and, below the floor, reports nothing.",
  "src/capacity/model.ts": "W222 counts how full a practice's own sessions have run. It decides nothing about anybody — a session in it is a clinician, a weekday and two counts, with nowhere to put a patient — and its two refusals are statements about the diary's silence rather than about a person.",
  "src/console/capacity.ts": "W229 is the view model for the page that shows how full a practice's own sessions run. It arranges what W222 to W228 already computed and decides nothing itself: its three empty states are statements about the diary — nothing recorded, everything already full, or ranges without a track record — and no patient can enter it, because a session in this lane is a clinician, a weekday and two counts.",
  "src/console/responses.ts": "W220 is the view model for the page that shows how messages were answered. It arranges already-computed counts for a reader and decides nothing about anybody: its three empty states are statements about the record, not about a person.",
  "src/outcomes/attribution-v2.ts": "W219 reports how each kind of intervention was answered and, when the holdout arm allows a claim at all, carries W215's practice-wide figure through unchanged. It decides nothing about anybody: its refusals are about whether a figure may be split between kinds of message, and no function in it takes a patient.",
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
