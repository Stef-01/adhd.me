// AR18: theme parity, dark. See src/design/dark-grounds.ts's header for the scope: this tree has
// one literal theme, so what gets measured here is the tree's actual dark surface — inverted
// grounds (dark background, light text) — not a toggled mode that would have to be invented to
// exist.
//
// LIKE contrast-load.ts (AR12): NOT a taste-register rule. The register (AR1) holds no contrast
// entry — O157 built contrast as a WCAG gate outside it, and adding a register id is a taste-law
// change (`.claude/skills/adhdme-taste/SKILL.md`), not a loop firing's call to make unprompted.
// This file carries no `taste-rule:` tag for that reason, named rather than left to look like an
// oversight.
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  DARK_GROUND_SELECTORS_DECLARED,
  DARK_LUMINANCE_CEILING,
  DARK_TOKENS_DECLARED,
  darkGroundContrastPairs,
  darkGroundSelectors,
  darkTokens,
  leafRules,
  relativeLuminance,
  tokenDefinitions,
  wcagFloor,
} from "./dark-grounds";

const ROOT = path.resolve(__dirname, "../..");
const css = () => readFileSync(path.join(ROOT, "app/globals.css"), "utf8");

describe("AR18 — theme parity, dark: the site's actual inverted-ground census", () => {
  it("the dark-token census holds at its declared, pinned set", () => {
    const measured = darkTokens(css());
    expect(
      measured,
      `dark-token census diverged — measured:\n${measured.map((t) => `${t.name} ${t.hex}`).join("\n")}`,
    ).toEqual(DARK_TOKENS_DECLARED);
  });

  it("the dark-ground selector census holds at its declared, pinned set", () => {
    const measured = darkGroundSelectors(css(), darkTokens(css()));
    expect(
      measured,
      `dark-ground selector census diverged — measured:\n${measured.map((s) => `${s.selector} -> ${s.token}`).join("\n")}`,
    ).toEqual(DARK_GROUND_SELECTORS_DECLARED);
  });

  it("finds a non-trivial population — guards against a vacuous pass", () => {
    // A stripped-comment step or a brace walker that silently matched nothing would make the
    // equality checks above pass by finding zero on both sides, exactly AR1/AR2's own guard.
    expect(tokenDefinitions(css()).length).toBeGreaterThanOrEqual(30);
    expect(leafRules(css()).length).toBeGreaterThanOrEqual(500);
    expect(darkTokens(css()).length).toBe(DARK_TOKENS_DECLARED.length);
    expect(darkGroundSelectors(css(), darkTokens(css())).length).toBe(DARK_GROUND_SELECTORS_DECLARED.length);
  });

  it(
    "every dark-ground selector resolves its own same-rule foreground and clears the WCAG floor",
    () => {
      const pairs = darkGroundContrastPairs(css());
      expect(pairs.length).toBe(DARK_GROUND_SELECTORS_DECLARED.length);
      const unresolved = pairs.filter((p) => p.foregroundHex === null);
      expect(
        unresolved.map((p) => p.selector),
        "a dark-ground rule left its text colour to inherit past the dark background, or named " +
          "a colour this resolver cannot follow — neither is safe to treat as passing",
      ).toEqual([]);
      const underFloor = pairs.filter((p) => (p.ratio ?? 0) < wcagFloor(13, true));
      expect(
        underFloor.map((p) => `${p.selector}: ${p.ratio?.toFixed(2)}:1`),
        "a dark-ground pairing measured under the WCAG floor",
      ).toEqual([]);
    },
  );

  it("is a non-vacuous check: a dark background with no colour override is caught, not passed", () => {
    const fixture = `
      :root { --fixture-dark: #101010; }
      .fixture-panel { background: var(--fixture-dark); padding: 8px; }
    `;
    const tokens = darkTokens(fixture);
    expect(tokens).toEqual([{ name: "fixture-dark", hex: "#101010" }]);
    const pairs = darkGroundContrastPairs(fixture);
    expect(pairs).toEqual([
      {
        selector: ".fixture-panel",
        token: "fixture-dark",
        backgroundHex: "#101010",
        colorDeclaration: null,
        foregroundHex: null,
        ratio: null,
      },
    ]);
  });

  it("is a non-vacuous check: a real under-floor pairing is caught, not passed", () => {
    const fixture = `
      :root { --fixture-dark: #101010; }
      .fixture-bad { background: var(--fixture-dark); color: #1a1a1a; }
    `;
    const [pair] = darkGroundContrastPairs(fixture);
    expect(pair!.foregroundHex).toBe("#1a1a1a");
    expect(pair!.ratio!).toBeLessThan(wcagFloor(13, true));
  });

  it("a new dark background anywhere is caught by the selector census, not silently skipped", () => {
    const withPlant = css() + "\n.ar18-fixture-plant { background: var(--ground); color: white; }\n";
    const measured = darkGroundSelectors(withPlant, darkTokens(withPlant));
    expect(measured.length).toBe(DARK_GROUND_SELECTORS_DECLARED.length + 1);
    expect(measured).toContainEqual({ selector: ".ar18-fixture-plant", token: "ground" });
  });

  it("a token this dark anywhere is caught by the token census, not silently skipped", () => {
    const withPlant = css().replace(":root {", ":root {\n  --ar18-fixture-dark: #0a0a0a;");
    const measured = darkTokens(withPlant);
    expect(measured.length).toBe(DARK_TOKENS_DECLARED.length + 1);
    expect(measured).toContainEqual({ name: "ar18-fixture-dark", hex: "#0a0a0a" });
  });

  it("relativeLuminance/contrastRatio agree with e2e/support/contrast-load.ts's own known values", () => {
    // Cross-checked against that file's runtime formula rather than re-derived independently:
    // black-on-white and white-on-black are both the WCAG reference maximum, 21:1.
    expect(relativeLuminance("#ffffff")).toBeCloseTo(1, 5);
    expect(relativeLuminance("#000000")).toBeCloseTo(0, 5);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 1);
    expect(contrastRatio("#191a17", "#191a17")).toBeCloseTo(1, 5);
  });

  it("the dark ceiling separates the declared dark tokens from --paper's own light one", () => {
    const paper = tokenDefinitions(css()).find((t) => t.name === "paper");
    expect(paper).toBeDefined();
    expect(relativeLuminance(paper!.hex)).toBeGreaterThan(DARK_LUMINANCE_CEILING);
    for (const t of DARK_TOKENS_DECLARED) expect(relativeLuminance(t.hex)).toBeLessThan(DARK_LUMINANCE_CEILING);
  });

  it("wcagFloor matches O157's large-text branch", () => {
    expect(wcagFloor(13, true)).toBe(4.5);
    expect(wcagFloor(24, false)).toBe(3);
    expect(wcagFloor(19, true)).toBe(3);
    expect(wcagFloor(18, true)).toBe(4.5);
  });
});
