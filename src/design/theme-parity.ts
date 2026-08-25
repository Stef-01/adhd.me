// AR17: theme parity (light) — the raw-hex ratchet.
//
// The taste register's law is "palette tokens only; no raw hex in components", and until this
// unit it was enforced by memory. Measured 2026-08-24: 30 raw-hex sites in app/ components
// across 6 files, and 82 raw-hex colour values in globals.css rules OUTSIDE custom-property
// definitions (31 more live inside `--token:` definitions, which is exactly where hex belongs
// — a palette has to be written down somewhere). Eleven dozen sites cannot be migrated
// honestly in one loop unit, so this is a RATCHET, the AR7 shape: everything measured is
// pinned; a NEW site anywhere fails the suite with its file named; the pinned numbers may
// only move DOWN, re-derived in the same commit that earns the drop.
//
// Component sites are held to a stricter standard than the CSS ceiling: each FILE carrying
// hex must sit in COMPONENT_HEX_EXCEPTIONS with its exact site count and a rationale a
// reviewer can weigh — because "component" is where the taste law draws its line, and an
// exception that cannot say why it exists is a violation with paperwork.

import { readdirSync, readFileSync } from "node:fs";
import path from "node:path";

const HEX = /#[0-9a-fA-F]{3,8}\b/g;

export type ComponentHexException = {
  /** app-relative file path. */
  readonly file: string;
  /** Exact number of raw-hex sites this file is allowed — growth fails, shrink re-derives. */
  readonly sites: number;
  /** Why these are not UI rules in the taste register's sense. */
  readonly rationale: string;
};

export const COMPONENT_HEX_EXCEPTIONS: readonly ComponentHexException[] = [
  {
    file: "app/acknowledgement-of-country.tsx",
    sites: 5,
    rationale:
      "The Acknowledgement of Country artwork: ochre and earth tones that MEAN something in the illustration and deliberately do not participate in the UI palette — retinting the acknowledgement to match the brand would be exactly backwards.",
  },
  {
    file: "app/layout.tsx",
    sites: 1,
    rationale:
      "viewport.themeColor is a meta value serialized into HTML — a CSS variable cannot reach it, so the literal is the only way to state it. It must EQUAL --paper's value; the day the palette moves, this literal moves in the same commit or the O157 contrast sweep and the browser chrome disagree about the page.",
  },
  {
    file: "app/opengraph-image.tsx",
    sites: 3,
    rationale:
      "Rendered server-side to a PNG by Satori — no stylesheet exists at render time, so var(--ink) is not expressible. The literals mirror the palette tokens by eye and by the guidelines sweep's chrome test at the page level.",
  },
  {
    file: "app/story-sequence.tsx",
    sites: 9,
    rationale:
      "Inline SVG illustration colours inside the story sequence's device artwork — drawn shapes, not UI rules. Any NEW hex in this file must justify itself as illustration or migrate to tokens.",
  },
];

/** globals.css raw-hex colour values outside `--token:` definitions and comments, measured 2026-08-24. */
export const CSS_RAW_HEX_SITES = 82;

/** Raw hex inside `--token:` definitions — where hex belongs. Pinned so a moved definition is noticed. */
/* AR27: 31 -> 38 — the chart's seven colours moved INTO :root definitions, which is the
   direction this census exists to encourage; its two component exceptions deleted above. */
export const CSS_TOKEN_DEFINITION_SITES = 38;

export type HexSite = { readonly file: string; readonly line: number; readonly hex: string };

/** Every raw-hex site in the given source text, 1-indexed lines — the one matcher every scan uses. */
export function hexSites(file: string, source: string): HexSite[] {
  const out: HexSite[] = [];
  source.split("\n").forEach((line, index) => {
    for (const match of line.match(HEX) ?? []) out.push({ file, line: index + 1, hex: match });
  });
  return out;
}

/** Walks app/ for component sources (.ts/.tsx, tests excluded) and returns every raw-hex site. */
export function scanComponents(repoRoot: string): HexSite[] {
  const out: HexSite[] = [];
  const walk = (dir: string) => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.tsx?$/.test(entry.name) && !entry.name.includes(".test.") && !entry.name.endsWith(".css")) {
        const rel = path.relative(repoRoot, full).replaceAll(path.sep, "/");
        out.push(...hexSites(rel, readFileSync(full, "utf8")));
      }
    }
  };
  walk(path.join(repoRoot, "app"));
  return out.filter((site) => !site.file.endsWith("globals.css"));
}

export type CssHexCensus = {
  /** Hex inside a `--token: …` definition on the same line. */
  readonly tokenDefinitions: number;
  /** Hex in comment lines — prose citing a value, not a rule. */
  readonly comments: number;
  /** Everything else: a colour-bearing RULE carrying raw hex instead of a token. */
  readonly rules: HexSite[];
};

/** Classifies every raw-hex site in a stylesheet — the census the ceiling pins. */
export function scanCss(file: string, css: string): CssHexCensus {
  let tokenDefinitions = 0;
  let comments = 0;
  const rules: HexSite[] = [];
  css.split("\n").forEach((line, index) => {
    for (const match of line.match(HEX) ?? []) {
      if (new RegExp(String.raw`--[\w-]+\s*:\s*[^;]*` + match).test(line)) tokenDefinitions += 1;
      else if (line.includes("/*") || line.trim().startsWith("*") || line.trim().startsWith("//")) comments += 1;
      else rules.push({ file, line: index + 1, hex: match });
    }
  });
  return { tokenDefinitions, comments, rules };
}
