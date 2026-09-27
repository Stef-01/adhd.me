// A module page, held to the lead designer's review: room above "All modules", no small text on a
// strong lesson fill, no ring round a heading on arrival, and one round it after a keyboard step.

import { expect } from "@playwright/test";
import { test } from "./support/test";

for (const [width, gap] of [[390, 16], [1440, 24]] as const) {
  test(`"All modules" has room under the header at ${width}`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/approach?module=adhd");
    const back = page.getByRole("button", { name: "All modules" });
    await expect(back).toBeVisible();
    const header = await page.locator("header.platform-header").boundingBox();
    const button = await back.boundingBox();
    expect(button!.y - (header!.y + header!.height)).toBeGreaterThanOrEqual(gap);
  });
}

test("no text under 14px sits on a strong lesson fill at 390", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 900 });
  for (const module of ["adhd", "everyday", "finding", "cost", "changed"]) {
    await page.goto(`/approach?module=${module}`);
    const card = page.locator(".learn-lesson.composition-0.is-current");
    await expect(card).toBeVisible();
    const small = await card.evaluate((root) => {
      const out: string[] = [];
      const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
      for (let node = walker.nextNode(); node; node = walker.nextNode()) {
        const text = node.textContent?.trim();
        const el = node.parentElement;
        if (!text || !el || el.closest(".activity-feedback, .discovery-grid, .learning-explorer, svg, [aria-hidden='true']")) continue;
        const style = getComputedStyle(el);
        if (style.display === "none" || style.visibility === "hidden") continue;
        if (parseFloat(style.fontSize) < 14) out.push(`${text} (${style.fontSize})`);
      }
      return out;
    });
    expect(small, module).toEqual([]);
  }
});

test("arriving on a module rings no heading; a keyboard step rings the new one", async ({ page }) => {
  await page.goto("/approach?module=adhd");
  const heading = page.locator(".learn-lesson.is-current .learn-card-heading");
  await expect(page.locator(".learn-module[data-hydrated='true']")).toBeVisible();
  // Arrival leaves focus alone, so no ring draws round the statement on load (PLAN.md N12).
  await expect(heading).not.toBeFocused();
  expect(await heading.evaluate((el) => getComputedStyle(el).outlineStyle)).toBe("none");
  // Next by keyboard puts the reader on the new statement, and the ring shows where focus went.
  const first = await heading.textContent();
  await page.locator(".learn-controls .learn-primary").focus();
  await page.keyboard.press("Enter");
  await expect(heading).not.toHaveText(first ?? "");
  await expect(heading).toBeFocused();
  expect(await heading.evaluate((el) => getComputedStyle(el).outlineStyle)).not.toBe("none");
});
