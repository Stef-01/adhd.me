// W139: the referral compliance linter.
//
// The gate has two halves and the second one is the design: "W6's rules APPLIED, not
// re-implemented". A second copy of the banned-language rules is worse than none, because it
// starts identical, drifts silently, and the drift is invisible until somebody compares two
// files nobody has reason to open together. W114 hit this first and the fix was to split
// `lintMessageText` out of W6 so the rules could be REACHED; this unit is the second consumer,
// which is when a seam like that either proves itself or turns out to be wrong.
//
// So the rule sets here are unioned from their own modules, never restated:
//
//   W6 (`lintMessageText`) — clinical, urgency and benefit language in patient copy.
//   W66 (`disclosesCondition`) — the relational condition-leak check.
//   W23 (`lintLandingCopy`) — testimonials, ratings, superlatives, "specialist".
//
// What this unit adds is the part no existing linter covers: REFERRAL-SPECIFIC language. A
// referral has a second practice in it, and patient-facing copy about a referral can imply
// things none of the existing rules were written for:
//
//   - that the other practice has ALREADY agreed to see them (W134's whole point is that
//     sending is not transferring, and a patient told "you have been referred to Dr X" before
//     anybody accepted has been told something untrue);
//   - that a referral is an appointment;
//   - that the receiving practice is better at something, which is a comparative claim about a
//     named clinician and the most regulated sentence a product like this could emit.
//
// Patient-facing is the scope. Copy between practices is professional communication and is
// governed by W131's rule — attributed, and never written by this product.

import { lintLandingCopy } from "@/compliance/landing";
import type { Condition } from "@/domain/types";
import { disclosesCondition } from "@/messaging/condition-lint";
import { lintMessageText } from "@/messaging/templates";

export interface ReferralCopyViolation {
  rule: string;
  match: string;
}

/**
 * Rules this unit owns, on top of the three linters it delegates to.
 *
 * Each one is a sentence a referral tempts you to write and nothing else forbids.
 */
const REFERRAL_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  // W134: sending is not transferring. Telling a patient they "have been referred to" a named
  // practice before that practice answered states a handover that has not happened.
  {
    rule: "no-assumed-acceptance",
    // `(is|are)` on both agreement forms: the first draft only matched the singular, so
    // "they are expecting you" — the more natural phrasing about a practice — sailed through.
    pattern: /\b(you have been referred to|(has|have) accepted (you|your referral)|will be seen by|(is|are) expecting you|(has|have) taken over your care)\b/i,
  },
  // A referral is not an appointment, and a patient who reads it as one stops chasing.
  {
    rule: "no-referral-as-appointment",
    pattern: /\byour (referral )?appointment (is|has been) (booked|confirmed|arranged)\b|\bwe have booked you\b/i,
  },
  // A comparative claim about a named practice or clinician — the most regulated sentence this
  // product could emit, and the one a referral rail invites.
  {
    rule: "no-comparative-claim",
    pattern: /\b(more experienced|better (at|with|placed)|most qualified|the right (doctor|clinician|person) for)\b/i,
  },
  // Meherr is not a party to clinical care (W89). Copy must not say the product arranged,
  // decided or oversees anything about the patient's treatment.
  {
    rule: "no-product-as-party",
    pattern: /\b(we (have )?(arranged|organised) your care|our clinicians|your care team here|meherr (recommends|has referred|will arrange))\b/i,
  },
];

export const REFERRAL_RULES: readonly string[] = REFERRAL_PATTERNS.map((p) => p.rule);

/**
 * Every rule that reaches referral copy — the union of four sources, deduplicated.
 *
 * Exported so a caller can assert coverage rather than guess, and so a rule added to W6, W23 or
 * this module is visibly reaching this surface. W114 established the shape.
 */
export function referralCopyRules(landingRules: readonly string[], messageRules: readonly string[]): string[] {
  return [...new Set([...landingRules, ...messageRules, ...REFERRAL_RULES, "condition-disclosed"])];
}

/**
 * Lint patient-facing copy about a referral.
 *
 * `conditions` is the practice's own register catalogue: the condition-leak check is RELATIONAL
 * (W66), so it needs the conditions to check against rather than a fixed word list. Passing an
 * empty list is legitimate — a practice with no registers — and is not a way to switch the
 * check off, because the other three linters still run.
 */
export function lintReferralCopy(
  text: string,
  conditions: readonly Condition[] = [],
): ReferralCopyViolation[] {
  const violations: ReferralCopyViolation[] = [];

  // Delegated, never restated. A rule added to any of these arrives here the same day.
  for (const violation of lintMessageText(text)) violations.push(violation);
  for (const violation of lintLandingCopy(text)) violations.push(violation);

  for (const condition of conditions) {
    const leaked = disclosesCondition(text, condition);
    if (leaked !== null) violations.push({ rule: "condition-disclosed", match: leaked });
  }

  for (const { rule, pattern } of REFERRAL_PATTERNS) {
    const match = text.match(pattern);
    if (match) violations.push({ rule, match: match[0] });
  }
  return violations;
}

/** Throws rather than returning a list, for W6's reason: a list nobody reads is not a gate. */
export function renderCompliantReferralCopy(
  text: string,
  conditions: readonly Condition[] = [],
): string {
  const violations = lintReferralCopy(text, conditions);
  if (violations.length > 0) {
    throw new Error(
      `referral copy failed compliance lint: ${violations.map((v) => v.rule).join(", ")}`,
    );
  }
  return text;
}

export const REFERRAL_RULE_COPY: Record<string, string> = {
  "no-assumed-acceptance":
    "This tells the patient the other practice has taken them on. Until that practice answers, it has not — and the patient would stop chasing something still open.",
  "no-referral-as-appointment":
    "This reads as though an appointment exists. A referral is a request, and a patient who thinks it is a booking will not book.",
  "no-comparative-claim":
    "This compares clinicians. A claim that one practitioner is better than another is regulated advertising, and it is not a claim this product is in a position to make.",
  "no-product-as-party":
    "This implies Meherr arranged or oversees the patient's care. It does not — the practices do, and the copy has to say so.",
};
