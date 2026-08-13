// W139 verify gate: "no clinical claim in any referral-adjacent patient-facing copy; W6's
// rules APPLIED, not re-implemented."
//
// The second half is the one that can rot, so it is tested as WIRING rather than by example:
// every rule name W6 and W23 can report must be reachable from this linter, and each delegated
// linter is proven live by a string only it catches. A copy of the rules would pass a
// by-example test on the day it was written and drift silently afterwards.

import { describe, expect, it } from "vitest";
import type { Condition, ConditionCode } from "@/domain/types";
import { LANDING_RULES } from "@/compliance/landing";
import { MESSAGE_BANNED_RULES } from "@/messaging/templates";
import {
  lintReferralCopy,
  REFERRAL_RULE_COPY,
  REFERRAL_RULES,
  referralCopyRules,
  renderCompliantReferralCopy,
} from "./compliance";

const CONDITIONS: Condition[] = [
  {
    code: "placeholder_register_a" as ConditionCode,
    displayName: "Placeholder Register A",
    description: "Placeholder description — fixture only, not clinical content.",
    active: true,
  },
];

const rulesFor = (text: string, conditions: readonly Condition[] = []) =>
  lintReferralCopy(text, conditions).map((v) => v.rule);

describe("W139 W6's rules are applied, not re-implemented", () => {
  it("every rule from both linters is reachable from referral copy", () => {
    // The wiring assertion. If this module ever grew its own copy of the patterns, the union
    // would stop matching the sources and this fails.
    const reachable = referralCopyRules(LANDING_RULES, MESSAGE_BANNED_RULES);
    for (const rule of [...LANDING_RULES, ...MESSAGE_BANNED_RULES]) {
      expect(reachable, `rule ${rule} does not reach referral copy`).toContain(rule);
    }
    expect(LANDING_RULES.length).toBeGreaterThan(0);
    expect(MESSAGE_BANNED_RULES.length).toBeGreaterThan(0);
  });

  it("catches a W6-only rule", () => {
    // "overdue" is a message rule and appears in no landing rule.
    expect(rulesFor("You are overdue for this.")).toContain("no-overdue-framing");
  });

  it("catches a W23-only rule", () => {
    // "testimonial" is a landing rule and appears in no message rule.
    expect(rulesFor("Read a testimonial from another patient.")).toContain("no-testimonials");
  });

  it("catches a W66 condition leak, relationally", () => {
    // W66's check is against the practice's own catalogue, so a register invented next month is
    // covered without touching this file.
    expect(rulesFor("About your placeholder register a review.", CONDITIONS)).toContain(
      "condition-disclosed",
    );
    // And a single significant word is enough — the whole point of the relational form.
    expect(rulesFor("Notes on your Placeholder care.", CONDITIONS)).toContain("condition-disclosed");
  });

  it("still runs the other three linters when no conditions are supplied", () => {
    // An empty catalogue is legitimate — a practice with no registers — and must not read as a
    // way to switch the checking off.
    expect(rulesFor("You are overdue.", []).length).toBeGreaterThan(0);
  });

  it("deduplicates a rule name shared by two linters", () => {
    const reachable = referralCopyRules(LANDING_RULES, MESSAGE_BANNED_RULES);
    expect(new Set(reachable).size).toBe(reachable.length);
  });
});

describe("W139 the rules a referral needs and nothing else has", () => {
  it("refuses copy claiming the other practice has taken the patient on", () => {
    // W134's whole point: sending is not transferring. A patient told this before anybody
    // answered has been told something untrue, and would stop chasing something still open.
    for (const text of [
      "You have been referred to Northside Family Practice.",
      "Northside has accepted your referral.",
      "You will be seen by the other practice next week.",
      "They are expecting you.",
    ]) {
      expect(rulesFor(text), text).toContain("no-assumed-acceptance");
    }
  });

  it("refuses copy that reads as though an appointment exists", () => {
    for (const text of ["Your referral appointment is booked.", "We have booked you in."]) {
      expect(rulesFor(text), text).toContain("no-referral-as-appointment");
    }
  });

  it("refuses a comparative claim about a clinician", () => {
    // The most regulated sentence this product could emit, and the one a referral rail invites.
    for (const text of [
      "They are more experienced with this.",
      "Dr Lee is better placed to help.",
      "The right doctor for you.",
    ]) {
      expect(rulesFor(text), text).toContain("no-comparative-claim");
    }
  });

  it("refuses copy implying Meherr is a party to the care", () => {
    // W89's line. The practices provide care; this product moves paperwork between them.
    for (const text of [
      "We have arranged your care with another practice.",
      "Our clinicians will look after this.",
      "Meherr has referred you on.",
    ]) {
      expect(rulesFor(text), text).toContain("no-product-as-party");
    }
  });

  it("explains each of its own rules in terms of the harm, not the pattern", () => {
    for (const rule of REFERRAL_RULES) {
      const copy = REFERRAL_RULE_COPY[rule];
      expect(copy, rule).toBeTruthy();
      expect(copy!.length, rule).toBeGreaterThan(60);
    }
  });
});

describe("W139 compliant copy passes, and the gate throws", () => {
  it("accepts copy that states the position honestly", () => {
    const text =
      "Your practice has asked another practice to see you. They have not answered yet, and your usual practice is still looking after you.";
    expect(lintReferralCopy(text, CONDITIONS)).toEqual([]);
    expect(renderCompliantReferralCopy(text, CONDITIONS)).toBe(text);
  });

  it("throws rather than returning a list nobody reads", () => {
    expect(() => renderCompliantReferralCopy("You have been referred to Dr Lee.")).toThrow(
      /no-assumed-acceptance/,
    );
  });

  it("reports every violation, not the first", () => {
    const text = "You have been referred to the best clinic and your appointment is booked.";
    const rules = new Set(rulesFor(text));
    expect(rules.size).toBeGreaterThan(2);
    expect(rules).toContain("no-assumed-acceptance");
    expect(rules).toContain("no-referral-as-appointment");
  });

  it("does not fire on the product's own referral console copy", () => {
    // The console is practice-facing rather than patient-facing, so it is not this linter's
    // scope — but its standing note is the sentence most likely to trip a rule by accident,
    // and it should read cleanly under patient-facing rules too.
    const note =
      "Until a referral is answered, this practice is still looking after the patient.";
    expect(lintReferralCopy(note, CONDITIONS)).toEqual([]);
  });
});
