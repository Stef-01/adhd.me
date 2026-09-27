// The care map, held to what the lead designer's review found: the bottom labels read upright,
// the centre carries no count, and nothing on the wheel or in its panel is a number about somebody.

import { expect } from "@playwright/test";
import { test } from "./support/test";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LIVED_RECORD } from "../scripts/text-budget-lib.mjs";

test("every quadrant label reads upright", async ({ page }) => {
  await page.goto("/approach/map");
  const labels = page.locator(".care-map-layer");
  await expect(labels).toHaveCount(4);
  const turns = await labels.evaluateAll((els) =>
    els.map((el) => {
      const text = el as SVGTextElement;
      const deg = text.getRotationOfChar(0);
      return { label: text.textContent, deg: ((deg + 540) % 360) - 180 };
    }),
  );
  for (const { label, deg } of turns) {
    expect(Math.abs(deg), `${label} starts at ${deg} degrees`).toBeLessThan(90);
  }
});

test("the wheel and its panel say words, never a number about the person", async ({ page }) => {
  await page.goto("/approach/map");
  await page.evaluate((rec) => localStorage.setItem("adhdme.model.v1", rec), JSON.stringify(LIVED_RECORD));
  await page.reload();
  await expect(page.locator(".care-map-node.is-signal").first()).toBeVisible();
  expect(await page.locator(".care-map-svg").textContent()).not.toMatch(/\d/);
  await page.getByRole("button", { name: /^Starting \(Brain\)/ }).click();
  const panel = page.locator(".care-map-detail");
  await expect(panel).toContainText("you said it costs a lot");
  // What the panel says about the person; the games and modules it lists are titles, and a title
  // like "60-Second Start" is not a number about anybody.
  const about = await panel.evaluate((el) => {
    const copy = el.cloneNode(true) as HTMLElement;
    copy.querySelector(".care-map-modules")?.remove();
    return copy.textContent ?? "";
  });
  expect(about).toContain("costs a lot");
  expect(about).not.toMatch(/\d/);
});

test("from 1200px the panel sits beside the wheel and stays there; below it, a tap brings the panel into view", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/approach/map");
  const [wheel, panel] = [page.locator(".care-map-svg"), page.locator(".care-map-detail")];
  const [w, p] = [(await wheel.boundingBox())!, (await panel.boundingBox())!];
  expect(w.width).toBeLessThanOrEqual(690.5);
  expect(p.x, "the panel is to the right of the wheel").toBeGreaterThanOrEqual(w.x + w.width);
  // Under 1200px the panel would be too narrow beside a full wheel, so it sits below it.
  await page.setViewportSize({ width: 1100, height: 800 });
  const [w2, p2] = [(await wheel.boundingBox())!, (await panel.boundingBox())!];
  expect(p2.y, "the panel is below the wheel").toBeGreaterThanOrEqual(w2.y + w2.height);
  await page.setViewportSize({ width: 390, height: 700 });
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach/map");
  await page.getByRole("button", { name: "Body", exact: true }).click();
  await page.getByRole("button", { name: /^Sleep \(Body\)/ }).click();
  await expect(page.getByRole("heading", { name: "Sleep" })).toBeInViewport();
  // Focus stays on the node that was tapped.
  expect(await page.evaluate(() => document.activeElement?.getAttribute("aria-label"))).toMatch(/^Sleep \(Body\)/);
});

test("on a desk a node's name renders at 12px or more", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/approach/map");
  // The label's size in viewBox units times the SVG's scale on screen.
  const px = await page.locator(".care-map-node text").first().evaluate((el) => {
    const text = el as SVGTextElement;
    return parseFloat(getComputedStyle(text).fontSize) * text.getScreenCTM()!.a;
  });
  expect(px).toBeGreaterThanOrEqual(12);
});

test("the wheel draws from the palette: no raw colour on it", async ({ page }) => {
  await page.goto("/approach/map");
  const raw = await page.locator(".care-map-svg [fill], .care-map-svg [stroke]").evaluateAll((els) =>
    els.flatMap((el) => ["fill", "stroke"].map((a) => el.getAttribute(a)).filter((v): v is string => Boolean(v && v.startsWith("#")))));
  expect(raw).toEqual([]);
});

// N8, the founder's pick (2026-09-27): on a phone the wheel is four quarters, a tap lists that
// quarter's parts under it, and every name on the screen renders at 12px or more.
for (const width of [320, 390]) {
  test(`on a ${width}px phone the wheel is four quarters, and a tap lists that quarter's parts`, async ({ page }) => {
    await page.setViewportSize({ width, height: 700 });
    await page.goto("/approach/map");
    await expect(page.locator(".care-map-svg")).toBeHidden();
    await expect(page.locator(".care-map-detail")).toBeHidden();
    const quarters = page.locator(".care-map-quarter");
    await expect(quarters).toHaveCount(4);
    const sizes = await page.locator(".care-map-quarters text").evaluateAll((els) =>
      els.map((el) => parseFloat(getComputedStyle(el).fontSize) * (el as SVGTextElement).getScreenCTM()!.a));
    for (const px of sizes) expect(px).toBeGreaterThanOrEqual(12);
    for (const q of await quarters.all()) {
      const box = (await q.boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    }

    const brain = page.getByRole("button", { name: "Brain", exact: true });
    await brain.click();
    await expect(brain).toHaveAttribute("aria-expanded", "true");
    const parts = page.locator(".care-map-parts button");
    await expect(parts).toHaveCount(7);
    await expect(parts.first()).toHaveText("Starting");
    for (const p of await parts.all()) expect((await p.boundingBox())!.height).toBeGreaterThanOrEqual(44);

    await page.getByRole("button", { name: /^Working memory \(Brain\)/ }).click();
    await expect(page.getByRole("heading", { name: "Working memory" })).toBeVisible();

    // Another quarter swaps the list and closes a panel that belongs to the first.
    await page.getByRole("button", { name: "People", exact: true }).click();
    await expect(brain).toHaveAttribute("aria-expanded", "false");
    await expect(page.locator(".care-map-detail")).toBeHidden();
    await expect(page.locator("#care-map-parts-title")).toHaveText("People");
  });
}

test("from 768px the wheel of named parts is back", async ({ page }) => {
  await page.setViewportSize({ width: 768, height: 900 });
  await page.goto("/approach/map");
  await expect(page.locator(".care-map-phone")).toBeHidden();
  const px = await page.locator(".care-map-node text").first().evaluate((el) =>
    parseFloat(getComputedStyle(el).fontSize) * (el as SVGTextElement).getScreenCTM()!.a);
  expect(px).toBeGreaterThanOrEqual(12);
});
