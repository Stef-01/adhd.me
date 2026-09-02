// AR5: the 49 remaining hardcoded route arrays, triaged.
//
// AR3/AR4 fixed how the taste REGISTER names the routes it covers. This is the other half of the
// premise AR1 measured: only 8 of the tree's 57 (now 58) e2e specs import `e2e/site-routes.ts`'s
// derived list; the other 49 pick their own routes by hand. The plan is explicit that the unit is
// triage, not a fix-everything pass: classify each spec as (a) a sweep that should read the derived
// list, (b) a feature test rightly pinned to one route, or (c) a stale array nobody noticed.
//
// MEASURED, NOT SAMPLED: every one of the 49 was read (not grepped-and-guessed), and the true shape
// is a fourth outcome the plan's three categories do not name: two specs (`party-to-care.spec.ts`,
// `public-sweep.spec.ts`) already compute their own route list from the filesystem or from
// `src/compliance/public-surfaces.ts` — they hold no hardcoded array at all, just a SECOND
// computation of the same census `e2e/site-routes.ts` now centralises, predating it (`party-to-care`
// cites W138, `public-sweep` cites W192, both older than O168). Forcing them into "should read the
// derived list" would overstate the finding — nothing there is stale — and forcing them into
// "feature test on one route" would hide a real, if minor, duplication risk (`party-to-care.spec.ts`
// reimplements the exact PUBLIC_ROUTES/CONSOLE_ROUTES split inline instead of importing it). Named
// honestly as its own category rather than bent into one of three, per this lane's "report the
// disagreement" law.
//
// THE REAL (a) FINDINGS, THREE OF THEM. `landing.spec.ts`'s "no public page ships hidden content in
// its server-rendered HTML" sweeps 7 of the site's 14 public routes while asserting a claim ("no
// public page") that is currently false as a coverage statement — /about, /examples, /faq, /terms,
// /thanks, /clinicians/join and /privacy/automated-decisions render unswept. `ui-audit.spec.ts`'s
// O24 screenshot capture claims "every prose surface" over the same seven, for the same reason
// (written before /about, /demo, /finder, /terms, /thanks and /clinicians/join existed). And
// `guidelines-sweep.spec.ts`'s founder-word test sweeps 5 public routes under a comment calling
// itself "the site-wide version" — a claim `ownership-disclosure.spec.ts`'s O168-derived
// PUBLIC_ROUTES + CONSOLE_ROUTES sweep already makes true and exhaustive for the same word, so the
// gap here is masked rather than exploitable, but the array is still narrower than its own comment
// says and would be the first place a NEW founder-word regression on an uncovered route slips past.
//
// NO STALE ARRAY FOUND. Every literal route string across all 49 specs was cross-checked against
// the real `app/` tree (`find app -name page.tsx`) — no spec references a route that has moved or
// been removed. `two-practice.spec.ts` and `console.spec.ts` each hold a short, explained array (2-3
// routes) for one specific guard behaviour, not a coverage claim, so they are (b) despite the array
// syntax looking like a sweep at a glance — the plan's own distinction is intent, not shape.
//
// This module is filesystem-free, matching `taste-register.ts`'s AR1 choice: the walk that discovers
// the real spec files and which of them import `./site-routes` lives in the test file, and
// `diffSpecTriage` below takes both as plain data.

export type RouteArrayCategory =
  /** (a) — sweeps a hardcoded subset of routes while making or implying a completeness claim. */
  | "incomplete-sweep"
  /** (b) — deliberately scoped to one route or a small, explained, named set; not a coverage claim. */
  | "single-route-feature"
  /** (c) — the array's content no longer matches reality (a moved or removed route). */
  | "stale"
  /** Not in the plan's three categories: already computes its own route list, just not via `e2e/site-routes.ts`. */
  | "independently-derived";

export interface SpecTriage {
  /** File name under `e2e/`, e.g. `"landing.spec.ts"`. */
  file: string;
  category: RouteArrayCategory;
  /** The specific route(s) this spec's array/goto calls actually name. */
  routes: readonly string[];
  reason: string;
}

/**
 * Every spec that does not import `e2e/site-routes.ts` — 49 of them when this was first measured
 * on 2026-08-23, 50 since O192 added `network.spec.ts` and 51 since O197 added `mission.spec.ts`. The number is deliberately not pinned
 * here: `diffSpecTriage` compares this list against the real filesystem in both directions, so a
 * transcribed count would be a second, weaker claim that could only go stale.
 * Read in full before classifying, not inferred from an import check alone — `diffSpecTriage`'s
 * test enforces that this list and the real filesystem stay exactly the same set.
 */
export const SPEC_TRIAGE: readonly SpecTriage[] = [
  {
    file: "landing.spec.ts",
    category: "incomplete-sweep",
    routes: ["/", "/approach", "/finder", "/practices", "/clinicians", "/privacy", "/demo"],
    reason:
      'the "no public page ships hidden content" test sweeps 7 of 14 public routes while its own ' +
      "name claims all of them; /about, /examples, /faq, /terms, /thanks, /clinicians/join and " +
      "/privacy/automated-decisions render unswept for this specific check.",
  },
  {
    file: "ui-audit.spec.ts",
    category: "incomplete-sweep",
    routes: ["/", "/approach", "/practices", "/clinicians", "/faq", "/examples", "/privacy"],
    reason:
      'the O24 mobile screenshot capture is commented "every prose surface" but its PAGES array ' +
      "predates /about, /demo, /finder, /terms, /thanks and /clinicians/join; no assertion depends " +
      "on completeness (it only writes files), so the cost of the gap is an incomplete design record.",
  },
  {
    file: "guidelines-sweep.spec.ts",
    category: "incomplete-sweep",
    routes: ["/", "/finder", "/approach", "/clinicians", "/practices"],
    reason:
      'the founder-word test sweeps 5 public routes under a comment calling itself "the site-wide ' +
      'version"; the same word is already swept exhaustively over every public+console route by ' +
      "ownership-disclosure.spec.ts's O168-derived PUBLIC_ROUTES+CONSOLE_ROUTES sweep, so this gap " +
      "is masked today but the array is narrower than its own comment claims. The file's OTHER " +
      'array (["/finder", "/", "/approach"], the wordmark test) is single-route-feature-shaped — ' +
      "deliberately scoped, no completeness claim — and is not what earns this file its category.",
  },
  {
    file: "party-to-care.spec.ts",
    category: "independently-derived",
    routes: [],
    reason:
      "computes its own route list via discoverSurfaces(\"app\") directly (W138, predates " +
      "e2e/site-routes.ts) and re-derives the PUBLIC_ROUTES/CONSOLE_ROUTES split inline rather than " +
      "importing it — not a hardcoded array, but a second independent computation of the same " +
      "census, the M1/O183 shape applied to route derivation itself.",
  },
  {
    file: "public-sweep.spec.ts",
    category: "independently-derived",
    routes: [],
    reason:
      "sweeps PUBLIC_SURFACES from src/compliance/public-surfaces.ts (W192), a filesystem-pinned " +
      "register distinct from e2e/site-routes.ts and older than it — genuinely derived, not stale, " +
      "and serving a different purpose (audience-tagged compliance surfaces) so not a duplicate to " +
      "collapse into the census, only a second source worth knowing about.",
  },
  {
    file: "console.spec.ts",
    category: "single-route-feature",
    routes: ["/console", "/console/onboarding", "/console/rules"],
    reason: "the signed-out-redirect test checks 3 named guard routes, not a coverage sweep.",
  },
  {
    file: "two-practice.spec.ts",
    category: "single-route-feature",
    routes: ["/console", "/console/rules", "/console/verticals"],
    reason:
      "the cross-tenant guard test visits 3 named practice-scoped routes; its own comment explains " +
      "why /console/dashboard is deliberately excluded (it renders a simulation, not practice data).",
  },
  { file: "allocation-console.spec.ts", category: "single-route-feature", routes: ["/console/allocation"], reason: "single console feature under test." },
  { file: "applications.spec.ts", category: "single-route-feature", routes: ["/console/applications", "/clinicians/join"], reason: "one console feature plus the public form it reviews." },
  { file: "booking.spec.ts", category: "single-route-feature", routes: ["/book/[token]"], reason: "the dynamic booking route, excluded from the static derived list by design (DYNAMIC_ROUTE_PLAN) and swept here instead." },
  { file: "capability.spec.ts", category: "single-route-feature", routes: ["/console/capability"], reason: "single console feature under test." },
  { file: "capacity-console.spec.ts", category: "single-route-feature", routes: ["/console/capacity"], reason: "single console feature under test." },
  { file: "case-mix.spec.ts", category: "single-route-feature", routes: ["/console/case-mix"], reason: "single console feature under test." },
  { file: "compare.spec.ts", category: "single-route-feature", routes: ["/finder"], reason: "single patient feature under test." },
  { file: "complaints.spec.ts", category: "single-route-feature", routes: ["/console/complaints", "/book/[token]"], reason: "one console feature plus the patient-side page it concerns." },
  { file: "analytics.spec.ts", category: "single-route-feature", routes: ["/", "/privacy"], reason: "U13: the measurement tag behind the agreement — nothing requested before Agree on the landing, one loader after, and on /privacy the withdraw control stops it and brings the bar back. Two named routes for one consent feature, not a coverage sweep." },
  { file: "consent.spec.ts", category: "single-route-feature", routes: ["/", "/finder"], reason: "two named routes for one consent-banner feature." },
  { file: "console-provenance.spec.ts", category: "single-route-feature", routes: ["/console/matching"], reason: "single console feature under test." },
  { file: "credentials.spec.ts", category: "single-route-feature", routes: ["/console/credentials"], reason: "single console feature under test." },
  { file: "dashboard.spec.ts", category: "single-route-feature", routes: ["/console/dashboard"], reason: "single console feature under test." },
  { file: "demo.spec.ts", category: "single-route-feature", routes: ["/demo", "/console/ops"], reason: "the demo walkthrough plus the console screen it drives." },
  { file: "education.spec.ts", category: "single-route-feature", routes: ["/console/education"], reason: "single console feature under test." },
  { file: "error-boundary.spec.ts", category: "single-route-feature", routes: ["/api/mock/fault/[kind]"], reason: "U3: the fault fixture throws while Next renders it, so the spec can reach the route error boundary in a real browser and hold it to its copy and its two doors; the other kind is a 404. One route, by design." },
  { file: "reporter.spec.ts", category: "single-route-feature", routes: ["/api/health", "/api/mock/fault/[kind]", "/api/mock/reports", "/api/vitals", "/api/csp-report"], reason: "U4: the health endpoint's shape, then the reporter seam proven end to end — the fault fixture throws, `/api/mock/reports` shows the server-error report arrived with the route and no query string, a Web Vital beacon and a policy-violation document each arrive as their own kinds. Named operations surfaces, not a coverage sweep." },
  { file: "finder-a11y.spec.ts", category: "single-route-feature", routes: ["/finder"], reason: "U9: focus, the one live line and the microphone toggle after every stage transition, and axe on all eight stages — the route sweep in a11y.spec.ts reaches the welcome screen only. One route, by design." },
  { file: "finder-flow.spec.ts", category: "single-route-feature", routes: ["/finder"], reason: "the finder journey, one route, many client-state steps." },
  { file: "finder-history.spec.ts", category: "single-route-feature", routes: ["/finder"], reason: "U8: the finder's stages as history entries — the browser's Back, Forward and reload walk the stages on the one route, and the address bar carries the place and never the words. One route, by design." },
  { file: "headers.spec.ts", category: "single-route-feature", routes: ["/", "/finder", "/console/signin", "/faq", "/no-such-route", "/console"], reason: "U1: the security headers are mounted on `/:path*` by one config entry (headers.test.ts pins the source), so the spec reads them off five deliberately different responses — the landing, the finder, a console route, a prose page and a 404 that no derived list can name — and proves the CSP (enforced since U13) quiet on `/`, `/finder` and the console shell. Named surfaces, not a coverage sweep." },
  { file: "interest.spec.ts", category: "single-route-feature", routes: ["/console/interest"], reason: "single console feature under test." },
  { file: "interop-console.spec.ts", category: "single-route-feature", routes: ["/console/interop"], reason: "single console feature under test." },
  { file: "interview.spec.ts", category: "single-route-feature", routes: ["/console/interview", "/console/matching"], reason: "two related console features in one interview-to-matching flow." },
  { file: "join-page.spec.ts", category: "single-route-feature", routes: ["/clinicians/join"], reason: "single public feature under test — O188 retired the form (and join-form/join-hero.spec with it); this pins the email invitation and the form's absence." },
  { file: "matching-verification.spec.ts", category: "single-route-feature", routes: ["/finder"], reason: "single patient feature under test." },
  { file: "mock-fixtures.spec.ts", category: "single-route-feature", routes: ["/console/credentials"], reason: "fixture-liveness probe (O174) on one console screen." },
  { file: "ops.spec.ts", category: "single-route-feature", routes: ["/console/ops"], reason: "single console feature under test." },
  { file: "outcomes.spec.ts", category: "single-route-feature", routes: ["/console/outcomes"], reason: "single console feature under test." },
  { file: "outreach.spec.ts", category: "single-route-feature", routes: ["/console/outreach"], reason: "single console feature under test." },
  { file: "pathways.spec.ts", category: "single-route-feature", routes: ["/console/pathways"], reason: "single console feature under test." },
  { file: "preferences.spec.ts", category: "single-route-feature", routes: ["/book/[token]"], reason: "single patient-side feature under test." },
  { file: "privacy.spec.ts", category: "single-route-feature", routes: ["/console", "/book/[token]", "/console/privacy", "/privacy", "/privacy/automated-decisions"], reason: "five named routes for the privacy feature across patient, console and public surfaces — each named for a reason, not a sweep." },
  { file: "profile-accent.spec.ts", category: "single-route-feature", routes: ["/finder"], reason: "single patient feature under test." },
  { file: "profile-layout.spec.ts", category: "single-route-feature", routes: ["/finder"], reason: "single patient feature under test." },
  { file: "profile-sweep.spec.ts", category: "single-route-feature", routes: ["/finder"], reason: "sweeps every REAL clinician's profile, not every route — one route, many clinicians." },
  { file: "referrals.spec.ts", category: "single-route-feature", routes: ["/console/referrals"], reason: "single console feature under test." },
  { file: "registers.spec.ts", category: "single-route-feature", routes: ["/console/registers"], reason: "single console feature under test." },
  { file: "reporting.spec.ts", category: "single-route-feature", routes: ["/console/reporting"], reason: "single console feature under test." },
  { file: "robots.spec.ts", category: "single-route-feature", routes: ["/finder", "/examples", "/demo", "/thanks", "/faq", "/robots.txt", "/sitemap.xml"], reason: "U7: the routes the crawler register hides, read from the register itself rather than typed here, plus robots.txt, the sitemap and one public page as the control; the both-directions sweep over every census path is robots.test.ts's, in source." },
  { file: "responses-console.spec.ts", category: "single-route-feature", routes: ["/console/responses"], reason: "single console feature under test." },
  { file: "results.spec.ts", category: "single-route-feature", routes: ["/console/results"], reason: "single console feature under test." },
  { file: "roi.spec.ts", category: "single-route-feature", routes: ["/console/roi"], reason: "single console feature under test." },
  { file: "setup.spec.ts", category: "single-route-feature", routes: ["/console/setup/[step]"], reason: "the dynamic setup wizard, walked through its own steps (practice, review)." },
  { file: "telehealth.spec.ts", category: "single-route-feature", routes: ["/book/[token]"], reason: "single patient-side feature under test." },
  { file: "told.spec.ts", category: "single-route-feature", routes: ["/console/matching"], reason: "single console feature under test." },
  { file: "usefulness.spec.ts", category: "single-route-feature", routes: ["/console/usefulness"], reason: "single console feature under test." },
  { file: "verticals.spec.ts", category: "single-route-feature", routes: ["/console/verticals"], reason: "single console feature under test." },
  { file: "voice.spec.ts", category: "single-route-feature", routes: ["/finder"], reason: "single patient feature under test." },
];

/**
 * Category (a): the actual work queue. Pinned so a change can only be deliberate — O177's rule
 * that a queue must distinguish "not done" from "decided" applies here exactly as it did to AR2's
 * `UNENFORCED_COUNT`. Falling requires someone to have actually fixed a sweep; rising requires
 * someone to have found a new one and said so, not for the count to drift unnoticed either way.
 */
export const INCOMPLETE_SWEEP_COUNT = 3;

export interface SpecTriageDiff {
  /** Spec needing triage (does not import the derived list) but absent from SPEC_TRIAGE. */
  missing: string[];
  /** In SPEC_TRIAGE but the file no longer exists, or now imports the derived list itself. */
  stale: string[];
  /** The same file triaged more than once. */
  duplicate: string[];
}

/**
 * Both directions, AR1's shape applied to specs instead of taste rules: every spec that does not
 * import the derived route list must be triaged exactly once, and a triage entry for a spec that
 * now imports it (fixed) or no longer exists (deleted) is stale and must be removed, not left to
 * describe a file that has moved on.
 */
export function diffSpecTriage(
  specFiles: readonly string[],
  derivedListUsers: ReadonlySet<string>,
  triage: readonly SpecTriage[] = SPEC_TRIAGE,
): SpecTriageDiff {
  const specSet = new Set(specFiles);
  const needsTriage = specFiles.filter((f) => !derivedListUsers.has(f));
  const triagedFiles = triage.map((t) => t.file);
  const triagedSet = new Set(triagedFiles);

  const missing = needsTriage.filter((f) => !triagedSet.has(f)).sort();
  const stale = triagedFiles.filter((f) => derivedListUsers.has(f) || !specSet.has(f)).sort();

  const seen = new Set<string>();
  const duplicate: string[] = [];
  for (const f of triagedFiles) {
    if (seen.has(f)) duplicate.push(f);
    seen.add(f);
  }

  return { missing, stale, duplicate: duplicate.sort() };
}
