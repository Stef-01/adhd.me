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
const SET_BY_O231 = "2026-09-02";
const SET_BY_O232 = "2026-09-02";
const SET_BY_O233 = "2026-09-02";
const SET_BY_O234 = "2026-09-02";
const SET_BY_O235 = "2026-09-02";
const SET_BY_O236 = "2026-09-02";
const SET_BY_O239 = "2026-09-02";
const SET_BY_O240 = "2026-09-02";
const SET_BY_O242 = "2026-09-02";

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

  // O231 (founder-directed): demo-day readiness — the booking dead-end removed so the journey
  // completes, the example-profile labels off the finder surfaces, the monogram designed rather
  // than defaulted, and one truthful roster note on /story. Net of four deleted CSS rules and a
  // deleted component, the tree is larger by the reasoning that records what changed and why.
  { measure: 'app-lines', value: 15801, on: SET_BY_O231, reason: "O231: the roster note on /story, the booking screen's terminal block, and the comments recording which of the seven synthetic-roster defences moved and which stayed — the label went, the structure did not, and a future reader needs that distinction at the point of the change." },
  { measure: 'src-lines', value: 54200, on: SET_BY_O231, reason: "O231: the amended founder decision quoted in full in founder-gates.ts, and the booking note's own account of the line the unit holds (no generated face, no invented number, no fabricated listing)." },
  { measure: 'src-unreached-lines', value: 23900, on: SET_BY_O231, reason: "O231: as src-lines — founder-gates.ts and the simplicity register are both law modules the product does not import." },
  { measure: 'src-reached-lines', value: 30320, on: SET_BY_O231, reason: "O231: synthetic-roster.ts is in the product's import closure (the finder ranks over it), and the booking note's own account of what the unit would not fabricate is the bulk of the addition." },
  { measure: 'css-lines', value: 7962, on: SET_BY_O231, reason: "O231: the monogram's band ramp, the /story roster note and the booking screen's practice block, less the four dead label rules the dead-CSS census required be deleted with their markup." },
  { measure: 'css-rule-blocks', value: 1462, on: SET_BY_O231, reason: "O231: the monogram's ramp, the /story roster note and the booking screen's practice card, less the four dead label rules the dead-CSS census required be deleted alongside their markup." },

  // O232 (founder-directed): the craft pass under adhdme-taste and impeccable. The tree grows by
  // the browser surfaces nobody had themed, one material, and the reasoning recording which of
  // these were defects against the tree's OWN laws rather than matters of taste.
  { measure: 'app-lines', value: 15820, on: SET_BY_O232, reason: "O232: the scenarios screen's heading and the two removed eyebrows carry their reasoning, and shared.tsx names the out-ramp and the press spring once instead of ten times as literals." },
  { measure: 'src-lines', value: 54211, on: SET_BY_O232, reason: "O232: theme-parity.ts records why the raw-hex ceiling FELL from 71 to 66 — four component hex values became color-mix() from the tokens they sit in, which is the ratchet turning the right way and the note is what stops a later unit reading the drop as a measurement error." },
  { measure: 'css-lines', value: 8083, on: SET_BY_O232, reason: "O232: ::selection, caret-color and the scrollbar — the surfaces the browser draws, which shipped as defaults belonging to no design system — plus the tab bar and sheet materials behind an @supports guard, and tabular figures on the four classes that carry numbers." },
  { measure: 'css-rule-blocks', value: 1478, on: SET_BY_O232, reason: "O232: as css-lines; the browser-surface rules and the @supports material block are most of the count." },
  { measure: 'css-styled-classes', value: 502, on: SET_BY_O232, reason: "O232: no new component classes beyond the booking practice card's parts — the pass restyles what exists." },

  // O233 (founder-directed): the information architecture. A bar is for destinations somebody
  // returns to, so it became Find / Profile / Learn; About and Questions moved behind a settings
  // control; /profile is a new route showing what the device holds; the welcome tagline went and
  // the input became the screen.
  { measure: 'app-files', value: 139, on: SET_BY_O233, reason: "O233: app/app-settings.tsx, app/profile-view.tsx and app/profile/page.tsx — the settings sheet and the Profile tab the bar now points at." },
  { measure: 'app-lines', value: 16060, on: SET_BY_O233, reason: "O233: the settings sheet, the Profile tab and its empty state, and the reasoning recording why the bar's membership changed — O230 filled it with the pages the tree had rather than the places a person returns to." },
  { measure: 'src-lines', value: 54260, on: SET_BY_O233, reason: "O233: /profile joined the public-surface, crawler and working-truth registers, and the tab register records what a bar is for." },
  { measure: 'src-reached-lines', value: 30380, on: SET_BY_O233, reason: "O233: as src-lines; the tab register and the robots register are both in the product's closure." },
  { measure: 'css-lines', value: 8260, on: SET_BY_O233, reason: "O233: the compose box at its new size, the settings trigger and rows, and the Profile tab — less the retired welcome-screen trigger the dead-CSS census required be deleted with its markup." },
  { measure: 'css-rule-blocks', value: 1520, on: SET_BY_O233, reason: "O233: as css-lines — the settings rows and the Profile tab are most of the count." },
  { measure: 'css-styled-classes', value: 520, on: SET_BY_O233, reason: "O233: the settings sheet's rows and the Profile tab's facts, actions and empty state." },
  { measure: 'src-unreached-lines', value: 23914, on: SET_BY_O233, reason: "O233: the robots and public-surface registers gained /profile's entry and its reasoning; both are law modules the product does not import." },
  { measure: 'use-client-files', value: 31, on: SET_BY_O233, reason: "O233: app-settings.tsx and profile-view.tsx are interactive — a sheet that traps focus and a view that reads this device's own session cannot be server components. U25 is the unit that lowers this." },
  { measure: 'classname-attributes', value: 1790, on: SET_BY_O233, reason: "O233: the settings rows and the Profile tab's markup." },
  { measure: 'vitest-lines', value: 53159, on: SET_BY_O233, reason: "O233: the tab register's test follows the bar to three destinations and asserts that the three routes which LEFT the bar are now claimed by no tab." },
  { measure: 'e2e-support-lines', value: 2422, on: SET_BY_O233, reason: "O233: the working-truth register gained /profile's proof — the sentence the page renders before any session is read." },
  { measure: 'e2e-spec-lines', value: 7749, on: SET_BY_O233, reason: "O233: app-shell.spec.ts gained four tests — the bar holding three destinations, settings reaching About with no bar on it, the Profile tab showing and forgetting what the device holds, and the welcome screen leading with the question and a box tall enough to be the subject." },
  { measure: 'e2e-goto-calls', value: 280, on: SET_BY_O233, reason: "O233: the new tests walk /profile and the settings route out to /story, which are the two surfaces the unit added and moved." },

  // O234 (founder-directed): the map, the filters and the harmony pass. Results gain a nearby map
  // drawn from the gazetteer (no tile host — the coordinate never leaves the device); /profile
  // gains the person's own filters, held on the device and applied to the roster before ranking;
  // one shell-width token replaces the four widths the app's fixed surfaces used to disagree on.
  { measure: 'app-files', value: 140, on: SET_BY_O234, reason: "O234: app/finder-stages/nearby-map.tsx — the map, as its own stage piece beside the results screen it sits on." },
  { measure: 'app-lines', value: 16467, on: SET_BY_O234, reason: "O234: the map component, the profile's filter controls (switch rows, language chips, distance segments), the results screen's filter strip and its no-results state, and the reasoning at each — why a filter narrows where a sentence orders, and why a pin is a key and not a rank." },
  { measure: 'src-modules', value: 301, on: SET_BY_O234, reason: "O234: src/finder/filters.ts (the device-held filter set and its application) and src/geo/local-map.ts (the map's projection and fit)." },
  { measure: 'src-lines', value: 54607, on: SET_BY_O234, reason: "O234: the two modules above, the two exported nearest-location readers in clinicians.ts the map and the filters share with the ranking, and the two AR24 zero-state classifications." },
  { measure: 'src-reached-modules', value: 168, on: SET_BY_O234, reason: "O234: filters.ts and local-map.ts are both in the product's closure — the finder applies the one and the results screen draws the other." },
  { measure: 'src-reached-lines', value: 30657, on: SET_BY_O234, reason: "O234: as src-reached-modules, plus the clinicians.ts readers." },
  { measure: 'src-unreached-lines', value: 23950, on: SET_BY_O234, reason: "O234: the zero-state register gained the two classifications; it is a law module the product does not import." },
  { measure: 'src-single-importer-modules', value: 64, on: SET_BY_O234, reason: "O234: local-map.ts is imported by the map alone, which is the seam it was cut on — the geometry is pure and node-tested, the SVG is not. filters.ts has two importers (the finder and the profile) and does not count." },
  { measure: 'use-client-files', value: 32, on: SET_BY_O234, reason: "O234: nearby-map.tsx handles taps and keys on its stops; it cannot be a server component. It is rendered only by a client stage already." },
  { measure: 'css-lines', value: 8719, on: SET_BY_O234, reason: "O234: the map, the filter strip, the row keys, the no-results block, the profile's switch rows, chips and segments, and the shell-width block — plus the compose box collapsing to one pill and the welcome screen's one-edge rules, which replace scattered insets rather than add to them." },
  { measure: 'css-rule-blocks', value: 1591, on: SET_BY_O234, reason: "O234: as css-lines; the profile's controls are most of the count." },
  { measure: 'css-styled-classes', value: 555, on: SET_BY_O234, reason: "O234: nearby-*, filter-*, row-key, results-empty-*, me-section/switch/chip/segment — every one with markup, per the dead-CSS census." },
  { measure: 'classname-attributes', value: 1839, on: SET_BY_O234, reason: "O234: the map's SVG parts, the filter strip, the profile's controls." },
  { measure: 'vitest-files', value: 315, on: SET_BY_O234, reason: "O234: filters.test.ts and local-map.test.ts — the model layer, node-tested before any browser saw it." },
  { measure: 'vitest-lines', value: 53416, on: SET_BY_O234, reason: "O234: as vitest-files." },
  { measure: 'e2e-spec-lines', value: 7861, on: SET_BY_O234, reason: "O234: app-shell.spec.ts gained four tests — filters set on the profile narrowing the finder and clearing from results, the map's stops finding their rows, the no-results way out, and the one-shell geometry (notice inside the shell, bar the shell's width, question/box/link on one edge)." },
  { measure: 'e2e-goto-calls', value: 286, on: SET_BY_O234, reason: "O234: the new tests walk /profile and / in both directions, which is the unit's whole claim." },

  // O235 (founder-directed): the map, on a real basemap — Leaflet over OpenStreetMap replaces the
  // O234 SVG. Net of the SVG rules and the layout module that went, the tree grows by the marker
  // and control markup and the reasoning that names what the tile host learns.
  { measure: 'app-lines', value: 16491, on: SET_BY_O235, reason: "O235: the Leaflet map component — markers, the app's own zoom control, the fit, and the reasoning that names what the tile host learns — replacing the SVG one, plus the privacy page's sentence on map tiles and the results screen's client-only import." },
  { measure: 'src-unreached-lines', value: 23971, on: SET_BY_O235, reason: "O235: the two design registers are law modules the product does not import." },
  { measure: 'css-lines', value: 8784, on: SET_BY_O235, reason: "O235: the map frame, the 44px zoom control, the markers and their labels, and Leaflet's attribution restyled — replacing the SVG ring and pin rules the dead-CSS census required be deleted with their markup." },
  { measure: 'css-rule-blocks', value: 1594, on: SET_BY_O235, reason: "O235: as css-lines." },
  { measure: 'e2e-spec-lines', value: 7869, on: SET_BY_O235, reason: "O235: the map test asserts a real basemap — Leaflet's container, the OSM attribution link, 44px zoom controls, markers keyed to rows." },
  { measure: 'src-lines', value: 54568, on: SET_BY_O235 },
  { measure: 'src-reached-lines', value: 30597, on: SET_BY_O235 },
  { measure: 'classname-attributes', value: 1834, on: SET_BY_O235 },
  { measure: 'vitest-lines', value: 53366, on: SET_BY_O235 },
  // O236 (founder-directed): the results screen's search summary and the note-taking filter —
  // the summary card, the AI-scribe fact on every example persona, the three-way filter, and the
  // retired quote/pill/disclosure rules deleted with their markup.
  { measure: 'app-lines', value: 16514, on: SET_BY_O236, reason: "O236: the summary card and the note-taking segment on the profile, less the quote, pill and disclosure markup that went." },
  { measure: 'src-lines', value: 54630, on: SET_BY_O236, reason: "O236: consultRecording on the roster type and every example persona, and the filter's three-way choice with its validation." },
  { measure: 'src-reached-lines', value: 30645, on: SET_BY_O236, reason: "O236: as src-lines — the roster and the filters are in the product's closure." },
  { measure: 'src-unreached-lines', value: 23985, on: SET_BY_O236, reason: "O236: the simplicity register's argued length for the synthetic roster." },
  { measure: 'css-lines', value: 8795, on: SET_BY_O236, reason: "O236: the summary card, the results title, the chip lead — less the retired quote, pill, place-field and disclosure rules." },
  { measure: 'css-rule-blocks', value: 1598, on: SET_BY_O236, reason: "O236: as css-lines." },
  { measure: 'css-styled-classes', value: 560, on: SET_BY_O236, reason: "O236: results-summary(-words/-text/-place), results-title, results-notes, clarify-sub, me-segments-3 — less the four retired classes." },
  { measure: 'classname-attributes', value: 1841, on: SET_BY_O236, reason: "O236: the summary card's markup." },
  { measure: 'vitest-lines', value: 53376, on: SET_BY_O236, reason: "O236: filters.test.ts covers the note-taking choice and refuses an unknown one." },
  // O237–O239 (founder-directed): the results screen reduced to summary, chips, map-behind-a-button
  // and list; the Learn tab rebuilt as three modules with a device record of which are finished; the
  // story sequence and its 170 rules deleted with the page they drew. Net, the stylesheet SHRANK.
  { measure: 'src-modules', value: 303, on: SET_BY_O239, reason: "O239: src/learn/scenes.ts (the story's copy as data, regrouped into modules) and src/learn/progress.ts (which modules this device finished)." },
  { measure: 'src-lines', value: 54866, on: SET_BY_O239, reason: "O239: the scenes moved from app/ into src/ as data, plus the progress record and its validation." },
  { measure: 'src-reached-modules', value: 170, on: SET_BY_O239, reason: "O239: both learn modules are in the product's closure — the Learn tab renders one and writes the other." },
  { measure: 'src-reached-lines', value: 30869, on: SET_BY_O239, reason: "O239: as src-reached-modules." },
  { measure: 'src-single-importer-modules', value: 65, on: SET_BY_O239, reason: "O239: progress.ts is imported by the Learn tab alone, which is the seam it was cut on — node-tested record, React-free." },
  { measure: 'vitest-files', value: 316, on: SET_BY_O239, reason: "O239: progress.test.ts — the modules cover every scene once, and the record refuses what it does not recognise." },
  { measure: 'vitest-lines', value: 53452, on: SET_BY_O239, reason: "O239: as vitest-files." },
  { measure: 'e2e-spec-lines', value: 7885, on: SET_BY_O239, reason: "O237: the place-field tests rewritten to reach a place by link or profile; O238: the map opened by its control." },
  { measure: 'e2e-support-lines', value: 2424, on: SET_BY_O239, reason: "O239: moved by the unit; pinned to the tree as measured." },
  { measure: 'e2e-goto-calls', value: 291, on: SET_BY_O239, reason: "O239: moved by the unit; pinned to the tree as measured." },
  { measure: 'app-lines', value: 15952, on: SET_BY_O239 },
  { measure: 'src-unreached-lines', value: 23997, on: SET_BY_O239, reason: "O239: this register's own O237–O239 entries and the learn progress module's validation; the sequence's deletion banked more than these cost elsewhere." },
  { measure: 'css-lines', value: 8763, on: SET_BY_O239 },
  { measure: 'css-rule-blocks', value: 1488, on: SET_BY_O239 },
  { measure: 'css-styled-classes', value: 493, on: SET_BY_O239 },
  { measure: 'classname-attributes', value: 1764, on: SET_BY_O239 },
  // O240 (founder-directed): the motion pass — the house spring, the travelling tab marker, the
  // map panel unfolding, Learn cards sliding — and the lighter rows and one-line disclaimer.
  { measure: 'app-lines', value: 16015, on: SET_BY_O240, reason: "O240: the tab marker as a shared-layout element, the map panel's AnimatePresence, the Learn module's spring wrappers, and the reasoning at each — every effect gated at the hook." },
  { measure: 'css-lines', value: 8805, on: SET_BY_O240, reason: "O240: the tab marker rule, the row hover lift behind its hover gate, the disclaimer's line, the consent card's entrance keyframe and its reduced-motion equal." },
  { measure: 'css-rule-blocks', value: 1497, on: SET_BY_O240, reason: "O240: as css-lines." },
  { measure: 'css-styled-classes', value: 494, on: SET_BY_O240, reason: "O240: app-tab-marker." },
  { measure: 'classname-attributes', value: 1765, on: SET_BY_O240, reason: "O240: the marker element." },
  { measure: 'src-lines', value: 54876, on: SET_BY_O240, reason: "O240: this register's entries." },
  { measure: 'src-unreached-lines', value: 24007, on: SET_BY_O240, reason: "O240: this register's entries; a law module the product does not import." },
  // O242 (founder-directed): credited stock portraits on the example personas — the register that
  // holds them (source, photographer, licence, file), and the test that refuses anything else.
  { measure: 'app-lines', value: 16018, on: SET_BY_O242, reason: "O242: the portrait's alt says it is a stock portrait standing in for an example profile." },
  { measure: 'src-modules', value: 304, on: SET_BY_O242, reason: "O242: src/demo/portrait-credits.ts — every example portrait's source, photographer, page and licence, and the two personas that keep the monogram, with why." },
  { measure: 'src-lines', value: 54960, on: SET_BY_O242, reason: "O242: the register above and the roster's amended defence." },
  { measure: 'src-reached-modules', value: 171, on: SET_BY_O242, reason: "O242: as src-reached-lines." },
  { measure: 'src-reached-lines', value: 30941, on: SET_BY_O242, reason: "O242: the register is in the product's closure — the roster reads it." },
  { measure: 'src-single-importer-modules', value: 66, on: SET_BY_O242, reason: "O242: portrait-credits.ts is imported by the synthetic roster alone — the seam it was cut on; the test imports it too but tests do not count." },
  { measure: 'vitest-lines', value: 53485, on: SET_BY_O242, reason: "O242: synthetic-roster.test.ts holds every image to the register, the register to the personas, and never to a real clinician." },
  { measure: 'e2e-spec-lines', value: 7886, on: SET_BY_O242, reason: "O242: moved by the portrait register; pinned to the tree as measured." },
  { measure: 'src-unreached-lines', value: 24019, on: SET_BY_O242, reason: "O242: this register's entries." },
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
