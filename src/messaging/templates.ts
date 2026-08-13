// W6: message templates + compliance linter.
// The linter is the code-level enforcement of the venture brief's advertising posture:
// availability messages carry NO clinical content — no urgency, no "overdue", no diagnosis,
// no benefit claims (Ahpra advertising guidelines / s 133 National Law / Spam Act posture).
// A template that fails lint can never be sent; the gate runs at build time AND at send time.

export interface MessageContext {
  patientFirstName: string;
  clinicianDisplayName: string;
  practiceName: string;
  sessionWindow: string; // e.g. "after 5pm this week" — availability language only
  bookingUrl: string;
  /** W25: telehealth variant swaps "appointment" for "telehealth (phone/video) appointment". */
  telehealth?: boolean;
}

export interface LintViolation {
  rule: string;
  match: string;
}

/** Clinical/urgency/benefit language that must never appear in an availability invitation. */
const BANNED_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  { rule: "no-overdue-framing", pattern: /\boverdue\b|\bdue for\b|\bmissed\b/i },
  { rule: "no-urgency", pattern: /\burgent\w*\b|\bas soon as possible\b|\basap\b|\bimmediately\b|\bdon'?t delay\b/i },
  { rule: "no-clinical-necessity", pattern: /\bmust be seen\b|\bneeds? to be seen\b|\brequired?\b|\bmedically\b/i },
  { rule: "no-deterioration", pattern: /\bdeteriorat\w*\b|\bworsen\w*\b|\bat risk\b|\brisk of\b/i },
  { rule: "no-diagnosis-or-condition", pattern: /\bdiagnos\w*\b|\byour (condition|illness|disease|results?|blood pressure|diabetes|kidney|heart)\b/i },
  { rule: "no-test-results-bait", pattern: /\btest results?\b|\bpathology\b|\babnormal\b/i },
  { rule: "no-benefit-claims", pattern: /\bbest\b|\bleading\b|\bexpert\b|\bspecialist\b|\bguarantee\w*\b/i },
  { rule: "no-checkup-prompting", pattern: /\bcheck-?up\b|\bhealth check\b|\btime for your\b/i },
];

/** Structural requirements: who is messaging, and a working way out. */
const REQUIRED_CHECKS: Array<{ rule: string; ok: (text: string, ctx: MessageContext) => boolean }> = [
  { rule: "identifies-practice", ok: (t, c) => t.includes(c.practiceName) },
  { rule: "has-opt-out", ok: (t) => /reply stop/i.test(t) },
  { rule: "has-booking-link", ok: (t, c) => t.includes(c.bookingUrl) },
];

/** The rule names this linter can report, for callers asserting coverage rather than guessing. */
export const MESSAGE_BANNED_RULES: readonly string[] = BANNED_PATTERNS.map((p) => p.rule);

/**
 * The banned-language half of the message lint, without the structural checks.
 *
 * W114 needs these rules to reach a credential's scope label, and a scope label has no
 * practice name, opt-out or booking link — running the whole lint over one would report three
 * violations that mean nothing. Splitting it here rather than copying the patterns is what
 * makes the reach REAL: a rule added to BANNED_PATTERNS reaches scope labels the same day,
 * with nobody remembering to mirror it.
 */
export function lintMessageText(text: string): LintViolation[] {
  const violations: LintViolation[] = [];
  for (const { rule, pattern } of BANNED_PATTERNS) {
    const match = text.match(pattern);
    if (match) violations.push({ rule, match: match[0] });
  }
  return violations;
}

export function lintMessage(text: string, ctx: MessageContext): LintViolation[] {
  const violations: LintViolation[] = lintMessageText(text);
  for (const { rule, ok } of REQUIRED_CHECKS) {
    if (!ok(text, ctx)) violations.push({ rule, match: "(missing)" });
  }
  return violations;
}

/** The canonical availability invitation (venture brief §Phase 1 wording). */
export function renderAvailabilityInvitation(ctx: MessageContext): string {
  const offer = ctx.telehealth
    ? "has telehealth (phone/video) appointments available"
    : "has appointments available";
  return (
    `Hi ${ctx.patientFirstName}, ${ctx.clinicianDisplayName} ${offer} ` +
    `${ctx.sessionWindow} at ${ctx.practiceName}. Book: ${ctx.bookingUrl} — or reply STOP to opt out.`
  );
}

/** Render + hard lint gate: a non-compliant message throws rather than sends. */
export function renderCompliant(ctx: MessageContext): string {
  const text = renderAvailabilityInvitation(ctx);
  const violations = lintMessage(text, ctx);
  if (violations.length > 0) {
    throw new Error(`message failed compliance lint: ${violations.map((v) => v.rule).join(", ")}`);
  }
  return text;
}
