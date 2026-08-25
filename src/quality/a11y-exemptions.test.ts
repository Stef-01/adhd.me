import { describe, expect, it } from "vitest";
import { A11Y_EXEMPTION_COUNT, A11Y_EXEMPTIONS, filterExemptViolations } from "./a11y-exemptions";

const violation = (id: string) => ({ id, nodes: [{}] });

describe("filterExemptViolations — proven to go red in every direction (the AR-lane's own law)", () => {
  it("passes an unexempted violation through as a real failure", () => {
    const result = filterExemptViolations("/console/dashboard", [violation("target-size")], []);
    expect(result.unexempted).toEqual([violation("target-size")]);
    expect(result.unusedExemptions).toEqual([]);
  });

  it("filters a violation an exemption names for this exact surface and rule", () => {
    const exemptions = [
      { ruleId: "target-size", surface: "/console/dashboard", reason: "x".repeat(30), reviewBy: "2026-12-01" },
    ];
    const result = filterExemptViolations("/console/dashboard", [violation("target-size")], exemptions);
    expect(result.unexempted).toEqual([]);
    expect(result.unusedExemptions).toEqual([]);
  });

  it("does not let an exemption for a DIFFERENT surface swallow a violation here", () => {
    const exemptions = [
      { ruleId: "target-size", surface: "/console/other", reason: "x".repeat(30), reviewBy: "2026-12-01" },
    ];
    const result = filterExemptViolations("/console/dashboard", [violation("target-size")], exemptions);
    expect(result.unexempted).toEqual([violation("target-size")]);
  });

  it("does not let an exemption for a DIFFERENT rule swallow this violation", () => {
    const exemptions = [
      { ruleId: "color-contrast", surface: "/console/dashboard", reason: "x".repeat(30), reviewBy: "2026-12-01" },
    ];
    const result = filterExemptViolations("/console/dashboard", [violation("target-size")], exemptions);
    expect(result.unexempted).toEqual([violation("target-size")]);
  });

  it("reports an exemption that matched nothing this run as unused — a stale claim, not a free pass", () => {
    const exemptions = [
      { ruleId: "target-size", surface: "/console/dashboard", reason: "x".repeat(30), reviewBy: "2026-12-01" },
    ];
    const result = filterExemptViolations("/console/dashboard", [], exemptions);
    expect(result.unusedExemptions).toEqual(exemptions);
  });

  it("resolves several violations independently — one exempted, one real", () => {
    const exemptions = [
      { ruleId: "target-size", surface: "/finder", reason: "x".repeat(30), reviewBy: "2026-12-01" },
    ];
    const result = filterExemptViolations(
      "/finder",
      [violation("target-size"), violation("color-contrast")],
      exemptions,
    );
    expect(result.unexempted).toEqual([violation("color-contrast")]);
    expect(result.unusedExemptions).toEqual([]);
  });
});

describe("A11Y_EXEMPTIONS — the register itself, honest about today", () => {
  it("is pinned at exactly the count it holds — a silent add or drop must move this number", () => {
    expect(A11Y_EXEMPTIONS.length).toBe(A11Y_EXEMPTION_COUNT);
  });

  it("holds zero entries today — the WCAG 2.2 AA scan (all 47 routes) is genuinely clean", () => {
    expect(A11Y_EXEMPTIONS).toEqual([]);
  });

  it("every entry, whenever one exists, argues its case and names a review date", () => {
    for (const e of A11Y_EXEMPTIONS) {
      expect(e.reason.length, `${e.surface}/${e.ruleId}'s reason`).toBeGreaterThanOrEqual(20);
      expect(e.reviewBy, `${e.surface}/${e.ruleId}'s reviewBy`).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });
});
