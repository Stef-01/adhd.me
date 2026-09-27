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
  expect(await panel.innerText()).not.toMatch(/\d/);
});
