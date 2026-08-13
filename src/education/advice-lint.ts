// W150: informs the GP, never recommends — and a linter that reaches every education surface.
//
// W144's boundary document added a fifth property to the rail's four, and this is it:
//
//   THE PRODUCT INFORMS A CLINICIAN AND NEVER ADVISES ABOUT A PATIENT.
//
// The difference is testable, which is why it is worth stating as a rule rather than as an
// intention. "This pathway changed on 3 March; here is what changed" informs. "You should review
// this patient against the new criteria" advises. The second sentence is one word away from the
// first and a copywriter under deadline will write it.
//
// Two design decisions.
//
//   W6's RULES ARE APPLIED, NOT RE-IMPLEMENTED. Same seam W114 opened and W139 proved: the
//   clinical, urgency and benefit vocabulary is reached through `lintMessageText`, so a rule
//   added there arrives here the same day. This module owns only the patterns nothing else has
//   — the ones specific to advising a clinician.
//
//   "EVERY EDUCATION SURFACE" IS A REGISTRY CHECKED AGAINST THE TREE. A linter that has to be
//   remembered at each call site is a linter that covers whatever somebody remembered. So the
//   copy sources are declared, and `advice-lint.test.ts` reads `src/education/` and fails if a
//   module exports operator-facing copy that is not declared — the W102/W140 pattern, which has
//   caught something four times this year.

import { lintMessageText } from "@/messaging/templates";

export interface AdviceViolation {
  rule: string;
  match: string;
}

/**
 * Patterns this module owns: advising a clinician about a patient.
 *
 * Each is a sentence an education surface is tempted to write and nothing else forbids.
 */
const ADVICE_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  // The plain imperative. "You should review this" is advice however softly it is phrased.
  {
    rule: "no-clinician-instruction",
    pattern: /\byou (should|must|need to|ought to|will want to)\b|\bplease (review|check|reassess|follow up)\b/i,
  },
  // The polite imperative, which is the one that actually gets written.
  {
    rule: "no-soft-recommendation",
    pattern: /\b(consider|it is recommended|we recommend|recommended (next )?step|worth (considering|reviewing)|may wish to)\b/i,
  },
  // A statement about what a PATIENT needs is advice about that patient, whoever it addresses.
  {
    rule: "no-patient-directed-claim",
    pattern: /\bthis patient (needs|requires|should|is due|warrants)\b|\bthey (need|require|should be) (seen|reviewed|assessed)\b/i,
  },
  // Framing a change as an action item converts information into a task list.
  {
    rule: "no-action-framing",
    pattern: /\baction (required|needed)\b|\bnext steps?\b|\bto-?do\b|\bfollow[- ]up required\b/i,
  },
];

export const ADVICE_RULES: readonly string[] = ADVICE_PATTERNS.map((p) => p.rule);

/**
 * Lint one piece of education copy.
 *
 * Delegates the shared vocabulary and owns only the advice patterns. Every violation is
 * returned, not the first.
 */
export function lintEducationCopy(text: string): AdviceViolation[] {
  const violations: AdviceViolation[] = [];
  for (const violation of lintMessageText(text)) violations.push(violation);
  for (const { rule, pattern } of ADVICE_PATTERNS) {
    const match = text.match(pattern);
    if (match) violations.push({ rule, match: match[0] });
  }
  return violations;
}

/** Throws rather than returning findings — W6's posture: a list nobody reads is not a gate. */
export function renderCompliantEducationCopy(text: string): string {
  const violations = lintEducationCopy(text);
  if (violations.length > 0) {
    throw new Error(
      `education copy failed the advice lint: ${violations.map((v) => v.rule).join(", ")}`,
    );
  }
  return text;
}

/**
 * A pre-consult notice that a pathway a practice uses has changed.
 *
 * The feature this unit exists to make safe, and it is deliberately thin: it says THAT something
 * changed, WHEN, and WHO changed it, and points at W122's diff. It does not say what the change
 * means for anybody, and it does not mention a patient — a notice that named one would be
 * advising about that patient however carefully it was worded.
 */
export interface PathwayUpdateNotice {
  pathwayId: string;
  fromVersionHash: string;
  toVersionHash: string;
  changedOn: string;
  changedBy: string;
  changeCount: number;
}

export function renderUpdateNotice(notice: PathwayUpdateNotice): string {
  return [
    `${notice.pathwayId} changed on ${notice.changedOn}.`,
    `${notice.changeCount} criterion change(s), drafted by ${notice.changedBy}.`,
    `The full comparison is available; this notice states that the pathway changed and nothing about any patient.`,
  ].join(" ");
}

/**
 * The declared education copy sources.
 *
 * `advice-lint.test.ts` checks this against `src/education/` and fails when a module exports
 * operator-facing copy that is not declared here — so "every education surface" is a property of
 * the tree rather than of somebody's memory.
 */
export const EDUCATION_COPY_MODULES: readonly string[] = [
  "src/education/curation.ts",
  "src/education/triggers.ts",
  "src/education/cpd.ts",
  "src/education/advice-lint.ts",
  "src/education/console-copy.ts",
  "src/education/provenance.ts",
];

export const ADVICE_RULE_COPY: Record<string, string> = {
  "no-clinician-instruction":
    "This tells a clinician what to do. The product informs; the clinical decision is theirs, and a surface that instructs has taken part in it.",
  "no-soft-recommendation":
    "'Consider' and 'worth reviewing' are recommendations in a softer voice. The softness does not change who made the judgement.",
  "no-patient-directed-claim":
    "This says what a patient needs. That is advice about that patient whoever the sentence addresses.",
  "no-action-framing":
    "Framing information as an action item converts a notice into a task list, and a task list implies somebody decided the task was warranted.",
};
