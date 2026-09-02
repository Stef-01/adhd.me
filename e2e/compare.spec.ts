import { expect, test, type Page } from "@playwright/test";

const MULTI_ASK =
  "I want a woman GP who bulk bills and can do telehealth, and I need a longer first appointment";

async function intoResults(page: Page, request = MULTI_ASK) {
  await page.goto("/");
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

test("the comparison heading renders in the display face, not the body face", async ({ page }) => {
  // O193, and it exists because O192 changed this line without anybody looking at the screen.
  //
  // `.compare-content h1` named `var(--font-display)` — a variable this tree never defines. O192
  // corrected it in a sweep over eight such declarations, seven of which were on /network and were
  // checked by screenshot. This one was not, so the correction shipped unverified.
  //
  // MEASURED HERE RATHER THAN ASSUMED, AND THE MEASUREMENT CORRECTED THE STORY. An undefined
  // `var()` does not fall through to the rest of the stack — it makes the whole declaration invalid
  // at computed-value time, and `font-family` is inherited, so the element computed to the BODY's
  // stack. This heading was rendering in Inter, the same face as the paragraphs under it, not in
  // the Georgia fallback sitting right there in its own declaration. That is why a fallback in a
  // font stack after a `var()` buys nothing, and why DECLARED_FONT_STACKS pins the whole set.
  await intoResults(page);
  await openCompare(page);
  const family = await page
    .locator(".compare-content h1")
    .evaluate((el) => getComputedStyle(el).fontFamily);
  expect(family, "the comparison heading fell back to the body face").toContain("Newsreader");
});

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
