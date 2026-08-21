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

/** Public surfaces. */
const SURFACES = ["/", "/approach", "/finder", "/clinicians", "/clinicians/join", "/practices", "/privacy"];

/**
 * O149: the console, whose absence here used to be justified in this file with "the console is
 * behind sign-in and is not a phone surface". That premise was wrong and the cost was measurable:
 * EVERY console route scrolled sideways at 390px — `/console` at 548px of content in a 390px
 * viewport, `/console/rules` at 468 — because the shell's header row could not wrap and the
 * signed-in email dragged the document with it. Sign-in is not a statement about screen size; the
 * console is where somebody reconfirms capacity on a phone between patients.
 *
 * These assert the DOCUMENT's scrollWidth only, not the per-element check the public surfaces
 * get, and the difference is deliberate. `/console/matching` and `/console/allocation` render wide
 * tables that reach x=745 inside their own `overflow-x` container — which is exactly what the web
 * guidelines require of wide content, and is why the document does not move. An element-rect
 * assertion would call those tables a defect and "fixing" them would mean squeezing a data table
 * that is correct as it stands.
 */
const CONSOLE_SURFACES = [
  "/console", "/console/dashboard", "/console/matching", "/console/interview",
  "/console/applications", "/console/allocation", "/console/rules", "/console/registers",
  "/console/privacy", "/console/ops", "/console/outcomes", "/console/referrals",
  "/console/complaints", "/console/reporting", "/console/usefulness", "/console/case-mix",
];

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

for (const path of SURFACES) {
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
  for (const path of CONSOLE_SURFACES) {
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
