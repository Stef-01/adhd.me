// Examples you can see and tap (docs/design/ux-evaluation-2026-09/PLAN.md W6b): four chips under
// the finder's box. Each fills the box with a short, neutral request, never a story the person did
// not tell, and each must produce an informed order ("Matches") on the roster; the test holds it.
// An example also has to be one the list can order: "A woman GP for ADHD" tied eleven women, and
// the fold, which never cuts a tie, opened on all eleven (76 words). A second ask breaks the tie.

export interface ExampleSearch {
  /** What the chip says. */
  readonly label: string;
  /** What the box fills with. */
  readonly request: string;
}

export const EXAMPLE_SEARCHES: readonly ExampleSearch[] = [
  { label: "Adult ADHD assessment", request: "An adult ADHD assessment, telehealth, not rushed" },
  { label: "Medication review", request: "An ADHD medication review" },
  { label: "A woman doctor", request: "A woman GP for ADHD, not rushed" },
  { label: "Telehealth appointment", request: "A telehealth appointment for ADHD" },
];
