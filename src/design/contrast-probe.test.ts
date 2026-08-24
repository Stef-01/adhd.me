// AR12: `e2e/support/contrast-load.ts`'s pure half, checked in the hard gate (the AR6-AR11
// split). The browser half — canvas parsing, luminance, the injections — is in
// contrast-probe.spec.ts against a real rendered page.
import { describe, expect, it } from "vitest";
import { CONTRAST_RULE_ID, contrastFinding } from "../../e2e/support/contrast-load";

describe("contrastFinding()", () => {
  it("returns null on a clean route", () => {
    expect(contrastFinding("/", [])).toBeNull();
  });

  it("names the route, the count and the rule id", () => {
    const finding = contrastFinding("/console/dashboard", ['4.24:1 (needs 4.5) <span> 14px "Holdout"']);
    expect(finding).toContain("/console/dashboard");
    expect(finding).toContain("1 text element(s)");
    expect(finding).toContain(CONTRAST_RULE_ID);
  });

  it("carries every offender, so the finding says what to go and look at", () => {
    const finding = contrastFinding("/faq", ['4.24:1 (needs 4.5) <p>', '2.85:1 (needs 3) <h2>']);
    expect(finding).toContain("4.24:1");
    expect(finding).toContain("2.85:1");
  });

  it("the rule id says where the law lives — O157's WCAG gate, not a register entry", () => {
    // contrast.spec.ts carries no taste-rule tag and the register holds no contrast entry
    // (AR17-18 are its future colour work). If contrast ever joins the register, this pin is
    // the reminder to point the id there — AR11 holds the same pin for semantics.
    expect(CONTRAST_RULE_ID).toContain("O157");
  });
});
