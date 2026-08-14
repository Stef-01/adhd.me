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

/** Public surfaces. The console is behind sign-in and is not a phone surface. */
const SURFACES = ["/", "/finder", "/clinicians", "/clinicians/join", "/practices", "/privacy"];

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
