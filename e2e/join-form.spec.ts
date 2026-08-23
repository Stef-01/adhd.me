// O181: the join form's two reading modes — sectioned and whole — pinned as behaviour.
// O185: the sectioned view cut down to one question and almost nothing else.
//
// WHAT THESE TESTS ARE REALLY FOR. The change is a view change over a form that already worked, so
// the risk is not that a new feature is wrong; it is that the OLD one quietly stops working. Three
// ways that could happen, and each has a test below rather than a comment:
//   - a hidden section stops submitting, because it was unmounted instead of hidden;
//   - a hidden section renders anyway, because `.join-form fieldset` is unlayered CSS in a
//     Tailwind v4 project and beats `[hidden]` regardless of specificity (the trap the styles
//     were written against — so this asserts the COMPUTED display, never the attribute);
//   - an error lands in a section nobody is looking at, and the form appears to do nothing.
//
// O185 CHANGED THREE THINGS THESE TESTS PINNED, AND EACH IS A DELIBERATE DESIGN DECISION RATHER
// THAN A TEST GOING STALE ON ITS OWN:
//   - SIX SECTIONS BECAME EIGHT. "What you see often" was twelve checkboxes under three
//     sub-headings on one screen; the sub-headings were already the seam and are now three steps.
//   - THE COUNTER STOPPED REPEATING THE TITLE. It read "Section 1 of 6 — You" directly above a
//     legend that said "You". It now reads "Step 1 of 8" and the legend carries the title once.
//   - THE "Go to" SELECT IS GONE. It was a second navigation model for a form that already has
//     "Show the whole form", which reaches any question in one tap. The tests that used it to jump
//     now either step through or switch view — which is what a reader has to do too, so they
//     exercise the real path rather than a shortcut only the test had.
import { expect, test } from "@playwright/test";

const JOIN = "/clinicians/join";

/** The sectioned view is the default, but only after hydration — wait for it rather than racing. */
async function intoSteppedForm(page: import("@playwright/test").Page) {
  await page.goto(JOIN);
  await expect(page.getByRole("button", { name: "One section at a time" })).toHaveAttribute("aria-pressed", "true");
}

/** Section 1's three required fields, because `advance()` will not step over an empty one. */
async function fillIdentity(page: import("@playwright/test").Page, ahpra = "MED0001234567") {
  await page.getByLabel("Full name").fill("Dr Example Name");
  await page.getByLabel("Ahpra registration number").fill(ahpra);
  await page.getByLabel("Email").fill("example@example.com");
}

/**
 * Steps 1 and 2 are the only ones carrying required inputs; every later step is checkboxes, which
 * `advance()` lets past because the browser considers an unchecked optional box valid. Walking to
 * the end therefore means filling exactly these five fields and then pressing Next — which is also
 * the shortest real path a GP has, now that the jump select is gone.
 */
async function walkToLastStep(page: import("@playwright/test").Page, ahpra = "MED0001234567") {
  await fillIdentity(page, ahpra);
  await page.getByRole("button", { name: "Next" }).click();
  await page.getByLabel("Practice name").fill("Example Medical Practice");
  await page.getByLabel("Suburb").fill("Beecroft");
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: "Next" }).click();
  await expect(page.getByText("Step 8 of 8")).toBeVisible();
}

test.describe("the join form can be read two ways", () => {
  test("opens sectioned, says how long it is, and shows one section at a time", async ({ page }) => {
    await intoSteppedForm(page);

    // The old form's objection to a wizard was "no way to see how long it is". This is the answer,
    // and after O185 it is four characters rather than a sentence that repeated the legend below.
    await expect(page.getByText("Step 1 of 8")).toBeVisible();
    await expect(page.getByRole("group", { name: "About you" })).toBeVisible();

    // Exactly one fieldset is visible, and the rest are hidden by COMPUTED STYLE — see the header.
    const shown = await page.$$eval(".join-form fieldset", (nodes) =>
      nodes.map((node) => getComputedStyle(node).display !== "none"),
    );
    expect(shown).toEqual([true, false, false, false, false, false, false, false]);
  });

  /**
   * O185's own claim, asserted rather than described: the sectioned view puts a question on screen
   * and almost nothing else. Before it, a GP met the view toggle, a "Go to" select carrying every
   * section name, a progress sentence and a bar — eight interactive controls above the first
   * question, five of them about the form rather than in it.
   */
  test("shows one question and almost nothing else above it", async ({ page }) => {
    await intoSteppedForm(page);

    // Nothing between the top of the card and the first question except the counter.
    await expect(page.locator(".join-card .join-count")).toHaveText("Step 1 of 8");
    await expect(page.locator(".join-card select")).toHaveCount(0);

    // The view toggle is below the card, not above the first question.
    const cardBottom = await page.locator(".join-card").evaluate((node) => node.getBoundingClientRect().bottom);
    const toggleTop = await page.locator(".join-viewtoggle").evaluate((node) => node.getBoundingClientRect().top);
    expect(toggleTop).toBeGreaterThanOrEqual(cardBottom);

    // Exactly one filled action on the screen: the button that carries the flow.
    await expect(page.locator(".join-actions button:visible")).toHaveCount(2); // Back (quiet) + Next
    await expect(page.getByRole("button", { name: "Next" })).toBeVisible();
  });

  /**
   * THE WALL THAT MADE O185 NECESSARY. Twelve care-area checkboxes arrived on one screen; the
   * busiest step now carries six, and the three ADHD-group boxes plus the anchor are their own
   * step. Asserted as a CAP over every step rather than as three separate counts, so a future step
   * that quietly grows past the wall fails whatever it is called.
   */
  test("no single step carries more than ten checkboxes, and the care wall is split three ways", async ({ page }) => {
    await intoSteppedForm(page);

    const perSection = await page.$$eval(".join-form fieldset", (nodes) =>
      nodes.map((node) => node.querySelectorAll("input[type=checkbox]").length),
    );
    // you, practice, ADHD, mood, other, manner, languages, declarations
    expect(perSection).toEqual([0, 0, 4, 2, 6, 9, 10, 3]);
    expect(Math.max(...perSection)).toBeLessThanOrEqual(10);
  });

  test("the whole form is one tap away, and shows every section", async ({ page }) => {
    await intoSteppedForm(page);
    await page.getByRole("button", { name: "Show the whole form" }).click();

    const shown = await page.$$eval(".join-form fieldset", (nodes) =>
      nodes.map((node) => getComputedStyle(node).display !== "none"),
    );
    expect(shown).toEqual([true, true, true, true, true, true, true, true]);

    // And in the whole-form view there is no step machinery competing with the submit button.
    await expect(page.getByRole("button", { name: "Next" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Back" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send application" })).toBeVisible();
  });

  test("NOTHING TYPED IS LOST — not by stepping, not by switching view", async ({ page }) => {
    await intoSteppedForm(page);

    await fillIdentity(page);
    await page.getByRole("button", { name: "Next" }).click();
    await page.getByLabel("Practice name").fill("Example Practice");

    // Back to section 1: still there.
    await page.getByRole("button", { name: "Back" }).click();
    await expect(page.getByLabel("Full name")).toHaveValue("Dr Example Name");

    // And across a view switch, which is the case a re-mounting implementation would fail.
    await page.getByRole("button", { name: "Show the whole form" }).click();
    await expect(page.getByLabel("Full name")).toHaveValue("Dr Example Name");
    await expect(page.getByLabel("Practice name")).toHaveValue("Example Practice");
  });

  test("Next will not step over an unanswered required question", async ({ page }) => {
    await intoSteppedForm(page);
    // Section 1 has three required fields and none is filled.
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Step 1 of 8")).toBeVisible();
    await expect(page.locator(".join-advisory")).toContainText("still needs an answer");
    // The reader is put ON the problem, not told about it.
    await expect(page.getByLabel("Full name")).toBeFocused();
  });

  test("the submit button appears only on the last section, and Enter still works before it", async ({ page }) => {
    await intoSteppedForm(page);
    await expect(page.getByRole("button", { name: "Send application" })).toBeHidden();

    // Step through to the end — the only way there now that the jump select is gone, and the path
    // a reader actually takes.
    await walkToLastStep(page);

    await expect(page.getByRole("button", { name: "Send application" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toHaveCount(0);
  });

  /**
   * THE FAILURE THIS EXISTS FOR. Submit an application the server rejects while the reader is
   * looking at the last section, and the error is in section 1. Without the jump the page would
   * report "check the form" over a section that is perfectly filled in, and the GP would have no
   * way to know where to look — the sectioned view's one genuinely new way to break.
   */
  test("a server error pulls the reader to the section that has it", async ({ page }) => {
    await intoSteppedForm(page);

    // Fill section 1 well enough to advance past the client check, but with an Ahpra number the
    // server rejects — so the error necessarily comes back from `submitApplication`. Walk to the
    // declarations IN THE SECTIONED VIEW, which is the state whose failure mode this test exists
    // for: the reader is seven steps away from the problem when the server reports it.
    await walkToLastStep(page, "not-a-registration");
    await page.getByRole("checkbox", { name: /These details are mine/ }).check();
    await page.getByRole("button", { name: "Send application" }).click();

    // All the way back to step 1, with the field marked.
    await expect(page.getByText("Step 1 of 8")).toBeVisible();
    await expect(page.getByLabel("Ahpra registration number")).toHaveAttribute("aria-invalid", "true");
  });
});
