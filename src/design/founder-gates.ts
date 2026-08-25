// AR36: the founder gate register — the aesthetic and working-truth questions that are PRODUCT
// decisions, named, priced, and mechanically kept out of the loop's hands.
//
// WHY A REGISTER. These questions were real and SCATTERED: two acceptances in a sweep file, a
// boolean in a page module, two flag records, a review date, a priced backlog in a document.
// Scattered means decidable-by-drift — any one of them could be resolved by an ordinary edit
// that nobody recognises as a product decision. This register names each question once, and
// `founder-gates.test.ts` asserts per gate that the OPEN STATE still exists at its source. An
// edit that closes a question without updating this register fails the build with a message
// saying exactly what happened: the question appears to have been decided, and the founder's
// decision must be recorded here in the same commit. The loop may close a gate's plumbing —
// never the question.
//
// WHAT DOES NOT BELONG HERE. Plan §4's operational gates (no real patient data, no live SMS,
// no production credentials, G1/G5) live in the plan and `src/interop/credentials.ts`; this
// register is the AESTHETIC and WORKING-TRUTH set the AR lane surfaced. AR18 (dark-theme
// parity) was checked and deliberately excluded: it is a plan-listed [P] engineering unit, not
// an open product question.

export interface FounderGate {
  id: string;
  /** The decision, phrased as the question only the founder can answer. */
  question: string;
  /** What answering costs — in units, in review, or in regulatory exposure. */
  price: string;
  /** Where the open state lives in the tree. The liveness test reads this location. */
  openAt: string;
}

export const FOUNDER_GATES: readonly FounderGate[] = [
  {
    id: "prescriber-on-profile",
    question:
      "May a clinician's own profile text say 'prescriber' where a patient reads it, given it is her declaration and W23 reads the word as a clinical claim?",
    price:
      "A wording ruling: keep the acceptance (declaration wins), or ask the clinician to reword (the linter wins). Either way one sentence in the O163 register records it; no code beyond the acceptance moves.",
    openAt: "e2e/profile-sweep.spec.ts",
  },
  {
    id: "mental-health-on-profile",
    question:
      "May a profile list 'mental health' among a GP's own clinical interests on a patient surface, where the condition-targeting rule would otherwise refuse it?",
    price:
      "The same ruling class as prescriber, and O163 called it the closest to the rule's actual intent — naming a condition TO a patient versus a directory stating what a GP does. One acceptance kept or one interest reworded.",
    openAt: "e2e/profile-sweep.spec.ts",
  },
  {
    id: "team-page-public",
    question: "Does the team page go public (TEAM_PAGE_PUBLIC), naming the founders on a patient-reachable route?",
    price:
      "Flipping the boolean is free; the real price is the disclosure itself plus the mechanical cascade AR37 pre-wired: the /about working-truth proof goes red and must be replaced with team content, and the new screen owes a qa/ capture and a DESIGN-QA entry.",
    openAt: "app/about/team.ts",
  },
  {
    id: "brand-names-a-condition",
    question:
      "Does ADHD.ME stand as the brand, given the name itself puts a condition in every title and URL — condition-targeting by construction that no copy linter can reach?",
    price:
      "An Ahpra advertising review of the NAME, separate from any page copy — the risk position the tree inherited from a rename rather than took deliberately. Recorded in PRODUCT_FLAGS and at the head of src/compliance/landing.ts.",
    openAt: "src/compliance/public-surfaces.ts",
  },
  {
    id: "clinicians-page-clinical-content",
    question:
      "Should ADHD.ME publish clinical guidance to GPs at all — /clinicians ships differential diagnosis and titration content while W56 has held the register chain for less?",
    price:
      "A consistency ruling the Y2 and Q13 dossiers each filed and no one has made: either the page's content class is fine (and W56's hold should say why it is different) or it is not (and the page loses its clinical sections). Both defensible; not simultaneously.",
    openAt: "src/compliance/public-surfaces.ts",
  },
  {
    id: "console-honesty-wording-review",
    question:
      "At review, do 'Best Practice' (the vendor name in the G1 gate text) and 'specialist' (the pathways governance role) remain the right words on staff screens?",
    price:
      "A re-read of two argued acceptances against whatever the product looks like then — the register carries the arguments; the review either re-dates or rewords.",
    openAt: "src/compliance/console-honesty.ts",
  },
  {
    id: "taste-enforcement-spend",
    question:
      "Which of the dossier's priced enforcement gaps get built, and in what order — is the recommended spend (honesty-pair probe first) the product's priority?",
    price:
      "Roughly one loop unit per gap, per AR-DOSSIER §3's table; the decision is prioritisation, not feasibility. Un-decided, the loop builds none of them on its own.",
    openAt: "docs/AR-DOSSIER.md",
  },
  {
    id: "judgment-rules-stay-human",
    question:
      "Is it acceptable indefinitely that layout.one-idea, layout.shared-row and motion.carries-meaning are enforced only by review discipline — or is a proxy detector wanted despite the dossier's Goodhart warning?",
    price:
      "Accepting the status quo costs a standing review habit; buying a proxy costs a unit AND the risk the proxy becomes the rule. The dossier recommends the former; the choice is the founder's.",
    openAt: "docs/AR-DOSSIER.md",
  },
];
