// W151: the education console's standing copy, in a module the advice linter reaches.
//
// The page could hold these sentences in JSX and no linter would ever see them. That is the
// whole reason they are here: W150 built a linter over "every education surface" and made
// coverage a property of the tree, and the first new surface after it is the moment that either
// earns the registry or quietly steps around it.
//
// So the console's prose lives in `src/education/`, is declared in `EDUCATION_COPY_MODULES`, and
// `advice-lint.test.ts` runs every value below through `lintEducationCopy`. A sentence added
// here that tells a clinician what to do fails the suite; a sentence added to the page's JSX
// instead is the thing the next hardening week should look for.

/**
 * Every fixed sentence the education console renders.
 *
 * Dynamic lines (the ordering basis, the out-of-scope tally, the CPD rows) come from W145/W148/
 * W149 and are already linted where they are produced.
 */
export const EDUCATION_CONSOLE_COPY = {
  intro:
    "Material about the conditions this practice keeps registers for, and your own record of what you have read.",

  /** W144 step 4, on screen: the product may order and must not withhold. */
  libraryAllShown:
    "Meherr does not shorten this list. Every item about a register this practice runs is above, in full. A list that quietly dropped its weaker entries would be making a judgement on your behalf and hiding that it had made one.",

  /** W127's rule about zero states: say why it is empty rather than rendering a blank list. */
  libraryEmpty:
    "There is no material in the library. Meherr ships with none of its own: every item has to trace back to content that cleared sign-off, and nothing has cleared it. That is the state of the product rather than a page that failed to load.",

  /** W148's emptiness, stated where a reader would otherwise assume a broken feature. */
  /** W154: material whose cited source is not signed off is not shown — and says so. */
  librarySourceWithheld:
    "Some material is not shown because the content it cites is not currently signed off. It may have been withdrawn, or the reference may be wrong. Nothing is hidden silently — each item is named below, and the ordering figures further down count material before this check.",
  triggersNone:
    "No teaching triggers ship with Meherr. Deciding that something written on a record is a moment to put material in front of a clinician is a clinical judgement about that condition, and nobody has made it. The library above does not depend on that — it is offered in full either way.",

  /** W144 step 6, on screen: the evaluation and the material are not rendered together. */
  evaluationSeparate:
    "Where a care pathway has been evaluated against a record, that sits on the pathway surface and is not repeated here. Meherr keeps the two apart on purpose — a statement about a record placed next to material about the same pathway reads as advice, and none was given.",

  noPatientHere:
    "Nothing on this page is about a particular patient. It lists what this practice's registers make relevant, and what you have read, and it names nobody.",

  /** W149's position, in the one place a practice would go looking for the report it refuses. */
  cpdOwn:
    "Your own record of what you opened, and when. Meherr shows it to nobody else — there is no practice view of who has read what, and no function in the product that could build one.",

  cpdNotComprehension:
    "It records that material was opened. It says nothing about whether it was understood, agreed with, or acted on.",

  cpdEmpty: "No entries. Meherr draws no conclusion from that.",

  cpdUnlinked:
    "Your sign-in is not linked to a clinician on this practice's roster, so Meherr does not know whose reading record this would be. It will not guess.",

  /** W149 again: a correction is marked alongside the original, never a silent rewrite. */
  cpdCorrected: "The clinician has since said this entry was wrong.",
} as const;
