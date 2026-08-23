// AR4 verify gate: `docs/AESTHETIC-COVERAGE.md` is regenerated in memory and diffed against the
// checked-in file on every run — W207's shape, a document that cannot go stale because staleness
// is a failing test rather than a review finding to notice or miss.

import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { generateCoverageDoc } from "./taste-coverage-doc";
import { ROUTE_COVERAGE_EXEMPTIONS, TASTE_RULES, type TasteRule } from "./taste-register";

const DOC_PATH = path.join(process.cwd(), "docs", "AESTHETIC-COVERAGE.md");
const checkedInDoc = () => readFileSync(DOC_PATH, "utf8");

describe("AR4 the coverage document is generated, and cannot drift from the register unnoticed", () => {
  it("regenerating from the real register produces exactly the checked-in file", () => {
    // The gate itself: call the same generator with the same real data the script
    // (scripts/generate-aesthetic-coverage.mts) calls it with, and diff must be empty.
    expect(generateCoverageDoc()).toBe(checkedInDoc());
  });

  it("is non-vacuous: a mutated register produces a document that disagrees with the checked-in file", () => {
    // Proves the equality check above can actually fail — a generator that silently ignored its
    // input (or a diff that always passed) would make the first test meaningless.
    const withExtraRule: readonly TasteRule[] = [
      ...TASTE_RULES,
      {
        id: "layout.fabricated-for-this-test",
        section: "layout",
        statement: "A rule that does not really exist, added only to prove the diff can fail.",
        incident: "none — test fixture",
        unenforced: "test fixture, not a real gap",
      },
    ];
    expect(generateCoverageDoc(withExtraRule)).not.toBe(checkedInDoc());

    const droppedRule = TASTE_RULES.filter((r) => r.id !== "layout.one-idea");
    expect(generateCoverageDoc(droppedRule)).not.toBe(checkedInDoc());

    const rewordedStatement = TASTE_RULES.map((r) =>
      r.id === "layout.one-idea" ? { ...r, statement: `${r.statement} (reworded for this test)` } : r,
    );
    expect(generateCoverageDoc(rewordedStatement)).not.toBe(checkedInDoc());

    const extraExemption = { ...ROUTE_COVERAGE_EXEMPTIONS, "/made-up-route": "a fixture exemption for this test" };
    expect(generateCoverageDoc(TASTE_RULES, extraExemption)).not.toBe(checkedInDoc());
  });

  it("the summary counts are computed from the register passed in, not the real one by coincidence", () => {
    // Guards the summary line specifically: a generator that hardcoded "22 rules" would pass the
    // equality test above for the wrong reason. Feeding a small fabricated register must move it.
    const small: readonly TasteRule[] = [
      { id: "a", section: "layout", statement: "one", incident: "x", unenforced: "y" },
      {
        id: "b",
        section: "motion",
        statement: "two",
        incident: "x",
        enforcedBy: ["some/file.test.ts :: a test"],
        routeScope: { kind: "not-route-based", reason: "test fixture, over twenty characters long" },
      },
    ];
    const doc = generateCoverageDoc(small, {});
    expect(doc).toContain("**2 rules** across 6 sections");
    expect(doc).toContain("**1 enforced**, **1 unenforced**");
    expect(doc).toContain("**0 route exemptions** declared");
    expect(doc).toContain("None declared.");
  });

  it("renders every real rule id and both enforcement forms somewhere in the checked-in file", () => {
    const doc = checkedInDoc();
    for (const rule of TASTE_RULES) {
      expect(doc, `${rule.id} missing from the generated document`).toContain(`\`${rule.id}\``);
    }
    expect(doc).toContain("**Enforced by:**");
    expect(doc).toContain("**Unenforced:**");
  });

  it("names the real declared exemption, so the exemptions section is not silently empty", () => {
    expect(Object.keys(ROUTE_COVERAGE_EXEMPTIONS).length).toBeGreaterThan(0);
    expect(checkedInDoc()).toContain("/console/setup/[step]");
  });
});
