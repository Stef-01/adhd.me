// The platform plan's width matrix (docs/design/2026-platform/PLAN.md §10): the same screens at
// 320, 390, 430, 768, 1280 and 1440, and the finder at 320 as the reflow case. Two things are
// asserted, both measured: the document never scrolls sideways, and no element carrying text is
// clipped by its own box unless a scrolling container was given to it on purpose. A failing
// width is named with the route and the element, never filtered.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { PUBLIC_ROUTES } from "./site-routes";

const WIDTHS = [320, 390, 430, 768, 1280, 1440] as const;

type Clip = { tag: string; text: string; scroll: number; client: number };

async function clippedText(page: Page): Promise<Clip[]> {
  return page.evaluate(() => {
    const out: { tag: string; text: string; scroll: number; client: number }[] = [];
    const scrolls = (el: Element | null): boolean => {
      for (let e = el; e && e !== document.body; e = e.parentElement) {
        const o = getComputedStyle(e).overflowX;
        if (o === "auto" || o === "scroll") return true;
      }
      return false;
    };
    for (const el of document.querySelectorAll<HTMLElement>("h1, h2, h3, p, li, summary, button, a, label, dt, dd, td, th, small, strong, span")) {
      if (!el.textContent?.trim()) continue;
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden") continue;
      if (el.closest("details:not([open])") && !el.closest("summary")) continue;
      if (cs.textOverflow === "ellipsis" || cs.overflowX === "auto" || cs.overflowX === "scroll") continue;
      if (scrolls(el)) continue;
      if (el.scrollWidth > el.clientWidth + 1 && el.clientWidth > 0) {
        out.push({ tag: el.tagName.toLowerCase(), text: (el.textContent ?? "").trim().slice(0, 60), scroll: el.scrollWidth, client: el.clientWidth });
      }
    }
    return out;
  });
}

for (const width of WIDTHS) {
  test(`no sideways scroll and no clipped text at ${width}px`, async ({ page }) => {
    test.setTimeout(240_000);
    await page.setViewportSize({ width, height: width < 700 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: "reduce" });
    expect(PUBLIC_ROUTES.length, "the derived public list collapsed").toBeGreaterThan(8);
    const sideways: string[] = [];
    const clips: string[] = [];
    for (const route of PUBLIC_ROUTES) {
      await page.goto(route);
      const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      if (over > 1) sideways.push(`${route} scrolls ${over}px sideways`);
      for (const c of await clippedText(page)) clips.push(`${route} <${c.tag}> "${c.text}" ${c.scroll}>${c.client}`);
    }
    expect(sideways).toEqual([]);
    expect(clips).toEqual([]);
  });
}

test("the finder reflows at 320px through a search and a profile", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 });
  await page.goto("/");
  await page.getByRole("textbox").fill("an adult ADHD assessment, not rushed");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20_000 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  expect(await clippedText(page)).toEqual([]);
  await page.locator(".clinician-row").first().click();
  await expect(page.locator(".profile-screen")).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(1);
  expect(await clippedText(page)).toEqual([]);
});
