// W114 verify gate: "W23/W6 linters reach every scope label; 'specialist' cannot appear next
// to a niche scope (s 133)."
//
// "Reach" is the word that needs testing properly. A label being linted TODAY is easy; what
// the gate asks is that the linters reach scope labels as they grow, so the tests below check
// the wiring — that the rule sets come from the linters' own modules — rather than asserting
// against a copied list that would drift in exactly the way the gate is guarding against.

import { describe, expect, it } from "vitest";
import { LANDING_RULES } from "@/compliance/landing";
import { MESSAGE_BANNED_RULES } from "@/messaging/templates";
import type { CredentialScope } from "./model";
import {
  ALL_SCOPE_PERMISSIONS,
  explainScopeViolation,
  isNicheScope,
  lintScopeLabel,
  SCOPE_LABEL_RULES,
  scopeStatement,
  SHIPPED_SCOPE_STATEMENTS,
  type ScopeStatement,
} from "./scope";

const CONDITION: CredentialScope = { kind: "condition", conditionCode: "placeholder_register_a" };
const PROCEDURE: CredentialScope = { kind: "procedure", name: "placeholder procedure" };
const GENERAL: CredentialScope = { kind: "general" };

const input = (label: string, scope: CredentialScope = CONDITION) => ({
  credentialId: "cred-1",
  scope,
  label,
  permits: ["record_only"] as const,
});

describe("W114 both linters reach every scope label", () => {
  it("drops no rule from either linter", () => {
    // The wiring assertion. If W6 or W23 gains a rule and this module stopped delegating,
    // the union would no longer match and this fails — which is the drift the gate is about.
    for (const rule of [...LANDING_RULES, ...MESSAGE_BANNED_RULES]) {
      expect(SCOPE_LABEL_RULES, `rule ${rule} does not reach scope labels`).toContain(rule);
    }
    expect(LANDING_RULES.length).toBeGreaterThan(0);
    expect(MESSAGE_BANNED_RULES.length).toBeGreaterThan(0);
  });

  it("refuses a label tripping a W23-only rule", () => {
    // "testimonial" is a landing-page rule and appears in no message rule.
    const result = scopeStatement(input("Testimonial from a happy patient"));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.violations.map((v) => v.rule)).toContain("no-testimonials");
  });

  it("refuses a label tripping a W6-only rule", () => {
    // "overdue" is a message rule and appears in no landing rule.
    const result = scopeStatement(input("For patients who are overdue"));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.violations.map((v) => v.rule)).toContain("no-overdue-framing");
  });

  it("reports every violation at once, not the first", () => {
    const result = scopeStatement(input("The best expert, results guaranteed"));
    expect(result.ok).toBe(false);
    const rules = !result.ok ? new Set(result.violations.map((v) => v.rule)) : new Set();
    expect(rules.size).toBeGreaterThan(1);
  });

  it("refuses an empty label rather than accepting a scope that says nothing", () => {
    const result = scopeStatement(input("   "));
    expect(!result.ok && result.violations.map((v) => v.rule)).toContain("label-missing");
  });

  it("accepts a label that describes what was checked", () => {
    const result = scopeStatement(input("Chronic disease management training, completed 2025"));
    expect(result.ok).toBe(true);
    expect(result.ok && result.statement.label).toBe(
      "Chronic disease management training, completed 2025",
    );
  });
});

describe("W114 s 133: specialist cannot appear next to a niche scope", () => {
  it("refuses it beside a condition scope", () => {
    const result = scopeStatement(input("Specialist in this condition", CONDITION));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.violations.map((v) => v.rule)).toContain("no-specialist-title");
  });

  it("refuses it beside a procedure scope", () => {
    const result = scopeStatement(input("Specialist procedure accreditation", PROCEDURE));
    expect(!result.ok && result.violations.map((v) => v.rule)).toContain("no-specialist-title");
  });

  it("refuses it beside a general scope too, via the marketing rule", () => {
    // The s 133 rule is relational, as the gate words it. The blanket refusal comes from the
    // W23 linter, and it is deliberately stricter than the law: whether a clinician may use
    // the title is a fact on the specialist register, which this module cannot rule on.
    const result = scopeStatement(input("Specialist registration", GENERAL));
    expect(result.ok).toBe(false);
    expect(!result.ok && result.violations.map((v) => v.rule)).toContain("no-specialist");
  });

  it("catches it in any casing and anywhere in the label", () => {
    for (const label of ["SPECIALIST clinic", "our Specialist team", "accredited specialist"]) {
      expect(scopeStatement(input(label)).ok, label).toBe(false);
    }
  });

  it("explains the refusal by naming the section, not just the rule", () => {
    const copy = explainScopeViolation("no-specialist-title");
    expect(copy).toContain("s 133");
    expect(copy.length).toBeGreaterThan(40);
  });

  it("knows which scopes are niche", () => {
    expect(isNicheScope(CONDITION)).toBe(true);
    expect(isNicheScope(PROCEDURE)).toBe(true);
    expect(isNicheScope(GENERAL)).toBe(false);
  });
});

describe("W114 a permission here is never a clinical one", () => {
  it("has a closed vocabulary containing nothing that authorises clinical activity", () => {
    // W111's move from the other side: the conclusion this product is not entitled to draw is
    // unrepresentable rather than discouraged.
    expect([...ALL_SCOPE_PERMISSIONS].sort()).toEqual(["record_only", "register_participation"]);
    for (const permission of ALL_SCOPE_PERMISSIONS) {
      expect(permission).not.toMatch(/perform|prescrib|diagnos|treat|administer|operate|certif/i);
    }
  });

  it("carries the permissions it was given, and nothing is inferred from the scope", () => {
    const result = scopeStatement({ ...input("Accredited training"), permits: [] });
    expect(result.ok && result.statement.permits).toEqual([]);
  });
});

describe("W114 unlinted is unrepresentable", () => {
  it("cannot be constructed from a string a caller believes is fine", () => {
    // Every field below is a plain literal of the right type, so the ONLY thing wrong with
    // this object is the missing brand — otherwise the directive would be satisfied by
    // something else and prove nothing (the W65 trap).
    // @ts-expect-error — ScopeStatement is branded; only scopeStatement() can produce one.
    const forged: ScopeStatement = {
      credentialId: "cred-1",
      scope: { kind: "general" },
      label: "See a specialist today",
      permits: ["record_only"],
    };
    expect(forged).toBeDefined();
  });

  it("ships no scope statements — clinical content is the founder's to sign off (G5)", () => {
    // W68/W69/W105 posture: the machinery ships, the values do not. Pinned so a later unit
    // cannot quietly add one.
    expect(SHIPPED_SCOPE_STATEMENTS).toEqual([]);
  });

  it("lints practice-authored labels on the way in, which is where they come from", () => {
    expect(lintScopeLabel("Best in the region", GENERAL).length).toBeGreaterThan(0);
    expect(lintScopeLabel("Wound care training, 2025", GENERAL)).toEqual([]);
  });
});
