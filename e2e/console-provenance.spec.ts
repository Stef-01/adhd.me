// O126 (explaining the fit, Q4): the doctor sees the provenance the patient sees.
//
// The unity is pinned in the unit tests (console phrase === patient phrase, character for
// character). This asserts the console actually RENDERS it — a field carried through the audit
// and never printed would satisfy every unit test and show the doctor nothing.

import { expect, test, type Page } from "@playwright/test";

async function signInAsPracticeOwner(page: Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("owner@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("every asked facet on the console names the words that reached it (O126)", async ({ page }) => {
  await signInAsPracticeOwner(page);
  await page.goto("/console/matching");

  const rows = page.locator(".mc-asked li");
  await expect(rows.first()).toBeVisible();
  const count = await rows.count();
  expect(count).toBeGreaterThan(0);

  // Every row carries its provenance, not just the first.
  for (let i = 0; i < count; i++) {
    await expect(rows.nth(i)).toContainText("reached by");
  }

  await page.locator("section[aria-labelledby='audit-h']").screenshot({
    path: "qa/_runs/provenance-o126/asked-desktop.png",
  });
});

test("the console reads the phrase as a match, not as a quotation (O126)", async ({ page }) => {
  await signInAsPracticeOwner(page);
  await page.goto("/console/matching");

  // `matched` is the lexicon's cue — every token stem-matched, in order — and not a verbatim
  // extract, so neither surface may claim to be quoting the reader. The patient side says
  // "from your words"; this says "reached by". Both true; neither says "they said".
  const asked = await page.locator(".mc-asked").first().innerText();
  expect(asked).not.toContain("they said");
  expect(asked).not.toContain("the patient said");
});
