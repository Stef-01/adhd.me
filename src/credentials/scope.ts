// W114: scope statements — what a credential permits, as data.
//
// A credential without a scope is a claim with no edges: "verified" says someone checked
// something, and says nothing about what the practice may now do differently. This turns that
// into data. Two things make it a compliance unit rather than a modelling one.
//
//   WHAT A CREDENTIAL PERMITS HERE IS A SOFTWARE PERMISSION, NEVER A CLINICAL ONE. Nothing in
//   this system authorises anybody to do anything clinical — that is registration, scope of
//   practice and the practice's own governance, none of which a scheduling product is entitled
//   to encode. So the permission vocabulary is closed, product-shaped, and a test asserts it
//   contains no value that grants clinical activity. W111 made the same move from the other
//   side: a register hit says "this person is registered", not "this person may do the thing".
//
//   EVERY SCOPE LABEL IS LINTED, AND UNLINTED IS UNREPRESENTABLE. A scope label is free text a
//   practice writes, and it lands next to a clinician's name — which is precisely where
//   regulated advertising language does its damage. `ScopeStatement` is branded, so the only
//   way to obtain one is `scopeStatement()`, which runs the W23 landing rules AND the W6
//   message rules over the label. Not copies of them: the same arrays, reached through their
//   own modules, so a rule added to either reaches scope labels the same day.
//
// The s 133 rule gets its own treatment. "Specialist" is a protected title: using it without
// specialist registration is an offence under s 133 of the National Law, and the damage is
// worst exactly where it is most tempting — beside a narrow scope, where it reads as
// "specialist in <condition>". A blanket refusal here is STRICTER than the law, and
// deliberately so: whether a given clinician may use the title is a fact on the Ahpra
// specialist register, which W111 can read and this module cannot rule on. Meherr does not
// carry specialist titles at all. That is safe whichever way the founder later rules, and the
// refusal says so rather than leaving the next reader to guess it was an oversight.

import { LANDING_RULES, lintLandingCopy } from "@/compliance/landing";
import { lintMessageText, MESSAGE_BANNED_RULES } from "@/messaging/templates";
import type { CredentialScope } from "./model";

/**
 * What a credential lets the SOFTWARE do. Deliberately short and deliberately not clinical.
 *
 * There is no member here that says a clinician may perform, prescribe, diagnose or treat
 * anything. If one is ever wanted, that is a founder decision about what this product is,
 * not a field a build unit adds.
 */
export type ScopePermission =
  /** The clinician may be offered to patients on this register's invitation list (W57/W61). */
  | "register_participation"
  /** Recorded for the practice's own records, and changes nothing the software does. */
  | "record_only";

export const ALL_SCOPE_PERMISSIONS: readonly ScopePermission[] = [
  "register_participation",
  "record_only",
];

/**
 * A scope label that has been through both linters.
 *
 * The brand is a `unique symbol` this module never exports, so a caller cannot construct one
 * from a string it believes is fine. Same device as W109's vault grant and W112's live
 * credential, for the same reason: the check cannot be skipped if the result of the check is
 * the only thing downstream accepts.
 */
declare const LINTED_SCOPE: unique symbol;

export interface ScopeStatement {
  readonly [LINTED_SCOPE]: true;
  readonly credentialId: string;
  readonly scope: CredentialScope;
  /** Practice-authored, and linted. What this credential covers, in the practice's words. */
  readonly label: string;
  readonly permits: readonly ScopePermission[];
}

export interface ScopeViolation {
  rule: string;
  match: string;
}

export type ScopeResult =
  | { ok: true; statement: ScopeStatement }
  | { ok: false; violations: ScopeViolation[] };

export interface ScopeInput {
  credentialId: string;
  scope: CredentialScope;
  label: string;
  permits: readonly ScopePermission[];
}

/** Every rule a scope label is checked against — the union of both linters, not a third list. */
// W116 finding: deduplicated. `no-urgency` exists in BOTH linters, so the union carried it
// twice and any caller rendering this list showed a rule the label is checked against once.
export const SCOPE_LABEL_RULES: readonly string[] = [
  ...new Set([...LANDING_RULES, ...MESSAGE_BANNED_RULES, "no-specialist-title", "label-missing"]),
];

/** True when the scope names one thing rather than describing general registration. */
export function isNicheScope(scope: CredentialScope): boolean {
  return scope.kind !== "general";
}

/**
 * Lint a scope label against everything that governs practice-authored copy.
 *
 * Both linters are reached through their own modules rather than reimplemented, so this
 * cannot fall behind them. Every violation is returned, not the first.
 */
export function lintScopeLabel(label: string, scope: CredentialScope): ScopeViolation[] {
  const violations: ScopeViolation[] = [];
  if (label.trim() === "") violations.push({ rule: "label-missing", match: "(empty)" });

  for (const violation of lintLandingCopy(label)) violations.push(violation);
  for (const violation of lintMessageText(label)) violations.push(violation);

  // s 133, stated as its own rule so the refusal explains itself rather than arriving as a
  // generic "no-specialist" from the marketing linter. The relational form is what the gate
  // asks for: beside a niche scope this reads as "specialist in <condition>", which is the
  // representation the section exists to stop.
  if (/\bspecialist\b/i.test(label) && isNicheScope(scope)) {
    violations.push({ rule: "no-specialist-title", match: "specialist" });
  }
  return violations;
}

/**
 * Build a scope statement, or refuse it with every reason.
 *
 * There is no second constructor and no escape hatch. An unlinted label cannot become a
 * `ScopeStatement`, so no surface can render one.
 */
export function scopeStatement(input: ScopeInput): ScopeResult {
  const violations = lintScopeLabel(input.label, input.scope);
  if (violations.length > 0) return { ok: false, violations };
  return {
    ok: true,
    statement: {
      credentialId: input.credentialId,
      scope: input.scope,
      label: input.label.trim(),
      permits: [...input.permits],
    } as unknown as ScopeStatement,
  };
}

/**
 * Scope statements that ship with the product: none.
 *
 * A statement of what a credential covers for a named condition is clinical content, and the
 * founder signs clinical content off (G5). This is the W68/W69/W105 posture — the machinery
 * ships, the values do not — and a test pins the emptiness so a later unit cannot quietly add
 * one. Practices author their own, through `scopeStatement`, and everything they write is
 * linted on the way in.
 */
export const SHIPPED_SCOPE_STATEMENTS: readonly ScopeStatement[] = [];

/** Plain-English refusal, for the practice member who has to fix the wording. */
export function explainScopeViolation(rule: string): string {
  switch (rule) {
    case "label-missing":
      return "Say what this credential covers.";
    case "no-specialist-title":
      return "“Specialist” is a protected title under s 133 of the National Law, and Meherr does not carry specialist titles. Describe what the credential covers instead.";
    default:
      return `This wording is not allowed next to a clinician's name (${rule}). Describe what the practice checked, not how good anyone is.`;
  }
}
