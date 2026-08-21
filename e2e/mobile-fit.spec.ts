// W216: nothing on a public surface is wider than the phone it is read on.
//
// WHY THIS EXISTS. A tap-target rule added during the mobile pass set `display: inline-flex` on
// every anchor inside a `nav`. Rules in app/globals.css are unlayered and Tailwind's utilities live
// in `@layer utilities`, and unlayered CSS beats layered CSS whatever the specificity - so that one
// declaration overrode `.hidden` and revived the three `hidden sm:inline` links in the /practices
// header. The page then measured 453px inside a 390px viewport and scrolled sideways.
//
// Every existing spec passed while that was true. The a11y sweep does not measure layout, the
// public sweep reads copy, and no unit test can see a viewport. The failure was only visible in a
// screenshot, which is not a thing CI looks at.
//
// The second assertion is the one that would have caught the CAUSE rather than the symptom: an
// element carrying Tailwind's `hidden` must actually be `display: none`. A future unlayered rule
// that resurrects hidden content fails here even if it happens not to overflow.

import { expect, test, type Page } from "@playwright/test";

// O172: the routes are derived from `app/` now, not listed here — BUT THE SPLIT IS KEPT, and the
// split is the whole reason this file was the last mechanical one.
//
// Public surfaces get the strict PER-ELEMENT check: nothing may extend past the viewport's right
// edge. The console gets the DOCUMENT's `scrollWidth` only. That difference is deliberate and O149
// wrote the reason down: `/console/matching` and `/console/allocation` render wide tables reaching
// x=745 inside their own `overflow-x` container, which is exactly what the web guidelines require
// of wide content, and is why the document does not move. A per-element assertion would call those
// tables a defect, and "fixing" them would mean squeezing a data table that is correct as it stands.
//
// THE PUBLIC LIST HELD 7 OF 15, WHICH I HAD MIS-READ IN AGGREGATE. O168 reported this sweep at
// 25/45 and I took that for a console gap, as it was for every other sweep. Eight public pages —
// /about, /demo, /examples, /faq, /terms, /thanks, /privacy/automated-decisions,
// /privacy/counsel-review — had never been checked for horizontal overflow at 390px, and they are
// the ones that get the STRICT assertion.
//
// W216's own history is the argument for caring: that row exists because a tap-target rule revived
// three `hidden sm:inline` links and /practices measured 453px inside a 390px viewport — and every
// existing spec passed while that was true, because a11y does not measure layout, the public sweep
// reads copy, and no unit test can see a viewport.
import { CONSOLE_ROUTES, PUBLIC_ROUTES } from "./site-routes";

async function signInAsPracticeOwner(page: Page) {
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

/** iPhone 12/13/14 logical width - the narrowest mainstream phone still in wide use. */
const PHONE = { width: 390, height: 844 };

async function measure(page: Page) {
  return page.evaluate(() => {
    const root = document.documentElement;
    const offenders: string[] = [];
    for (const el of Array.from(document.querySelectorAll("body *"))) {
      const box = el.getBoundingClientRect();
      if (box.width === 0 && box.height === 0) continue;
      if (box.right > root.clientWidth + 1) {
        offenders.push(
          `<${el.tagName.toLowerCase()} class="${String(el.className).slice(0, 60)}"> right=${Math.round(box.right)}`,
        );
      }
    }
    const revived = Array.from(document.querySelectorAll(".hidden"))
      .filter((el) => getComputedStyle(el).display !== "none")
      .map((el) => `<${el.tagName.toLowerCase()}> is ${getComputedStyle(el).display}, not none`);
    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      offenders: offenders.slice(0, 5),
      revived: revived.slice(0, 5),
    };
  });
}

// O172: A GENERATED-TEST LOOP HAS A VACUITY SHAPE THE OTHER SWEEPS DO NOT, and it needs its own
// guard. Every other derived sweep in this suite loops over routes INSIDE one test, so a collapsed
// derivation shows up as a population floor failing. Here the loop generates the tests themselves:
// if `PUBLIC_ROUTES` came back empty, Playwright would report a clean run of the remaining specs and
// nothing would be red — the assertions cannot fire because the tests do not exist. No floor placed
// inside a generated test can catch that, so the count is asserted in a test of its own.
test("the public sweep generated a test per route, and there are 15 of them", () => {
  expect(PUBLIC_ROUTES.length, "the derived public list collapsed — the per-route tests above do not exist").toBeGreaterThan(12);
});

for (const path of PUBLIC_ROUTES) {
  test(`${path} fits a 390px phone`, async ({ browser }) => {
    const context = await browser.newContext({ viewport: PHONE, reducedMotion: "reduce" });
    const page = await context.newPage();
    await page.goto(path);
    await page.waitForLoadState("networkidle");

    const result = await measure(page);

    expect(result.revived, `Tailwind's .hidden was overridden on ${path}`).toEqual([]);
    expect(
      result.offenders,
      `something on ${path} extends past the viewport's right edge`,
    ).toEqual([]);
    expect(
      result.scrollWidth,
      `${path} scrolls sideways: ${result.scrollWidth}px of content in a ${result.clientWidth}px viewport`,
    ).toBeLessThanOrEqual(result.clientWidth);

    await context.close();
  });
}

// The results list is only reachable through an interaction, and it is the screen with the most
// per-row content, so it is the likeliest to overflow.
test("the results list fits a 390px phone", async ({ browser }) => {
  const context = await browser.newContext({ viewport: PHONE, reducedMotion: "reduce" });
  const page = await context.newPage();
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await page.waitForSelector(".clinician-list");

  const result = await measure(page);
  expect(result.offenders).toEqual([]);
  expect(result.scrollWidth).toBeLessThanOrEqual(result.clientWidth);

  await context.close();
});


test("no console route scrolls sideways on a phone (O149)", async ({ browser, request }) => {
  await request.post("/api/mock/console");
  const context = await browser.newContext({ viewport: PHONE, reducedMotion: "reduce" });
  const page = await context.newPage();
  await signInAsPracticeOwner(page);

  const sideways: string[] = [];
  // O172: 30 routes with a fonts-ready wait each does not fit Playwright's 30s default. Fourth
  // instance in four rows (contrast O169, touch-floor O170, semantics O171). Every one of these
  // specs was written with a short route list and inherited a timeout nobody chose.
  test.setTimeout(300_000);
  expect(CONSOLE_ROUTES.length, "the derived console list collapsed").toBeGreaterThan(24);
  for (const path of CONSOLE_ROUTES) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await page.evaluate(() => document.fonts.ready);
    const result = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      clientWidth: document.documentElement.clientWidth,
    }));
    if (result.scrollWidth > result.clientWidth) {
      sideways.push(`${path}: ${result.scrollWidth}px of content in a ${result.clientWidth}px viewport`);
    }
  }

  expect(sideways, `console routes scrolling sideways:\n${sideways.join("\n")}`).toEqual([]);
  await context.close();
});
