// W138 verify gate (linter half): the rule fires on ADHD.ME-as-carer and stays silent on the
// correct way to say the same thing. The surface sweep is e2e/party-to-care.spec.ts.

import { describe, expect, it } from "vitest";
import {
  PARTY_TO_CARE_RULES,
  PRACTICE_RESPONSIBILITY_STATEMENT,
  RESPONSIBILITY_STATEMENT,
  lintPartyToCare,
} from "./party-to-care";

describe("W138 it catches ADHD.ME holding itself out as a carer", () => {
  const violations: Array<[string, string]> = [
    ["we treat patients with ongoing conditions", "adhd-me-as-care-provider"],
    ["ADHD.ME will assess whether you need to be seen", "adhd-me-as-care-provider"],
    ["our system can diagnose common presentations", "adhd-me-as-care-provider"],
    ["we monitor your blood pressure between visits", "adhd-me-as-care-provider"],
    ["ADHD.ME will review your results and get back to you", "adhd-me-as-care-provider"],
    ["we manage your care between appointments", "adhd-me-as-care-provider"],
    ["our doctors are available after hours", "adhd-me-owns-clinicians"],
    ["book with one of our GPs", "adhd-me-owns-clinicians"],
    ["your ADHD.ME clinician will be in touch", "adhd-me-owns-clinicians"],
    ["ADHD.ME's care team is here to help", "adhd-me-owns-clinicians"],
    ["ADHD.ME is part of your care team", "adhd-me-as-care-team"],
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

describe("§O97 the ordinary-English verbs need a clinical object", () => {
  /**
   * The rule's `assess`, `treat` and `monitor` arm was split off because it read our OWN privacy
   * policy's Notifiable Data Breaches paragraph as an offer of clinical assessment. These pins
   * hold both directions of that split: a person or their health as the object still fails, and
   * a breach, an incident or a server does not.
   */
  const stillFlagged = [
    "we treat patients with ongoing conditions",
    "ADHD.ME will assess whether you need to be seen",
    "we monitor your blood pressure between visits",
    "we can assess you at short notice",
    "ADHD.ME will treat anyone who asks",
    "we will assess your ADHD and get back to you",
  ];
  for (const text of stillFlagged) {
    it(`still flags "${text}"`, () => {
      expect(lintPartyToCare(text).map((f) => f.rule)).toContain("adhd-me-as-care-provider");
    });
  }

  const nowSilent = [
    // The sentence that found the defect, verbatim from app/privacy/page.tsx. It is a statutory
    // obligation under the NDB scheme; if this pin ever fails, fix the rule, not the policy.
    "If we suspect information we hold has been lost or accessed without authority, we will assess it promptly, tell the people affected what happened and what we are doing about it, and notify the Office of the Australian Information Commissioner where the Notifiable Data Breaches scheme requires it.",
    "We assess every incident within thirty days.",
    "We monitor uptime and error rates.",
    "We treat every report of a fault as urgent.",
  ];
  for (const text of nowSilent) {
    it(`passes "${text.slice(0, 56)}…"`, () => {
      expect(lintPartyToCare(text)).toEqual([]);
    });
  }

  it("KNOWN LIMIT, today's truth: `your` alone carries the clinical reading", () => {
    /**
     * `your` is in the clinical-object list because "we monitor your blood pressure" must keep
     * failing and the health nouns that can follow `your` are not enumerable. The price is that
     * a non-clinical `your` object is still flagged. Pinned rather than fixed: the sentence is
     * not in this tree, and when one is written it earns its own narrowing with a real sentence
     * attached — the way this split was earned by a real page. If a future unit narrows it,
     * this pin is the one to update, deliberately.
     */
    expect(lintPartyToCare("we treat your data with care").map((f) => f.rule))
      .toContain("adhd-me-as-care-provider");
  });
});

describe("W138 the finding still names its sentence", () => {
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
    "ADHD.ME offers available appointment times on your practice's instructions.",
    "We send appointment invitations on behalf of your practice.",
    "ADHD.ME never makes a clinical decision about any patient.",
    "Talk to your practice about anything to do with your health.",
    "Tell your practice if the time does not suit.",
    "Your usual GP is the person who looks after you.",
    "Our software schedules invitations; it does not provide care.",
    "We report on how many invitations led to an attended appointment.",
    "ADHD.ME processes the minimum information needed to deliver the service.",
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

  it("each says who is responsible and what ADHD.ME is not", () => {
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
      "adhd-me-as-care-provider",
      "adhd-me-as-care-team",
      "adhd-me-owns-clinicians",
      "send-us-clinical",
    ]);
  });

  it("reports every rule that fired, not just the first", () => {
    const findings = lintPartyToCare(
      "Our doctors treat patients here. ADHD.ME is part of your care team.",
    );
    expect(findings.length).toBeGreaterThanOrEqual(2);
  });
});
