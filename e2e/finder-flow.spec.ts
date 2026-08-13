// W214: the finder's seven screens, walked end to end.
//
// Written during the first minimalism round, which collapsed `review`, `matching`, `match` and
// `all` into one `results` screen. Four screens disappearing at once is exactly the change that
// leaves a dangling route or a button pointing at a stage that no longer exists, and none of the
// existing specs walked the patient flow past the first match.
//
// It asserts the SHAPE of the flow rather than its copy: which screen follows which, that every
// back route lands somewhere real, and that a booking can still be completed. Copy is asserted by
// the compliance sweeps, and duplicating it here would mean every wording change broke two files.

import { expect, test, type Page } from "@playwright/test";

async function intoResults(page: Page) {
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}

test("a scenario reaches results without a loading screen in between", async ({ page }) => {
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();

  // The 4.25s `matching` screen is gone, so results are there immediately. A generous timeout
  // would let it creep back without failing, which is why this one is deliberately tight.
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 2500 });
  await expect(page.locator(".clinician-row")).not.toHaveCount(0);
});

test("every result is reachable and opens a profile", async ({ page }) => {
  await intoResults(page);
  const rows = page.locator(".clinician-row");
  const count = await rows.count();
  expect(count).toBeGreaterThan(3);

  // The first and the last, because an index bug usually shows at an end.
  for (const index of [0, count - 1]) {
    const name = (await rows.nth(index).locator("strong").innerText()).trim();
    await rows.nth(index).click();
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /Back to results/i }).click();
    await expect(page.locator(".clinician-list")).toBeVisible();
  }
});

test("changing the suburb re-ranks in place instead of losing the search", async ({ page }) => {
  await intoResults(page);
  const before = await page.locator(".clinician-row strong").allInnerTexts();

  await page.getByLabel(/Where are you/i).fill("Mount Druitt");
  await expect(page.getByText(/nearest to Mount Druitt first/i)).toBeVisible();

  const after = await page.locator(".clinician-row strong").allInnerTexts();
  // Same people, and still on the same screen. The point of moving this field onto the results is
  // that editing it does not send anybody back a step.
  expect(after.sort()).toEqual(before.sort());
  expect(page.url()).toContain("/finder");
  await expect(page.locator(".clinician-list")).toBeVisible();
});

test("an uncovered suburb says so rather than silently ranking on nothing", async ({ page }) => {
  await intoResults(page);
  await page.getByLabel(/Where are you/i).fill("Bondi");
  await expect(page.getByText(/do not cover that one yet/i)).toBeVisible();
  await expect(page.locator(".clinician-row")).not.toHaveCount(0);
});

test("a booking can still be completed after the collapse", async ({ page }) => {
  await intoResults(page);
  await page.locator(".clinician-row").first().click();

  const book = page.getByRole("button", { name: /request|appointment|book/i }).first();
  await book.click();
  await expect(page.getByRole("radiogroup")).toBeVisible({ timeout: 10000 });
  await page.getByRole("radio").first().click();
  await page.getByRole("button", { name: "Send request" }).click();
  await expect(page.getByText("Request ready")).toBeVisible();
});

test("refine returns to typing with the words already there", async ({ page }) => {
  await intoResults(page);
  await page.getByRole("button", { name: /Change what you said/i }).click();
  const box = page.getByRole("textbox");
  await expect(box).toBeVisible();
  expect((await box.inputValue()).length).toBeGreaterThan(10);

  await box.fill("I would like an ADHD assessment and I speak Vietnamese");
  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 2500 });
});

test("no screen the collapse removed is still reachable", async ({ page }) => {
  // A button left pointing at a deleted stage renders NOTHING, because every screen is gated on a
  // stage equality check. An empty main is the signature of that bug, so it is asserted directly.
  await intoResults(page);
  for (const click of [
    () => page.locator(".clinician-row").first().click(),
    () => page.getByRole("button", { name: /All results/i }).click(),
  ]) {
    await click();
    const text = await page.locator("main").innerText();
    expect(text.trim().length, "a stage rendered nothing").toBeGreaterThan(40);
  }
});
