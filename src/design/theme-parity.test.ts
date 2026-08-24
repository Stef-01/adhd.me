import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  COMPONENT_HEX_EXCEPTIONS,
  CSS_RAW_HEX_SITES,
  CSS_TOKEN_DEFINITION_SITES,
  hexSites,
  scanCss,
  scanComponents,
} from "./theme-parity";

const ROOT = path.resolve(__dirname, "../..");

describe("AR17 — theme parity, the raw-hex ratchet", () => {
  /**
   * THE COMPONENT LAW: every file carrying raw hex sits in the exception register at its exact
   * count, both directions — a file with hex and no entry fails (new violation), an entry
   * whose file dropped its hex fails (stale paperwork: delete the entry in the same commit),
   * and a count moving either way fails until re-derived. The failure message carries the
   * sites so the offender is found without re-running the scan by hand.
   */
  it("raw hex in a component is a build failure unless declared with its rationale", () => {
    const sites = scanComponents(ROOT);
    const byFile = new Map<string, number>();
    for (const site of sites) byFile.set(site.file, (byFile.get(site.file) ?? 0) + 1);

    const measured = [...byFile.entries()].map(([file, count]) => ({ file, sites: count })).sort((a, b) => a.file.localeCompare(b.file));
    const declared = COMPONENT_HEX_EXCEPTIONS.map(({ file, sites: count }) => ({ file, sites: count }));

    expect(
      measured,
      `component raw-hex census diverged from COMPONENT_HEX_EXCEPTIONS — sites:\n${sites.map((s) => `${s.file}:${s.line} ${s.hex}`).join("\n")}`,
    ).toEqual(declared);
  });

  it("every exception carries a rationale a reviewer can weigh, and the register is sorted", () => {
    for (const entry of COMPONENT_HEX_EXCEPTIONS) {
      expect(entry.rationale.length).toBeGreaterThanOrEqual(40);
      expect(entry.sites).toBeGreaterThan(0);
    }
    const files = COMPONENT_HEX_EXCEPTIONS.map((entry) => entry.file);
    expect([...files].sort()).toEqual(files);
    expect(new Set(files).size).toBe(files.length);
  });

  /**
   * THE CSS CEILING, pinned exactly rather than as an inequality: growth is a new unattributed
   * raw-hex rule; an untracked DROP is progress nobody recorded, and the ratchet's history is
   * only trustworthy if every movement was conscious — re-derive the constant in the commit
   * that earns it. Token definitions are pinned too, so a palette definition wandering out of
   * `:root` into a rule does not silently swap one bucket for the other.
   */
  it("globals.css raw-hex rules hold at the measured ceiling", () => {
    const census = scanCss("app/globals.css", readFileSync(path.join(ROOT, "app/globals.css"), "utf8"));
    expect(
      census.rules.length,
      `raw-hex colour rules moved (${census.rules.length} vs pinned ${CSS_RAW_HEX_SITES}) — newest sites:\n` +
        census.rules.slice(-8).map((s) => `${s.file}:${s.line} ${s.hex}`).join("\n"),
    ).toBe(CSS_RAW_HEX_SITES);
    expect(census.tokenDefinitions).toBe(CSS_TOKEN_DEFINITION_SITES);
  });

  /** layout.tsx's themeColor literal must equal --paper — the exception's own stated condition. */
  it("the themeColor literal equals the --paper token", () => {
    const css = readFileSync(path.join(ROOT, "app/globals.css"), "utf8");
    const paper = css.match(/--paper:\s*(#[0-9a-fA-F]{3,8})/)?.[1];
    const layout = readFileSync(path.join(ROOT, "app/layout.tsx"), "utf8");
    expect(paper).toBeDefined();
    expect(layout).toContain(`themeColor: "${paper}"`);
  });

  /** Planted-hex direction, driven through the REAL matcher and classifier (the probe rule). */
  it("the scanner sees a planted hex, in a component and in a CSS rule alike", () => {
    expect(hexSites("x.tsx", 'const c = "#ab12cd";')).toEqual([{ file: "x.tsx", line: 1, hex: "#ab12cd" }]);
    const census = scanCss("x.css", ":root { --ink: #191a17; }\n.a { color: #123456; }\n/* #fff in prose */");
    expect(census.tokenDefinitions).toBe(1);
    expect(census.comments).toBe(1);
    expect(census.rules).toEqual([{ file: "x.css", line: 2, hex: "#123456" }]);
  });
});
