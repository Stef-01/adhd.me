// Phase M (ADR 0007) verify gate, e2e half: the whole loop in a real browser. A person writes a
// request and sees up to three GPs with a reason each; a GP profile shows declared and checked
// as different words; the GP dashboard receives the request, sets capacity, and accepts it; the
// person then sees the acceptance, prepares, and both sides record how it went.

import { expect, test } from "@playwright/test";
import { MANAGER_EMAIL, signInAndOnboard } from "./support/session";

const NARRATIVE =
  "I think I have had ADHD my whole life. I want an adult assessment with someone who will not rush me. I have anxiety too, and telehealth would be easier.";

async function intake(page: import("@playwright/test").Page) {
  await page.goto("/match");
  await page.locator("#match-narrative").fill(NARRATIVE);
  await page.locator("#match-suburb").fill("Epping");
  await page.locator("#match-consult-style").selectOption("telehealth");
  await page.getByRole("button", { name: "Find my three" }).click();
  await expect(page).toHaveURL(/\/match\/results$/);
  await expect(page.getByTestId("match-cards")).toBeVisible();
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/matching");
});

test("a request comes back with up to three GPs, each with a reason and a status", async ({ page }) => {
  await intake(page);
  const cards = page.locator(".match-card");
  const count = await cards.count();
  expect(count).toBeGreaterThan(0);
  expect(count).toBeLessThanOrEqual(3);
  for (let i = 0; i < count; i++) {
    const card = cards.nth(i);
    await expect(card.locator(".match-headline")).not.toBeEmpty();
    await expect(card.locator(".match-points li").first()).toBeVisible();
    await expect(card.getByTestId("match-status")).toContainText("Sent to the GP");
    await expect(card).toContainText("Telehealth");
  }
  // The person's own words are never rendered back as a reason.
  await expect(page.getByTestId("match-cards")).not.toContainText("whole life");
});

test("the request lives in the tab, not the address bar, and a fresh tab has nothing to show", async ({ page, context }) => {
  await intake(page);
  expect(page.url()).not.toMatch(/whole|adhd\?|narrative/i);
  const fresh = await context.newPage();
  await fresh.goto("/match/results");
  await expect(fresh.getByRole("heading", { name: "Nothing to show yet" })).toBeVisible();
  await fresh.close();
});

test("a GP profile says declared and checked as different things, and shows no score", async ({ page, request }) => {
  await request.post("/api/mock/matching?seedFeedback=1");
  await page.goto("/gp/example-mei-chao");
  await expect(page.getByRole("heading", { level: 1 })).toContainText("Dr Mei Chao");
  await expect(page.getByRole("heading", { name: "Credentials, as declared and as checked" })).toBeVisible();
  await expect(page.getByTestId("felt-understood")).toContainText(/Of 7 people matched here/);
  const body = await page.locator("main").innerText();
  expect(body).not.toMatch(/★|\/ ?5\b|rated|reviews? (from|by)/i);
  await expect(page.getByRole("link", { name: "Get matched" })).toBeVisible();
});

test("the GP dashboard receives the request, takes a capacity, and accepts it; the person sees it and prepares", async ({ page, browser }) => {
  await intake(page);
  const first = page.locator(".match-card").first();
  const matchId = (await first.getAttribute("data-match"))!;
  const gpId = (await first.getAttribute("data-gp"))!;

  // The GP's side, in a second context so the patient's session storage stays where it is.
  const gpContext = await browser.newContext();
  const gpPage = await gpContext.newPage();
  await gpPage.request.post("/api/mock/console");
  await signInAndOnboard(gpPage, MANAGER_EMAIL);
  await gpPage.goto("/console/gp");
  await expect(gpPage.getByTestId("gp-list")).toBeVisible();
  await gpPage.goto(`/console/gp/${gpId}`);
  const request = gpPage.locator(`[data-testid="incoming-request"][data-match="${matchId}"]`);
  await expect(request).toBeVisible();
  await expect(request.locator("blockquote")).toContainText("whole life");

  // Capacity slider writes the declared places.
  await gpPage.getByTestId("capacity-slider").fill("2");
  await gpPage.getByTestId("capacity-save").click();
  await expect(gpPage.getByTestId("gp-saved")).toContainText("Capacity saved");
  await expect(gpPage.getByRole("heading", { name: /Capacity/ })).toBeVisible();

  // Accept.
  await gpPage.locator(`[data-testid="incoming-request"][data-match="${matchId}"]`).getByTestId("accept-request").click();
  await expect(gpPage.getByTestId("gp-saved")).toContainText("Answered");
  await expect(gpPage.getByTestId("accepted-request")).toHaveCount(1);
  // A second answer from a stale page is refused.
  await gpPage.goto(`/console/gp/${gpId}?saved=answered`);
  await expect(gpPage.locator(`[data-testid="incoming-request"][data-match="${matchId}"]`)).toHaveCount(0);

  // The person sees the acceptance and the prep page.
  await page.reload();
  const accepted = page.locator(`.match-card[data-match="${matchId}"]`);
  await expect(accepted.getByTestId("match-status")).toContainText("Accepted");
  await accepted.getByRole("link", { name: "Prepare for the first appointment" }).click();
  await expect(page).toHaveURL(/\/match\/prep$/);
  const checklist = page.getByTestId("match-checklist");
  await expect(checklist.locator("li")).not.toHaveCount(0);
  await expect(checklist).toContainText("Medicare card and photo ID");
  await expect(checklist).toContainText("School reports");
  await expect(page.getByRole("heading", { name: /What to expect with/ })).toBeVisible();
  const firstBox = checklist.locator('input[type="checkbox"]').first();
  await firstBox.check();
  await page.reload();
  await expect(page.getByTestId("match-checklist").locator('input[type="checkbox"]').first()).toBeChecked();

  // Both sides record how it went.
  await gpPage.getByTestId("complete-request").click();
  await expect(gpPage.getByTestId("gp-saved")).toContainText("Marked as done");
  await gpPage.getByTestId("gp-feedback-submit").click();
  await expect(gpPage.getByTestId("gp-feedback-recorded")).toBeVisible();
  await expect(gpPage.getByTestId("gp-aggregate")).toBeVisible();

  await page.goto("/match/feedback");
  await expect(page.getByRole("heading", { name: "How did it go?" })).toBeVisible();
  for (const key of ["fit", "communication", "clinicalAppropriateness"]) {
    await page.locator(`[aria-labelledby="q-${key}"] button`).nth(4).click();
  }
  await page.getByRole("button", { name: "Send" }).click();
  await expect(page.getByTestId("feedback-sent")).toBeVisible();

  await gpContext.close();
});

test("declining needs a reason, and the person sees the reason on their side", async ({ page, browser }) => {
  await intake(page);
  const first = page.locator(".match-card").first();
  const matchId = (await first.getAttribute("data-match"))!;
  const gpId = (await first.getAttribute("data-gp"))!;
  const gpContext = await browser.newContext();
  const gpPage = await gpContext.newPage();
  await gpPage.request.post("/api/mock/console");
  await signInAndOnboard(gpPage, MANAGER_EMAIL);
  await gpPage.goto(`/console/gp/${gpId}`);
  const request = gpPage.locator(`[data-testid="incoming-request"][data-match="${matchId}"]`);
  await request.locator('select[name="reason"]').selectOption("outside_scope");
  await request.getByTestId("decline-request").click();
  await expect(gpPage.getByTestId("gp-saved")).toContainText("Answered");
  await page.reload();
  await expect(page.locator(`.match-card[data-match="${matchId}"]`).getByTestId("match-status")).toContainText("Outside what I see");
  await gpContext.close();
});

test("signed-out access to the GP dashboard redirects to sign-in", async ({ page }) => {
  await page.goto("/console/gp");
  await expect(page).toHaveURL(/\/console\/signin$/);
});
