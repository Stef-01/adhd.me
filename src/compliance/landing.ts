// W23: copy-compliance linter for the public B2B landing page. ADHD.ME sells to
// general practices, so the site must carry ZERO regulated therapeutic advertising
// (Ahpra advertising guidelines / s 133 National Law / TGA therapeutic-goods rules)
// and none of the things CLAUDE.md law 6 bans anywhere: no clinical claims, no
// testimonials or ratings, no "specialist" beside a niche scope. This is the B2B
// twin of the W6 patient-message linter: same posture, tuned for marketing copy.
// The landing page imports its copy from ./landing-copy; the test lints that copy,
// so a non-compliant edit fails the build.
//
// ─────────────────────────────────────────────────────────────────────────────────
// THE PRODUCT IS NAMED AFTER A DIAGNOSIS, AND THAT IS A STANDING HAZARD THIS FILE
// CANNOT FIX. "ADHD.ME" puts a condition in every page title, every URL and every
// sentence naming the product, which is condition-targeting by construction — the
// exact thing `no-condition-targeting` exists to catch, arriving through the one
// string no linter can refuse.
//
// SO DO NOT ADD "adhd" TO `no-condition-targeting`. It would fail on the brand and
// the only available fix would be to stop linting the page. The rule keeps naming
// the conditions the copy has no business raising, and the brand is handled where it
// actually has to be handled: by a founder decision, not a regex.
//
// FOUNDER ACTION, AND IT IS NOT A SMALL ONE: a name that asserts a condition needs an
// Ahpra advertising review in its own right, separately from the page copy. The
// product this was adapted from deliberately kept the condition out of its name and
// out of its B2B positioning; this one cannot. That is a legitimate choice and it is
// a different risk position, which somebody should take deliberately rather than
// inherit from a rename. Recorded here because this is the file a reviewer opens.
// ─────────────────────────────────────────────────────────────────────────────────

export interface LandingViolation {
  rule: string;
  match: string;
}

const BANNED_PATTERNS: Array<{ rule: string; pattern: RegExp }> = [
  // No patient-facing therapeutic advertising / clinical claims.
  {
    rule: "no-clinical-claims",
    pattern: /\b(diagnos\w*|treat(?:s|ment|ing)?|cure\w*|heal(?:s|ing)?|therap\w*|prescrib\w*)\b/i,
  },
  { rule: "no-health-outcome-promise", pattern: /\b(healthier|better health|improve[sd]? (?:your )?health|live longer|save lives)\b/i },
  { rule: "no-condition-targeting", pattern: /\b(diabetes|blood pressure|hypertension|cancer|kidney|heart disease|mental health)\b/i },
  // No testimonials or ratings anywhere (CLAUDE.md law 6).
  { rule: "no-testimonials", pattern: /\b(testimonial|patients? love|loved by|our patients say|success stor)/i },
  { rule: "no-ratings", pattern: /(\b\d(?:\.\d)?\s*\/\s*5\b|\b\d(?:\.\d)?[- ]star\b|★|\brated\b|\breviews?\b)/i },
  // No superlatives / guarantees that constitute regulated advertising.
  { rule: "no-superlatives", pattern: /\b(best|#1|number one|leading|top-rated|world-class)\b/i },
  { rule: "no-guarantees", pattern: /\b(guarantee\w*|risk-free|proven to)\b/i },
  // "specialist" must never sit beside a niche scope (GP is general practice).
  { rule: "no-specialist", pattern: /\bspecialist\b/i },
  // No urgency/scarcity pressure.
  { rule: "no-urgency", pattern: /\b(urgent\w*|act now|limited time|don'?t miss|hurry)\b/i },
];

/** The rule names this linter can report. Exported so a caller can assert it reached all of them. */
export const LANDING_RULES: readonly string[] = BANNED_PATTERNS.map((p) => p.rule);

export function lintLandingCopy(text: string): LandingViolation[] {
  const violations: LandingViolation[] = [];
  for (const { rule, pattern } of BANNED_PATTERNS) {
    const match = text.match(pattern);
    if (match) violations.push({ rule, match: match[0] });
  }
  return violations;
}

/** Lint a bundle of copy strings; returns every violation with its field path. */
export function lintCopyBundle(bundle: Record<string, unknown>): Array<LandingViolation & { field: string }> {
  const out: Array<LandingViolation & { field: string }> = [];
  const walk = (value: unknown, path: string) => {
    if (typeof value === "string") {
      for (const v of lintLandingCopy(value)) out.push({ ...v, field: path });
    } else if (Array.isArray(value)) {
      value.forEach((item, i) => walk(item, `${path}[${i}]`));
    } else if (value && typeof value === "object") {
      for (const [k, v] of Object.entries(value)) walk(v, path ? `${path}.${k}` : k);
    }
  };
  walk(bundle, "");
  return out;
}
