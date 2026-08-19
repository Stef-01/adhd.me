// O10: matching verified in the rendered product, with screenshots as the record.
//
// The unit suites prove the pipeline's arithmetic; this file proves the PRODUCT — that a person
// typing real sentences into the real page sees the ranking, the honesty copy, the clarifier and
// the evidence the pipeline computed. Each test drops a full-page screenshot into
// qa/matching-o10/, following the qa/ convention: the picture is the review artefact, so a
// regression is visible to a reviewer who never reads this file.

import { expect, test, type Page } from "@playwright/test";
import { clinicians } from "../src/demo/clinicians";
import { clarifiers } from "../src/matching/clarify";

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
  await expect(page.getByText(/everyone we list/)).toBeVisible();
  // O46: unearned words are a quiet quote, not a display headline — and the bare count
  // ("3 of 3.") is gone when everyone is shown anyway, because it said nothing.
  await expect(page.locator(".results-head h1")).toHaveCount(0);
  await expect(page.locator(".results-request-quote")).toContainText("Hello there");
  await expect(page.locator(".results-head")).not.toContainText(/\d+ of \d+\./);
  await page.screenshot(shot("04-unmatched-says-so"));
});

test("answering the one question visibly turns a non-order into an order (W225+O5)", async ({ page }) => {
  await searchFor(page, "hello there");
  await expect(page.getByText(/One answer would narrow it/)).toBeVisible();
  await page.screenshot(shot("05-clarifier-offered"));

  // Tap the first question the product itself would offer — computed from the same function
  // the page renders, so a re-scoped care vocabulary (the W221 merge retired the hardcoded
  // physical-checks prompt this test used to name) cannot strand the spec. Every offered
  // question splits the roster by construction, so answering must earn the order.
  const offered = clarifiers("hello there", clinicians, 1)[0]!;
  await page.getByRole("button", { name: offered.prompt }).click();
  await expect(page.locator(".clinician-list")).toBeVisible();
  await expect(page.getByText(/everyone we list/)).toHaveCount(0);
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

test("the query that failed in production now reads both halves (O13)", async ({ page }) => {
  await searchFor(page, "Kind Hindi speaking and non judgemental");
  // The non_judgmental declarer first, both cards carrying Hindi, no disclaimer banner:
  // the order is earned, where production (pre-overhaul main) showed 'unmatched' beside
  // Hindi-speaking evidence and a count line claiming a ranking.
  await expect(page.locator(".clinician-row strong").first()).toHaveText(/Saxena/);
  await expect(page.getByText(/everyone we list/)).toHaveCount(0);
  await page.screenshot(shot("09-production-failure-query-now-reads"));
});

test("a psychographic ask ranks, explains, and shows its provenance on screen (O30)", async ({ page }) => {
  // Values-level language on both sides of the roster's manner split: plain-language reaches
  // sense_making (Dr Saxena declares it), faith-in-the-room reaches culturally_attuned
  // (Dr Yadav declares it). Both rows must carry their reason, and the profile must quote
  // the provenance — the O21 "from your words" line — for a phrase added in O30.
  await searchFor(page, "explain things in plain language and someone who respects my faith");
  const rows = page.locator(".clinician-row");
  await expect(rows.first().getByText("Helps it make sense").or(rows.first().getByText("Understands your background"))).toBeVisible();
  await page.screenshot({ path: "qa/matching-o30/01-psychographic-ask-ranked.png", fullPage: true });

  await rows.first().click();
  await expect(page.getByText(/from your words/).first()).toBeVisible();
  await page.screenshot({ path: "qa/matching-o30/02-psychographic-provenance.png", fullPage: true });
});

test("the neurodiversity ask is read, and unanswered honestly while nobody declares it (O30)", async ({ page }) => {
  // "neurodiversity affirming" reaches Strengths-focused — a facet NO roster member declares
  // today. The honest render is the point: the words are understood (not the unmatched
  // banner), but no row claims a strengths reason it has not declared.
  await searchFor(page, "a neurodiversity affirming doctor who explains in plain language");
  await expect(page.locator(".clinician-list")).toBeVisible();
  await expect(page.locator(".clinician-row").getByText("Strengths-focused")).toHaveCount(0);
  await page.screenshot({ path: "qa/matching-o30/03-neurodiversity-honest-nondeclaration.png", fullPage: true });
});

test("a triple ask — language, psychographic, care — reads all three families at once (O33)", async ({ page }) => {
  // The recursive edge case: three vocabularies in one sentence. Urdu (language pipeline),
  // no-jargon (O30 psychographic), titration (care). All three must appear as evidence, and
  // the order must be earned (Dr Saxena declares Urdu + sense_making + titration).
  await searchFor(page, "an Urdu speaking GP who explains without the jargon, my dose needs titration");
  await expect(page.locator(".clinician-row strong").first()).toHaveText(/Saxena/);
  await expect(page.getByText(/not a ranking|everyone we list/)).toHaveCount(0);
  await page.locator(".clinician-row").first().click();
  await expect(page.getByText("Urdu-speaking").first()).toBeVisible();
  await page.screenshot({ path: "qa/matching-o30/04-triple-ask-language-psychographic-care.png", fullPage: true });
});

test("the woman-GP ask the roster could never answer now ranks Dr Anusha Saxena first (O34)", async ({ page }) => {
  // The founder's instruction, verified in pixels: she is live, she is first on the ask that
  // motivated listing her, the reason is printed, and the monogram renders (no photo, by her
  // choice) rather than a placeholder or a gap.
  await searchFor(page, "I would prefer a woman doctor for an ADHD assessment");
  await expect(page.locator(".clinician-row strong").first()).toHaveText(/Anusha/);
  await expect(page.getByText(/not a ranking|everyone we list/)).toHaveCount(0);
  await page.screenshot({ path: "qa/matching-o34/01-woman-gp-ranked-first.png", fullPage: true });
  await page.locator(".clinician-row").first().click();
  await expect(page.getByText("Dr Anusha Saxena").first()).toBeVisible();
  await expect(page.getByText(/from your words/).first()).toBeVisible();
  await page.screenshot({ path: "qa/matching-o34/02-anusha-profile.png", fullPage: true });

  // O44: her booking path, walked to the handoff. The bar is a fixed overlay, so the evidence
  // here is a viewport shot — fullPage screenshots drop fixed elements, which is how the last
  // capture showed a profile with no way to book. And the copy is pinned pronoun-clean: the
  // screen once said "held by his practice" to a she/her clinician.
  const bookingBar = page.locator(".profile-footer");
  await expect(bookingBar).toBeVisible();
  await page.screenshot({ path: "qa/matching-o34/03-anusha-booking-bar.png" });
  await bookingBar.getByRole("button", { name: "See available times" }).click();
  const bookingCopy = await page.locator(".booking-content").textContent();
  expect(bookingCopy).toContain("held by the practice");
  expect(bookingCopy).not.toMatch(/\bhis\b/);
  await expect(page.locator(".bottom-action a.primary-button")).toHaveAttribute(
    "href",
    "/go/anusha-saxena?src=finder",
  );
  await page.screenshot({ path: "qa/matching-o34/04-anusha-booking-screen.png" });
});
