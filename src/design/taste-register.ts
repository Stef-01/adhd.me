// The taste law's machine-readable twin (PLAN.md N11). One entry per rule id in
// `.claude/skills/adhdme-taste/SKILL.md`, checked against that file in both directions by
// `taste-register.test.ts`, so a rule added, removed or renamed in one place and not the other
// fails the build.
//
// `checkedBy` names the tests that hold a rule. A rule no test can hold is held by the skill's
// review procedure, and says so rather than pointing at a test that does not check it.

export interface TasteRule {
  readonly id: string;
  /** The rule in a line. */
  readonly rule: string;
  /** Test files that hold it, from the repository root, or "review" when only the review procedure does. */
  readonly checkedBy: readonly string[] | "review";
}

export const TASTE_REGISTER: readonly TasteRule[] = [
  { id: "layout.one-idea", rule: "One idea per screen; controls live inside the statement.", checkedBy: "review" },
  { id: "layout.fold-governed", rule: "Nothing above the fold that is not the idea.", checkedBy: ["e2e/text-budget.spec.ts"] },
  { id: "layout.shared-row", rule: "Related facts share a row.", checkedBy: "review" },
  { id: "layout.five-then-rest", rule: "Long lists show a few, with the rest one tap away.", checkedBy: ["e2e/learn-panes.spec.ts", "e2e/game-discovery.spec.ts"] },
  { id: "layout.full-bleed-play", rule: "In Play the stage is the screen, with one slim housing for chrome.", checkedBy: "review" },
  { id: "layout.calm", rule: "No labels or eyebrows; a heading, one line and the control.", checkedBy: ["e2e/text-budget.spec.ts", "e2e/headings.spec.ts"] },
  { id: "layout.one-container", rule: "One container per idea; no boxes inside boxes.", checkedBy: "review" },
  { id: "type.serif-display", rule: "Serif for a question asked of the person and a quoted voice.", checkedBy: ["e2e/typography.spec.ts"] },
  { id: "type.accent-live-tokens", rule: "Accent colour only for the value that changes.", checkedBy: "review" },
  { id: "type.numeric-typography", rule: "Tabular numbers where they change; real quotes and ellipses.", checkedBy: "review" },
  { id: "type.palette-tokens", rule: "Palette tokens only; no raw hex in components.", checkedBy: ["e2e/care-map.spec.ts"] },
  { id: "type.glass-chrome", rule: "Glass for all UI, except the My ADHD tab.", checkedBy: ["e2e/app-shell.spec.ts"] },
  { id: "type.no-dark-blocks", rule: "Ink is for text; no dark fill as a block, pill or button but the one primary.", checkedBy: "review" },
  { id: "interaction.touch-44", rule: "44px minimum touch target.", checkedBy: ["e2e/controls.spec.ts"] },
  { id: "interaction.hover-focus", rule: "Hover behind (hover: hover); a visible focus ring.", checkedBy: ["e2e/keyboard-focus.spec.ts"] },
  { id: "interaction.errors-plain", rule: "Errors are plain sentences with a way out.", checkedBy: ["src/voice/speech.test.ts"] },
  { id: "motion.carries-meaning", rule: "Motion carries meaning, never only draws the eye.", checkedBy: "review" },
  { id: "motion.reduced-motion", rule: "Reduced motion is honoured at the hook, with a static equal.", checkedBy: ["e2e/reduced-motion.spec.ts"] },
  { id: "motion.autoplay-stop", rule: "Indefinite autoplay needs a stop.", checkedBy: "review" },
  { id: "motion.consult-view-transitions", rule: "Consult view transitions before bespoke animation.", checkedBy: "review" },
  { id: "honesty.claim-earned", rule: "A claim renders only when it is earned.", checkedBy: ["e2e/finder-flow.spec.ts", "e2e/finder-personalisation.spec.ts", "src/lives/lives.test.ts"] },
  { id: "honesty.no-testimonials", rule: "No testimonials, ratings or \"specialist\" where a patient reads.", checkedBy: ["src/directory/profile.test.ts"] },
  { id: "honesty.clinician-declaration", rule: "Copy about a clinician is their declaration.", checkedBy: ["src/matching/provenance.test.ts"] },
  { id: "honesty.qa-capture", rule: "Every changed screen ships with a capture and a DESIGN-QA entry.", checkedBy: "review" },
  { id: "review.screenshot-both-viewports", rule: "Screenshot at 390x844 and desktop.", checkedBy: "review" },
  { id: "review.walk-fix-smallest", rule: "Walk the checklists; fix in place, smallest diff.", checkedBy: "review" },
  { id: "review.recapture-record", rule: "Re-capture and record the before and after.", checkedBy: "review" },
];
