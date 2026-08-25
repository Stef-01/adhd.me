// AR30: the console honesty register — accepted marketing-rule findings on signed-in surfaces.
//
// WHY THE CONSOLE GETS ITS OWN REGISTER RATHER THAN ENTRIES IN `ACCEPTED_FINDINGS`. W192's
// register classifies surfaces a STRANGER can reach; its both-directions test pins that list
// against the filesystem with console routes excluded by construction. Console screens are read
// by signed-in practice staff, which puts them under the professional audience's rules (the W23
// marketing subset: no testimonials, no ratings, no superlatives, no guarantees, no urgency
// pressure, no "specialist", no health-outcome promises) — and their findings need a different
// argument, which O189 named: a console REPORTS things. A word rendered there is often not the
// site speaking, it is the site showing a stored fact — a workflow state, a stored declaration,
// a role the clinical-governance chain actually requires. The marketing rules are about what the
// product says about itself; a report is the product saying what is in it.
//
// THAT DISTINCTION IS THE FIELD, NOT A VIBE. Every acceptance below must argue `dataVsCopy`
// separately from `why`: what stored fact or workflow state the matched text renders, and why
// editing the word would misreport it. An entry that cannot make that argument is site copy that
// tripped a marketing rule, and the fix is to edit the copy — never to add the entry.
//
// The register follows W53/W192's acceptance shape exactly: exact path + rule + matched text, an
// argument, and a review date past which somebody looks again. `e2e/console-honesty.spec.ts`
// checks both directions — an unaccepted finding fails the sweep, and an acceptance whose text no
// longer renders fails as stale.

import type { AcceptedFinding } from "./public-surfaces";

export interface ConsoleAcceptedFinding extends AcceptedFinding {
  /**
   * O189's law, made a required field: the stored fact or workflow state this text renders, and
   * why rewording it would misreport that fact. Site copy has no answer here.
   */
  dataVsCopy: string;
}

export const CONSOLE_ACCEPTED_FINDINGS: readonly ConsoleAcceptedFinding[] = [
  // The AR30 measurement run swept all 28 console routes and found exactly these two. Every
  // entry after them needs its own red sweep first — an entry added without one accepts nothing.
  {
    path: "/console/interop",
    rule: "no-superlatives",
    match: "Best",
    why:
      "The G1 founder-gate panel quotes the gate's own definition from docs/FIVE-YEAR-PLAN.md §4: " +
      "real PMS credentials for “Halo/Best Practice, HotDoc partner access” are blocked until the " +
      "founder opens the gate. src/interop/credentials.test.ts already records the identical " +
      "acceptance where `no-benefit-claims` trips on the same string at the module level.",
    dataVsCopy:
      "“Best” is half the proper noun “Best Practice” — a vendor's practice-management product, " +
      "quoted from GATES.G1.covers in src/interop/credentials.ts. It is the stored gate definition " +
      "rendered as a report, not the product praising anything; renaming a vendor's product to " +
      "quiet a regex would misreport which integration the gate blocks.",
    reviewBy: "2027-02-25",
  },
  {
    path: "/console/pathways",
    rule: "no-specialist",
    match: "specialist",
    why:
      "The pathways screen reports the two-step governance chain: “reviewed by a specialist and " +
      "signed off”. The rule bans the word because a patient reading it beside a niche scope is " +
      "being sold expertise (tree law 6); here it is read by practice staff and names the medical " +
      "role the chain requires, next to no scope at all. Contrast /console/verticals, whose own " +
      "“specialist” WAS wrong (completeness.ts requires no specialist reviewer) and was fixed as " +
      "copy — that is the data-vs-copy line drawn from both sides.",
    dataVsCopy:
      "The page renders approvals of stored kind `specialist_review`: src/registers/authoring.ts " +
      "requires a specialist reviewer to attest clinical correctness before founder sign-off, and " +
      "records “reviewed by specialist” in the history. The word names the role the stored " +
      "approval means; a euphemism in the UI would misname what the record requires and attests.",
    reviewBy: "2027-02-25",
  },
];
