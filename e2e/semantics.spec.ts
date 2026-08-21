// O160: the structure a screen reader navigates by — heading hierarchy, the `main` landmark, and
// whether every form field has an accessible name. Swept across the public site and the console.
//
// It found nothing, and that is recorded rather than dressed up: this gate holds ground rather
// than fixing a defect. It earns its place because semantic structure is what rots silently as
// pages are edited, and it is invisible to every other sweep already standing — touch, focus,
// overflow and contrast all pass happily on a page with three h1s and an unlabelled input.

import { test, expect, type Page } from "@playwright/test";

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
import { CONSOLE_ROUTES, PUBLIC_ROUTES } from "./site-routes";

async function signIn(page: Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("owner@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

const PROBE = () => {
  const out: string[] = [];
  const hs = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
    .filter((h) => { const b = h.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
  const levels = hs.map((h) => Number(h.tagName[1]));
  const h1s = levels.filter((l) => l === 1).length;
  if (h1s !== 1) out.push(`h1 count = ${h1s}`);
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i]! - levels[i - 1]! > 1) {
      out.push(`heading jump h${levels[i - 1]}->h${levels[i]} at "${(hs[i]!.textContent || "").trim().slice(0, 26)}"`);
    }
  }
  if (!document.querySelector("main")) out.push("no <main> landmark");
  let fields = 0;
  for (const el of Array.from(document.querySelectorAll("input:not([type=hidden]),select,textarea"))) {
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    fields += 1;
    const id = el.getAttribute("id");
    const named = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")
      || (id && document.querySelector(`label[for="${id}"]`)) || el.closest("label");
    if (!named) out.push(`unnamed <${el.tagName.toLowerCase()}> name=${el.getAttribute("name") ?? "?"}`);
  }
  return { out, headings: hs.length, fields };
};

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
    if (res && res.status() === 404) return;
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(PROBE);
    for (const f of r.out) findings.push(`${route}: ${f}`);
    headings += r.headings; fields += r.fields;
  };
  for (const route of PUBLIC_ROUTES) await scan(route);
  await signIn(page);
  for (const f of ["referrals", "registers", "usefulness", "ops", "pathways"]) await request.post(`/api/mock/${f}`);
  // `/console/signin` and `/console/onboarding` are visited signed IN, which is a real state for
  // both — signin renders, onboarding redirects to `/console` once a practice exists. A redirect
  // re-probes `/console`, which is harmless here (the probe is idempotent and route-independent)
  // but would be dishonest to count as coverage of onboarding, so it is named rather than implied.
  for (const route of CONSOLE_ROUTES) await scan(route);
  // Non-vacuity, and it is load-bearing: a selector that stopped matching would otherwise report a
  // flawless sweep of nothing. Measured at 152 headings and 101 fields when this was written.
  console.log(`SEMANTICS ${PUBLIC_ROUTES.length + CONSOLE_ROUTES.length} routes, ${headings} headings, ${fields} fields, ${findings.length} findings`);
  // NON-VACUITY, LOAD-BEARING, AND RE-MEASURED — a selector that stopped matching would otherwise
  // report a flawless sweep of nothing. O160 set these at 100/60 against 152 headings and 101 fields
  // over 25 routes. The derived list is 45 routes and draws **214 headings and 108 fields**, so a
  // floor of 100 would no longer notice the sweep collapsing back to roughly the list it replaced.
  // Raised with the observed figures stated beside them, which is the same staleness O170 found in
  // `touch-floor`'s population floor an hour earlier — floors go stale silently whenever the thing
  // they bound grows.
  expect(PUBLIC_ROUTES.length + CONSOLE_ROUTES.length, "the derived route list collapsed").toBeGreaterThan(40);
  expect(headings, "the heading probe stopped matching (observed 214)").toBeGreaterThan(180);
  expect(fields, "the form-field probe stopped matching (observed 108)").toBeGreaterThan(90);
  expect(findings, `semantic defects:\n${findings.join("\n")}`).toEqual([]);
});
