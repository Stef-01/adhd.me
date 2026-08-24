// O189 (founder-directed): "no logo, noone can navigate clearly" turned out to be a census
// result — eight public pages carried breadcrumbs but no wordmark and nothing shaped like a
// control. This sweep is the fix made permanent: EVERY public route must show the ADHD.ME mark
// and give the reader a way home from it. Derived from the route list (O168's law), so the
// next public page cannot ship headerless without going red here.
//
// The rule is stated the way the surfaces actually satisfy it: most routes render the mark as
// a direct home link; /clinicians and /demo render it as the demo-map trigger, a button whose
// menu holds "Back to main home" — pressing the mark is still the way home, one step longer,
// and the sweep walks that step rather than flattening the two shapes into a lie.

import { expect, test } from "@playwright/test";
import { PUBLIC_ROUTES } from "./site-routes";

test("every public route shows the ADHD.ME mark and reaches home from it", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const shapes: string[] = [];
  let judged = 0;
  for (const route of PUBLIC_ROUTES) {
    const res = await page.goto(route, { waitUntil: "networkidle" });
    // O155's precedent, and the semantics sweep's: a founder-gated page renders notFound() on
    // purpose (/about today). A 404 is skipped and NAMED, never judged headerless — and never
    // silently either, so the log shows exactly which routes the rule was checked on.
    if (res && res.status() === 404) {
      shapes.push(`${route} gated (404) — skipped`);
      continue;
    }
    judged += 1;
    const homeLink = page.locator('a[href="/"]', { hasText: "ADHD.ME" }).first();
    if (await homeLink.count()) {
      await expect(homeLink, `${route}: the wordmark home link is not visible`).toBeVisible();
      shapes.push(`${route} link`);
      continue;
    }
    const trigger = page.getByRole("button", { name: /ADHD\.ME/ }).first();
    await expect(trigger, `${route}: no ADHD.ME mark at all — the page is headerless`).toBeVisible();
    await trigger.click();
    await expect(
      page.locator('a[href="/"]').first(),
      `${route}: the mark opens but nothing inside reaches home`,
    ).toBeVisible();
    shapes.push(`${route} trigger`);
  }
  console.log("PUBLIC_NAV\n  " + shapes.join("\n  "));
  expect(shapes.length).toBe(PUBLIC_ROUTES.length);
  // Non-vacuity: a sweep that skipped everything as gated would satisfy the line above.
  expect(judged, "every public route came back 404 — the sweep judged nothing").toBeGreaterThan(10);
});
