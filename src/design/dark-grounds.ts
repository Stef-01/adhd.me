// AR18: theme parity, dark — "as AR17, plus contrast measured in both themes."
//
// CLAIM SCOPE, measured before building: this tree ships exactly one literal theme
// (e2e/support/visual.ts, AR15: "no prefers-color-scheme, no data-theme"), so a TOGGLED dark mode
// cannot be measured — it does not exist, and faking one would be exactly the vacuous-check shape
// this lane exists to refuse. What the tree does ship, and what AR17 did not census, is a small
// family of deliberately INVERTED grounds: dark backgrounds carrying light text on an otherwise
// light-paper site (the codebase's own name for the idea is literal — `--ground`/`--on-ground`,
// defined right beside `--ink`/`--paper` as "the primary button: dark pill, light label"). That
// family is this unit's "dark" — the site's actual second surface, not an unbuilt third theme.
//
// MEASURED 2026-08-25: 7 custom properties resolve under the dark ceiling by luminance, but only 4
// of those 7 are ever used as a `background`/`background-color` (the other 3 — `cv2-ink`, `s-ink`,
// `community-ink` — are foreground-only "ink" colours that happen to be dark, exactly as `--ink`
// itself is; luminance alone cannot tell "used as background" from "used as text", so both halves
// of the census are kept and the second is what actually matters). Those 4 tokens back 18 leaf
// rules across app/globals.css. Every one of the 18 declares its own `color:` in the SAME rule
// (never left to inherit past its dark background, which would be the real bug this exists to
// catch) — so contrast is resolved statically, from source, the same "not sampled by eye" standard
// AR17 set, rather than by walking a rendered page. Ratios measured 13.30–17.48:1, all comfortably
// past the WCAG AA floor with room to spare.

const HEX_KEYWORDS: Readonly<Record<string, string>> = { white: "#ffffff", black: "#000000" };

/** WCAG relative luminance of an sRGB hex colour. The same formula
 * `e2e/support/contrast-load.ts` runs against rendered pixels in the browser — duplicated
 * deliberately (AR9's "one detector" rule is about not running two copies of one runtime
 * measurement; this is a second, source-level measurement with a different job) rather than
 * imported, because that file is browser-evaluated Playwright code with no Node entry point. */
export function relativeLuminance(hex: string): number {
  const n = hex.length === 4 ? hex.slice(1).split("").map((c) => c + c).join("") : hex.slice(1);
  const r = parseInt(n.slice(0, 2), 16);
  const g = parseInt(n.slice(2, 4), 16);
  const b = parseInt(n.slice(4, 6), 16);
  const f = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}

/** WCAG contrast ratio between two sRGB hex colours. */
export function contrastRatio(hexA: string, hexB: string): number {
  const a = relativeLuminance(hexA);
  const b = relativeLuminance(hexB);
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}

/** A ground counts as "dark" below this luminance — an order of magnitude under every measured
 * dark token (0.010–0.016) and an order of magnitude over `--paper`'s own (light) luminance. */
export const DARK_LUMINANCE_CEILING = 0.06;

export type TokenDefinition = { readonly name: string; readonly hex: string };

/** Every `--name: #hex` custom-property definition in a stylesheet. First definition wins per
 * name, matching how the cascade resolves a redefinition at equal specificity. */
export function tokenDefinitions(css: string): TokenDefinition[] {
  const out: TokenDefinition[] = [];
  const seen = new Set<string>();
  for (const m of css.matchAll(/--([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) {
    const name = m[1]!;
    if (seen.has(name)) continue;
    seen.add(name);
    out.push({ name, hex: m[2]! });
  }
  return out;
}

/** Every token definition dark enough to be a "dark ground" candidate, sorted by name. Includes
 * foreground-only "ink" tokens that happen to be dark — `darkGroundSelectors` is what narrows this
 * to the ones actually painted as a background. */
export function darkTokens(css: string): TokenDefinition[] {
  return tokenDefinitions(css)
    .filter((t) => relativeLuminance(t.hex) < DARK_LUMINANCE_CEILING)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** Strips `/* … *\/` comments so brace-depth matching cannot be confused by literal braces
 * inside prose (this file's own comments are full of them). */
function stripComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

export type LeafRule = { readonly selector: string; readonly body: string };

/** Every leaf rule (a selector plus a flat declaration body — no nested braces) in a stylesheet,
 * found by brace-depth matching rather than a line-oriented regex, so a body split across many
 * lines (as every real rule in this file is) is read whole. An at-rule wrapper (`@media`,
 * `@supports`) is opened and recursed into rather than skipped, so nothing inside one goes
 * uncensused; its own selector-like text (`@media (...)`) is discarded, not reported as a rule. */
export function leafRules(css: string): LeafRule[] {
  const out: LeafRule[] = [];
  const walk = (source: string) => {
    let i = 0;
    while (i < source.length) {
      const brace = source.indexOf("{", i);
      if (brace === -1) break;
      let depth = 1;
      let j = brace + 1;
      while (depth > 0 && j < source.length) {
        if (source[j] === "{") depth += 1;
        else if (source[j] === "}") depth -= 1;
        j += 1;
      }
      const selector = source.slice(i, brace).replace(/\s+/g, " ").trim();
      const body = source.slice(brace + 1, j - 1);
      if (body.includes("{")) walk(body);
      else if (selector && !selector.startsWith("@")) out.push({ selector, body });
      i = j;
    }
  };
  walk(stripComments(css));
  return out;
}

/** Declared, MEASURED 2026-08-25 — the 7 dark-by-luminance tokens, pinned exactly (not just a
 * count) so a renamed or redefined token is visible in the diff rather than hidden behind a
 * number that happened not to move. Growth or shrink each re-derive this in the same commit. */
export const DARK_TOKENS_DECLARED: readonly TokenDefinition[] = [
  { name: "community-ink", hex: "#1f221c" },
  { name: "cv2-ground", hex: "#1d2019" },
  { name: "cv2-ink", hex: "#1d2019" },
  { name: "ground", hex: "#191a17" },
  { name: "ink", hex: "#191a17" },
  { name: "s-dark", hex: "#292800" },
  { name: "s-ink", hex: "#1f221c" },
];

export type DarkGroundSelector = { readonly selector: string; readonly token: string };

/** Declared, MEASURED 2026-08-25 and re-derived 2026-08-26 when O192's network added two
 * (`.gp-book`, `.interface-launch-link`) — every leaf-rule selector painting a dark token as its own
 * background, pinned exactly (AR17's shape): a NEW site painting an existing dark token, or a new
 * dark token appearing anywhere, fails until this list is re-derived and read. */
export const DARK_GROUND_SELECTORS_DECLARED: readonly DarkGroundSelector[] = [
  { selector: ".be-save-button", token: "ground" },
  { selector: ".briefing-footer > button", token: "ground" },
  { selector: ".consent-bar", token: "ink" },
  { selector: ".consent-dialog .consent-agree", token: "ink" },
  { selector: ".cv2-action > .cv2-start-cta", token: "cv2-ground" },
  { selector: ".cv2-action > button, .cv2-learning-card > button", token: "cv2-ground" },
  { selector: ".cv2-case-hero", token: "cv2-ground" },
  { selector: ".cv2-coming-tooltip", token: "cv2-ground" },
  { selector: ".cv2-learning-card", token: "cv2-ground" },
  { selector: ".demo-nav-next", token: "ground" },
  { selector: ".gp-book", token: "ground" },
  { selector: ".interface-launch-link", token: "ground" },
  { selector: '.iv-answer[aria-pressed="true"]', token: "ground" },
  { selector: ".join-email-cta:hover", token: "ink" },
  { selector: ".mic-button", token: "ground" },
  { selector: ".notfound-primary", token: "ink" },
  { selector: ".primary-button", token: "ground" },
  { selector: ".skip-link", token: "ink" },
  { selector: ".story-sticky-cta a", token: "ink" },
  { selector: ".story-throughline", token: "s-dark" },
];

/** Every leaf-rule selector that paints one of the given dark tokens as its OWN `background`/
 * `background-color` — the census AR18 pins. Only a token reached that literal way is in scope; a
 * background resolved some other way (inline style, a third-party component) is outside what a
 * source census can see and is not claimed here. */
export function darkGroundSelectors(css: string, tokens: readonly TokenDefinition[]): DarkGroundSelector[] {
  const names = tokens.map((t) => t.name);
  const out: DarkGroundSelector[] = [];
  for (const { selector, body } of leafRules(css)) {
    for (const name of names) {
      if (new RegExp(String.raw`background(-color)?:\s*var\(--${name}\)`).test(body)) {
        out.push({ selector, token: name });
      }
    }
  }
  return out.sort((a, b) => (a.selector === b.selector ? a.token.localeCompare(b.token) : a.selector.localeCompare(b.selector)));
}

export type DarkGroundContrastPair = {
  readonly selector: string;
  readonly token: string;
  readonly backgroundHex: string;
  /** The rule's own `color:` declaration, verbatim (a keyword, a hex literal, or a `var()`). */
  readonly colorDeclaration: string | null;
  /** Resolved to a concrete hex if the declaration was a keyword, a hex literal, or a token this
   * stylesheet itself defines; null if there was no same-rule declaration or it could not be
   * resolved this way (e.g. it names a token defined by something other than a hex literal). */
  readonly foregroundHex: string | null;
  readonly ratio: number | null;
};

/** Resolves a CSS `color:` value to a concrete hex using only what this stylesheet's own token
 * definitions and a small literal-keyword table can answer — no browser, no cascade beyond the
 * one declaration. */
function resolveColorValue(raw: string, tokens: readonly TokenDefinition[]): string | null {
  const value = raw.trim();
  if (HEX_KEYWORDS[value]) return HEX_KEYWORDS[value];
  const hexMatch = value.match(/#[0-9a-fA-F]{3,8}/);
  if (hexMatch) return hexMatch[0];
  const varMatch = value.match(/var\(--([\w-]+)\)/);
  if (varMatch) return tokens.find((t) => t.name === varMatch[1])?.hex ?? null;
  return null;
}

/**
 * For every dark-ground selector, the same-rule `color:` declaration (if any) resolved and
 * measured against its own background — contrast "not sampled by eye" (AR17's own words for the
 * raw-hex ratchet), extended here to the one property that actually determines legibility. A
 * `foregroundHex` of null means this rule left its text colour to inherit past a dark background
 * (a real, checkable defect class) or named something this resolver cannot follow — either way
 * reported, never silently treated as passing.
 */
export function darkGroundContrastPairs(css: string): DarkGroundContrastPair[] {
  const tokens = tokenDefinitions(css);
  const dark = darkTokens(css);
  const selectors = darkGroundSelectors(css, dark);
  const rules = leafRules(css);
  return selectors.map(({ selector, token }) => {
    const rule = rules.find((r) => r.selector === selector && new RegExp(String.raw`background(-color)?:\s*var\(--${token}\)`).test(r.body));
    const backgroundHex = dark.find((t) => t.name === token)!.hex;
    const colorMatch = rule?.body.match(/(?<![\w-])color:\s*([^;]+);/);
    const colorDeclaration = colorMatch ? colorMatch[1]!.trim() : null;
    const foregroundHex = colorDeclaration ? resolveColorValue(colorDeclaration, tokens) : null;
    const ratio = foregroundHex ? contrastRatio(backgroundHex, foregroundHex) : null;
    return { selector, token, backgroundHex, colorDeclaration, foregroundHex, ratio };
  });
}

/** WCAG AA floor — 3:1 for large text (≥24px, or ≥18.66px at bold+), 4.5:1 otherwise. Every
 * pairing this census resolves today uses small button/label text, so the stricter floor applies;
 * exported so a future large-text pairing can be judged correctly rather than by copying 4.5. */
export function wcagFloor(fontSizePx: number, bold: boolean): number {
  const large = fontSizePx >= 24 || (fontSizePx >= 18.66 && bold);
  return large ? 3 : 4.5;
}
