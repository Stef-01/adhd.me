// O200: the stylesheet may not style markup that does not exist.
//
// HOW THIS QUESTION GOT ASKED, AND IT WAS NOT BY LOOKING FOR IT. O199 finished by checking whether
// gating hover had broken two reveal-on-hover affordances — `.match-portrait:hover .portrait-nav`
// and `.cv2-coming-grid button:hover .cv2-coming-tooltip`. It had not, and the reason was worse
// than the bug being looked for: NEITHER SELECTOR MATCHES ANY MARKUP. Both style elements the
// application never renders. That was the second unit running to turn up a dead selector while
// looking for something else, and kept-but-unused code is this tree's own named disease
// (O186/O187). 92 of 594 styled classes — 15% — were dead, in 209 rules totalling about a tenth of
// the stylesheet every visitor downloads.
//
// THE CLASSIFIER WAS WRONG TWICE BEFORE IT WAS RIGHT, and the corrections are why this is a module
// rather than a one-off grep:
//
//   * A bare "never appears in source" scan reported 122 of 594. Wrong: a class built as
//     `` `seq-w-${i}` `` is live and never appears as a literal anywhere.
//   * Crediting every `prefix-${` found in the source rescued 46 of those — and most of those
//     prefixes were DATA IDS rather than class names. `iv-${code}` is an interval id,
//     `row-${index}` a record id, `clinician-${i}` an error key. Reading them as className
//     prefixes silently forgave 25 genuinely dead classes.
//
// So a prefix only counts when it appears INSIDE a `className`/`class` value. Nine do.
//
// WHAT THIS CHECK USES, AND THE ONE CRITERION IT DELIBERATELY DOES NOT. The unit confirmed its 92
// against THREE criteria: absent as a source literal, not producible by a className template, and
// never emitted by any built server or client chunk. Only the first two live here, because the
// third needs `.next/` to exist and `pnpm verify` runs the unit suite before the build — a check
// that silently passes when the build output is missing would be this lane's own failure mode
// wearing a stronger claim. The build-output pass is recorded in the ledger as verification, not
// borrowed here as enforcement.

/** Class names the stylesheet styles, e.g. `network-card` from `.network-card:hover span`. */
export function styledClasses(css: string): Set<string> {
  const masked = css.replace(/\/\*[\s\S]*?\*\//g, (m) => " ".repeat(m.length));
  const found = new Set<string>();
  // `[{}]` RATHER THAN `}` ALONE, AND THE DIFFERENCE WAS A BLIND SPOT THAT REPORTED CLEAN. The
  // first version matched a selector only when it followed a closing brace or the start of the
  // file — which skips the FIRST rule inside every `@media` block, because that one follows an
  // opening brace. The census passed on a sheet that still contained dead selectors
  // (`.match-count:hover, .icon-button:hover`, first inside a hover gate), and the deletion pass
  // built on the same pattern had walked straight past them. A media prelude cannot be captured by
  // accident here: it contains `@`, which the selector class excludes.
  for (const m of masked.matchAll(/(^|[{}])([^{}@]+?)\{/g)) {
    for (const c of m[2]!.matchAll(/\.([A-Za-z_][\w-]*)/g)) found.add(c[1]!);
  }
  return found;
}

/**
 * Template prefixes that actually build a class name, e.g. `seq-w-` from
 * ``className={`seq-w-${i}`}``.
 *
 * SCOPED TO A `className` VALUE ON PURPOSE — see this module's header. Every `prefix-${` in the
 * tree is not a class; most are ids, and crediting them forgives dead classes wholesale.
 */
export function classNamePrefixes(source: string): Set<string> {
  const prefixes = new Set<string>();
  const values = [
    ...source.matchAll(/class(?:Name)?\s*=\s*\{?`([^`]*)`/g),
    ...source.matchAll(/class(?:Name)?\s*=\s*\{[^}]*?`([^`]*)`/g),
  ].map((m) => m[1]!);
  for (const value of values) {
    for (const m of value.matchAll(/([A-Za-z_][\w-]*-)\$\{/g)) prefixes.add(m[1]!);
  }
  return prefixes;
}

/**
 * Source with its comments removed, so prose cannot vouch for code.
 *
 * THIS FUNCTION EXISTS BECAUSE THE SCANNER FORGAVE ITSELF. The first run of this module reported 89
 * dead classes where the unit's own measurement had found 92, and the three it lost were
 * `match-portrait`, `portrait-nav` and `cv2-coming-grid` — the very selectors named in THIS FILE's
 * header comment as examples of dead code. Writing the documentation made the classes look alive.
 *
 * It is the same defect O199's scanner had one unit earlier, in the mirror: that one read a CSS
 * comment as a rule, this one read a TypeScript comment as a usage. A scanner that reads prose is
 * not measuring the program.
 */
export function stripComments(source: string): string {
  return source
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/(^|[^:])\/\/[^\n]*/g, "$1 ");
}

/** Styled classes nothing in the application can ever produce. */
export function deadClasses(css: string, source: string): string[] {
  const code = stripComments(source);
  const tokens = new Set(code.match(/[A-Za-z_][\w-]*/g) ?? []);
  const prefixes = classNamePrefixes(code);
  return [...styledClasses(css)]
    .filter((c) => !tokens.has(c))
    .filter((c) => ![...prefixes].some((p) => c.startsWith(p)))
    .sort();
}

/**
 * Classes styled deliberately without appearing in this tree's own source, each with its reason.
 *
 * EMPTY TODAY. Kept as a register rather than a bare zero so a real case — a class applied by a
 * third-party script, or one a future `dangerouslySetInnerHTML` emits — has somewhere to be ARGUED
 * rather than quietly dropped from a count. Same shape as `HOVER_EXCEPTIONS` (O199) and
 * `LEGITIMATELY_EMPTY` (O196): an exception that cannot say why it is correct is a deletion waiting
 * to happen.
 */
export interface DeadCssException {
  className: string;
  why: string;
}

export const DEAD_CSS_EXCEPTIONS: readonly DeadCssException[] = [
  {
    className: "leaflet-control-attribution",
    why: "O235: emitted by Leaflet (node_modules/leaflet) for the OpenStreetMap attribution its licence requires; the stylesheet restyles it into the app's type and colours. The class never appears in this tree's source because the library writes the element.",
  },
];
