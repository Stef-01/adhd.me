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
      "The product writes no clinical text. G5 governs content Meherr publishes; a GP writing about their own patient is professional communication this product neither generates nor edits.",
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
    operatorCopy: ["SPINE_NOT_RESPONSES"],
    notCopy:
      "SPINE_RESPONSE_KINDS is a translation table of event identifiers. The rendered graph composes from counts, W211's absence copy and the per-kind reasons in SPINE_NOT_RESPONSES, which is the only prose the module authors itself.",
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
    module: "src/matching/explain.ts",
    operatorCopy: ["MATCH_REASON_COPY", "MATCH_FLOOR_BREACH_COPY"],
    notCopy:
      "The remaining exports are the reason union, the candidate projection and the floor check. `MATCH_REASON_COPY` is the sentence a practice manager reads about one appointment offer and `MATCH_FLOOR_BREACH_COPY` tells a reviewer why a plan was refused. Both are about capacity, recorded availability and practice-set limits; a test asserts neither can name a condition, a symptom or an urgency, because a reason is the one place a matcher gets to say WHY in words somebody reads.",
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
    module: "src/verticals/completeness.ts",
    exportName: "REMAINING_CHAIN",
    rule: "no-benefit-claims",
    match: "specialist",
    why: "'a specialist review and then a founder sign-off (G5)' describes Meherr's own content governance chain to whoever is watching a vertical fill up. The rule bundles 'specialist' because a clinician claiming to be one is a prohibited title claim (W6, W184); a specialist reviewing our pathway content is the opposite direction of the same word.",
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
