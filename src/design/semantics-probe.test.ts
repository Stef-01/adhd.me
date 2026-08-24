// AR11: `e2e/support/semantics-load.ts`'s pure half, checked in the hard gate (the AR6-AR10
// split). The browser half — the DOM walk and the four mutations — is in semantics-probe.spec.ts.
import { describe, expect, it } from "vitest";
import { SEMANTICS_RULE_ID, semanticsFinding } from "../../e2e/support/semantics-load";

describe("semanticsFinding()", () => {
  it("returns null on a clean route", () => {
    expect(semanticsFinding("/", [])).toBeNull();
  });

  it("names the route, the count and the rule id", () => {
    const finding = semanticsFinding("/faq", ["h1 count = 2", "no <main> landmark"]);
    expect(finding).toContain("/faq");
    expect(finding).toContain("2 semantic defect(s)");
    expect(finding).toContain(SEMANTICS_RULE_ID);
  });

  it("carries every defect, so the finding says what to go and look at", () => {
    const finding = semanticsFinding("/about", ["heading jump h2->h4", "unnamed <input> name=q"]);
    expect(finding).toContain("heading jump h2->h4");
    expect(finding).toContain("unnamed <input> name=q");
  });

  it("the rule id says where the law lives — the source unit, not a register entry that does not exist", () => {
    // semantics.spec.ts carries no taste-rule tag and taste-register.ts holds no semantic-structure
    // entry; the id points at O160 instead. If this sweep ever joins the register, this pin is the
    // reminder to point the id there.
    expect(SEMANTICS_RULE_ID).toContain("O160");
  });
});
