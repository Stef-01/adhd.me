// O160: the structure a screen reader navigates by — heading hierarchy, the `main` landmark, and
// whether every form field has an accessible name. Swept across the public site and the console.
//
// It found nothing, and that is recorded rather than dressed up: this gate holds ground rather
// than fixing a defect. It earns its place because semantic structure is what rots silently as
// pages are edited, and it is invisible to every other sweep already standing — touch, focus,
// overflow and contrast all pass happily on a page with three h1s and an unlabelled input.

import { test, expect } from "@playwright/test";

// O171: the routes are derived from `app/` now, not listed here.
//
// The public list was already complete at 15. The console list held 10 of 28 — eighteen screens
// whose heading structure, landmark and field labelling had never been checked, the largest console
// gap of the six sweeps O168 measured.
//
// AND I HAD TWICE CLASSIFIED THIS SWEEP AS ONE THAT COULD NOT BE SWAPPED MECHANICALLY, on the
// strength of its low coverage number. That was a fact about its route array, not about its probe:
// `PROBE` below is entirely route-independent — one visible h1, no level jump, a `<main>`, a name on
// every visible field. Nothing in it is tuned to a screen. Recorded here because "this one is hard"
// was the reason it waited through two rows.
import { CONSOLE_ROUTES, PUBLIC_ROUTES, revealCollapsedSurfaces } from "./site-routes";
// AR11: the probe itself now lives in `e2e/support/semantics-load.ts`, so the mutation probe in
// `e2e/support/semantics-probe.spec.ts` drives THIS detector rather than a copy. What stays here
// is the sweep's own job: navigation, sign-in, fixture seeding, the route loops and the floors.
import { semanticFindings, semanticsFinding } from "./support/semantics-load";
import { measured } from "./support/measured";
import { derivedFloor } from "./support/floors";
import { seedFixtures } from "./support/fixtures";
import { signInAndOnboard as signIn } from "./support/session";

test.beforeEach(async ({ request }) => { await request.post("/api/mock/console"); });

test("headings, landmarks and field names hold across the site", async ({ page, request }) => {
  // O171: 43 routes with a fonts-ready wait each does not fit the 30s default. O169 found the same
  // latent default in `contrast` and O170 in `touch-floor`; this is the third instance.
  test.setTimeout(300_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const findings: string[] = [];
  let headings = 0, fields = 0;
  const scan = async (route: string) => {
    const res = await page.goto(route);
  await revealCollapsedSurfaces(page);
    if (res && res.status() === 404) return;
    await page.evaluate(() => document.fonts.ready);
    const r = await semanticFindings(page);
    // AR11: the per-route verdict names the route AND the rule id (AR9/AR10's change, third time).
    const finding = semanticsFinding(route, r.out);
    if (finding) findings.push(finding);
    headings += r.headings; fields += r.fields;
  };
  for (const route of PUBLIC_ROUTES) await scan(route);
  await signIn(page);
  // AR8: O174's exact silent-failure shape, still live here until now — five of the eleven
  // practice-dependent fixtures posted with no status check at all, and `credentials`,
  // `capability` and `education` (O174's own three) never posted here, so this sweep has always
  // scanned their unlinked refusal pages while reporting them covered. `seedFixtures` seeds the
  // full set and throws naming any fixture that fails, instead of posting and hoping.
  await seedFixtures(request);
  // `/console/signin` and `/console/onboarding` are visited signed IN, which is a real state for
  // both — signin renders, onboarding redirects to `/console` once a practice exists. A redirect
  // re-probes `/console`, which is harmless here (the probe is idempotent and route-independent)
  // but would be dishonest to count as coverage of onboarding, so it is named rather than implied.
  for (const route of CONSOLE_ROUTES) await scan(route);
  // Non-vacuity, and it is load-bearing: a selector that stopped matching would otherwise report a
  // flawless sweep of nothing. Measured at 152 headings and 101 fields when this was written.
  console.log(`SEMANTICS ${PUBLIC_ROUTES.length + CONSOLE_ROUTES.length} routes, ${headings} headings, ${fields} fields, ${findings.length} findings`);
  // AR6: the two runtime-measured populations (not the route-list-collapse guards below, which
  // are a different check) declared through the shared harness alongside the existing log line.
  measured("semantics.headings", headings);
  measured("semantics.fields", fields);
  // NON-VACUITY, LOAD-BEARING — a selector that stopped matching would otherwise report a flawless
  // sweep of nothing. This guard is the route-list-collapse check (a different thing from the two
  // below): O160 set it at 40 and it stays transcribed, per AR6's note, because a route COUNT this
  // low is itself the failure, not a rate that should track the count.
  expect(PUBLIC_ROUTES.length + CONSOLE_ROUTES.length, "the derived route list collapsed").toBeGreaterThan(40);
  const totalRoutes = PUBLIC_ROUTES.length + CONSOLE_ROUTES.length;
  // AR7: the heading/field floors are derived from the route count instead of transcribed. O170
  // found `touch-floor`'s population floor stale for the same reason: 180/90 were set against 214
  // headings and 108 fields over 45 routes, and would not notice the sweep collapsing back toward
  // the 25-route list they replaced. 4/route and 2/route stay below those observed rates
  // (~4.8 headings/route, ~2.4 fields/route).
  expect(headings, "the heading probe stopped matching").toBeGreaterThan(derivedFloor(totalRoutes, 4));
  // O188: the join form was ~41 of the site's ~113 visible fields; retiring it dropped the
  // measured population to 72 over 45 routes (~1.6/route) and AR7's floor at 2/route fired —
  // correctly, its first fire in anger, in the untested direction (population loss). Re-derived
  // at 1.4/route (floor 63) below the new observed rate, same margin discipline as the rest.
  expect(fields, "the form-field probe stopped matching").toBeGreaterThan(derivedFloor(totalRoutes, 1.4));
  expect(findings, `semantic defects:\n${findings.join("\n")}`).toEqual([]);
});
