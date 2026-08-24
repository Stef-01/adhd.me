// AR20: reduced-motion equality — the sweep half. The census (src/design/reduced-motion.ts)
// proves every motion-importing file CHECKS the preference; this sweep proves the RESULT: under
// emulated reduce, every public route rests untransformed with all content present. Detector in
// e2e/support/reduced-motion-load.ts; probe in e2e/support/reduced-motion-probe.spec.ts.
// taste-rule: motion.reduced-motion

import { expect, test } from "@playwright/test";
import { reducedMotionFindings, type ReducedMotionFinding } from "./support/reduced-motion-load";
import { PUBLIC_ROUTES } from "./site-routes";

const GATED_404 = new Set(["/about"]);

test("under reduced motion, no element rests transformed and every reveal's content is present", async ({ page }) => {
  test.setTimeout(300_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });

  const findings: ReducedMotionFinding[] = [];
  let judged = 0;
  for (const route of PUBLIC_ROUTES) {
    if (GATED_404.has(route)) continue;
    await page.goto(route, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    // Let any wrongly-running entrance finish before judging the REST state — the sweep judges
    // where elements END UP, and a mid-flight snapshot would flag correct pages as transformed.
    await page.waitForTimeout(800);
    judged += 1;
    findings.push(...(await reducedMotionFindings(page, route)));
  }

  expect(judged, "non-vacuity: the sweep must judge the public surface").toBeGreaterThan(10);
  expect(
    findings,
    `reduced-motion violations:\n${findings.map((finding) => `${finding.route}: [${finding.kind}] ${finding.detail}`).join("\n")}`,
  ).toEqual([]);
});
