// O102 (explaining the fit, Q3): the side-by-side, walked and held to its honesty rules.
//
// It asserts the SHAPE and the two things this screen is not allowed to become: a ranking of
// one named doctor against another, and a table that appears when there is nothing to put in
// it. Copy is asserted by the compliance sweeps; the lines checked here are the ones whose
// ABSENCE would change what the screen claims.

import { expect, test, type Page } from "@playwright/test";

async function intoProfile(page: Page, request: string) {
  await page.goto("/finder");
  await page.locator("#welcome-request").fill(request);
  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.locator(".clinician-row").first().click();
  await expect(page.locator(".profile-screen")).toBeVisible();
}

const MULTI_ASK =
  "I want a woman GP who bulk bills and can do telehealth, and I need a longer first appointment";

test("a profile offers the neighbour in the order, and the compare opens on both names", async ({ page }) => {
  await intoProfile(page, MULTI_ASK);

  const control = page.locator(".profile-compare-action");
  await expect(control).toBeVisible();
  await control.click();

  await expect(page.locator(".compare-screen")).toBeVisible();
  // Both GPs are named on the screen — the whole point is that it is about two people.
  await expect(page.locator(".compare-head")).toHaveCount(2);
  await expect(page.locator(".compare-group li")).not.toHaveCount(0);
});

test("rows are grouped by what they can tell the reader, differences first", async ({ page }) => {
  await intoProfile(page, MULTI_ASK);
  await page.locator(".profile-compare-action").click();
  await expect(page.locator(".compare-screen")).toBeVisible();

  const headings = await page.locator(".compare-group h2").allTextContents();
  expect(headings.length).toBeGreaterThan(0);
  // Whichever groups this query produces, the deciding one is never buried under the rest.
  if (headings.includes("Where they differ")) {
    expect(headings[0]).toBe("Where they differ");
  }
  // Every rendered group has rows: an empty group would be a heading making a promise.
  for (const group of await page.locator(".compare-group").all()) {
    expect(await group.locator("li").count()).toBeGreaterThan(0);
  }
});

test("the table says whose claim it is, and refuses to be a ranking", async ({ page }) => {
  await intoProfile(page, MULTI_ASK);
  await page.locator(".profile-compare-action").click();
  await expect(page.locator(".compare-screen")).toBeVisible();

  // W193's posture, stated once for the whole table.
  const basis = page.locator(".compare-basis");
  await expect(basis).toBeVisible();
  await expect(basis).toContainText("declares about their own practice");
  await expect(basis).toContainText("not a ranking");

  // No score, no total, no winner. These would each be a quality judgement about a named
  // real person, which is the one thing this product never makes.
  const body = (await page.locator(".compare-content").innerText()).toLowerCase();
  for (const forbidden of ["better", "best", "winner", "score", "%", "out of"]) {
    expect(body).not.toContain(forbidden);
  }
});

test("no compare is offered when the words reached nothing to compare on", async ({ page }) => {
  // Nothing in this reaches a facet, so there are no asks and therefore no rows. A table of
  // nothing would be a claim of thoroughness with nothing behind it.
  await intoProfile(page, "qqzz wibble");
  await expect(page.locator(".profile-compare-action")).toHaveCount(0);
});

test("the second column's name is a way to that profile", async ({ page }) => {
  await intoProfile(page, MULTI_ASK);
  await page.locator(".profile-compare-action").click();

  await expect(page.locator(".compare-screen")).toBeVisible();
  const otherName = (await page.locator(".compare-open").innerText()).trim();
  await page.locator(".compare-open").click();

  await expect(page.locator(".profile-screen")).toBeVisible();
  await expect(page.locator(".profile-content h1")).toContainText(otherName.replace(/^Dr\s+/, ""));
});

test("back from the compare returns to the profile it was opened from", async ({ page }) => {
  await intoProfile(page, MULTI_ASK);
  const name = await page.locator(".profile-content h1").innerText();
  await page.locator(".profile-compare-action").click();
  await expect(page.locator(".compare-screen")).toBeVisible();

  await page.getByRole("button", { name: "Back to profile" }).click();
  await expect(page.locator(".profile-screen")).toBeVisible();
  await expect(page.locator(".profile-content h1")).toHaveText(name);
});
