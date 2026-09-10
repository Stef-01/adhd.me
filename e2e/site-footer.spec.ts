// The site footer, checked as a landmark and as a band, on every public route that renders it.
//
// WHY. `SiteFooter` is one component and it was placed two different ways: six routes rendered it
// INSIDE `<main id="main-content">` and four outside. Both looked identical in a screenshot on the
// pages whose `main` is full width, so nothing caught it, and it cost two things:
//
//   1. THE LANDMARK. A `<footer>` scoped to `main` is not the page's `contentinfo` landmark
//      (HTML-AAM: the mapping only applies when the nearest sectioning ancestor is `body`), so a
//      reader navigating by landmarks found a footer on four public routes and none on the other
//      six. axe has nothing to say about this — a missing landmark is not a violation.
//   2. THE BAND. `.site-footer` is a full-bleed dark band with a 3px accent rule along its top
//      edge. Inside `main.max-w-xl.px-6.py-16` (/terms, /privacy/counsel-review, /about) it drew
//      as a 576px rectangle floating in white, with the page's own 64px of bottom padding beneath
//      it — while /privacy, one route over in the same cluster, ran edge to edge.
//
// Derived from `site-routes.ts` rather than listed, so a route added tomorrow is checked by
// existing, and the check is skipped only where there is genuinely no site footer (the finder, the
// story, the console, the clinician walkthrough — each carries its own foot or none by design).

import { expect } from "@playwright/test";
import { test } from "./support/test";
import { PUBLIC_ROUTES } from "./site-routes";

test("the site footer is a contentinfo landmark and a full-bleed band wherever it renders", async ({ page }) => {
  test.setTimeout(120_000);
  expect(PUBLIC_ROUTES.length, "the derived public list collapsed").toBeGreaterThan(8);

  let seen = 0;
  for (const path of PUBLIC_ROUTES) {
    await page.goto(path);
    const footer = page.locator("footer.site-footer");
    if ((await footer.count()) === 0) continue;
    seen += 1;

    // Not nested in `main`, which is what the landmark mapping turns on.
    await expect(
      page.locator("main footer.site-footer"),
      `${path}: the site footer is inside <main>, so it is not the page's contentinfo landmark`,
    ).toHaveCount(0);

    // And the band reaches both edges: same measurement the nesting used to break.
    const width = await footer.first().evaluate((el) => el.getBoundingClientRect().width);
    const viewport = page.viewportSize()!.width;
    expect(width, `${path}: the footer band is ${width}px inside a ${viewport}px viewport`)
      .toBeGreaterThanOrEqual(viewport - 1);
  }

  // Non-vacuity: if a refactor stops rendering the footer anywhere, this test must not pass mute.
  expect(seen, "no public route rendered the site footer at all").toBeGreaterThan(5);
});
