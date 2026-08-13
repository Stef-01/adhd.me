// W66 verify gate: the linter blocks every seeded condition-leak, and W6's rules are still
// enforced. The seeds below are the messages a well-meaning person actually writes when told
// "we can target by register now" — each one is plausible, and each one is a health
// disclosure to a device that may be shared or read on a lock screen.

import { describe, expect, it } from "vitest";
import type { Condition, ConditionCode } from "@/domain/types";
import {
  auditAgainstCatalogue,
  disclosesCondition,
  lintConditionTargeted,
  renderConditionTargeted,
  type ConditionTargetedContext,
} from "./condition-lint";

function condition(code: string, displayName: string): Condition {
  return { code: code as ConditionCode, displayName, description: "", active: true };
}

const DIABETES = condition("type_2_diabetes", "Type 2 Diabetes");
const CKD = condition("ckd_stage_3", "Chronic Kidney Disease (stage 3)");

const CTX: ConditionTargetedContext = {
  patientFirstName: "Sam",
  clinicianDisplayName: "Dr Lee",
  practiceName: "Demo Family Practice",
  sessionWindow: "after 5pm this week",
  bookingUrl: "https://example.test/book/abc",
  targetedCondition: DIABETES,
};

const rules = (text: string, ctx: ConditionTargetedContext = CTX) =>
  lintConditionTargeted(text, ctx).map((v) => v.rule);

describe("W66 the standard invitation is unchanged and passes", () => {
  it("renders the same availability text regardless of which register selected the patient", () => {
    const viaDiabetes = renderConditionTargeted(CTX);
    const viaCkd = renderConditionTargeted({ ...CTX, targetedCondition: CKD });
    expect(viaDiabetes).toBe(viaCkd);
    expect(viaDiabetes).toContain("has appointments available");
    expect(viaDiabetes).toContain("reply STOP");
  });

  it("keeps the telehealth variant", () => {
    expect(renderConditionTargeted({ ...CTX, telehealth: true })).toContain("telehealth (phone/video)");
  });
});

describe("W66 seeded condition leaks are all blocked", () => {
  const base = `Hi Sam, Dr Lee has appointments available after 5pm this week at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`;

  it.each([
    ["names the condition outright", `Hi Sam, your Type 2 Diabetes review is available at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`],
    ["names it in lower case", `Hi Sam, Dr Lee has diabetes appointments available at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`],
    ["uses the register code", `Hi Sam, type_2_diabetes clinic at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`],
  ])("%s", (_label, text) => {
    expect(rules(text)).toContain("no-condition-disclosure");
  });

  it("catches a condition named only by one significant word", () => {
    const text = base.replace("appointments available", "diabetes appointments available");
    expect(rules(text)).toContain("no-condition-disclosure");
    // And the CKD register is caught by "kidney" alone.
    const ckdText = base.replace("appointments available", "kidney appointments available");
    expect(rules(ckdText, { ...CTX, targetedCondition: CKD })).toContain("no-condition-disclosure");
  });

  it.each([
    ["we noticed", `Hi Sam, we noticed you are due a visit. Dr Lee has appointments available at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`],
    ["our records show", `Hi Sam, our records show it has been a while. Dr Lee has appointments at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`],
    ["because you", `Hi Sam, because you have not been in, Dr Lee has appointments at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`],
    ["based on your", `Hi Sam, based on your last visit, Dr Lee has appointments at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`],
    ["recall framing", `Hi Sam, this is your recall. Dr Lee has appointments at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`],
  ])("blocks targeting tell: %s", (_label, text) => {
    // Reveals the patient was singled out without ever naming a condition.
    const found = rules(text);
    expect(
      found.some((r) => r.startsWith("no-selection-disclosure") || r.startsWith("no-personalised-reason") || r.startsWith("no-recall-framing")),
      `expected a targeting tell, got ${found.join(", ")}`,
    ).toBe(true);
  });

  it("refuses to render a leaking message rather than sending it", () => {
    const leaky: ConditionTargetedContext = { ...CTX, practiceName: "Diabetes Care Clinic" };
    expect(() => renderConditionTargeted(leaky)).toThrow(/no-condition-disclosure/);
  });
});

describe("W66 W6's existing rules are still enforced, not replaced", () => {
  it.each([
    ["overdue framing", "you are overdue"],
    ["urgency", "please book urgently"],
    ["deterioration", "your health may worsen"],
    ["test-results bait", "we have your test results"],
    ["checkup prompting", "time for your health check"],
  ])("still blocks %s", (_label, phrase) => {
    const text = `Hi Sam, ${phrase}. Dr Lee has appointments available at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`;
    expect(lintConditionTargeted(text, CTX).length).toBeGreaterThan(0);
  });

  it("still requires the practice name, opt-out and booking link", () => {
    expect(rules("Hi Sam, appointments available.")).toEqual(
      expect.arrayContaining(["identifies-practice", "has-opt-out", "has-booking-link"]),
    );
  });

  it("a condition-targeted message is never held to a weaker standard than an untargeted one", () => {
    // Every W6 rule that fires on a text must also fire through this path.
    const text = `Hi Sam, you are overdue for your health check at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`;
    const viaCondition = rules(text);
    for (const rule of ["no-overdue-framing", "no-checkup-prompting"]) {
      expect(viaCondition).toContain(rule);
    }
    // And it adds to them rather than replacing: the same text naming the register also
    // trips the leak rule.
    expect(rules(text.replace("health check", "diabetes review"))).toContain("no-condition-disclosure");
  });
});

describe("W66 the check extends to registers nobody has invented yet", () => {
  it("covers a practice-authored register without touching the linter", () => {
    const invented = condition("perinatal_mental_health", "Perinatal Mental Health");
    const text = `Hi Sam, perinatal appointments available at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`;
    expect(disclosesCondition(text, invented)).toBe("perinatal");
  });

  it("does not fire on generic words shared with ordinary copy", () => {
    // "care" and "health" appear in register names constantly; treating them as disclosures
    // would make the linter unusable and train people to route around it.
    const generic = condition("chronic_care_review", "Chronic Care Review");
    const clean = `Hi Sam, Dr Lee has appointments available after 5pm this week at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`;
    expect(disclosesCondition(clean, generic)).toBeNull();
    expect(lintConditionTargeted(clean, { ...CTX, targetedCondition: generic })).toEqual([]);
  });

  it("audits one message against the whole catalogue at once", () => {
    const text = `Hi Sam, diabetes and kidney appointments at Demo Family Practice. Book: https://example.test/book/abc — or reply STOP to opt out.`;
    const leaks = auditAgainstCatalogue(text, [DIABETES, CKD]);
    expect(leaks.map((l) => l.conditionCode).sort()).toEqual(["ckd_stage_3", "type_2_diabetes"]);
  });
});
