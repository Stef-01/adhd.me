import { expect, test, type Page } from "@playwright/test";

const MULTI_ASK =
  "I want a woman GP who bulk bills and can do telehealth, and I need a longer first appointment";

async function intoResults(page: Page, request = MULTI_ASK) {
  await page.goto("/finder");
  await page.locator("#welcome-request").fill(request);
  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}

async function openCompare(page: Page) {
  await page.locator(".clinician-row").first().click();
  await expect(page.locator(".profile-screen")).toBeVisible();
  const why = page.locator(".profile-disclosure").filter({ hasText: "Why matched" });
  await why.locator("summary").click();
  await why.getByRole("button", { name: /Compare with Dr/ }).click();
  await expect(page.locator(".compare-screen")).toBeVisible();
}

test("comparison is tucked inside the profile's match explanation", async ({ page }) => {
  await intoResults(page);
  await expect(page.getByRole("button", { name: /Compare with Dr/ })).toHaveCount(0);

  await page.locator(".clinician-row").first().click();
  await expect(page.locator(".profile-screen")).toBeVisible();
  await expect(page.locator(".profile-compare")).not.toBeVisible();
  const why = page.locator(".profile-disclosure").filter({ hasText: "Why matched" });
  await why.locator("summary").click();
  await expect(why.getByRole("button", { name: /Compare with Dr/ })).toBeVisible();
});

test("comparison opens on both names and groups useful rows first", async ({ page }) => {
  await intoResults(page);
  await openCompare(page);

  await expect(page.locator(".compare-head")).toHaveCount(2);
  await expect(page.locator(".compare-group li")).not.toHaveCount(0);
  const headings = await page.locator(".compare-group h2").allTextContents();
  if (headings.includes("Where they differ")) expect(headings[0]).toBe("Where they differ");
  for (const group of await page.locator(".compare-group").all()) {
    expect(await group.locator("li").count()).toBeGreaterThan(0);
  }
});

test("the table states its basis and refuses to become a ranking", async ({ page }) => {
  await intoResults(page);
  await openCompare(page);

  const basis = page.locator(".compare-basis");
  await expect(basis).toContainText("declares about their own practice");
  await expect(basis).toContainText("not a ranking");
  const body = (await page.locator(".compare-content").innerText()).toLowerCase();
  for (const forbidden of ["better", "best", "winner", "score", "%", "out of"]) {
    expect(body).not.toContain(forbidden);
  }
});

test("no comparison is offered when the words produced no rows", async ({ page }) => {
  await intoResults(page, "qqzz wibble");
  await page.locator(".clinician-row").first().click();
  const why = page.locator(".profile-disclosure").filter({ hasText: "Why matched" });
  await why.locator("summary").click();
  await expect(why.getByRole("button", { name: /Compare with Dr/ })).toHaveCount(0);
});

test("the other name opens that profile, while back returns to results", async ({ page }) => {
  await intoResults(page);
  await openCompare(page);

  const otherName = (await page.locator(".compare-open").innerText()).trim();
  await page.locator(".compare-open").click();
  await expect(page.locator(".profile-content h1")).toContainText(otherName.replace(/^Dr\s+/, ""));

  await page.getByRole("button", { name: "Back to results" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible();
  await openCompare(page);
  await page.getByRole("button", { name: "Back to results" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible();
});
