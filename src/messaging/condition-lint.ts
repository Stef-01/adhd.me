// W66: per-condition templates + the condition-leak linter.
//
// Q6 lets a practice target invitations BY REGISTER. The patient-facing message must not
// change at all. A patient invited because they are on the diabetes register and a patient
// invited because a session had spare capacity receive the same availability text; the
// register decides WHO is messaged, never WHAT they are told.
//
// That is not a stylistic preference. An SMS saying "you're on our diabetes register" is an
// unsolicited disclosure of health information to a device that may be shared, read on a
// lock screen, or seen by a family member — and it is the "condition-targeted advertising"
// posture the venture brief rules out (Ahpra advertising guidelines / s 133 National Law).
// W6's linter already bans clinical language in general terms. This adds the specific thing
// Q6 makes newly possible: the condition that SELECTED the patient leaking into their copy.
//
// The check is deliberately not a keyword list. A keyword list can only ban conditions
// somebody thought of, and Q6's whole point is that registers are practice-authored data.
// Instead the leak test is relational: given the condition a message was targeted for, does
// the rendered text disclose it — by code, display name, or any word from either? Adding a
// register to the catalogue therefore extends the linter automatically.

import type { Condition, ConditionCode } from "@/domain/types";
import { lintMessage, type LintViolation, type MessageContext } from "./templates";

export interface ConditionTargetedContext extends MessageContext {
  /** The register that selected this patient. Never rendered — this is why the check exists. */
  targetedCondition: Condition;
}

/** Words too generic to treat as a disclosure on their own. */
const STOPWORDS = new Set([
  "and", "the", "of", "or", "a", "an", "in", "for", "to", "with", "care", "health",
  "review", "check", "example", "register", "type", "chronic", "general", "other",
]);

function significantWords(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((w) => w.length >= 4 && !STOPWORDS.has(w));
}

/**
 * Does `text` disclose `condition`? Checks the code, the display name, and every significant
 * word from either — so "Type 2 Diabetes" is caught by "diabetes" alone, and a register the
 * practice invents next month is covered without touching this file.
 */
export function disclosesCondition(text: string, condition: Condition): string | null {
  const haystack = text.toLowerCase();
  const candidates = [
    condition.code as string,
    condition.displayName,
    ...significantWords(condition.displayName),
    ...significantWords((condition.code as string).replace(/[_-]+/g, " ")),
  ];
  for (const candidate of candidates) {
    const needle = candidate.toLowerCase().trim();
    if (needle.length < 4) continue;
    if (haystack.includes(needle)) return needle;
  }
  return null;
}

/**
 * The full gate for a condition-targeted send: every W6 rule, plus the leak check.
 *
 * W6's rules are applied unchanged rather than re-implemented, so a condition-targeted
 * message can never be held to a WEAKER standard than an untargeted one — the failure mode
 * where a new send path quietly bypasses the old linter.
 */
export function lintConditionTargeted(
  text: string,
  ctx: ConditionTargetedContext,
): LintViolation[] {
  const violations = lintMessage(text, ctx);
  const leaked = disclosesCondition(text, ctx.targetedCondition);
  if (leaked !== null) {
    violations.push({ rule: "no-condition-disclosure", match: leaked });
  }
  // The register's own vocabulary is not the only way to leak it. "We noticed you haven't
  // been in for your usual check" reveals targeting without naming a condition, so the
  // relational check is paired with a ban on personalised-reason framing.
  for (const { rule, pattern } of TARGETING_TELLS) {
    const match = text.match(pattern);
    if (match) violations.push({ rule, match: match[0] });
  }
  return violations;
}

/** Phrasings that reveal the patient was singled out, without naming why. */
const TARGETING_TELLS: Array<{ rule: string; pattern: RegExp }> = [
  { rule: "no-selection-disclosure", pattern: /\b(we (noticed|see|identified)|our records show|you (were|have been) (selected|identified|flagged))\b/i },
  { rule: "no-personalised-reason", pattern: /\b(because you|since you|as you (are|have)|based on your)\b/i },
  { rule: "no-recall-framing", pattern: /\b(recall|follow-?up (is|due)|your (next|regular) (review|visit))\b/i },
];

/**
 * Render a condition-targeted invitation. There is deliberately no per-condition template
 * BODY: the text is W6's availability invitation, unchanged. The "per-condition template"
 * this unit ships is a per-condition *selection* of who receives the standard message.
 *
 * A future unit that genuinely needs different copy per condition must go through G5 and
 * this linter, and will find that any condition-specific wording fails it — which is the
 * intended answer, not an obstacle to route around.
 */
export function renderConditionTargeted(ctx: ConditionTargetedContext): string {
  const text =
    `Hi ${ctx.patientFirstName}, ${ctx.clinicianDisplayName} ` +
    `${ctx.telehealth ? "has telehealth (phone/video) appointments available" : "has appointments available"} ` +
    `${ctx.sessionWindow} at ${ctx.practiceName}. Book: ${ctx.bookingUrl} — or reply STOP to opt out.`;
  const violations = lintConditionTargeted(text, ctx);
  if (violations.length > 0) {
    throw new Error(
      `condition-targeted message failed compliance lint: ${violations.map((v) => v.rule).join(", ")}`,
    );
  }
  return text;
}

/** Every register in the catalogue, checked against one rendered message. */
export function auditAgainstCatalogue(
  text: string,
  catalogue: readonly Condition[],
): Array<{ conditionCode: ConditionCode; leaked: string }> {
  const leaks: Array<{ conditionCode: ConditionCode; leaked: string }> = [];
  for (const condition of catalogue) {
    const leaked = disclosesCondition(text, condition);
    if (leaked !== null) leaks.push({ conditionCode: condition.code, leaked });
  }
  return leaks;
}
