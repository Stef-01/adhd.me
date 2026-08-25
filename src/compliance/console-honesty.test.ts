// AR30: the console register's entry laws, enforced in `pnpm verify` rather than only at e2e
// time. The e2e half (e2e/console-honesty.spec.ts) checks the register against what the screens
// actually render, both directions; this half checks each entry is one the register's own header
// permits — an exact console path, a rule the professional audience actually answers to, and the
// O189 data-vs-copy argument present and argued rather than gestured at.

import { describe, expect, it } from "vitest";
import { CONSOLE_ACCEPTED_FINDINGS } from "./console-honesty";
import { rulesFor } from "./public-surfaces";
import { LANDING_RULES } from "./landing";
import { discoverSurfaces } from "./surfaces";

const CONSOLE_PATHS = new Set(
  discoverSurfaces("app")
    .filter((s) => s.kind === "page")
    .map((s) => s.path)
    .filter((p) => p.startsWith("/console") && !p.includes("[")),
);

const PROFESSIONAL_RULES = new Set(rulesFor("professional", LANDING_RULES));

describe("AR30 console honesty register", () => {
  it("every entry names a console screen that exists, a rule the sweep applies, and both arguments", () => {
    for (const entry of CONSOLE_ACCEPTED_FINDINGS) {
      expect(CONSOLE_PATHS.has(entry.path), `${entry.path} is not a console page on disk`).toBe(true);
      expect(
        PROFESSIONAL_RULES.has(entry.rule),
        `${entry.rule} is not a rule the professional sweep applies — an acceptance for it accepts nothing`,
      ).toBe(true);
      expect(entry.why.length).toBeGreaterThan(80);
      // O189's field must carry an argument, not a label. Sixty characters does not prove one,
      // but it refuses "it's data".
      expect(entry.dataVsCopy.length).toBeGreaterThan(60);
      expect(entry.reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
  });

  it("no entry is listed twice — a duplicate acceptance reads as extra review that never happened", () => {
    const keys = CONSOLE_ACCEPTED_FINDINGS.map((e) => `${e.path} ${e.rule} ${e.match}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("the rule set the register is checked against is the marketing subset, not the patient set", () => {
    // Non-vacuous while the register is empty: this is the contract the e2e sweep applies, so a
    // drift in `rulesFor` shows up in verify rather than a Playwright run.
    expect(PROFESSIONAL_RULES.has("no-testimonials")).toBe(true);
    expect(PROFESSIONAL_RULES.has("no-specialist")).toBe(true);
    expect(PROFESSIONAL_RULES.has("no-clinical-claims")).toBe(false);
    expect(PROFESSIONAL_RULES.has("no-condition-targeting")).toBe(false);
  });
});
