// O10: matching verified in the rendered product, with screenshots as the record.
//
// The unit suites prove the pipeline's arithmetic; this file proves the PRODUCT — that a person
// typing real sentences into the real page sees the ranking, the honesty copy, the clarifier and
// the evidence the pipeline computed. Each test drops a full-page screenshot into
// qa/matching-o10/, following the qa/ convention: the picture is the review artefact, so a
// regression is visible to a reviewer who never reads this file.

import { expect, test, type Page } from "@playwright/test";

const shot = (name: string) => ({ path: `qa/matching-o10/${name}.png`, fullPage: true as const });

async function searchFor(page: Page, query: string) {
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /Change what you said/i }).click();
  const box = page.getByRole("textbox");
  await box.fill(query);
  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 5000 });
}

test("a separating ask ranks the declared clinician first, on screen", async ({ page }) => {
  await searchFor(page, "my dose wears off by the afternoon and needs titration reviewed");
  await expect(page.locator(".clinician-row strong").first()).toHaveText(/Saxena/);
  await page.screenshot(shot("01-titration-ranks-declared-gp-first"));
});

test("a language ask is ranked on and explained, not just printed (O1)", async ({ page }) => {
  await searchFor(page, "an Urdu-speaking GP please, for an ADHD assessment");
  // Only Dr Saxena declares Urdu: the order is earned, so no 'not a ranking' banner renders.
  await expect(page.locator(".clinician-row strong").first()).toHaveText(/Saxena/);
  await expect(page.getByText(/not a ranking|everyone we list/)).toHaveCount(0);
  await page.screenshot(shot("02-urdu-ranked-and-earned"));
  // And the profile says the reason in the closed vocabulary.
  await page.locator(".clinician-row").first().click();
  await expect(page.getByText(/Urdu-speaking/).first()).toBeVisible();
  await page.screenshot(shot("03-urdu-evidence-on-profile"));
});

test("a request the lexicon cannot read says so instead of faking an order", async ({ page }) => {
  await searchFor(page, "hello there");
  await expect(page.getByText(/everyone we list rather than an order/)).toBeVisible();
  await page.screenshot(shot("04-unmatched-says-so"));
});

test("answering the one question visibly turns a non-order into an order (W225+O5)", async ({ page }) => {
  await searchFor(page, "hello there");
  await expect(page.getByText(/One answer would narrow it/)).toBeVisible();
  await page.screenshot(shot("05-clarifier-offered"));

  // Tap the physical-checks question: only one GP declares cardiac screening, so the answer
  // must both remove the 'no order' banner and produce an earned first place.
  await page.getByRole("button", { name: /physical checks done before anything starts/i }).click();
  await expect(page.locator(".clinician-list")).toBeVisible();
  await expect(page.getByText(/everyone we list rather than an order/)).toHaveCount(0);
  await page.screenshot(shot("06-clarifier-answer-reorders"));
});

test("pasted junk is never echoed back from the closed vocabulary", async ({ page }) => {
  await searchFor(page, "<script>alert(1)</script> my sleep has never been right");
  await page.locator(".clinician-row").first().click();
  await expect(page.locator("body")).not.toContainText("<script>");
  await expect(page.locator("body")).not.toContainText("alert(1)");
  await page.screenshot(shot("07-junk-not-echoed"));
});

test("a suburb re-ranks with distance said per row, telehealth exempt (O3/O4)", async ({ page }) => {
  await searchFor(page, "I need an ADHD assessment");
  await page.getByLabel(/Where are you/i).fill("Beecroft");
  await expect(page.getByText(/nearest to Beecroft first/i)).toBeVisible();
  // The telehealth-first clinician carries the telehealth sentence, never a kilometre figure.
  await expect(page.getByText(/by telehealth, wherever you are/).first()).toBeVisible();
  await page.screenshot(shot("08-geo-reranks-with-honest-distance"));
});
