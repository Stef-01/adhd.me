// AR19: the visual fold sweep — the check the taste register's `layout.fold-governed` rule was
// citing a false friend for (W167 governs reduces, not viewports; see src/design/fold-bands.ts).
// taste-rule: layout.fold-governed
//
// Two assertions per public route, at both shipped widths:
//   1. THE IDEA ABOVE THE FOLD: the route's h1 sits fully inside the initial viewport — a page
//      whose statement is below its own fold opens with everything except the idea.
//   2. TIED BANDS NEVER CUT: each declared claim+qualifier pair's union box must not straddle
//      the fold at initial scroll, driven through the SAME `bandCut` the vitest probes — plus a
//      deliberately-straddled synthetic band each run, so a dead detector cannot pass (the
//      AR9–AR12 rule: the probe drives the real predicate, not a copy).
//
// /about is founder-gated behind notFound() (O155) and is skipped BY NAME, with a non-vacuity
// floor so a sweep that skipped everything as gated could not pass.

import { expect, test } from "@playwright/test";
import { bandCut, TIED_BANDS } from "../src/design/fold-bands";
import { PUBLIC_ROUTES } from "./site-routes";

const GATED_404 = new Set(["/about"]);
const VIEWPORTS = [
  { width: 390, height: 844 },
  { width: 1280, height: 900 },
] as const;

test("the idea sits above the fold and no tied band is cut, at both widths", async ({ page }) => {
  test.setTimeout(300_000);
  const failures: string[] = [];
  let judged = 0;

  for (const viewport of VIEWPORTS) {
    await page.setViewportSize(viewport);
    for (const route of PUBLIC_ROUTES) {
      if (GATED_404.has(route)) continue;
      await page.goto(route, { waitUntil: "networkidle" });
      await page.evaluate(() => document.fonts.ready);
      judged += 1;

      const h1 = page.locator("h1").first();
      const box = await h1.boundingBox();
      if (!box) {
        failures.push(`${route} @${viewport.width}: no h1 rendered`);
        continue;
      }
      if (box.y < 0 || box.y + box.height > viewport.height) {
        failures.push(
          `${route} @${viewport.width}: the idea is not above the fold — h1 spans ${Math.round(box.y)}..${Math.round(box.y + box.height)} in a ${viewport.height}px viewport`,
        );
      }

      for (const band of TIED_BANDS.filter((candidate) => candidate.route === route)) {
        const boxes = [];
        for (const selector of band.selectors) {
          const element = page.locator(selector).first();
          boxes.push(await element.boundingBox());
        }
        if (boxes.some((candidate) => !candidate)) {
          failures.push(`${route} @${viewport.width}: tied band "${band.name}" — a selector resolved nothing (vacuous register entry)`);
          continue;
        }
        const top = Math.min(...boxes.map((candidate) => candidate!.y));
        const bottom = Math.max(...boxes.map((candidate) => candidate!.y + candidate!.height));
        if (bandCut(top, bottom, viewport.height)) {
          failures.push(
            `${route} @${viewport.width}: the fold cuts "${band.name}" (${Math.round(top)}..${Math.round(bottom)} across the ${viewport.height}px fold) — ${band.why}`,
          );
        }
      }
    }
  }

  // The probe: a synthetic band planted across the fold must be seen by the REAL predicate.
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/", { waitUntil: "networkidle" });
  const planted = await page.evaluate(() => {
    const make = (top: number) => {
      const el = document.createElement("div");
      el.style.cssText = `position:absolute;top:${top}px;left:0;width:10px;height:60px;`;
      document.body.append(el);
      return el.getBoundingClientRect();
    };
    const a = make(800);
    const b = make(860);
    return { top: Math.min(a.top, b.top), bottom: Math.max(a.bottom, b.bottom) };
  });
  expect(bandCut(planted.top, planted.bottom, 844), "the probe band straddles the fold and the predicate must say so").toBe(true);

  expect(judged, "non-vacuity: the sweep must actually judge the public surface").toBeGreaterThan(20);
  expect(failures, `fold violations:\n${failures.join("\n")}`).toEqual([]);
});
