// W138 verify gate (linter half): the rule fires on Meherr-as-carer and stays silent on the
// correct way to say the same thing. The surface sweep is e2e/party-to-care.spec.ts.

import { describe, expect, it } from "vitest";
import {
  PARTY_TO_CARE_RULES,
  PRACTICE_RESPONSIBILITY_STATEMENT,
  RESPONSIBILITY_STATEMENT,
  lintPartyToCare,
} from "./party-to-care";

describe("W138 it catches Meherr holding itself out as a carer", () => {
  const violations: Array<[string, string]> = [
    ["we treat patients with ongoing conditions", "meherr-as-care-provider"],
    ["Meherr will assess whether you need to be seen", "meherr-as-care-provider"],
    ["our system can diagnose common presentations", "meherr-as-care-provider"],
    ["we monitor your blood pressure between visits", "meherr-as-care-provider"],
    ["Meherr will review your results and get back to you", "meherr-as-care-provider"],
    ["we manage your care between appointments", "meherr-as-care-provider"],
    ["our doctors are available after hours", "meherr-owns-clinicians"],
    ["book with one of our GPs", "meherr-owns-clinicians"],
    ["your Meherr clinician will be in touch", "meherr-owns-clinicians"],
    ["Meherr's care team is here to help", "meherr-owns-clinicians"],
    ["Meherr is part of your care team", "meherr-as-care-team"],
    ["tell us your symptoms and we will help", "send-us-clinical"],
    ["send us your latest results", "send-us-clinical"],
  ];

  for (const [text, rule] of violations) {
    it(`flags "${text}"`, () => {
      const findings = lintPartyToCare(text);
      expect(findings.map((f) => f.rule)).toContain(rule);
    });
  }

  it("names the sentence, not just the page", () => {
    // A linter whose output is "this page is non-compliant" gets ignored.
    const [finding] = lintPartyToCare("Our doctors will call you back.");
    expect(finding?.match.toLowerCase()).toContain("our doctors");
    expect(finding?.explanation.length).toBeGreaterThan(30);
  });
});

describe("W138 it stays silent on the correct way to say it", () => {
  // The half that decides whether the rule survives contact with real copy. The W23
  // `no-ratings` rule has blocked correct wording three times; a linter that taxes correct
  // sentences gets switched off, and then it protects nothing.
  const legitimate = [
    "Your GP will review the results with you at your appointment.",
    "Your practice will assess whether a longer appointment is needed.",
    "The practice's doctors set which registers are switched on.",
    "Meherr offers available appointment times on your practice's instructions.",
    "We send appointment invitations on behalf of your practice.",
    "Meherr never makes a clinical decision about any patient.",
    "Talk to your practice about anything to do with your health.",
    "Tell your practice if the time does not suit.",
    "Your usual GP is the person who looks after you.",
    "Our software schedules invitations; it does not provide care.",
    "We report on how many invitations led to an attended appointment.",
    "Meherr processes the minimum information needed to deliver the service.",
    "The practice remains the custodian of its patient records.",
    "Reply STOP to opt out of these messages at any time.",
  ];

  for (const text of legitimate) {
    it(`passes "${text}"`, () => {
      expect(lintPartyToCare(text)).toEqual([]);
    });
  }
});

describe("W138 the canonical statements pass their own linter", () => {
  it("both statements are clean", () => {
    // A statement that tripped the rule it exists to satisfy would be an obvious own goal, and
    // "your practice provides your care" is close enough to the pattern to be worth pinning.
    expect(lintPartyToCare(RESPONSIBILITY_STATEMENT)).toEqual([]);
    expect(lintPartyToCare(PRACTICE_RESPONSIBILITY_STATEMENT)).toEqual([]);
  });

  it("each says who is responsible and what Meherr is not", () => {
    expect(RESPONSIBILITY_STATEMENT).toContain("Your practice provides your care");
    expect(RESPONSIBILITY_STATEMENT).toContain("not part of your care team");
    expect(PRACTICE_RESPONSIBILITY_STATEMENT).toContain("treating entity");
    expect(PRACTICE_RESPONSIBILITY_STATEMENT).toContain("no clinical responsibility");
  });
});

describe("W138 the rule set cannot shrink unnoticed", () => {
  it("every rule is still present", () => {
    // Deleting a rule to make a page pass is the failure mode this guards. Adding one is fine
    // and updates this list; removing one has to be argued in a diff.
    expect([...PARTY_TO_CARE_RULES].sort()).toEqual([
      "meherr-as-care-provider",
      "meherr-as-care-team",
      "meherr-owns-clinicians",
      "send-us-clinical",
    ]);
  });

  it("reports every rule that fired, not just the first", () => {
    const findings = lintPartyToCare(
      "Our doctors treat patients here. Meherr is part of your care team.",
    );
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });
});
