import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMPONENT_PX_TYPE_EXCEPTIONS,
  CSS_PX_TYPE_FLOOR,
  DECLARED_FONT_STACKS,
  TABULAR_SITES,
  cssPxTypeCount,
  fontFamilyStacks,
  readGlobalsCss,
  selectorHasTabularNums,
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

  it("every font stack the stylesheet names is one this tree actually loads", () => {
    // O192. Eight declarations named an undefined CSS variable — `var(--font-newsreader)` and one
    // older `var(--font-display)` — and an undefined var in a font stack does not fail, it falls
    // through. The next name, bare `Newsreader`, is not installed either (fontsource registers the
    // family as "Newsreader Variable"), so those headings had been rendering in Georgia while the
    // source said serif. `type.serif-display` is a law about WHICH FACE carries a statement, and a
    // stack that cannot reach that face breaks it no matter what the declaration claims.
    const declared = new Set(DECLARED_FONT_STACKS);
    const stacks = fontFamilyStacks(css);
    expect(stacks.length, "no font-family in the stylesheet — this census went vacuous").toBeGreaterThan(20);
    const unknown = [...new Set(stacks)].filter((stack) => !declared.has(stack));
    expect(unknown, "font stacks nobody declared — check each resolves before adding it").toEqual([]);
    // The other direction: a declared stack nothing uses is a register describing the past.
    const used = new Set(stacks);
    expect(
      DECLARED_FONT_STACKS.filter((stack) => !used.has(stack)),
      "declared stacks the stylesheet no longer names — delete them",
    ).toEqual([]);
  });

  it("the font-stack census would catch the defect that produced it", () => {
    // Non-vacuity by fixture: the exact shape O192 found must be reported, and a valid stack
    // must not be.
    expect(fontFamilyStacks(".a { font-family: var(--font-newsreader), Newsreader, Georgia, serif; }")).toEqual([
      "var(--font-newsreader), Newsreader, Georgia, serif",
    ]);
    expect(
      fontFamilyStacks(".a { font-family: var(--font-newsreader), serif; }").every((s) =>
        DECLARED_FONT_STACKS.includes(s),
      ),
    ).toBe(false);
    expect(fontFamilyStacks('.a { font-family: "Inter Variable", Inter, system-ui, sans-serif; }')).toEqual([
      DECLARED_FONT_STACKS[1]!,
    ]);
  });

  /** Both predicates driven on fixtures — the probe rule at vitest scale. */
  it("the predicates discriminate", () => {
    expect(cssPxTypeCount(".a { font-size: 14px; }")).toBe(1);
    expect(cssPxTypeCount(".a { font-size: 0.875rem; }")).toBe(0);
    expect(selectorHasTabularNums(".n { font-variant-numeric: tabular-nums; }", ".n")).toBe(true);
    expect(selectorHasTabularNums(".n { color: red; }", ".n")).toBe(false);
  });
});
