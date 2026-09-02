// U14 (R0): the size census register — every number §1 and §2.5 of `docs/ONE-YEAR-BUILD-PLAN.md`
// quote, pinned as a floor the tree may not rise above.
//
// THE FLOOR IS THE NUMBER, WITH NO HEADROOM. Each measure's floor is the newest entry in its
// history; the tree measured above it fails `size-census.test.ts`, and `pnpm verify` runs that
// test. The register is APPEND-ONLY, like `ACCEPTED_DIFFS`: lowering a floor is banking a gain
// (`pnpm census` prints the entry to append); raising one needs a dated reason, because a
// raise is a decision the year plan's ratchet (§2.5) says must be argued, never slipped in.
//
// Beside each floor sits the figure the plan quoted (`PLAN_FIGURES`). The plan was laid on
// 2026-09-02 before the redesign (`b7629e9`) and U1–U13 landed, so the day's floors are above
// several of its figures — `globals.css` most of all. That gap is the honest starting line, not a
// reason to move the plan's numbers: the stale-check in the test holds the plan's text to these
// figures both ways, so the plan's numbers are provably what the tree said on the day.
//
// The reader (`size-census-read.ts`) says exactly what each measure counts; this module never
// reads a file.

import type { Census } from "./size-census-read.ts";

export interface RatchetEntry {
  /** A key `measureTree()` produces. */
  readonly measure: string;
  /** The floor from `on` until a later entry for the same measure. */
  readonly value: number;
  /** ISO date the entry was appended. */
  readonly on: string;
  /** Required when `value` is above the previous entry's; the argument for the raise. */
  readonly reason?: string;
}

/**
 * The figure the plan quotes for a measure, in `docs/ONE-YEAR-BUILD-PLAN.md` §1 or §2.5, as the
 * doc prints it — a stale-check reads it back. Measures the plan left to U14 ("U14 pins", "U14
 * counts") or defined by hand only (`store-modules`: "21 in-memory or file-backed stores" was a
 * hand count; the census counts store modules by name) carry no figure.
 */
export const PLAN_FIGURES: Readonly<Record<string, number>> = {
  "app-files": 119,
  "app-lines": 14407,
  "app-console-pages": 31,
  "actions-files": 13,
  "mock-routes": 14,
  "src-modules": 280,
  "src-lines": 51760,
  "src-reached-modules": 153,
  "src-reached-lines": 29231,
  "src-unreached-modules": 127,
  "src-unreached-lines": 22809,
  "src-test-held-modules": 96,
  "use-client-files": 20,
  "largest-data-file-lines": 1159,
  "css-lines": 6087,
  "css-rule-blocks": 1178,
  "css-styled-classes": 373,
  "classname-attributes": 1654,
  "vitest-files": 298,
  "vitest-lines": 50358,
  "e2e-spec-files": 63,
  "e2e-spec-lines": 7536,
  "e2e-support-lines": 1478,
  "e2e-goto-calls": 252,
  "scripts-lines": 230,
};

const SET_BY_U14 = "2026-09-02";
const SET_BY_O230 = "2026-09-02";
const SET_BY_U15 = "2026-09-02";

/**
 * Append-only. The newest entry per measure is its floor.
 *
 * O230 (the app shell) is the first unit to RAISE floors, and every one of its entries carries the
 * reason the register's law demands. It added a navigation bar, a bottom sheet, their register and
 * their test, and moved two pages; U14's rule is that a raise is argued rather than slipped in, so
 * the argument sits on each entry, in the same commit as the code that spent it.
 */
export const RATCHET: readonly RatchetEntry[] = [
  { measure: "app-files", value: 134, on: SET_BY_U14 },
  { measure: "app-lines", value: 15469, on: SET_BY_U14 },
  { measure: "app-console-pages", value: 31, on: SET_BY_U14 },
  { measure: "app-console-lines", value: 7058, on: SET_BY_U14 },
  { measure: "actions-files", value: 13, on: SET_BY_U14 },
  { measure: "actions-lines", value: 741, on: SET_BY_U14 },
  { measure: "mock-routes", value: 15, on: SET_BY_U14 },
  { measure: "src-modules", value: 295, on: SET_BY_U14 },
  { measure: "src-lines", value: 53492, on: SET_BY_U14 },
  { measure: "src-reached-modules", value: 165, on: SET_BY_U14 },
  { measure: "src-reached-lines", value: 30223, on: SET_BY_U14 },
  { measure: "src-unreached-modules", value: 130, on: SET_BY_U14 },
  { measure: "src-unreached-lines", value: 23269, on: SET_BY_U14 },
  { measure: "src-test-held-modules", value: 97, on: SET_BY_U14 },
  { measure: "src-single-importer-modules", value: 62, on: SET_BY_U14 },
  { measure: "store-modules", value: 15, on: SET_BY_U14 },
  { measure: "use-client-files", value: 27, on: SET_BY_U14 },
  { measure: "largest-file-lines", value: 918, on: SET_BY_U14 },
  { measure: "largest-data-file-lines", value: 1159, on: SET_BY_U14 },
  { measure: "css-lines", value: 7693, on: SET_BY_U14 },
  { measure: "css-rule-blocks", value: 1430, on: SET_BY_U14 },
  { measure: "css-styled-classes", value: 488, on: SET_BY_U14 },
  { measure: "css-dead-classes", value: 0, on: SET_BY_U14 },
  { measure: "classname-attributes", value: 1771, on: SET_BY_U14 },
  { measure: "vitest-files", value: 311, on: SET_BY_U14 },
  { measure: "vitest-lines", value: 52843, on: SET_BY_U14 },
  { measure: "e2e-spec-files", value: 70, on: SET_BY_U14 },
  { measure: "e2e-spec-lines", value: 7542, on: SET_BY_U14 },
  { measure: "e2e-support-lines", value: 2408, on: SET_BY_U14 },
  { measure: "e2e-goto-calls", value: 266, on: SET_BY_U14 },
  { measure: "scripts-lines", value: 663, on: SET_BY_U14 },
  { measure: 'app-files', value: 136, on: SET_BY_O230, reason: "O230's shell: app/app-tabs.tsx, app/sheet.tsx and app/story/page.tsx, less the deleted app/finder/page.tsx." },
  { measure: 'app-lines', value: 15762, on: SET_BY_O230, reason: "O230's shell components and the reasoning in them; the story landing kept every line it had, at a new address." },
  { measure: 'src-modules', value: 296, on: SET_BY_O230, reason: 'O230: src/app-shell/tabs.ts, the tab register the bar reads instead of listing anything.' },
  { measure: 'src-lines', value: 53604, on: SET_BY_O230, reason: "O230's tab register and the register edits the move required (robots, public surfaces, route weights)." },
  { measure: 'src-reached-modules', value: 166, on: SET_BY_O230, reason: 'O230: the tab register is imported by the bar, which every tab route renders — reached, not dormant.' },
  { measure: 'src-reached-lines', value: 30305, on: SET_BY_O230, reason: "O230: as above; the shell's law is in the product's import closure by construction." },
  { measure: 'src-unreached-lines', value: 23299, on: SET_BY_O230, reason: 'O230: incidental — comment lines added to registers the product does not import.' },
  { measure: 'src-single-importer-modules', value: 63, on: SET_BY_O230, reason: "O230: the tab register has one importer today (the bar). U15's simplicity laws are where that shape is judged, not here." },
  { measure: 'use-client-files', value: 29, on: SET_BY_O230, reason: 'O230: the tab bar and the sheet are interactive — a bar that knows the current route and a focus-trapping dialog cannot be server components. U25 (the client boundary to the leaves) is the unit that lowers this.' },
  { measure: 'css-lines', value: 7941, on: SET_BY_O230, reason: 'O230: the tab bar and the sheet, written from the existing tokens with their reasoning beside them; the dead .quiet-link and .finder-home-link rules came out in the same pass.' },
  { measure: 'css-rule-blocks', value: 1460, on: SET_BY_O230, reason: "O230: as css-lines — two new components' worth of rules, minus the three deleted dead ones." },
  { measure: 'css-styled-classes', value: 500, on: SET_BY_O230, reason: 'O230: the classes the bar and the sheet render, each used by markup that exists (the dead-CSS census is green).' },
  { measure: 'classname-attributes', value: 1782, on: SET_BY_O230, reason: "O230: the shell's own markup." },
  { measure: 'vitest-files', value: 312, on: SET_BY_O230, reason: 'O230: src/app-shell/tabs.test.ts, holding the bar to the routes that exist and to the researched shape.' },
  { measure: 'vitest-lines', value: 52938, on: SET_BY_O230, reason: 'O230: as vitest-files, plus the register edits the move required.' },
  { measure: 'e2e-spec-files', value: 71, on: SET_BY_O230, reason: "O230: e2e/app-shell.spec.ts — the front door, the bar, the touch floor and the sheet's dialog behaviour, proven in a browser." },
  { measure: 'e2e-spec-lines', value: 7684, on: SET_BY_O230, reason: 'O230: as e2e-spec-files.' },
  { measure: 'e2e-support-lines', value: 2417, on: SET_BY_O230, reason: 'O230: the real-roster helper walks the new door (a sheet, dismissed with Escape) and the working-truth register moved its root proof.' },
  { measure: 'e2e-goto-calls', value: 275, on: SET_BY_O230, reason: "O230: app-shell.spec.ts walks the app's four tab routes and the redirect; the shell IS four routes." },
  { measure: 'scripts-lines', value: 668, on: SET_BY_O230, reason: "O230: scripts/perf-gate.mts learned the router's own rule — a `(group)` segment is not part of a URL, so the manifest key is stripped of it. Without that the gate reported a budget for `/(app)`, an address nobody can visit, while claiming `/` had vanished." },

  // U15 (R0): the simplicity laws and their registers. Laws, not deletions — the unit names what
  // is wrong and proves each register can fail; U16 and U30 are where the tree gets smaller. Every
  // module it adds is `law` by its own definition, which is why the unreached and test-held counts
  // rise with it: a law the product imported would be a law the product could bend.
  { measure: 'src-modules', value: 299, on: SET_BY_U15, reason: "U15: module-reasons.ts, simplicity.ts and simplicity-read.ts — the register, the three shape laws, and the reader behind them." },
  { measure: 'src-lines', value: 54167, on: SET_BY_U15, reason: "U15: the three modules above, of which module-reasons.ts is 133 one-line entries — one per module the product does not import, each quoting that module's own header." },
  { measure: 'src-unreached-modules', value: 133, on: SET_BY_U15, reason: "U15: its own three modules, unreached by design. A register that judges the product must not be reachable from it; this is the law describing itself correctly, not an exception to it." },
  { measure: 'src-unreached-lines', value: 23862, on: SET_BY_U15, reason: "U15: as src-unreached-modules — the register and its two law modules." },
  { measure: 'src-test-held-modules', value: 99, on: SET_BY_U15, reason: "U15: module-reasons.ts, simplicity.ts and simplicity-read.ts are imported only by simplicity.test.ts, which is what `law` means here (W53's shape: the module decides, the test enforces, the product touches neither). This raise is the one the laws document's Law 4 qualifier exists for, and it applies ONLY to modules tagged `law`." },
  { measure: 'vitest-files', value: 313, on: SET_BY_U15, reason: "U15: simplicity.test.ts — the four laws held to the tree, each with its planted violation." },
  { measure: 'vitest-lines', value: 53158, on: SET_BY_U15, reason: "U15: as vitest-files; the planted-violation tests are the bulk of it, and they are the unit's actual deliverable." },
];

/** The current floor per measure: the last entry wins. */
export function floors(register: readonly RatchetEntry[] = RATCHET): Readonly<Record<string, number>> {
  const out: Record<string, number> = {};
  for (const entry of register) out[entry.measure] = entry.value;
  return out;
}

export interface RegisterFinding {
  readonly kind: "raise-without-reason" | "date-out-of-order" | "bad-date";
  readonly measure: string;
  readonly detail: string;
}

/** The register's own laws: append-only in date order, and a raise carries its reason. */
export function registerFindings(register: readonly RatchetEntry[] = RATCHET): RegisterFinding[] {
  const out: RegisterFinding[] = [];
  const previous = new Map<string, RatchetEntry>();
  for (const entry of register) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(entry.on)) {
      out.push({ kind: "bad-date", measure: entry.measure, detail: `"${entry.on}" is not an ISO date` });
    }
    const before = previous.get(entry.measure);
    if (before !== undefined) {
      if (entry.on < before.on) {
        out.push({ kind: "date-out-of-order", measure: entry.measure, detail: `${entry.on} follows ${before.on}` });
      }
      if (entry.value > before.value && !entry.reason?.trim()) {
        out.push({
          kind: "raise-without-reason",
          measure: entry.measure,
          detail: `${before.value} → ${entry.value} on ${entry.on} with no reason`,
        });
      }
    }
    previous.set(entry.measure, entry);
  }
  return out;
}

export interface CensusVerdict {
  readonly measure: string;
  readonly kind: "over-floor" | "unpinned-measure" | "vanished-measure";
  readonly floor?: number;
  readonly measured?: number;
}

/**
 * The measured tree against the floors, in both directions: a measure above its floor, a measure
 * the register does not pin, a pin naming a measure the reader no longer produces. Under the
 * floor is not a verdict — it is a gain to bank (see `bankable`).
 */
export function sizeCensusVerdicts(measured: Census, register: readonly RatchetEntry[] = RATCHET): CensusVerdict[] {
  const out: CensusVerdict[] = [];
  const floor = floors(register);
  for (const [measure, value] of Object.entries(measured)) {
    const f = floor[measure];
    if (f === undefined) out.push({ measure, kind: "unpinned-measure", measured: value });
    else if (value > f) out.push({ measure, kind: "over-floor", floor: f, measured: value });
  }
  for (const measure of Object.keys(floor)) {
    if (!(measure in measured)) out.push({ measure, kind: "vanished-measure", floor: floor[measure] });
  }
  return out;
}

/** The entries `pnpm census` prints for every measure now under its floor — the gains to bank. */
export function bankable(measured: Census, register: readonly RatchetEntry[] = RATCHET, on: string): RatchetEntry[] {
  const floor = floors(register);
  return Object.entries(measured)
    .filter(([measure, value]) => floor[measure] !== undefined && value < floor[measure]!)
    .map(([measure, value]) => ({ measure, value, on }));
}
