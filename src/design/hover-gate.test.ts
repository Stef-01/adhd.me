// O199: the census that makes `interaction.hover-focus`'s hover clause a check rather than a claim.
//
// Both directions, W102's shape: a new ungated rule fails, and an exception describing a selector
// the sheet no longer carries fails too, because a stale exception reads as coverage. Plus the
// mutation probe the AR lane requires of every sweep — the scan is driven on a planted fixture, so
// a clean census cannot mean a broken scanner.
// taste-rule: interaction.hover-focus

import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  HOVER_EXCEPTIONS,
  UNGATED_HOVER_ALLOWED,
  hoverRules,
  ungatedHoverRules,
} from "./hover-gate";

const CSS = () => readFileSync("app/globals.css", "utf8");

describe("O199 every hover style is gated behind a pointer", () => {
  it("lets no hover rule apply on a device that cannot hover", () => {
    const declared = new Set(HOVER_EXCEPTIONS.map((e) => e.selector));
    const offenders = ungatedHoverRules(CSS()).filter((r) => !declared.has(r.selector));
    expect(
      offenders.map((r) => r.selector),
      offenders.length > 0
        ? `these hover styles apply on a device with no pointer. Wrap the rule in ` +
          `@media (hover: hover) IN PLACE (a media query adds no specificity, so the cascade is ` +
          `preserved). If the selector list also carries :focus-visible or :focus-within, SPLIT it ` +
          `instead — wrapping the pair would delete the focus style on touch, which is a worse ` +
          `regression than the rule it fixes.`
        : "",
    ).toHaveLength(UNGATED_HOVER_ALLOWED);
  });

  it("keeps a real population, so a passing census is not an empty one", () => {
    // The failure this lane keeps finding: a sweep that goes quietly green because it stopped
    // measuring anything. If the scanner broke, or the sheet lost its hover styles wholesale, the
    // check above would pass perfectly.
    const rules = hoverRules(CSS());
    // FLOOR LOWERED, AND THE REASON IS RECORDED RATHER THAN THE NUMBER QUIETLY EDITED. It was 40,
    // measured when the tree served both interfaces. Splitting the network onto its own deployment
    // took its hover rules with it, and the population measures 40 exactly — so the old strict
    // `> 40` now fails on a tree that is simply smaller, not less covered. The floor exists to catch
    // a scanner reading nothing, so it is set well below the measurement and left there.
    expect(rules.length, "no hover rules found at all — the scanner is looking at nothing").toBeGreaterThan(30);
    expect(rules.filter((r) => r.gated).length).toBeGreaterThan(30);
  });

  it("classifies a reduced-motion override as legitimately ungated, and still counts it", () => {
    // The distinction that makes this a classifier rather than a grep: a reduced-motion block
    // OVERRIDES an already-gated rule, so nesting it inside a hover gate too would say nothing
    // extra. It must not be reported — and it must not vanish from the population either.
    const rules = hoverRules(CSS());
    const overrides = rules.filter((r) => r.reducedMotionOverride);
    expect(overrides.length, "the reduced-motion hover overrides are gone").toBeGreaterThan(0);
    for (const rule of overrides) {
      expect(ungatedHoverRules(CSS()).map((r) => r.selector)).not.toContain(rule.selector);
    }
  });

  it("declares no exception for a selector the sheet no longer carries", () => {
    // The other direction. An exception describing something that has been renamed or fixed reads
    // as coverage, which is worse than no exception at all.
    const live = new Set(hoverRules(CSS()).map((r) => r.selector));
    for (const entry of HOVER_EXCEPTIONS) {
      expect(live.has(entry.selector), `${entry.selector} is excepted but no longer exists`).toBe(true);
      expect(entry.why.length, `${entry.selector} is excepted without an argument`).toBeGreaterThan(80);
    }
  });

  it("would catch an ungated rule, so a clean census means something", () => {
    // The mutation probe, on a fixture rather than the tree — a scan is only worth its result if it
    // can still find the shape it was built for.
    const planted = `.a:hover { color: red; }\n@media (hover: hover) { .b:hover { color: blue; } }`;
    const found = ungatedHoverRules(planted);
    expect(found.map((r) => r.selector)).toEqual([".a:hover"]);
    expect(hoverRules(planted)).toHaveLength(2);
  });

  it("does not read its own documentation as code", () => {
    // The scan's first version reported 42 ungated rules and one was a SENTENCE inside a comment
    // that quoted a deleted selector. Masking comments is load-bearing, so it is pinned.
    const commented = `/* we used to have .gone:hover here, and it was deleted */\n.a { color: red; }`;
    expect(hoverRules(commented)).toHaveLength(0);
  });
});
