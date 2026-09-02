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
    file: "app/brand-mark.tsx",
    sites: 6,
    rationale:
      "O220/O222: the ONE copy of the app-icon art (both icon routes call in), Satori-rendered at build like the OG image. The six sites mirror navigation ink, route, on-route, paper and action tokens in the daylight-wayfinding route tile; the dedup halved the register's declared icon sites from 12 to 6.",
  },
  {
    file: "app/layout.tsx",
    sites: 1,
    rationale:
      "viewport.themeColor is a meta value serialized into HTML — a CSS variable cannot reach it, so the literal is the only way to state it. It must EQUAL --paper's value; the day the palette moves, this literal moves in the same commit or the O157 contrast sweep and the browser chrome disagree about the page.",
  },
  {
    file: "app/manifest.ts",
    sites: 2,
    rationale:
      "O220: theme_color and background_color in the web app manifest — serialized JSON a CSS variable cannot reach, the exact law app/layout.tsx's viewport.themeColor entry states. Both must EQUAL --paper so the standalone window launches on paper, not a white flash; the day the palette moves, these move in the same commit.",
  },
  {
    file: "app/opengraph-image.tsx",
    sites: 6,
    rationale:
      "Rendered server-side to a PNG by Satori — no stylesheet exists at render time, so the six literals mirror paper, ink, muted, route, on-route and action tokens in the daylight-wayfinding share card.",
  },
  {
    file: "app/story-sequence.tsx",
    sites: 9,
    rationale:
      "Inline SVG illustration colours inside the story sequence's device artwork — drawn shapes, not UI rules. Any NEW hex in this file must justify itself as illustration or migrate to tokens.",
  },
];

/** globals.css raw-hex colour values outside `--token:` definitions and comments, measured 2026-08-24. */
/* 82 -> 87: the "One GP" chapter (.story-chapter-country) grounds itself in the
   Acknowledgement-of-Country earth tones — five raw-hex sites (a two-stop gradient, plus the
   heading/pull and prose type). Same precedent as .aoc-band and .story-chapter-tint: Country and
   band colours that deliberately are not palette tokens, so they live as hex in the rule, not
   as `--token:` definitions. Re-derived in the commit that earns it, per the ratchet's law. */
/* 87 -> 91 (O199): FOUR MORE SITES AND NOT ONE NEW RAW HEX. The hover-gate unit split 14 selector
   lists that paired `:hover` with `:focus-visible` — wrapping such a pair whole would delete the
   focus style on touch devices, so the focus half stays ungated and the hover half moves inside
   `@media (hover: hover)`. Four of those rules already carried a raw hex in their declarations
   (`#ffffff`, `#fff`, `#6f1e31`, `#000`), and a split necessarily copies the declarations, so each
   appears twice where it appeared once. Verified as exactly that rather than assumed: the multiset
   difference between the sheet before and after this unit is those four values and nothing else.
   The ratchet measures SITES, and this is the one way the number can rise while the amount of
   untokenised colour in the tree stays identical — recorded here so a future reader does not read
   it as four new hexes somebody authored. Re-derived in the commit that earns it, per the law. */
/* 91 -> 80 (O200): THE RATCHET FELL, WHICH IS THE DIRECTION IT EXISTS TO ENCOURAGE, and it fell
   without a single colour being tokenised. Deleting the 209 rules that styled markup the
   application never renders took eleven raw-hex sites with them — they were untokenised colour on
   screens that do not exist. Re-derived in the commit that earned it, per the ratchet's law; an
   untracked DROP is progress nobody recorded, which this census refuses in the same breath as it
   refuses an untracked rise. */
/* 80 -> 73 (O216, the brand-scheme reskin): THE RATCHET FELL BY SEVEN, all of them colours the
   reskin retired rather than restated. Three went with the Acknowledgement band's own beige strip
   (#f6ecdd, #f3ddbe, #4a3420 — the band now carries the scheme's closing fall from tokens); three
   went with the story header's demo pill moving onto the band as a paper pill (its #fff label is
   var(--ink) now, and its two `color-mix(… #000)` darkening states are var(--on-ground)); one was
   the throughline's rose tint (#e0aeba), now var(--on-band). The three hand-written rose-dark
   stops (#6f1e31) became `color-mix(… 82%, #000)` derived from the accent they darken — a
   site-neutral swap (#6f1e31 out, #000 in), counted as exactly that by the census. Re-derived in
   the commit that earned it, per the ratchet's law. */
/* 71 -> 66 (O232, the craft pass): five raw-hex sites left the stylesheet in one batch — the
   primary button's disabled pair (`#a3a39e` on `#e3e1db`, warm greys stranded from the
   pre-redesign stone palette), the dual input's placeholder (`#9c7b45`) and the two `#744910`
   hover fills on the microphone and the send control. All four are now `color-mix()` from the
   accent or the neutrals they sit in, so a palette change carries them instead of leaving them
   behind — which is exactly what had happened to the disabled pair.

   73 -> 71 (O219, the accent-law pass): the story CTA's #fff label became var(--s-paper) on the
   ink pill, and its hover's color-mix dark stop became var(--s-dark) outright — two more
   untokenised colours retired, none restated. Re-derived in the commit that earned it. */
export const CSS_RAW_HEX_SITES = 66;

/** Raw hex inside `--token:` definitions — where hex belongs. Pinned so a moved definition is noticed. */
/* AR27: 31 -> 38 — the chart's seven colours moved INTO :root definitions, which is the
   direction this census exists to encourage; its two component exceptions deleted above. */
/* 38 -> 44 (O216): +7 for the brand-gradient hues ported from the network deployment
   (--hero-glow through --hero-dusk) — new colour arriving AS token definitions, the only door
   this census wants colour to arrive through — and -1 that was never a definition at all: the
   old story-palette comment's prose contained a literal \`--accent: #8A5A16\` and this line-based
   classifier cannot tell prose citing a definition from a definition, so it had counted a comment
   here since the day it was written. The rewritten comment no longer quotes one. */
export const CSS_TOKEN_DEFINITION_SITES = 44;

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
