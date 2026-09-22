// The accessibility re-sweep, WCAG 2.1 AA (PRODUCT.md's bar), over everything the app serves: every
// public route at a desktop and a phone width, the finder's eight stages — most of which no URL
// reaches — and every console screen, signed in and seeded so the scan sees a populated page
// rather than a one-paragraph refusal. Derived from the filesystem (`site-routes.ts`) and the
// stage machine (`STAGES`), never listed, so a new screen is swept by existing.
//
// This is a CHECK, not a resurrected gate: there is no exemption register and no verify step. A
// finding is fixed in the same change, and the spec stays so the fix cannot rot back silently.

import { expect } from "@playwright/test";
import { test } from "./support/test";
import { CONSOLE_ROUTES, DYNAMIC_ROUTE_PLAN, PUBLIC_ROUTES, staleDynamicPlanEntries, undeclaredDynamicRoutes } from "./site-routes";
import { expectNoViolations } from "./support/a11y";
import { installFakeSpeech } from "./support/fake-speech";
import { STAGES, openStage } from "./support/finder-stages";
import { MANAGER_EMAIL, signIn, signInAndOnboard } from "./support/session";

const PHONE = { width: 390, height: 844 };

test.describe("public routes", () => {
  test.beforeEach(async ({ page }) => {
    // Before the first paint: a framework reads this once at mount. The scan sees what a
    // reduced-motion reader sees, which is a state the product ships.
    await page.emulateMedia({ reducedMotion: "reduce" });
  });

  for (const viewport of [null, PHONE] as const) {
    test(`pass WCAG 2.1 AA${viewport ? " at a phone width" : ""}`, async ({ page }) => {
      test.setTimeout(240_000);
      if (viewport) await page.setViewportSize(viewport);
      expect(PUBLIC_ROUTES.length, "the derived public list collapsed").toBeGreaterThan(8);
      for (const path of PUBLIC_ROUTES) {
        await page.goto(path);
        await expectNoViolations(page, `${path}${viewport ? " @390" : ""}`);
      }
    });
  }
});

/**
 * THE PLAN THAT NOTHING WAS ENFORCING. `site-routes.ts` carries `DYNAMIC_ROUTE_PLAN` and says of
 * it: "A derived sweep that quietly skips anything with a bracket in it has reinvented the
 * hardcoded array in a new place... `dynamicRoutePlan` below fails on any dynamic route missing
 * from this record, so adding one forces its author to decide which it is and write down why."
 *
 * It did not fail on anything, because nothing called it. Both guard functions were exported and
 * unreferenced, so the mechanism built to stop an unswept dynamic route appearing had let two
 * through: `/lives/play/[journey]`, which is every character's game, and `/practitioner/[id]`,
 * added with the skill-match dialog. Wired up here, beside the sweep that depends on it.
 */
test("every dynamic route is either swept or excluded, on purpose", () => {
  expect(undeclaredDynamicRoutes(), "a dynamic route with no entry in DYNAMIC_ROUTE_PLAN is a screen nobody decided about").toEqual([]);
  expect(staleDynamicPlanEntries(), "a plan entry naming a route that no longer exists").toEqual([]);
});

/**
 * And the samples are actually visited. A `sample` that nothing opens is a promise of coverage
 * rather than coverage — `/gp/[id]` had declared one since W102 and no sweep had ever loaded it.
 */
test("the sampled dynamic routes pass WCAG 2.1 AA", async ({ page }) => {
  test.setTimeout(240_000);
  const samples = Object.values(DYNAMIC_ROUTE_PLAN)
    .filter((entry): entry is { sample: string } => "sample" in entry)
    .map((entry) => entry.sample)
    .filter((path) => !path.startsWith("/console"));
  expect(samples.length, "no dynamic route declares a sample").toBeGreaterThan(2);
  for (const viewport of [null, PHONE] as const) {
    if (viewport) await page.setViewportSize(viewport);
    await page.emulateMedia({ reducedMotion: "reduce" });
    for (const path of samples) {
      await page.goto(path);
      await expectNoViolations(page, `${path}${viewport ? " @390" : ""}`);
    }
  }
});

test("the finder's stages pass WCAG 2.1 AA", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize(PHONE);
  await installFakeSpeech(page);
  for (const stage of STAGES) {
    await openStage(page, stage);
    await expectNoViolations(page, `/ (${stage})`);
  }
});

test.describe("the console", () => {
  test.beforeEach(async ({ page, request }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await request.post("/api/mock/state");
    await request.post("/api/mock/console");
    await signInAndOnboard(page, MANAGER_EMAIL);
    // Seeded and linked, so the credential, pathway, referral, education and vertical screens are
    // scanned POPULATED — their unlinked refusal is one paragraph and no controls.
    await request.post("/api/mock/credentials?linkEmail=manager@demo.practice.example");
    await request.post("/api/mock/pathways");
    await request.post("/api/mock/referrals");
    await request.post("/api/mock/education?linkEmail=manager@demo.practice.example");
    await request.post("/api/mock/verticals");
  });

  test("every screen passes WCAG 2.1 AA", async ({ page }) => {
    test.setTimeout(300_000);
    // Two need session states this test does not have and are scanned below; the wizard's steps
    // are covered by `console.spec.ts`, so one real step stands for the dynamic route here.
    const OWN_TEST = new Set(["/console/signin", "/console/onboarding"]);
    const surfaces = [...CONSOLE_ROUTES.filter((r) => !OWN_TEST.has(r)), "/console/setup/practice"];
    expect(surfaces.length, "the derived console list collapsed").toBeGreaterThan(20);
    for (const path of surfaces) {
      await page.goto(path);
      await expectNoViolations(page, path);
    }
  });

  test("sign-in and onboarding pass WCAG 2.1 AA", async ({ page, request }) => {
    await page.getByRole("button", { name: "Sign out" }).click();
    await page.waitForURL(/\/console\/signin$/);
    await expectNoViolations(page, "/console/signin");

    await request.post("/api/mock/console");
    await signIn(page, MANAGER_EMAIL);
    await page.waitForURL(/\/console\/onboarding$/);
    await expectNoViolations(page, "/console/onboarding");
  });
});
