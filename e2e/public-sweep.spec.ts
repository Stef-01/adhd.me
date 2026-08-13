// W192 verify gate (e2e half): no clinical claim on any public surface, checked against what the
// pages actually SERVE. The axe half is e2e/a11y.spec.ts, which already scans every path here.
//
// Rendered text rather than source, and the reason is concrete rather than tidy: scanning the
// source of /clinicians reports a `no-ratings` hit on the word "review", which turns out to be the
// identifier `is-reviewed` in a className. A source scan measures the code. Only a rendered scan
// measures what a stranger reads, and the stranger is who the rules are about.

import { expect, test } from "@playwright/test";
import {
  ACCEPTED_FINDINGS,
  PUBLIC_SURFACES,
  STANDING_FLAGS,
  sweepSurface,
  unaccepted,
} from "../src/compliance/public-surfaces";

/** The booking page needs a token, so it is swept through a seeded invitation below. */
const STATIC_SURFACES = PUBLIC_SURFACES.filter((s) => !s.path.includes("["));

test("every public surface serves copy its audience's rules allow", async ({ page }) => {
  test.setTimeout(90_000);
  expect(STATIC_SURFACES.length).toBeGreaterThan(5);
  const seen: ReturnType<typeof sweepSurface> = [];

  for (const surface of STATIC_SURFACES) {
    await page.goto(surface.path);
    await page.waitForLoadState("networkidle");
    const text = await page.locator("body").innerText();
    // Vacuity guard per page: a blank render would satisfy every rule.
    expect(text.length, `${surface.path} rendered nothing`).toBeGreaterThan(200);

    const findings = sweepSurface(surface.path, surface.audience, text);
    expect(
      unaccepted(findings).map((f) => `${f.rule}: "${f.match}"`),
      `${surface.path} (${surface.audience}) serves copy its rules refuse`,
    ).toEqual([]);
    seen.push(...findings);
  }

  // Both directions, W102's shape. An acceptance for a finding the page no longer produces is
  // stale, and a stale acceptance reads as coverage while silently permitting something else.
  for (const accepted of ACCEPTED_FINDINGS) {
    expect(
      seen.some((f) => f.path === accepted.path && f.rule === accepted.rule && f.match === accepted.match),
      `${accepted.path} no longer serves "${accepted.match}" — delete the acceptance rather than leaving it`,
    ).toBe(true);
    expect(accepted.why.length).toBeGreaterThan(80);
    expect(accepted.reviewBy).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  }
});

test("the patient booking page serves no clinical claim either", async ({ page, request }) => {
  const seeded = (await (await request.post("/api/mock/state")).json()) as {
    invitations: Array<{ token: string }>;
  };
  const token = seeded.invitations[0]!.token;

  await page.goto(`/book/${token}`);
  await page.waitForLoadState("networkidle");
  const text = await page.locator("body").innerText();
  expect(text.length).toBeGreaterThan(100);

  // The most patient-facing surface in the product, and the only one reached by somebody who was
  // contacted rather than somebody who went looking — so it gets the full patient rule set.
  expect(
    unaccepted(sweepSurface("/book/[token]", "patient", text)).map((f) => `${f.rule}: "${f.match}"`),
  ).toEqual([]);
});

test("the sweep would notice a violation, so a clean run means something", async ({ page }) => {
  // Non-vacuous end to end: the same function, over text that should fail, on a real page's
  // audience. If this ever passes, the sweep above is decorative.
  await page.goto("/");
  const planted = "We treat diabetes and guarantee better health. Our patients love us. Rated 5/5.";
  const findings = sweepSurface("/", "patient", planted);
  expect(findings.length).toBeGreaterThan(2);
  expect(findings.map((f) => f.rule)).toContain("no-clinical-claims");
});

test("the professional surfaces are the ones with a standing flag on them", async ({ page }) => {
  // /clinicians passes because it is classified professional, NOT because it carries no clinical
  // content — it carries Rotterdam criteria, COCP suitability and metformin titration. The flag is
  // asserted here so a green sweep cannot be read as the stronger claim.
  await page.goto("/clinicians");
  await page.waitForLoadState("networkidle");
  const text = await page.locator("body").innerText();

  expect(sweepSurface("/clinicians", "professional", text)).toEqual([]);
  // And the same text under the patient rules would NOT pass — which is what the classification
  // is doing, stated rather than implied.
  expect(sweepSurface("/clinicians", "patient", text).length).toBeGreaterThan(0);
  expect(STANDING_FLAGS["/clinicians"]).toBeDefined();
});
