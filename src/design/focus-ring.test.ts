// taste-rule: interaction.hover-focus
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMPONENT_SUPPRESSION_SITES,
  CSS_SUPPRESSION_SITES,
  componentSuppressions,
  cssSuppressions,
  walkComponents,
} from "./focus-ring";

const ROOT = path.resolve(__dirname, "../..");

describe("AR23 — outline suppression without a replacement is a build failure", () => {
  it("globals.css declares no outline suppression at all — pinned at zero", () => {
    const sites = cssSuppressions(readFileSync(path.join(ROOT, "app/globals.css"), "utf8"));
    expect(sites, "an outline: none|0 declaration landed in the stylesheet — replace the ring visibly in the same block or do not suppress it").toEqual([]);
    expect(CSS_SUPPRESSION_SITES).toBe(0);
  });

  it("every component suppression pairs its ring in the same class string, at the pinned counts", () => {
    const unreplaced: string[] = [];
    const byFile = new Map<string, number>();
    for (const { file, source } of walkComponents(ROOT)) {
      for (const site of componentSuppressions(source)) {
        byFile.set(file, (byFile.get(file) ?? 0) + 1);
        if (!site.replaced) unreplaced.push(`${file}:${site.line}`);
      }
    }
    expect(unreplaced, "outline-none without a focus ring in the same class string").toEqual([]);
    const measured = [...byFile.entries()].map(([file, sites]) => ({ file, sites })).sort((a, b) => a.file.localeCompare(b.file));
    expect(measured).toEqual([...COMPONENT_SUPPRESSION_SITES]);
  });

  /** Both predicates driven on fixtures — the probe rule at vitest scale. */
  it("the predicates discriminate, in all four directions", () => {
    expect(cssSuppressions(".a { outline: none; }")).toHaveLength(1);
    expect(cssSuppressions("/* never outline:none without a replacement */")).toHaveLength(0);
    expect(componentSuppressions('className="focus:outline-none focus:ring-2"')[0]!.replaced).toBe(true);
    expect(componentSuppressions('className="focus:outline-none"')[0]!.replaced).toBe(false);
  });
});
