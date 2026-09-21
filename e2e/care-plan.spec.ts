// The care plan on the map, end to end (docs/adhd-life/CARE-PLAN-PRD.md §10).
//
// The lines this holds hardest are the two the feature is most likely to drift across.
//
// NO MONEY. The whole appeal of a care plan is financial, and `src/directory/fees.ts` refuses
// rebate arithmetic by construction — "what we charge is a fact, what you will pay is not". The
// model's own test refuses it over keys and exports; this refuses it over what reaches a screen.
//
// NO NUMBER ABOUT THE PERSON. The tab's standing rule (`my-adhd.spec.ts`) is that nothing on it
// counts anybody. A care plan is the one surface where a count is legitimate — services left is a
// fact about a plan, not a measure of a person — so the boundary is asserted rather than assumed:
// the plan's own count may appear, and a score, a percentage or a cost may not.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { expectNoViolations } from "./support/a11y";
// The library is plain ESM the CLI shares; the types are loose on purpose.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LIVED_RECORD } from "../scripts/text-budget-lib.mjs";

const MODEL_KEY = "adhdme.model.v1";

async function seed(page: Page, record: unknown = LIVED_RECORD): Promise<void> {
  await page.goto("/my-adhd");
  await page.evaluate(([k, rec]) => localStorage.setItem(k!, rec!), [MODEL_KEY, JSON.stringify(record)]);
  await page.reload();
}

/** The same person, before they have told us about a plan — the state everybody meets first. */
function withoutPlan(): unknown {
  const { carePlan, ...rest } = LIVED_RECORD as Record<string, unknown>;
  return rest;
}

test("the hub's card says what is left, in two words and a row of dots", async ({ page }) => {
  await seed(page);
  const card = page.locator(".plan-card");
  await expect(card).toBeVisible();
  // Two words on screen. The count is in the accessible name, because the hub had four words of
  // headroom and three hollow dots among five say "3 left" to anybody who can see them.
  await expect(card.locator(".plan-card-name")).toHaveText("Care plan");
  await expect(card).toHaveAccessibleName(/Care plan: 3 of 5 services left/);
  // Five dots for five services, two of them spent.
  await expect(card.locator(".plan-dot")).toHaveCount(5);
  await expect(card.locator(".plan-dot[data-used]")).toHaveCount(2);
});

test("before a plan the card asks, and offers the numbers straight away", async ({ page }) => {
  await seed(page, withoutPlan());
  const card = page.locator(".plan-card");
  await expect(card).toHaveAttribute("data-empty", "true");
  await expect(card).toContainText("Ask your GP");
  await expect(card.locator(".plan-dot")).toHaveCount(0);
  // With no plan there is nothing to spend, so the sheet opens straight onto the two numbers
  // rather than an empty list.
  await card.click();
  await expect(page.locator(".plan-numbers")).toBeVisible();
  await expect(page.locator(".plan-rows")).toHaveCount(0);
});

test("the sheet names the kinds the person's own map points at, and marks the one a plan cannot pay for", async ({ page }) => {
  await seed(page);
  await page.locator(".plan-card").click();
  const sheet = page.locator(".plan-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.locator(".plan-state")).toContainText("3 left");

  const rows = sheet.locator(".plan-row");
  expect(await rows.count()).toBeGreaterThan(1);

  // Every row names a kind and the axis it came from, and the axis is a word rather than a
  // sentence — `Need.label` is "Starting long independent work." and would not fit.
  for (const row of await rows.all()) {
    await expect(row.locator(".plan-row-kind")).not.toBeEmpty();
    const why = (await row.locator(".plan-row-why").innerText()).trim();
    expect(why.length).toBeGreaterThan(0);
    expect(why).not.toMatch(/\.$/);
  }

  // A GP writes the plan and is never suggested under it.
  await expect(sheet).not.toContainText(/^GP$/);

  // The uncovered kind is shown and marked, not dropped. MAP-CONNECTIONS measured `adhd-coach` as
  // the map's answer for 13 of 17 subdomains with no real provider, and a coach is the one kind a
  // plan can never cover — hiding it would make this sheet disagree with /support silently.
  const marked = sheet.locator(".plan-row:not([data-covered])");
  await expect(marked).toHaveCount(1);
  await expect(marked.locator(".plan-row-mark")).toHaveText("Not covered");

  await expectNoViolations(page, "The care plan sheet");
});

test("the plan says nothing about money, and nothing about the person", async ({ page }) => {
  await seed(page);
  await page.locator(".plan-card").click();
  const text = await page.locator(".plan-sheet").innerText();

  // fees.ts refuses rebate arithmetic by construction. Nothing here may reintroduce it on screen.
  expect(text, "a care plan screen must not do rebate arithmetic").not.toMatch(/\$|\bcost\b|\brebate\b|\bgap\b|\bsaving|\bworth\b|\bfree\b/i);
  // A percentage would turn three of five into a score.
  expect(text).not.toMatch(/%/);
  // The only digits allowed are the plan's own count — a fact about a plan, not a measure of
  // anybody. The seeded record holds a cost of 8 out of 10 that must never reach this surface.
  const digits = text.match(/\d+/g) ?? [];
  expect(digits.length).toBeGreaterThan(0);
  for (const d of digits) expect(Number(d)).toBeLessThanOrEqual(5);
});

test("the numbers are the person's own, by pointer and by keyboard", async ({ page }) => {
  await seed(page, withoutPlan());
  await page.locator(".plan-card").click();
  await expect(page.locator(".plan-numbers")).toBeVisible();

  const allows = page.locator(".plan-stepper").filter({ hasText: "My plan allows" });
  const used = page.locator(".plan-stepper").filter({ hasText: "Used so far" });

  // Announced as a number, with its bounds, rather than as bare text.
  const allowsValue = allows.locator("[role=spinbutton]");
  await expect(allowsValue).toHaveAttribute("aria-valuenow", "5");
  await expect(allowsValue).toHaveAccessibleName(/My plan allows/);

  await allows.getByRole("button", { name: /one more/ }).click();
  await expect(allowsValue).toHaveAttribute("aria-valuenow", "6");

  // Keyboard, on the value itself.
  await allowsValue.focus();
  await page.keyboard.press("ArrowDown");
  await expect(allowsValue).toHaveAttribute("aria-valuenow", "5");

  // `used` can never exceed what the plan allows, so the control stops rather than the model
  // having to floor a nonsense pair afterwards.
  const usedValue = used.locator("[role=spinbutton]");
  const oneMoreUsed = used.getByRole("button", { name: /one more/ });
  // Click until the control stops rather than a fixed number of times: the point is that it stops.
  for (let i = 0; i < 12 && (await oneMoreUsed.isEnabled()); i++) await oneMoreUsed.click();
  await expect(usedValue).toHaveAttribute("aria-valuenow", "5");
  await expect(oneMoreUsed).toBeDisabled();

  // Saving lands back on the plan, with the dots the numbers imply.
  await page.getByRole("button", { name: "Save", exact: true }).click();
  // Scoped to the sheet: the hub's card is behind it and draws the same dots, so an unscoped
  // count matches both rows and reads 10.
  const state = page.locator(".plan-state");
  await expect(state).toContainText("0 left");
  await expect(state.locator(".plan-dot[data-used]")).toHaveCount(5);

  // And it survives a reload, because it is on the record rather than in the sheet.
  await page.reload();
  await expect(page.locator(".plan-card")).toHaveAccessibleName(/0 of 5 services left/);
});

test("every target on the plan is one a thumb can land on", async ({ page }) => {
  await seed(page, withoutPlan());
  await page.setViewportSize({ width: 320, height: 844 });
  await page.locator(".plan-card").click();
  await expect(page.locator(".plan-numbers")).toBeVisible();
  const small = await page.evaluate(() =>
    [...document.querySelectorAll(".plan-sheet button, .plan-sheet [role=spinbutton]")]
      .map((e) => ({ name: (e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 24), r: e.getBoundingClientRect() }))
      .filter((x) => x.r.height < 44)
      .map((x) => `${x.name}: ${Math.round(x.r.height)}px`));
  expect(small, "a stepper a thumb cannot land on is a stepper on a phone").toEqual([]);
});

test("the plan reaches the GP summary as rows, and the sheet hands over to it", async ({ page }) => {
  await seed(page);
  await page.locator(".plan-card").click();
  // Phase 6: the way onward is the surface that already exists, opened in place rather than by a
  // navigation that would have dropped the person back on the hub.
  await page.getByRole("button", { name: /Take this to my GP/ }).click();

  const summary = page.locator(".map-sheet");
  await expect(summary).toBeVisible();
  await expect(summary.getByRole("button", { name: "My GP" })).toBeVisible();
  await summary.getByRole("button", { name: "My GP" }).click();

  // Rows the record already held, under a heading. No drafted prose: `summary.ts` writes none.
  await expect(page.getByText("Care plan", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Plan allows:\s*5/)).toBeVisible();
  await expect(page.getByText(/Used so far:\s*2/)).toBeVisible();
  // Only kinds a plan can pay for: a GP reading this does not need the coach the map suggested.
  await expect(page.getByText(/Considering:/)).not.toContainText(/coach/i);
});
