// W200: the G7 boundary, re-derived rather than assumed to have survived Y4.
//
// The Q11 dossier stated four properties the rail enforces, and W150 added a fifth. Each was true
// of the tree that existed when it was written. Y4 then added four quarters of product — verticals,
// outcome auditing, a public directory and reporting to third parties — and the unit's gate is
// explicit that the properties must be RE-DERIVED against that, not carried forward.
//
// Doing it turned up the thing carrying forward would have missed. Property five's enforcement is
// `lintEducationCopy`, and its declared surface is `EDUCATION_COPY_MODULES` — six files, all under
// `src/education/`. Y4 added operator-facing copy in verticals, outcomes, ops, the directory and
// reporting, and **none of it was ever linted**. Not a rule that was weakened; a control that did
// not follow the product. Properties one to four each had a Y4 surface that could have broken them
// and each survived on its own construction, which is what a re-derivation is for; property five
// survived on care, and care is not a control.
//
// SO THE DECLARED COPY SURFACE NOW COVERS EVERY Y4 MODULE, and the register is checked against the
// tree by reading the tree: `Y4_FIRST_UNIT` plus each module's own `// W<n>` header decides
// membership, so a Y4 module added tomorrow fails this unit's test until somebody says what its
// copy is. A hand-kept list of nine modules — which is what this register was on its first pass —
// covers the nine modules somebody remembered.
//
// EACH ENTRY SAYS WHICH EXPORTS AN OPERATOR READS, not which are strings. That distinction is
// load-bearing, because running the advice rules over every string export of Y4 flags eleven
// things and eight of them are the register machinery itself: the words a refusal has to quote in
// order to refuse them, and the reviewer notes explaining why a rule exists. It is the sixth
// instance of the pattern W198 named — a scan whose subject matter is the thing it bans matches
// the sentence doing the banning — and a heuristic would have to grow an exemption per collision.
// A declared surface asks the question that actually decides it: does a clinician or practice
// manager READ this text in the product?
//
// THE THREE REAL HITS ARE ACCEPTED, NOT REWORDED, AND THE RULE IS NOT LOOSENED. All three are in
// copy an operator does read, and the sharpest is `SILENCE_COPY` saying "No action needed", caught
// by `no-action-framing`. The tempting fix is to teach that rule about negation, and it is wrong:
// in W179's silence copy "no action needed" is a fact about a data feed, and in education copy
// "this pathway changed, no action needed" would be a clinical judgement about whether to review
// anybody. Same six characters, opposite meanings, and the difference is the surface — which is
// W192's finding arriving from the other direction. So the rule stays sharp and the acceptance is
// per module, per export, per matched string, with a date on it.
//
// KNOWN BOUND, stated rather than filed quietly: this register reaches EXPORTED copy. Prose
// composed inline inside a render function — `search.ts`'s "Ordered by …" is the clearest case —
// is not reachable by export name, and each entry's `notCopy` is where that has to be said out
// loud until a later unit lints rendered output against fixtures.

import { lintEducationCopy, type AdviceViolation } from "@/education/advice-lint";

/**
 * The first unit of Y4.
 *
 * Y4 is W157–W208. Used to read Y4 membership off each module's own header comment rather than
 * off a list, so the register cannot drift from the tree in the direction that matters — a module
 * arriving without a declaration.
 */
export const Y4_FIRST_UNIT = 157;

/** One of the five properties the CDSS boundary rests on. */
export interface RailProperty {
  id: string;
  /** The property, in the words the dossier used. */
  statement: string;
  /** The units that establish it. */
  establishedBy: readonly string[];
  /** What Y4 added that could have broken it, and why it did not. Re-derived, not carried. */
  y4Rederivation: string;
  /** The test that enforces it, so the property is not merely believed. */
  enforcedBy: string;
}

export const RAIL_PROPERTIES: readonly RailProperty[] = [
  {
    id: "never-selects-a-clinician",
    statement:
      "The product never selects a clinician. It answers 'may this clinician be offered this pathway' — a yes/no per clinician, deliberately not a ranking, because an ordered list of clinicians for a clinical pathway is a recommendation about who is better.",
    establishedBy: ["W123", "W82 (deliberately unused)"],
    y4Rederivation:
      "Y4 built the surface most likely to break this: W189's directory search literally takes a patient's need and returns clinicians. Re-derived rather than trusted — results are ordered by declared attributes with no clinical scoring, the ordering basis renders to the reader so the order is not mistaken for a judgement, W190 gives the clinician removal-only control over what is said about them, and W188 refuses to infer network membership from activity. The strongest new guard is W184/W187 refusing comparative claims in profile copy, which closes the prose route to the same recommendation, and W198 refusing price comparison, which closes the cheapest-first route to it.",
    enforcedBy: "src/directory/search.test.ts and src/directory/copy-lint.test.ts",
  },
  {
    id: "never-decides-care-transferred",
    statement:
      "The product never decides that care transferred. An explicit recorded acceptance is required; there is no timeout, no assumed handover, and no state in which nobody is watching.",
    establishedBy: ["W134", "W142"],
    y4Rederivation:
      "Q14 audits outcomes over that rail, which is where an inferred transfer would now appear. It does not infer one: W170's verdict is a statement about which events were RECORDED, `reached` requires an event evidencing the final stage, and there is no path returning it from an absence. W173's dashboard renders those verdicts and adds no arrival of its own.",
    enforcedBy: "src/outcomes/model.test.ts and src/referrals/acceptance.test.ts",
  },
  {
    id: "never-concludes-from-silence",
    statement:
      "The product never concludes from silence. It reports `unknown` rather than inferring, and reports disagreements between its state machines rather than resolving them.",
    establishedBy: ["W135", "W120"],
    y4Rederivation:
      "Y4 strengthened this rather than eroding it, and the strengthening is worth recording because it is the property most often lost by accident. W170 made `not_recorded` a first-class verdict that is never folded into failure; W179 split a zero into 'nothing happened' and 'nothing arrived', which are opposite operator actions; W171 refuses to report an absent escalation as 'none needed'; and W196 refuses to emit a figure at all over an empty basis, because a 0 sent to a commissioner reads as a fact about care.",
    enforcedBy: "src/outcomes/model.test.ts, src/ops/silence.test.ts, src/reporting/model.test.ts",
  },
  {
    id: "writes-no-clinical-text",
    statement:
      "The product writes no clinical text. G5 governs content ADHD.ME publishes; a GP writing about their own patient is professional communication this product neither generates nor edits.",
    establishedBy: ["W131", "W139"],
    y4Rederivation:
      "Y4 added the two places clinical text could have entered and neither did. Every pathway, interval and education catalogue still ships empty behind G5, so there is no authored clinical content to write, and W191's dermatology vertical is a spec awaiting the same sign-off rather than shipped content. `/clinicians` carries clinical guidance and is the one live tension — W192 classified it professional and flagged the underlying question as the founder's, which is a disclosure decision rather than the product generating text.",
    enforcedBy: "src/compliance/public-surfaces.test.ts and the empty SHIPPED_* registries",
  },
  {
    id: "informs-never-advises",
    statement:
      "The product informs a clinician and never advises about a patient. 'This pathway changed on 3 March; here is what changed' informs; 'you should review this patient against the new criteria' advises, and the second sentence is one word from the first.",
    establishedBy: ["W144", "W150"],
    y4Rederivation:
      "THE ONE THAT DID NOT SURVIVE INTACT — not the property, but its enforcement. W150's declared copy surface is six files under src/education/, and every quarter of Y4 added operator copy outside it that no linter reached: W179's silence copy, W171 and W176's empty-state copy, W173's dashboard, W187 and W198's directory rendering, W196's refusals, W159's contradiction copy in the verticals console. Re-running the advice rules over all of it found no advice about any patient, so the property held; the control did not follow the product. This unit extends the declared surface to every Y4 module, reads membership off the tree rather than a list, and accepts the three operational collisions (W179, W158, W159) by module, export and matched string rather than blunting the rule that caught them.",
    enforcedBy: "src/compliance/cdss-boundary.test.ts (this unit) plus src/education/advice-lint.test.ts",
  },
];

/**
 * Operator-facing copy outside `src/education/`, declared per Y4 module.
 *
 * Every Y4 module appears, including the ones with no copy at all — the test enumerates Y4 from
 * the tree and fails on a module that is missing here, so "no copy" has to be SAID. An empty
 * KNOWN GAP, measured under W246 and NOT closed there. This register enforces module coverage —
 * every Y4 module with a `// W<n>` header must appear — and it checks that each DECLARED export
 * exists and yields text. It does NOT check the other direction: a module can export a new sentence
 * and, as long as nobody adds it to `operatorCopy`, that sentence is never linted. W246 added three
 * and found this by hand. A sweep at the time counted 111 undeclared string-bearing exports across
 * the declared modules, so the fix is not a blanket "declare every string": most of those 111 are
 * data — suburb names, language lists, field-name registers — and a rule with 111 exceptions is
 * weaker than the `notCopy` prose it would replace. Closing it properly means classifying each
 * export as copy or data at the export, which is a unit of its own. Until then the prose is what
 * stands between a new sentence and an unlinted one, and the prose is not executable.
 *
 * `operatorCopy` with a reason is a declaration; an absent module is an oversight, and the two are
 * indistinguishable in a register that only lists what it covers.
 */
export interface CopySurface {
  module: string;
  /** Exports an operator reads. Linted. */
  operatorCopy: readonly string[];
  /** Why the module's other strings are not operator copy. */
  notCopy: string;
}

export const OPERATOR_COPY_SURFACES: readonly CopySurface[] = [
  {
    module: "src/onboarding/types.ts",
    operatorCopy: ["CARE_AREA_LABELS"],
    notCopy:
      "REFUSED_APPLICATION_FIELDS states, to a reviewer, the fields this form deliberately lacks and why, so it necessarily names the bio and the certificate upload it refuses. OFFERED_LANGUAGES is a list of language names. Only CARE_AREA_LABELS is copy a GP reads while choosing, and it is linted as such.",
  },
  {
    module: "src/onboarding/store.ts",
    operatorCopy: [],
    notCopy:
      "Validation messages addressed to the GP filling the form in, not to a practice operator, plus storage. They tell somebody their registration number is the wrong shape; they make no claim about care, a patient or a clinician's competence.",
  },
  {
    module: "src/geo/suburbs.ts",
    operatorCopy: [],
    notCopy:
      "Distances and suburb names, addressed to a PATIENT rather than to an operator. `describeDistance` is the only string-producing export and it is linted where it renders, by the W192 sweep over /finder, which is the surface a patient actually reads. Declared here because a W211 header makes it visible to this census, and an undeclared Y4 module is an unlinted one.",
  },
  {
    module: "src/voice/speech.ts",
    operatorCopy: [],
    notCopy:
      "SPEECH_DISCLOSURE, SPEECH_ERROR_COPY, SPEECH_UNAVAILABLE_COPY, SPEECH_LANGUAGES and SPEECH_ENGLISH_MATCHING_NOTE are patient-facing, not operator-facing: they sit beside the microphone on /finder and are swept there by W192. The disclosure necessarily names what happens to the audio, which is the whole reason it exists rather than something to lint out. The language list (O59) is closed and roster-derived — English plus the languages listed GPs declare — and the matching note is the honesty line that ships WITH the picker: a non-English choice is told, before speaking, that matching reads English for now, so the picker cannot invite somebody into a list that quietly ignores what they said.",
  },
  {
    module: "src/compliance/cdss-boundary.ts",
    operatorCopy: [],
    notCopy:
      "This register. Every string in it is written to a reviewer, and it necessarily quotes the advice language it is about — RAIL_PROPERTIES states the sentence that would count as advising in order to forbid it.",
  },
  {
    module: "src/compliance/public-surfaces.ts",
    operatorCopy: [],
    notCopy:
      "W192's sweep register. PUBLIC_SURFACES describes routes to a reviewer and ACCEPTED_FINDINGS quotes the exact matched text of each acceptance, which is the point of recording the match.",
  },
  {
    module: "src/directory/copy-lint.ts",
    operatorCopy: ["DIRECTORY_RULE_COPY"],
    notCopy:
      "NAME_WORD_EXCLUSIONS holds the banned words themselves, and FIELD_LINTING is a per-field disposition read by a reviewer.",
  },
  {
    module: "src/directory/correction.ts",
    operatorCopy: ["CORRECTION_COPY", "CORRECTION_EFFECT", "CORRECTION_REFUSAL_COPY"],
    notCopy:
      "REFUSED_CORRECTIONS explains to a reviewer why a control does not exist, and says the word 'specialist' in order to refuse it.",
  },
  {
    module: "src/directory/disclosure.ts",
    operatorCopy: ["DISCLOSURE_CAVEATS"],
    notCopy:
      "DISCLOSED_FIELDS and CLINICIAN_RECORD_CLASSES are W106-style classifications written for a reviewer, and they name the fields they refuse.",
  },
  {
    module: "src/directory/fees.ts",
    operatorCopy: ["BILLING_COPY", "FEE_REFUSAL_COPY"],
    notCopy:
      "FEE_RULE_COPY and REFUSED_FEE_FIELDS explain to a REVIEWER why a rule exists; RATING_RULE_OVER_BROAD is an engineering note filed for the next hardening week. None of the three renders to an operator, and all three necessarily quote the language they are about. The rendered caveat is checked by fees.test.ts through `lintFeeText`, which is the stricter directory rule set.",
  },
  {
    module: "src/directory/membership.ts",
    operatorCopy: ["MEMBERSHIP_BASIS_COPY", "JOIN_REFUSAL_COPY"],
    notCopy: "REFUSED_BASES is reviewer-facing, explaining why activity is not a membership basis.",
  },
  {
    module: "src/directory/profile.ts",
    operatorCopy: [],
    notCopy:
      "PROFILE_FIELDS and REFUSED_FIELDS are the field register and its refusals, both written to a reviewer. Profile copy itself is practice-supplied and linted at entry by copy-lint.",
  },
  {
    module: "src/directory/render.ts",
    operatorCopy: ["PROFESSION_COPY", "SCOPE_FRAMING", "REGISTRATION_FRAMING"],
    notCopy:
      "SPECIALIST_NOT_PUBLISHED is a refusal record — a rule name and the matched specialty — carried in a violation rather than rendered, and it holds the word 'specialist' because that is what it refuses. REGISTRATION_WORDS is vocabulary.",
  },
  {
    module: "src/directory/search.ts",
    operatorCopy: ["ORDERING"],
    notCopy:
      "REFUSED_SEARCH_FIELDS is reviewer-facing and names the fields it refuses, 'urgent' among them. `orderingBasis` composes its sentence inline from ORDERING's `describe` fields — the known bound in the module note; the parts are linted, the joining prose is not.",
  },
  {
    module: "src/engine/arm-stability.ts",
    operatorCopy: [],
    notCopy: "A test helper comparing experiment arms. No strings but identifiers and failure messages.",
  },
  {
    module: "src/matching/match.ts",
    operatorCopy: [],
    notCopy:
      "W214's matcher decides; W213's `MATCH_REASON_COPY` is where every sentence a practice reads about a decision lives, and this module composes nothing of its own. `REASONS_THIS_MATCHER_PRODUCES` holds reason identifiers, not prose.",
  },
  {
    module: "src/ops/silence.ts",
    operatorCopy: ["SILENCE_COPY"],
    notCopy:
      "CAUSE_ORDER is the cause enum in resolution order, and `explainSilence` picks an entry of SILENCE_COPY rather than writing anything of its own. Every rendered word in this module is in the declared export.",
  },
  {
    module: "src/outcomes/agreement.ts",
    operatorCopy: ["AGREEMENT_ANSWER_COPY"],
    notCopy: "DISAGREEMENT_BASES names the comparisons; the report renderer composes from the copy and counts.",
  },
  {
    module: "src/outcomes/audit-export.ts",
    operatorCopy: ["AUDIT_EXPORT_CAVEATS"],
    notCopy:
      "CONFIGURATION_KINDS is a kind list. The caveats are operator copy in the strongest sense — W149's rule is that they travel with the export, away from the product that would explain them.",
  },
  {
    module: "src/outcomes/dashboard.ts",
    operatorCopy: ["DASHBOARD_BASIS", "SETTLEMENT_ASK_COPY"],
    notCopy:
      "REFERRAL_CHAIN holds event-kind identifiers, not prose, and `describeAsk` composes its sentence from SETTLEMENT_ASK_COPY and the stage that is missing.",
  },
  {
    module: "src/outcomes/escalation-monitor.ts",
    operatorCopy: ["EMPTY_REASON_COPY"],
    notCopy:
      "The remaining exports are functions and the report renderer, whose output is assembled from EMPTY_REASON_COPY and counts.",
  },
  {
    module: "src/outcomes/model.ts",
    operatorCopy: ["OUTCOME_VERDICT_COPY"],
    notCopy: "`summarise` composes its basis sentence from counts; the rest are types and folds.",
  },
  {
    module: "src/outcomes/response-graph.ts",
    operatorCopy: ["SPINE_NOT_RESPONSES", "RESPONSE_GRAPH_DISCLOSURE_COPY"],
    notCopy:
      "SPINE_RESPONSE_KINDS is a translation table of event identifiers. The prose the module authors is the per-kind reasons in SPINE_NOT_RESPONSES and W218's RESPONSE_GRAPH_DISCLOSURE_COPY, which explains a withheld small cell; both are linted here. The rendered graph otherwise composes from counts and W211's absence copy.",
  },
  {
    module: "src/outcomes/time-to-escalation.ts",
    operatorCopy: ["NO_MEASUREMENT_COPY", "WHY_NO_TARGET"],
    notCopy: "The renderer composes from those two and from measured day counts.",
  },
  {
    module: "src/privacy/automated-decisions.ts",
    operatorCopy: [],
    notCopy:
      "W201's ADM notice, and the one module here whose copy is read by a PATIENT rather than an operator — so it answers to W192's sweep at the `patient_notice` audience, which `automated-decisions.test.ts` runs over exactly this text, and not to the advice rules. The distinction is not a dodge, it is the finding: `lintEducationCopy` bundles W6's patient-MESSAGE vocabulary, and a legal notice must say the words a message may not. Running it here flags five strings and all five are the notice refusing the thing — \"not a judgement about whether you need to be seen\", \"no diagnosis\", \"no list of who is most at risk\", \"does not read your test results\". Seventh instance of W198's pattern, and the second time the answer is the audience rather than the string. NOT_A_DECISION is reviewer-facing besides, naming decisions in order to rule them out.",
  },
  {
    module: "src/quality/latent-findings.ts",
    operatorCopy: [],
    notCopy:
      "W210's register of findings that are not yet defects. Every string is written to whoever reads the register — the defect, and the condition that would make it live — and it quotes the language of the defects it describes, PRIV-3's cross-practice reads among them.",
  },
  {
    module: "src/quality/order-independence.ts",
    operatorCopy: [],
    notCopy:
      "W167's fold register. Every string is a rationale addressed to whoever reads the register, and it argues about guarantees, which is why the benefit vocabulary matches it.",
  },
  {
    module: "src/quality/order-regressions.ts",
    operatorCopy: [],
    notCopy:
      "W178's regression corpus: the failures themselves, described to an engineer. It quotes the wording of past defects on purpose.",
  },
  {
    module: "src/reporting/model.ts",
    operatorCopy: ["FIGURE_REFUSAL_COPY"],
    notCopy:
      "REFUSED_FIGURES and AGGREGATION_FLOORS' `why` fields argue a threshold and a refusal to somebody reviewing them, not to an operator, and the floor rationales describe overdue intervals in order to explain the re-identification risk.",
  },
  {
    module: "src/reporting/suppression.ts",
    operatorCopy: [],
    notCopy:
      "NESTED_KINDS is a kind list and REFUSED_SUPPRESSION_TREATMENTS is reviewer-facing. `renderSuppressedReport` composes inline from figure kinds and the suppression marker — the known bound in the module note.",
  },
  {
    module: "src/reporting/report.ts",
    operatorCopy: ["REPORT_CAVEATS", "KIND_LABELS"],
    notCopy:
      "The remaining exports assemble and render the document. `REPORT_CAVEATS` and the coverage sentences are read by a practice manager, and they describe what the record holds and what it does not — never a patient, a condition or a next clinical step.",
  },
  {
    module: "src/reporting/retention.ts",
    operatorCopy: [],
    notCopy:
      "W204 declares how long a produced report lives. Every export here is reviewer-facing: `REPORT_RETENTION` and `PROPOSED_DISCLOSURE_LOG` argue a retention posture to somebody auditing it, and `REPORTING_ARTEFACTS` is a checklist of what this product does and does not keep. None of it reaches an operator, and none of it describes anybody's care.",
  },
  {
    module: "src/onboarding/transcript.ts",
    operatorCopy: [],
    notCopy:
      "Declared with NO operator copy of its own, and that is the finding rather than an omission: every label this module can emit is a facet label already declared and linted on `emotional-fit.ts` or `types.ts`, re-exported here as a lookup so the console can render a proposal the same way the form does. `CARE_LABEL_BY_AREA` is a Map and yields the linter no text, which the census caught on the first attempt to declare it — so it is named here in prose instead. The remaining exports are the turn and proposal types and the reader — it composes no sentence of its own, which is deliberate: a module that turned a clinician's speech into new prose about them would be writing the biography W183 refuses. It reads only the CLINICIAN's turns, never the interviewer's, because the interviewer names every facet by asking about it. It proposes rather than writes, and every proposal carries the clinician's own sentence, so a reviewer can check it and the clinician can recognise it. Nothing here is about a patient.",
  },
  {
    module: "src/onboarding/background-store.ts",
    operatorCopy: [],
    notCopy:
      "No copy at all: types, a writer, three readers and one thrown error. The error message is addressed to a developer, not an operator, and says why the save was refused — an accepted facet naming nobody would mean the machine accepted it. The rows it stores DO carry verbatim clinician speech from a transcript, which is not copy this tree authored and is neutralised at the writer for W153's reason, sharpened here: a quote beginning with an equals sign is a valid JSON string and an executable formula the moment somebody exports the review queue and opens it in a spreadsheet. Nothing here is about a patient and nothing here can publish.",
  },
  {
    module: "src/onboarding/background.ts",
    operatorCopy: [],
    notCopy:
      "Exports the reviewable-background and audit types, the bio assembler and the tag reader. It holds no copy of its own: every label it emits comes from a facet vocabulary declared and linted elsewhere, and the ONE sentence it composes — the assembled bio — is built at runtime from accepted facets rather than authored here. That sentence is deliberately not a field: `src/directory/profile.ts` refuses a free-text biography, so the editable surface is the facets and the prose follows them. The two fixed fragments it contributes, \"says they often see\" and \"on how they work\", exist to satisfy W193 — a declaration must be rendered AS a declaration, and the difference between \"Dr X sees adults\" and \"Dr X says they often see adults\" is the difference between vouching for a clinician and reporting one.",
  },
  {
    module: "src/demo/pending-clinicians.ts",
    operatorCopy: [],
    notCopy:
      "W228 stages a clinician the founder has asked to list before her own declarations exist. Every string is an identity or booking fact the founder supplied (name, practice, suburb, Healthengine profile URL) or an internal go-live checklist read by whoever completes the onboarding; nothing renders to a patient or an operator surface until the entry is moved into the live roster, which is the census's existing territory.",
  },
  {
    module: "src/attribution/outbound-store.ts",
    operatorCopy: [],
    notCopy:
      "W235 stores one row per booking handoff — clinician id (roster-validated), surface (allow-listed shape), DAY-truncated date — and tallies them for the staff console. No copy at all, and deliberately nothing about the person: no IP, no user agent, no session, no full timestamp, because an exact time beside a three-GP roster is a re-identification seed this product refuses to hold. The person is not the unit of measurement; the handoff is. Best-effort by contract (never throws into the redirect that calls it); the serverless-ephemerality limit is stated in the module header rather than discovered later.",
  },
  {
    module: "src/matching/allocation.ts",
    operatorCopy: [],
    notCopy:
      "W236 is the weighted pair-scoring machinery (founder-directed): synthetic patient requests against declared doctor records, hard filters with NAMED refusal reasons, then five global criterion weights (30/25/20/15/10, pinned to sum to 1) over sub-scores each normalised 0-1 by a stated formula. It renders nowhere yet — the breakdown sentences are fixed templates inside the scorers, interpolating only numerals and declared facts, never a patient's own words, and the surface that eventually renders them must declare its copy where it renders (the tie-quality precedent). Boundary facts: stated urgency is the patient's own timing preference and statedNeeds are asks in needs.ts's preference reading — nothing here reads symptoms or infers severity (G7); output is doctor lists per patient and no ordering of patients exists anywhere in the module, keeping the W201 ADM notice's 'no ordering of patients by need' true; weights are global, never keyed to a named doctor (C2); patientRef is an opaque synthetic reference with nowhere to put a name or a symptom (G2). Allocation may exclude an at-capacity doctor because assignment is not listing — the finder's O4 show-closed-books law governs the roster surface, which this module never touches.",
  },
  {
    module: "src/matching/tie-quality.ts",
    operatorCopy: [],
    notCopy:
      "W234 computes the tie-quality KPI: over the W231 corpus's reaching sentences, how many requests' top band was one clinician (separated), some of the roster (partial tie) or the whole roster (unseparated — the clarifier's work queue). It emits counts and outcome keys, no sentences; the staff-only matching console renders the numbers and its copy is linted where it renders. Nothing here is about a patient — the sentences it reads are the corpus's synthetic fixtures — and nothing here can publish or reorder anything: it reports on rankBands, it never feeds it.",
  },
  {
    module: "src/matching/corpus.ts",
    operatorCopy: [],
    notCopy:
      "W231 is the standing reach corpus: synthetic first-person SEARCH PHRASINGS with pinned expectations, consumed only by its own test as the year plan's per-facet CI gate. Nothing in it renders anywhere, to anybody — the strings are test fixtures in the W60 posture, not authored copy — and the file's own G7 section pins symptom descriptions as intentional NON-reaches, which is the boundary carried as data rather than as a comment.",
  },
  {
    module: "src/onboarding/applications-view.ts",
    operatorCopy: [],
    notCopy:
      "W233 turns a stored clinician application into the sentences the staff-gated applications console renders, as pure functions so each is unit-pinned without a staff grant existing (the W105 list ships empty). Every sentence REPORTS a declaration and none vouches: the Ahpra number is said to be an unchecked shape, the NSW training and books answers are said as the applicant's answers, and the join hero's mix renders only when the row carries one and only as stated preference — never a referral promise, never a directory field. Free-text fields (name, email, practice) pass through verbatim for the page to render under the W153 public_form attribution; this module authors nothing about any patient and nothing here can publish or advance an application.",
  },
  {
    module: "src/onboarding/reach-report.ts",
    operatorCopy: [],
    notCopy:
      "W230 aggregates saved onboarding rows into the reach-gap feed: per clinician, the sentences neither reader could hear. It authors nothing — every string it returns is verbatim clinician speech already neutralised at the W226 writer, plus identity fields from the same row. The feed renders on the staff-only matching console for lexicon review; nothing here is about a patient and nothing here can publish.",
  },
  {
    module: "src/onboarding/capture.ts",
    operatorCopy: [],
    notCopy:
      "W229 is the live interview's pure logic: parsing a typed transcript into attributed turns, finding the read-back question for a proposed facet, and folding spoken answers into the reviewable background. It authors no copy: every question it returns is `INTERVIEW`'s own `ask`, verbatim — already declared operator copy on this surface at src/onboarding/interview.ts — and its one original sentence is the drift fallback, which names a vocabulary/interview mismatch to the interviewer so the failure is visible in the room rather than thrown. Nothing here is about a patient and nothing here can publish; the only write path is the W226 store with its own refusals.",
  },
  {
    module: "src/onboarding/expertise.ts",
    operatorCopy: [],
    notCopy:
      "W227 reads an onboarding interview transcript with the patient lexicon and returns declaration PROPOSALS. The read-back questions it composes are spoken by the interviewer to the clinician being onboarded, quoting the clinician's own transcript back to them; nothing here renders to a patient or an operator surface, and a proposal becomes copy only after it is confirmed into the structured interview record, which is where the census already looks.",
  },
  {
    module: "src/onboarding/interview.ts",
    operatorCopy: ["INTERVIEW"],
    notCopy:
      "The remaining exports are the question and profile types, the frequency union and the facet map. `INTERVIEW` is read ALOUD TO A CLINICIAN during onboarding — every `ask` and every `saidAloud`. It asks a GP what they see often and how they work, and it asks nothing about any patient. Two of its `saidAloud` lines exist to satisfy W193 at the moment of collection rather than at the moment of display: the training is recorded as a declaration with no register to check it against, and a language is only ever shown to somebody who asked for that language. A test asserts the instrument cannot take free text for scope or manner, because a free-text scope answer is the biography `src/directory/profile.ts` refuses, with an interviewer's handwriting on it.",
  },
  {
    module: "src/demo/roster.ts",
    operatorCopy: ["clinicians"],
    notCopy:
      "The remaining export is the `Clinician` type. `clinicians` is the roster itself, and it is the one entry in this census whose copy is about NAMED REAL PEOPLE — which is why O100 split it into its own module and why it is filed under W193. Every reader-facing string in it (`focus`, `about`, `experience`, `manner`, the practice and suburb) is a DECLARATION relayed from a doctor or taken from what they publish, never a characterisation this product wrote about them and never a competence claim: the module's header carries that law in full, beside the entries it governs, rather than in a document somebody would have to know to look for. The distinction the census exists to draw is unusually sharp here — an edit to this module is a factual claim about a person who can be harmed by it being wrong, so it is reviewed against their published record, while an edit to src/demo/clinicians.ts next door is a ranking change reviewed against the corpus.",
  },
  {
    module: "src/demo/emotional-fit.ts",
    operatorCopy: ["EI_QUALITIES"],
    notCopy:
      "The remaining exports are the quality union, the key list and the two scoring helpers. `EI_QUALITIES` carries a reader-facing `label` and `matchLine` for each declared quality — the words a PATIENT reads as why this GP was shown. Every one describes the clinician's manner (\"listens and takes you seriously\", \"is non-judgmental, so you can be honest\"), never a state of the reader: the cues that reach them are PREFERENCE expressions, so \"I do not want to feel rushed\" is read as a want and not as a finding about somebody. That is the same side of G7 the rest of the finder sits on — a stated want matched to a declared attribute, which is what the roster already does for language and gender.",
  },
  {
    module: "src/matching/provenance.ts",
    operatorCopy: [],
    notCopy:
      "Exports three enumerators over a clinician's own declarations and a `ToldLine` type. It holds NO copy of its own and is declared with an empty `operatorCopy` deliberately, because the whole point of the module is that it AUTHORS NOTHING: every sentence it returns is composed by the function the finder itself calls — the reason line by `getPersonalizedMatch`, the closed-books line by `closedBooksNote`, the distance line by `distanceTo`, the listing-gap line by `unservedCopy` — and the two fixed frames it does carry are the profile's missed-asks sentence and a source label naming the field a line came from, neither of which a patient ever reads. A test asserts the panel and the finder cannot disagree. That property is the module's reason to exist: a \"what patients are told\" view that wrote its own copy would drift from the product the first time a sentence changed, and the clinician reading it would be reading a reassuring fiction about their own listing.",
  },
  {
    module: "src/matching/known-fps.ts",
    operatorCopy: [],
    notCopy:
      "Exports the false-positive register, its two selectors and its type. It holds no operator copy: every string in it is a build-time note — a corpus sentence quoted verbatim, the facet it wrongly reaches, the construction family it belongs to, and where an entry is accepted, the reason. None of it is rendered to anybody. Declared with an empty `operatorCopy` for the reason src/matching/read.ts states: a module absent from this census is indistinguishable from a module nobody has checked. What it is FOR is the O84 bar — one case does not earn a matcher mechanism, two do — which the tree had been applying from memory since August because the evidence for it lived in sixteen prose comments spread across corpus.ts. The register makes the count automatic, and its own first run taught it a distinction it lacked: a reading examined and judged harmless is ACCEPTED, not queued, and collapsing the two would have made the bar demand a mechanism for a family O119 had already looked at and cleared.",
  },
  {
    module: "src/demo/real-person-fields.ts",
    operatorCopy: [],
    notCopy:
      "Exports the basis register for every field this tree holds about a real, named clinician, plus its type and a name list. It is declared with an empty `operatorCopy` because nothing in it renders: each entry is a build-time note saying whose claim a field is (checkable on a public register, declared by the clinician, relayed by the founder, derived by this tree, or plain plumbing) and where specifically it came from. What it is FOR is the failure it was written after. `src/directory/disclosure.ts` has done exactly this for the PUBLIC directory since W193 — and the public directory is empty behind gate G6 and renders to nobody, while `/finder` puts three real named doctors in front of patients with their sourcing recorded only in prose comments. O156 then published \"Dr Saxena has an ownership interest in ADHD.ME\", a disclosed field about a named doctor whose basis nobody could state because there was nowhere to state it, and it took the founder to catch it. The register makes that sentence unwritable by accident: `disclosedInterest` is `founder-stated`, so entering one means citing what was actually said. Checked both directions against the live roster — a field on a real person with no entry fails, an entry naming a field nobody carries fails — so this cannot decay into a list of what somebody remembered.",
  },
  {
    module: "src/matching/scale-fixture.ts",
    operatorCopy: [],
    notCopy:
      "Exports a synthetic roster generator and a report over the clarifier selector. It is declared with an empty `operatorCopy` and that declaration deserves more scrutiny than its siblings', because unlike them this module DOES hold strings shaped like clinician copy — a name, a title, a practice, an `about` — and they are the one kind of string this tree must never publish: a fabricated doctor. They are here because `clarifiers()` takes a roster of `Clinician`, so measuring it at twenty means constructing twenty of them. Three things keep that safe and none of them is this comment. The strings are deliberately unusable as a person (\"Synthetic fixture entry 7\", \"Fixture entry — not a clinician\", a practice that says it does not exist, no image, no booking route, `realPerson` absent), so a surface that rendered one would look obviously broken rather than plausibly real. The module is imported from nowhere under `app/`, and `scale-fixture.test.ts` FAILS if that ever changes — verified by seeding a violation, not by assertion. And no entry carries an appointment, a suburb that resolves, or a competence claim of any kind. What the module is FOR is Q3 item 10, which rested on a guess about roster size that nobody had checked: the fixture is how that guess got measured without growing the real roster, which is a founder decision behind G6 and not a thing a build loop may simulate its way around.",
  },
  {
    module: "src/matching/refused-cues.ts",
    operatorCopy: [],
    notCopy:
      "Exports the refusal register and its type. It holds no operator copy: every string in it is a BUILD-TIME note to the next cue author — the phrase that was refused, the sentence that refused it, and why — and none of it is rendered to a patient, a clinician or an operator. It is declared with an empty `operatorCopy` rather than left out, for the reason src/matching/read.ts states: a module absent from this census is indistinguishable from a module nobody has checked. Worth saying what the register is FOR, because it looks like a ban list and is not: a refusal is a measurement somebody paid for, and recording it as data makes it findable by the person about to repeat it. Three times in one day a unit re-added a cue an earlier unit had measured and refused, and every one was caught by a pin — being caught three times is a signal about the process, not about the three cues. An entry can be overturned deliberately by deleting it and saying why; what it prevents is meeting the refusal by accident.",
  },
  {
    module: "src/matching/read.ts",
    operatorCopy: [],
    notCopy:
      "Exports a stemmer, a tokeniser and a cue-finder. It holds NO copy at all — not a label, not a sentence, not a fragment — because it operates on words a patient typed and words a lexicon author wrote, and produces token positions. It is declared with an empty `operatorCopy` rather than left out: a module absent from this census is indistinguishable from a module nobody has checked, and the whole point of a both-directions register is that absence cannot be silent.",
  },
  {
    module: "src/matching/clarify.ts",
    operatorCopy: ["CARE_PROMPTS", "MANNER_PROMPTS", "PREF_PROMPTS"],
    notCopy:
      "The rest is the selection logic and a label helper. All three copy tables are PATIENT-FACING and are exported for exactly that reason: the prompt is read by somebody choosing a GP, and the answer is appended to their own request and read back, so it has to survive the same linter as anything else on `/finder`. They are questions about preference and circumstance — how long an appointment, whether family is in the room, whether the dose is already being worked on — and never about symptoms, severity or history, because a triage question asked by a directory is a clinical act it has no business performing.",
  },
  {
    module: "src/matching/needs.ts",
    operatorCopy: ["NEED_LABELS"],
    notCopy:
      "The remaining exports are the facet unions, the reader and the key helper. `NEED_LABELS` is the closed vocabulary a match reason is composed from — the phrases a PATIENT reads back as why this GP was shown. Every one is written as a description of CARE rather than a finding about a person, which is the distinction this file exists to hold: \"a substance history held safely\" is a way of working, where \"substance use\" would be a clinical statement about somebody. The lexicon that reaches these labels reads a preference about care and never classifies a symptom, so the finder stays on the clinician-attribute side of G7.",
  },
  {
    module: "src/matching/explain.ts",
    operatorCopy: ["MATCH_REASON_COPY", "MATCH_FLOOR_BREACH_COPY"],
    notCopy:
      "The remaining exports are the reason union, the candidate projection and the floor check. `MATCH_REASON_COPY` is the sentence a practice manager reads about one appointment offer and `MATCH_FLOOR_BREACH_COPY` tells a reviewer why a plan was refused. Both are about capacity, recorded availability and practice-set limits; a test asserts neither can name a condition, a symptom or an urgency, because a reason is the one place a matcher gets to say WHY in words somebody reads.",
  },
  {
    module: "src/console/capacity.ts",
    operatorCopy: ["CAPACITY_EMPTY_COPY"],
    notCopy:
      "The remaining exports are the view types and the function that assembles one. `CAPACITY_EMPTY_COPY` holds the three sentences a practice reads when the page has no capacity picture: no diary recorded, every session already full, or ranges without a track record yet. The middle one is the reason these are three sentences rather than one — a fully booked practice reported as \"no capacity information\" would read as having room nobody recorded. Each names the wrong reading it must not be given. None describes a patient, a condition or a next clinical step, and the view computes no rate, range or verdict of its own: it arranges what W222 to W228 already decided.",
  },
  {
    module: "src/capacity/coupling.ts",
    operatorCopy: ["COUPLING_OFF_COPY", "COUPLING_REJECTION_COPY"],
    notCopy:
      "The remaining exports are the decision and state types, the refusal union, the shipped OFF state and three pure functions. `COUPLING_OFF_COPY` is what a practice reads where a control would be: sending more invitations when a session looks like it will run under-full is switched off, because how many people to contact is a decision about this practice's own capacity. `COUPLING_REJECTION_COPY` explains why an attempt to switch it on was refused — no recorded decision, a reason too short to be a reason, or an unreadable date. All four sentences describe a switch and the record of a choice about it. None names a patient, a condition or a next clinical step, and none advises: the module states what is off and what would be required to turn it on, and takes no view on whether it should be.",
  },
  {
    module: "src/capacity/drift.ts",
    operatorCopy: ["DRIFT_VERDICT_COPY", "DRIFT_REFUSAL_COPY"],
    notCopy:
      "The remaining exports are the verdict and refusal unions, the declared threshold, the window type and the single function that produces a report. `DRIFT_VERDICT_COPY` is what a practice manager reads about whether the ranges have matched what happened as often lately as they did earlier, and `DRIFT_REFUSAL_COPY` is what they read when there are too few scored weeks on one side of the split to compare at all. Every one of them describes the record and says outright what it does NOT establish — the drift sentence states that it cannot say which side moved, and the tracking sentence states that agreement between the halves is not a claim that the ranges are good. Nothing names a patient, a condition or a next clinical step, and nothing here proposes an action: the module reports a disagreement and, by design, resolves nothing.",
  },
  {
    module: "src/verticals/declare.ts",
    operatorCopy: [],
    notCopy:
      "W248's declaration path exports two types, an evidence reader and the `declareVertical` factory. It authors NO sentences at all: every string a vertical carries — its name, its member refs, the gate each member waits on — is supplied by the vertical that declares it and passed through untouched, which is why the copy tests live with the declarations rather than here. The one thing worth flagging for a reviewer is what the factory refuses to give a vertical: there is no field for what a member is FOR, because for a clinical pathway that sentence is the content G5 gates, and a shared factory that offered one would have offered it to every vertical at once.",
  },
  {
    module: "src/verticals/undecided.ts",
    operatorCopy: ["UNDECIDED_NAME_QUESTION"],
    notCopy:
      "The remaining exports are the declared membership and the vertical itself. `UNDECIDED_NAME_QUESTION` is the sentence a founder reads about why this vertical has no care area — it describes a CONTRADICTION BETWEEN TWO LEDGER ROWS and a decision that belongs to the company, and it names no patient, no condition and no clinical step. The `waitsOn` sentences on each member describe governance acts: which gate, whose signature, in what order. Nothing here says what any member would contain, and the module's own tests scan it for the care areas the ledger disputes and for any field that could hold what a member says.",
  },
  {
    module: "src/console/interop.ts",
    operatorCopy: [
      "INTEROP_HEADLINE",
      "SOMETHING_EXCHANGED_HEADLINE",
      "NOTHING_ATTEMPTED",
      "NONE_OF_THIS_KIND",
      "ATTEMPTED_NOT_CONFIRMED",
    ],
    notCopy:
      "The remaining exports are the view types, the gate-open constant, the function that assembles the page and `meaningFor`, which chooses between three of the sentences above and authors none. The five declared sentences exist to keep three zeroes apart: a zero because nothing was ever attempted, a zero because nothing of THIS kind was sent though other exchanges were, and a count above zero that still is not a delivery confirmation. The two headlines are the same distinction at the top of the page, and which one renders is derived from the counts rather than chosen. All five are about connections between systems; none describes a patient, a condition or a next clinical step. Every other sentence on the page is CARRIED from the interop module that owns the absence it describes, so this view authors no reason of its own.",
  },
  {
    module: "src/interop/exchange.ts",
    operatorCopy: ["EXCHANGE_OUTCOME_COPY", "UNKNOWN_REASON_COPY"],
    notCopy:
      "The remaining exports are the outcome and reason unions, the response and record types, and three pure functions. `EXCHANGE_OUTCOME_COPY` says what an exchange with another system came to — the receiving system confirmed it, said no with a reason, or said nothing that tells us either way — and `UNKNOWN_REASON_COPY` says which kind of not-knowing it was. Every sentence describes a MESSAGE and a SYSTEM, never a patient: no condition, no symptom, no next clinical step. The one thing worth flagging for a reviewer is what the copy refuses to say — that a request which completed without an error was received — which is W170's rule at the boundary where this tree cannot see the other side.",
  },
  {
    module: "src/interop/disclosure-consent.ts",
    operatorCopy: ["DISCLOSURE_CONSENT_COPY", "CONSENT_RECORD_REJECTION_COPY"],
    notCopy:
      "The remaining exports are the branded consent type, the status union, the recorder, the withdrawal and the two readers. `DISCLOSURE_CONSENT_COPY` is what somebody handling a disclosure reads about the patient's own decision — agreed, said no, lapsed, withdrawn, agreed for a different recipient, or never asked — and each sentence names the wrong reading it must not be given: a refusal is not a gap to be filled by asking again, a lapse is not a refusal, and an absence is never turned into agreement by time passing. `CONSENT_RECORD_REJECTION_COPY` says why a consent record could not be made. All of it is ABOUT a patient's decision and none of it is a statement about their health: no condition, no symptom, no next clinical step. The one sentence that told a reader what to do was reworded rather than accepted after the advice linter caught it.",
  },
  {
    module: "src/interop/credentials.ts",
    operatorCopy: ["CREDENTIAL_REFUSAL_COPY"],
    notCopy:
      "The remaining exports are the gate register, the G1-open constant, the source union and the one function that refuses. `CREDENTIAL_REFUSAL_COPY` is written to whoever is trying to configure an integration: the gate is shut, nothing was supplied, or the credential came from a literal in the tree. It names a gate and a vendor and describes nothing about any person — no patient, no condition, no next clinical step. The gate sentence quotes the plan's own words for G1, which is why it carries a vendor's product name and needs the acceptance recorded below.",
  },
  {
    module: "src/interop/disclosure-ledger.ts",
    operatorCopy: ["DISCLOSURE_REJECTION_COPY", "DISCLOSURE_POSTURE_COPY"],
    notCopy:
      "The remaining exports are the entry and posture types, the payload-posture constant W204's open question turns on, the retention life carried from W204, and two pure functions. `DISCLOSURE_REJECTION_COPY` tells whoever is recording a disclosure why an entry was refused — no identifier, a duplicate, no recipient, no recorded basis, no readable time, or figures under a ledger set to record only the fact. `DISCLOSURE_POSTURE_COPY` states what each answer to the open question means, INCLUDING the one not currently chosen, so a founder reads both consequences before deciding. All of it describes a record of what left a practice; none of it describes a patient, a condition or a next clinical step, and the ledger holds no clinical content at all under the posture that is live.",
  },
  {
    module: "src/interop/terminology.ts",
    operatorCopy: [],
    notCopy:
      "Declared with an EMPTY `operatorCopy` deliberately. The prose this module holds is written to whoever is doing an integration, never to a practice or a patient: the sentence naming an unbound code, the reasons a binding row was refused, and the two systems whose vocabularies are open because they come from a practice's own registers. The refusal sentence is composed per call and names the code — that is the row's own requirement, and its point is that somebody can act on it. Nothing here describes a patient, a condition or a next clinical step, and the bindings themselves ship EMPTY: a SNOMED CT-AU concept id written from memory would look exactly as authoritative as a correct one and bind a referral to the wrong concept, so the loader ships and the values wait for a release file somebody has opened.",
  },
  {
    module: "src/interop/contract.ts",
    operatorCopy: [],
    notCopy:
      "This module AUTHORS NOTHING and is declared with an empty `operatorCopy` deliberately — the `told.ts` posture. It is the interop lane's conformance contract: a fixture type, a pure checker returning what a mapping failed, a `describe` wrapper a mapping's own test imports, and a lane-wide walk asserting no interop module reaches a network. The only strings it holds are failure identifiers and the detail lines a developer reads in a failing assertion. Nothing here is shown to a practice, a clinician or a patient.",
  },
  {
    module: "src/interop/referral-profile.ts",
    operatorCopy: ["PROFILE_READ_REFUSAL_COPY"],
    notCopy:
      "The remaining exports are the profile types, three code-system constants, the register of slots left empty, and two pure functions. `PROFILE_READ_REFUSAL_COPY` is written to whoever is integrating a system: the resource is not a ServiceRequest, or it names a reason, request, requester, patient or receiving organisation this product cannot read. Each refuses rather than approximating, and the reason-code one says what approximating would cost — reading an unfamiliar reason as a familiar one puts words in the sending practice's mouth about why it asked. `REFERRAL_PROFILE_EMPTY_SLOTS` is the other prose here and it is reviewer-facing: it names each R4 slot this profile leaves empty and what filling it would cost, including that deriving a priority would be this tree making a triage judgement at the boundary. NOTHING in this module authors clinical text: the clinician's narrative is carried character-identical and no coding it emits carries a `display`, which is where the clinical wording would go.",
  },
  {
    module: "src/interop/fhir.ts",
    operatorCopy: ["FHIR_READ_REFUSAL_COPY"],
    notCopy:
      "The remaining exports are the resource and refusal types, three declared maps (status, appointment type, and the fields deliberately not sent) and two pure functions. `FHIR_READ_REFUSAL_COPY` is written to whoever is integrating a system, not to a practice or a patient: it says why a resource could not be read — not an Appointment, a status this mapping does not recognise, no practitioner, no readable start, or an appointment type coded under a system it does not know. Each says what was wrong rather than what anybody should do, and each states what a guess would have cost: a status read as the nearest familiar one silently changes what the record says happened, and a long appointment received as a standard one tells the diary the day has more room than it does. Nothing here describes a patient, a condition or a next clinical step — the resource carries a reference to a patient, which is an identifier rather than a statement about anybody.",
  },
  {
    module: "src/capacity/attribution.ts",
    operatorCopy: ["CAPACITY_ATTRIBUTION_WITHHELD_COPY"],
    notCopy:
      "The remaining exports are the comparator and arm types, the refusal union, an EMPTY shipped set of arm assignments and the single function that produces a difference or withholds one. `CAPACITY_ATTRIBUTION_WITHHELD_COPY` is what a practice manager reads instead of an answer to \"did opening slots help\": no sessions set aside for comparison, one side empty, a session on both sides, or an assignment that cannot be shown to precede the results. Each names the wrong answer it is refusing rather than only declining — the first says outright that comparing these weeks with earlier ones would credit the decision with everything else that changed. None describes a patient, a condition or a next clinical step; the module's inputs are session keys and counts.",
  },
  {
    module: "src/capacity/calendar.ts",
    operatorCopy: ["CALENDAR_UNKNOWN_COPY"],
    notCopy:
      "The remaining exports are the calendar types, the loader, its two readers and an EMPTY shipped catalogue. `CALENDAR_UNKNOWN_COPY` is what a practice manager reads where a closure allowance would be: no calendar has been loaded, so nothing here allows for the days the practice was shut, and it says outright that this is a gap in what has been recorded rather than a finding about the diary. It describes the record's limits and names no patient, condition or next clinical step. The loader authors the rejection REASONS, which are written to whoever is loading a calendar rather than to a practice, and each one says what was wrong with a row rather than what anybody should do about it.",
  },
  {
    module: "src/capacity/copy.ts",
    operatorCopy: [],
    notCopy:
      "This module AUTHORS NOTHING, and is declared with an empty `operatorCopy` deliberately — the `told.ts` posture. It exists to close the bound this register states about itself: the census reaches EXPORTED copy, and the capacity lane's sentences are assembled per call, so about eleven of them were prose a practice reads that no linter had ever run over. `CAPACITY_SENTENCE_KINDS` holds identifiers, the circumstance each sentence appears in, a phrase that binds the identifier to the text, and which kinds carry which others' words; `capacityCopySweep` and `capacityCopyOverDiary` PRODUCE the sentences from the four modules rather than transcribing them, and the module's own test lints every one of them joined. A transcript here would defeat the point twice: a copy of a sentence cannot go stale loudly, and a linter run over a transcript is a linter run over whatever was last pasted.",
  },
  {
    module: "src/capacity/recommendation.ts",
    operatorCopy: ["RECOMMENDATION_WITHHELD_COPY"],
    notCopy:
      "The remaining exports are the scope union, the recommendation type and the two functions that build one or withhold it. `RECOMMENDATION_WITHHELD_COPY` is what a practice manager reads where a conditional about opening slots would otherwise be: there is no range for this session, or the ranges have not been checked against the record yet. The recommendation SENTENCE it composes is a conditional about a diary — \"if N more slots were opened on Thursday, between X and Y filled\" — with the practice's own number echoed back rather than chosen, and the linter is run over it in the module's test. Nothing here names a patient, a condition or a next clinical step: no patient can enter the type, and the module imports nothing that holds one.",
  },
  {
    module: "src/capacity/score.ts",
    operatorCopy: ["SCORE_WITHHELD_COPY"],
    notCopy:
      "The remaining exports are the prediction and score types, the declared floor, and the three functions that back-test, score and pair a score with its forecast. `SCORE_WITHHELD_COPY` is what a practice manager reads instead of a hit rate when too few weeks have been scored. It describes the measurement and nothing else. No patient can appear in this module — its inputs are W222's occurrences, which are a clinician, a weekday and two counts — and it recommends nothing: it reports how often a range contained what happened and how wide that range was, with a sentence that says outright a wider range is right more often and says less.",
  },
  {
    module: "src/capacity/forecast.ts",
    operatorCopy: ["FORECAST_REFUSAL_COPY"],
    notCopy:
      "The remaining exports are the range and refusal types, the declared floor, and the two functions that compute a forecast or withhold one. `FORECAST_REFUSAL_COPY` is what a practice manager reads instead of a range: nothing recorded, not enough weeks recorded for a range to describe anything, or no slots in the question. All three describe the practice's own diary and the limits of what can be said from it. None names a patient, a condition or a next clinical step — a session here is a clinician, a weekday and two counts — and none can read as a range of zero, since the first says in words that it is not a forecast of nothing filling. The forecast SENTENCE is composed per call from the same vocabulary and is asserted to state a span rather than a single number.",
  },
  {
    module: "src/capacity/model.ts",
    operatorCopy: ["NO_HISTORY_COPY"],
    notCopy:
      "The remaining exports are the session and history types, the declared status table and the three functions that group a diary into them. `NO_HISTORY_COPY` is what a practice manager reads where a utilisation figure would otherwise be: a session that has not run before, and a session that offered no slots to work a rate out of. Both describe the practice's own diary and its limits. Neither names a patient, a condition or a next clinical step — a session in this model has nowhere to put a person — and neither can read as a zero, since each says in words that a missing figure is not nought per cent. `SLOT_STATUS`'s reasons are engineering notes on an internal classification rather than copy any reader is shown, and the module authors no other prose.",
  },
  {
    module: "src/console/responses.ts",
    operatorCopy: ["RESPONSES_EMPTY_COPY", "RESPONSES_REFUSAL_COPY"],
    notCopy:
      "The remaining exports are the view type and the function that builds it. `RESPONSES_EMPTY_COPY` holds the three sentences a practice reads when there is nothing to show — nothing sent, nothing recorded against what was sent, and every group too small to disclose — and `RESPONSES_REFUSAL_COPY` covers the two ways the graph itself refuses. All five describe the record and its limits. None names a patient, a condition or a next clinical step, and none can be read as a zero: each says in words that a missing number is not the number zero.",
  },
  {
    module: "src/outcomes/attribution-v2.ts",
    operatorCopy: ["KIND_CLAIM_WITHHELD_COPY", "RESPONSE_RATE_CAVEAT"],
    notCopy:
      "The remaining exports are the refusal union, the per-kind rate and figure types, and the two functions that compute them. `KIND_CLAIM_WITHHELD_COPY` tells a practice manager why an impact figure is not broken down by kind of message; `RESPONSE_RATE_CAVEAT` is the sentence that rides every response rate, saying that a rate counted within the messaged group does not say what would have happened without it. Both describe the measurement and its limits. Neither names a patient, a condition or a next clinical step, and neither can read as a zero — a withheld split is stated in words.",
  },
  {
    module: "src/outcomes/counterfactual.ts",
    operatorCopy: ["COUNTERFACTUAL_WITHHELD_COPY"],
    notCopy:
      "The remaining exports are the comparator union, the figure and the refusal check. `COUNTERFACTUAL_WITHHELD_COPY` tells a practice manager why an impact figure is withheld — because there is no comparison group, or because an arm is too small for the arithmetic to carry a claim. It describes the measurement, never a patient, a condition or a next clinical step, and a test asserts the copy never reads as a zero.",
  },
  {
    module: "src/outcomes/response.ts",
    operatorCopy: ["RESPONSE_STATE_COPY", "RESPONSE_ABSENCE_COPY", "RESPONSE_REJECTION_COPY"],
    notCopy:
      "The remaining exports are the model and its declared kind table. `RESPONSE_STATE_COPY` is W170's own wording re-exported rather than rewritten, `RESPONSE_ABSENCE_COPY` is the sentence a surface uses instead of \"no response\", and the rejection copy tells an operator why an event was not linked. None of it describes a patient, a condition or a next clinical step.",
  },
  {
    module: "src/tenancy/store-reads.ts",
    operatorCopy: [],
    notCopy:
      "W209's scope registry. `STORE_MODULES` is a file list and every `reason` in `STORE_READS` is addressed to a reviewer asking why a read is not narrowed to one practice. None of it reaches an operator, and none of it describes a patient, a condition or a next clinical step — the strings are about the shape of the code, not about anybody's care.",
  },
  {
    module: "src/verticals/binding.ts",
    operatorCopy: ["RESOLUTION_COPY", "ACCEPT_REFUSAL_COPY"],
    notCopy: "The remaining exports resolve which version a practice has accepted.",
  },
  {
    module: "src/verticals/completeness.ts",
    operatorCopy: ["REMAINING_CHAIN"],
    notCopy: "`assessCompleteness` counts; the report renderer composes from REMAINING_CHAIN and those counts.",
  },
  {
    module: "src/verticals/consistency.ts",
    operatorCopy: ["CONTRADICTION_COPY"],
    notCopy: "The remaining exports find contradictions; the copy is what the console renders for each kind.",
  },
  {
    module: "src/verticals/dermatology.ts",
    operatorCopy: [],
    notCopy:
      "A vertical SPEC awaiting G5 sign-off, not shipped content: member ids, criteria keys and gate names. Nothing here renders to anybody until the gate opens, and what it will render then is clinical content the founder signs off, not copy this product writes.",
  },
  {
    module: "src/verticals/model.ts",
    operatorCopy: ["VERTICAL_REFUSAL_COPY"],
    notCopy:
      "`verticalHash` and `usableVertical` are structural — a hash and a predicate. The refusal copy is the only thing in the module an operator ever sees.",
  },
  {
    module: "src/verticals/store.ts",
    operatorCopy: [],
    notCopy:
      "An in-memory store of specs, and its strings are ids and criteria keys. What it holds is authored elsewhere and gated by G5; the store renders nothing.",
  },
];

/**
 * A finding in operator copy that is accepted, with a reason and a date.
 *
 * W192's shape, and W53's before it: exact module, exact export, exact rule, exact matched string.
 * A rule accepted in general is a rule switched off, and the three entries below are the argument
 * for keeping this granular — each is the same rule doing its job on a surface where the sentence
 * means the opposite thing.
 */
export interface AcceptedCopyFinding {
  module: string;
  exportName: string;
  rule: string;
  /** The exact matched text. */
  match: string;
  why: string;
  /** ISO date. Past this, somebody looks again. */
  reviewBy: string;
}

export const ACCEPTED_COPY_FINDINGS: readonly AcceptedCopyFinding[] = [
  {
    module: "src/ops/silence.ts",
    exportName: "SILENCE_COPY",
    rule: "no-action-framing",
    match: "action needed",
    why: "W179's copy says 'No action needed' about an APPOINTMENT FEED — the connection is fine, the book is empty. The rule bans action framing because a task list implies somebody decided the task was warranted, and that reasoning is about patients; here the subject is a data connection and the sentence is the single most useful thing a practice manager can be told. Not fixed by teaching the rule about negation: in education copy 'this pathway changed, no action needed' WOULD be a clinical judgement, so the same words are acceptable here and unacceptable there, and the difference is the surface rather than the string.",
    reviewBy: "2027-02-11",
  },
  {
    module: "src/interop/credentials.ts",
    exportName: "CREDENTIAL_REFUSAL_COPY",
    rule: "no-benefit-claims",
    match: "Best",
    why: "The match is inside 'Halo/Best Practice', which is a practice-management vendor's PRODUCT NAME, quoted from the plan's own definition of G1. The rule bans benefit claims because 'our best doctors' is marketing a patient reads; naming the software a practice already runs is neither a claim nor patient-facing. Not fixed by rewording: the whole point of carrying the plan's words verbatim is that a reader of the refusal knows exactly which gate they are behind, and paraphrasing a vendor's name to satisfy a regex would make the gate text wrong to make a scan quiet. Not fixed by narrowing the rule either — 'best' really is the word that catches 'the best care in the area', and W164 already showed what happens when a compliance rule is loosened to stop it crying wolf.",
    reviewBy: "2027-08-21",
  },
  {
    module: "src/verticals/completeness.ts",
    exportName: "REMAINING_CHAIN",
    rule: "no-benefit-claims",
    match: "specialist",
    why: "'a specialist review and then a founder sign-off (G5)' describes ADHD.ME's own content governance chain to whoever is watching a vertical fill up. The rule bundles 'specialist' because a clinician claiming to be one is a prohibited title claim (W6, W184); a specialist reviewing our pathway content is the opposite direction of the same word.",
    reviewBy: "2027-02-11",
  },
  {
    module: "src/verticals/consistency.ts",
    exportName: "CONTRADICTION_COPY",
    rule: "no-clinical-necessity",
    match: "require",
    why: "'Two pathways in this vertical require the same recorded fact with opposite polarity' — rendered in the verticals console. The rule bans telling anybody that care is required; this says what two PATHWAY DEFINITIONS require of a data field, which is a statement about configuration and mentions no patient.",
    reviewBy: "2027-02-11",
  },
];

export interface CopyFinding extends AdviceViolation {
  module: string;
  exportName: string;
}

/**
 * Every string reachable inside a declared export.
 *
 * Recursive, because operator copy is not always a flat record — `SILENCE_COPY` is a record of
 * objects, and a one-level walk would have returned nothing for it and reported it clean. The
 * test asserts a non-zero text count per declared export for exactly that reason: a lint over
 * nothing passes.
 */
export function copyTexts(value: unknown, out: string[] = []): string[] {
  if (typeof value === "string") out.push(value);
  else if (Array.isArray(value)) for (const item of value) copyTexts(item, out);
  else if (value && typeof value === "object") for (const item of Object.values(value)) copyTexts(item, out);
  return out;
}

/**
 * Lint one declared surface's operator copy.
 *
 * Takes the module's namespace so the caller supplies the real exports — a register naming an
 * export that no longer exists is caught by the test rather than silently skipped here.
 */
export function lintOperatorCopy(
  surface: CopySurface,
  namespace: Record<string, unknown>,
): CopyFinding[] {
  const out: CopyFinding[] = [];
  for (const exportName of surface.operatorCopy) {
    for (const text of copyTexts(namespace[exportName])) {
      out.push(
        ...lintEducationCopy(text).map((v) => ({ ...v, module: surface.module, exportName })),
      );
    }
  }
  return out;
}

/** Findings with no acceptance. The list this unit exists to keep empty. */
export function unacceptedCopy(
  findings: readonly CopyFinding[],
  accepted: readonly AcceptedCopyFinding[] = ACCEPTED_COPY_FINDINGS,
): CopyFinding[] {
  return findings.filter(
    (f) =>
      !accepted.some(
        (a) =>
          a.module === f.module &&
          a.exportName === f.exportName &&
          a.rule === f.rule &&
          a.match.toLowerCase() === f.match.toLowerCase(),
      ),
  );
}
