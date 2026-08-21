// W106: every class of record that can hold a patient's identity, enumerated.
//
// W51 found the failure this exists to prevent: patient erasure covered the booking rail and
// missed the complaints store, so a raw patientId survived "delete everywhere" while the
// console reported no data held. The fix at the time was to compose the complaints store into
// the erasure path — correct, but it left the same trap set for the next store.
//
// Year 2 then added six more places patient identity can live. So this is the registry, and
// record-classes.test.ts checks it against the source tree: a store that holds a patientId
// and is not declared here fails the suite. A new record class cannot be added without an
// answer to "what happens to this on an access request, and on erasure?".
//
// `derived` is a first-class, reviewed answer — not an exemption. Register membership and
// care gaps are RECOMPUTED from PMS condition flags every cycle and never persisted, so
// erasing the source erases them; scrubbing them separately would be scrubbing a cache. That
// is a real property of those classes, and writing it down is what stops the next reader
// assuming it was an oversight.

export type Handling =
  /** Rows are stored and must be scrubbed on erasure and returned on an access request. */
  | "stored"
  /** Recomputed from another class every cycle; erasing the source erases these. */
  | "derived"
  /** Holds no patient identity at all. */
  | "no_patient_identity";

export interface RecordClass {
  /** The module that owns it, as the tree spells it. */
  module: string;
  what: string;
  handling: Handling;
  /** Why this handling is correct. Required — an undocumented classification is a guess. */
  rationale: string;
}

export const RECORD_CLASSES: readonly RecordClass[] = [
  {
    module: "src/booking/store.ts",
    what: "Invitations, appointments, audit events",
    handling: "stored",
    rationale: "The original W33 dataset: invitations and their audit events are removed, attended appointments lose their patient link so the slot history survives without the person.",
  },
  {
    module: "src/complaints/store.ts",
    what: "Complaint records and their patient link",
    handling: "stored",
    rationale: "W51 critical: this was the class erasure missed. The complaint is the practice's own handling record and stays; the patient link is scrubbed and the export returns them.",
  },
  {
    module: "src/audit/store.ts",
    what: "Usefulness outcome records",
    handling: "no_patient_identity",
    rationale: "W15 stores outcomes against an appointment id with a patient LABEL, never a patient id — deliberately de-identified at write time, so there is nothing to scrub.",
  },
  {
    module: "src/registers/store.ts",
    what: "Register catalogue and per-practice enable/disable",
    handling: "no_patient_identity",
    rationale: "W60 carries counts and practice choices only; membership itself is not persisted here.",
  },
  {
    module: "src/registers/membership.ts",
    what: "Register membership",
    handling: "derived",
    rationale: "W57 derives membership from PMS condition flags on every cycle and never persists it. Erasing the patient removes the flags, and membership disappears with them; scrubbing it separately would be scrubbing a cache.",
  },
  {
    module: "src/registers/caregap.ts",
    what: "Care gaps",
    handling: "derived",
    rationale: "W58 computes gaps from membership plus a cited interval at read time. Nothing is stored, so nothing survives erasure of the inputs.",
  },
  {
    module: "src/referrals/capture.ts",
    what: "Referrals and their completion state",
    handling: "derived",
    rationale: "W92 reads referrals from PMS-ingested data per run rather than holding its own copy; erasure at the source removes them.",
  },
  {
    module: "src/referrals/barriers.ts",
    what: "Barrier taxonomy against a referral",
    handling: "derived",
    rationale: "W94 records barriers as data attached to a referral, which is itself derived — and barriers are never inferred, so there is no independent store.",
  },
  {
    module: "src/referrals/store.ts",
    what: "Referral documents, acceptance acts, chain events and return reports",
    handling: "stored",
    rationale: "W137 holds patient-linked referral records on both sides of a GP-to-GP handover. On erasure the patient link must be removed from documents, acts, events and return reports alike — a referral naming a patient is patient identity wherever it sits, and the receiving practice holding a copy does not change that.",
  },
  {
    module: "src/education/store.ts",
    what: "Education library, case triggers and clinicians' CPD entries",
    handling: "no_patient_identity",
    rationale: "W151 holds CONTENT (material and triggers) plus CPD entries about CLINICIANS — what a person read and when. No entry carries a patient id: W148's triggers match fact CODES and W149's trail records an item, never the case that surfaced it. A patient erasure therefore has nothing to scrub here; the clinician's own rights over their trail are W149's, which makes it correctable by them and readable by nobody else.",
  },
  {
    module: "src/verticals/store.ts",
    what: "Declared verticals — which pathways, content, material and intervals each bundles",
    handling: "no_patient_identity",
    rationale: "W164 holds a list of REFERENCES to clinical content: version hashes, content ids, item ids, interval ids. There is no patient field on a vertical and no way to add one — a vertical says what a care model IS, never who is on it. Deliberately not practice-scoped either, for W127's reason: a vertical is a document. WHICH version a practice accepted is practice data and lives in W160's binding, not here.",
  },
  {
    module: "src/pathways/registry.ts",
    what: "Pathway catalogue and its sign-off attestations",
    handling: "no_patient_identity",
    rationale: "W127 holds clinical CONTENT and who reviewed it — versions, criteria, reviewer and signatory identities. There is no patient field on any event, so a patient erasure has nothing to scrub here. Deliberately not practice-scoped either: a pathway is a document, not practice data.",
  },
  {
    module: "src/credentials/ledger.ts",
    what: "Per-practice credential verification logs",
    handling: "no_patient_identity",
    rationale: "W113 stores W110's append-only lifecycle events — who submitted, checked and verified a CLINICIAN's credential, and when. No patient field exists on any event, so there is nothing to scrub on a patient erasure. As with the vault, the clinician's own rights over this history are a separate obligation from the patient-identity question this registry answers.",
  },
  {
    module: "src/credentials/vault.ts",
    what: "Evidence documents behind a clinician's credential",
    handling: "no_patient_identity",
    rationale: "W109 holds credentialing documents about CLINICIANS — a certificate scan, its subject and its uploader — and has no patient field to scrub. Note what this classification does NOT say: these are personal documents about identifiable people, and the clinician's own access and erasure rights are a separate obligation this registry does not cover, because the registry's question is patient identity. W112/W113 own that.",
  },
  {
    module: "src/capability/graph.ts",
    what: "Clinician interest, experience, competence",
    handling: "no_patient_identity",
    rationale: "W79's three fields are about CLINICIANS. Experience is a count of attended visits per condition and carries no patient id — W80 deliberately has no free-text or per-patient field.",
  },
  {
    module: "src/capability/store.ts",
    what: "Stated case-mix interest",
    handling: "no_patient_identity",
    rationale: "W81 records a clinician's own preference, keyed by clinician and condition.",
  },
  {
    module: "src/ops/store.ts",
    what: "Operational switches and queue view",
    handling: "no_patient_identity",
    rationale: "W19 holds practice-level switches; the queue view reads the rail rather than copying it.",
  },
  {
    module: "src/console/store.ts",
    what: "Practice profile, rules, roster, memberships",
    handling: "no_patient_identity",
    rationale: "Practice profile, eligibility rules, clinician roster and staff memberships — configuration about the practice and its people, with no patient record of any kind.",
  },
  {
    module: "src/lib/rate-limit.ts",
    what: "Rate-limit counters",
    handling: "no_patient_identity",
    rationale: "Keyed by action and coarse identifier, holds no patient record.",
  },
  {
    module: "src/privacy/state.ts",
    what: "Deletion records and the suppression list",
    handling: "stored",
    rationale: "Both hold a one-way patientRef rather than an identifier, BY DESIGN: a deletion record must prove a deletion happened and a suppression must outlive the data it protects. Erasing them would defeat both.",
  },
  {
    module: "src/interest/store.ts",
    what: "Community interest signups",
    handling: "stored",
    rationale: "Holds a name and email for people who are NOT patients of a subscribing practice — a different collection to everything else here (see the Y2 gate dossier). Access and erasure apply; it is file-backed rather than in-memory, so it is handled separately from the rail.",
  },
  // W180 — the Q14 outcome surface. Six modules, none of them a store, all declared anyway.
  //
  // The point of declaring a module that holds nothing is that "holds nothing" is a CLAIM, and
  // this registry is where claims about patient identity get written down and checked. Q14 built
  // an outcome rail on top of the referral rail; the privacy question for a rail built on a rail
  // is not "what does it store" but "does erasing the source empty it", and `derived` is the
  // answer W106 already has for exactly that.
  {
    module: "src/outcomes/dashboard.ts",
    what: "Referral outcome verdicts, per referral",
    handling: "derived",
    rationale:
      "W173 derives every verdict from the referral rail at read time and persists nothing. Patient identity does not survive the transform either: `ReferralEvent` carries a patientId and the chain events built from it carry only referralId, kind and at, so the verdict cannot name a patient. Erasing a patient from the rail (W137's scrub) removes their referrals and the verdicts go with them — composed, not remembered.",
  },
  {
    module: "src/outcomes/model.ts",
    what: "Outcome verdicts over a declared chain",
    handling: "no_patient_identity",
    rationale:
      "W170 folds `RecordedEvent { chainId, kind, at }`. A chain id is a referral id, not a person, and no field on an Outcome or an OutcomeSummary can hold patient identity — the type has nowhere to put one.",
  },
  {
    module: "src/outcomes/counterfactual.ts",
    what: "The counterfactual figure and its refusals",
    handling: "no_patient_identity",
    rationale:
      "W215 takes an `AttributionResult` — two arms as head counts and attended counts — and returns a difference or a refusal. There is no patient in any signature and no field on the figure or its basis a patient identifier could occupy, which is also why the per-patient counterfactual is refused structurally rather than by a rule somebody remembers. Erasure is composed: scrub a patient from the rail and they leave the counts W9 produces, with nothing here to remember to scrub.",
  },
  {
    module: "src/outcomes/response.ts",
    what: "The link between an intervention and a recorded fact that answers it",
    handling: "no_patient_identity",
    rationale:
      "W211 builds a `Response` from W170's `RecordedEvent { chainId, kind, at }` and an `Intervention { interventionId, practiceId, chainId, kind, at }`. Neither type has a field a patient identifier could go in, and the constructor copies only from those two, so the link is a statement about a chain and a practice. Erasure is COMPOSED for the same reason W180 gave: scrub the source rail and the events these rest on are gone, with nothing here to remember to scrub. W218 classifies the GRAPH built over this, which is a different question because a graph can hold shape a single link cannot.",
  },
  {
    module: "src/capacity/model.ts",
    what: "Session occurrences and per-session utilisation, over the practice's own diary",
    handling: "no_patient_identity",
    rationale:
      "W222's `SessionOccurrence` is a clinician id, a date, a weekday and two counts. There is no field a patient could occupy, so nothing is de-identified here — the identity never enters. MEASURED FOR SMALL CELLS RATHER THAN ASSUMED (W230): the per-session aggregates the console renders have a minimum FILLED cell of 10 over the synthetic practice, so no rendered figure is a count of a handful of people. The per-OCCURRENCE figures are smaller — 411 of them, 94 below five, minimum one filled slot of one offered, which is one person's appointment with a named clinician on a named day. Nothing discloses those today: `capacityView` carries per-session rows only. THE TRIGGER THAT CHANGES THIS CLASSIFICATION: the first surface that renders per-occurrence figures, or exports them to a recipient, needs W196's aggregation floor applied the way W218 applied it to the response graph — and it must be a floor on FILLED cells only, because an unfilled slot is nobody and withholding it would suppress the one figure that identifies no one.",
  },
  {
    module: "src/capacity/coupling.ts",
    what: "A switch, and the record of a practice's decision to turn it on",
    handling: "no_patient_identity",
    rationale:
      "W231 holds the forecast-to-invitation-volume coupling, shipped OFF. What it stores about a person is nothing: a `CouplingDecision` names whoever at the PRACTICE took the decision, a date and a reason, and the arithmetic takes two integers. It reaches no patient and no rail — a test walks src/ and app/ and asserts nothing outside this lane imports it. THE TRIGGER THAT CHANGES THIS CLASSIFICATION: switching it on does not make this module hold patient data, but it does make it an automated decision in use rather than built-and-idle, and W201's entry must move from `built_not_in_use` in the same commit.",
  },
  {
    module: "src/capacity/forecast.ts",
    what: "The range a session has run at, applied to slots being opened",
    handling: "no_patient_identity",
    rationale:
      "W223 reads W222's occurrences and returns two integers, a spread and a sentence. No patient can enter it because none can enter its input, and the figure it produces is a property of a diary rather than of anybody in it.",
  },
  {
    module: "src/capacity/score.ts",
    what: "How often the ranges contained what happened, and how wide they were",
    handling: "no_patient_identity",
    rationale:
      "W224 scores W223's ranges against W222's occurrences. A prediction holds a date, a range, two counts and a boolean; a score holds counts and rates over predictions. Nothing in either can name a person.",
  },
  {
    module: "src/capacity/drift.ts",
    what: "Whether the two halves of the scored record agree",
    handling: "no_patient_identity",
    rationale:
      "W228 compares summaries of W224's predictions. Its inputs hold no identity and its output is two windows of counts, so there is nothing here to scrub and nothing to withhold.",
  },
  {
    module: "src/capacity/recommendation.ts",
    what: "A conditional about opening more slots on one recurring session",
    handling: "no_patient_identity",
    rationale:
      "W225's refusal is structural and checked at three doors: no exported signature takes a patient, no field of `SessionRecommendation` can hold one, and the module's import list is pinned so nothing that holds patients can be reached from it. That third check is the one that matters — MATCH-1 arrived through a reasonable-looking line in a module that already had the data to hand.",
  },
  {
    module: "src/interop/fhir.ts",
    what: "Appointments translated to and from FHIR R4, in memory only",
    handling: "derived",
    rationale:
      "W235 is the FIRST module in the interop lane that can carry a patient identifier, and classifying it as anything else would be a convenient fiction: a FHIR Appointment\'s participant IS the patient, and a mapping that dropped it would be a mapping of nothing useful with the drop hidden in exactly the silence that unit exists to end. `derived` rather than `stored`: nothing is retained — the functions are pure, `SHIPPED_MAPPINGS` is pinned empty, and erasing the source appointment erases everything reachable here, because there is nowhere else for it to be. THE TRIGGER THAT CHANGES THIS CLASSIFICATION: the first code path that TRANSMITS or PERSISTS a mapped resource. At that point G8 applies (no patient-derived content to a third-party API until the founder has signed off vendor, data flow and retention), the handling becomes `stored`, and W239\'s outbound disclosure ledger becomes the thing that records what left. A test asserts this module contains no client, endpoint or fetch of any kind.",
  },
  {
    module: "src/capacity/attribution.ts",
    what: "The difference between two arms of a capacity experiment, and the arm assignments themselves",
    handling: "no_patient_identity",
    rationale:
      "W233's arm assignment names a SESSION — a clinician and a weekday — not a person, and the counts it produces are slots offered and filled. No patient can enter it: it imports only W222's model and the reporting basis type, and deliberately NOT `@/engine/holdout`, which is the tree's patient-level arm and answers a different question. `SHIPPED_CAPACITY_ARMS` is empty and pinned empty, so today it holds nothing at all. The small-cell reasoning in the W222 entry above applies unchanged: these are aggregates over arms, and an arm with a single session would be refused for being too thin to compare long before it were small enough to identify anybody.",
  },
  {
    module: "src/capacity/calendar.ts",
    what: "Declared non-working days, with provenance",
    handling: "no_patient_identity",
    rationale:
      "W227's calendar is about a jurisdiction and a date. It ships EMPTY and is pinned empty, so today it holds nothing at all; when it holds something it will still hold nothing about anybody.",
  },
  {
    module: "src/console/capacity.ts",
    what: "The capacity console's view over all of the above",
    handling: "no_patient_identity",
    rationale:
      "W229 arranges what W222 to W228 computed and adds no data of its own. It carries per-session rows and never per-occurrence ones, which is the distinction the W222 entry above says the small-cell trigger turns on.",
  },
  {
    module: "src/outcomes/attribution-v2.ts",
    what: "Per-kind response rates and, when the holdout arm allows one, the practice-wide incremental figure",
    handling: "no_patient_identity",
    rationale:
      "W219 reads W212's graph, which has already aggregated every chain id away, and W215's counterfactual, which counts arms rather than people. The types it produces hold an intervention kind, counts, a rate and a basis; there is nowhere in them a patient id could sit, and no exported signature takes a patient. Declared voluntarily — this module holds no globalThis store, so W106's discovery does not require an entry — because the outcomes modules are where a reader looks for what the product knows about a person, and an absence is only legible if it is written down. The small-cell question W218 settled for the graph is inherited rather than reopened: a rate here is computed from the graph's own per-kind denominators, and any disclosure of it runs through `discloseResponseGraph` first.",
  },
  {
    module: "src/outcomes/response-graph.ts",
    what: "Counts of how each kind of intervention was answered, over the synthetic loop",
    handling: "no_patient_identity",
    rationale:
      "W212 aggregates W211's links into edges holding an intervention kind, a response kind, a verdict, a count and a basis. No chain id and no patient id survives the aggregation — the edge type has nowhere to put one. W211's own entry flags that a GRAPH can hold shape a single link cannot, and that is right about SMALL CELLS rather than about identity: a count of one is a person, in the way W196's aggregation floors describe. W218 settles that floor question in the same module: `discloseResponseGraph` reads `RESPONSE_GRAPH_CELL_FLOOR` (5, declared data, no parameter) and withholds any intervention kind that contains a sub-floor cell WHOLE, recomputing the total over disclosed kinds so a withheld count cannot be recovered by subtraction — W196's floor and W197's differencing rule applied to the graph. Erasure stays COMPOSED (W180's word): nothing is stored — `SHIPPED_RESPONSE_GRAPHS` is pinned empty and the only builder takes a `SimResult` — so scrubbing the source rail leaves nothing here to reach, which is the sense in which erasure reaches every class this holds.",
  },
  {
    module: "src/outcomes/escalation-monitor.ts",
    what: "Unrouted escalations, aged",
    handling: "no_patient_identity",
    rationale:
      "W171 keys a sighting on pathwayId, versionHash and factCode. An escalation is a question about a PATHWAY criterion, not about the record that triggered it, so nothing here identifies whose fact fired it.",
  },
  {
    module: "src/outcomes/time-to-escalation.ts",
    what: "Interval between a fact being recorded and an escalation firing",
    handling: "no_patient_identity",
    rationale:
      "W176 measures two instants on the same pathway criterion and carries no subject. The module argues at length that the interval is a fact about the record rather than about a person; the type is what makes that true rather than aspirational.",
  },
  {
    module: "src/outcomes/agreement.ts",
    what: "Specialist-agreement sample",
    handling: "no_patient_identity",
    rationale:
      "W172 samples pathway verdicts by their own identity to compare reviewer and engine, and holds no patient field. The sample is over VERDICTS, and a verdict names a pathway version rather than the person it was computed for.",
  },
  {
    module: "src/reporting/report.ts",
    what: "The reporting summary a practice reads about itself",
    handling: "derived",
    rationale:
      "W204. Recomputed from the practice's own live rails on every read and never persisted, so erasing a source record is automatically effective on every figure derived from it. Storing a produced report would create a second copy that erasure does not reach — W51's failure in a new place. `derived` here is the reviewed answer W106 requires and not an exemption: the claim that nothing is written is checked against the tree by src/reporting/retention.test.ts, and the day G9 opens a DISCLOSURE LOG becomes mandatory and is a stored class with its own life.",
  },
  {
    module: "src/outcomes/audit-export.ts",
    what: "Practice configuration audit trail, exported",
    handling: "no_patient_identity",
    rationale:
      "W177 exports practice CONFIGURATION history, and this is the class where that matters most: an export leaves the product, so erasure can never reach it — a downloaded file is gone. Holding no patient identity is therefore not a convenience here but the only handling that is safe, and the test asserts the absence rather than trusting it.",
  },
];

/** Classes whose rows must be reachable by an access request and removable by erasure. */
export function storedClasses(): RecordClass[] {
  return RECORD_CLASSES.filter((c) => c.handling === "stored");
}
