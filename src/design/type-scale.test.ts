import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMPONENT_PX_TYPE_EXCEPTIONS,
  CSS_PX_TYPE_FLOOR,
  cssPxTypeCount,
  readGlobalsCss,
  selectorHasTabularNums,
  TABULAR_SITES,
} from "./type-scale";

const ROOT = path.resolve(__dirname, "../..");

describe("AR21 — type scale from the tokens, asserted rather than remembered", () => {
  const css = readGlobalsCss(ROOT);

  it("the stylesheet holds zero px font-sizes — O60's floor, now a law", () => {
    expect(cssPxTypeCount(css)).toBe(CSS_PX_TYPE_FLOOR);
    expect(CSS_PX_TYPE_FLOOR).toBe(0);
  });

  it("inline px type appears only in the two excepted files, both directions", () => {
    const offenders: string[] = [];
    const excepted = new Set(COMPONENT_PX_TYPE_EXCEPTIONS.map((entry) => entry.file));
    const walk = (dir: string) => {
      for (const entry of require("node:fs").readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full);
        else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.")) {
          const rel = path.relative(ROOT, full).replaceAll(path.sep, "/");
          const source = readFileSync(full, "utf8");
          const has = /fontSize[:=]\s*\{?\s*[0-9]/.test(source) || /font-size:\s*[0-9.]+px/.test(source) || /text-\[[0-9]+px\]/.test(source);
          if (has && !excepted.has(rel)) offenders.push(rel);
          if (!has && excepted.has(rel)) offenders.push(`${rel} (stale exception — delete its entry)`);
        }
      }
    };
    walk(path.join(ROOT, "app"));
    expect(offenders).toEqual([]);
    for (const entry of COMPONENT_PX_TYPE_EXCEPTIONS) expect(entry.why.length).toBeGreaterThanOrEqual(40);
  });

  it("every registered tabular site's rule carries font-variant-numeric: tabular-nums", () => {
    for (const site of TABULAR_SITES) {
      expect(selectorHasTabularNums(css, site.selector), `${site.selector} — ${site.why}`).toBe(true);
      expect(site.why.length).toBeGreaterThanOrEqual(20);
    }
    expect(TABULAR_SITES.length).toBeGreaterThanOrEqual(5);
  });

  /** Both predicates driven on fixtures — the probe rule at vitest scale. */
  it("the predicates discriminate", () => {
    expect(cssPxTypeCount(".a { font-size: 14px; }")).toBe(1);
    expect(cssPxTypeCount(".a { font-size: 0.875rem; }")).toBe(0);
    expect(selectorHasTabularNums(".n { font-variant-numeric: tabular-nums; }", ".n")).toBe(true);
    expect(selectorHasTabularNums(".n { color: red; }", ".n")).toBe(false);
  });
});
