// AR19: the visual fold sweep — the check the taste register's `layout.fold-governed` rule was
// citing a false friend for (W167 governs reduces, not viewports; see src/design/fold-bands.ts).
// taste-rule: layout.fold-governed
//
// AR28 moved the detector to e2e/support/fold-load.ts so the mutation probe
// (e2e/support/fold-probe.spec.ts) drives the REAL walk — h1 half, band half, accumulation —
// rather than the predicate alone: the AR9–AR12 rule, completing AR13's fold entry.
//
// /about is founder-gated behind notFound() (O155) and is skipped BY NAME, with a non-vacuity
// floor so a sweep that skipped everything as gated could not pass.

import { expect, test } from "@playwright/test";
import { foldFindings, type FoldFinding } from "./support/fold-load";
import { PUBLIC_ROUTES } from "./site-routes";

const GATED_404 = new Set(["/about"]);
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
] as const;

test("the idea sits above the fold and no tied band is cut, at both widths", async ({ page }) => {
  test.setTimeout(300_000);
  const failures: FoldFinding[] = [];
  let judged = 0;

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    for (const route of PUBLIC_ROUTES) {
      if (GATED_404.has(route)) continue;
      await page.goto(route, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      judged += 1;
      failures.push(...(await foldFindings(page, route, viewport.height)));
    }
  }

  expect(judged, "non-vacuity: the sweep must actually judge the public surface").toBeGreaterThan(20);
  expect(
    failures.map((finding) => `${finding.route}: ${finding.detail}`),
    "fold violations",
  ).toEqual([]);
});
