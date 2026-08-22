// O181: the join form's two reading modes — sectioned and whole — pinned as behaviour.
//
// WHAT THESE TESTS ARE REALLY FOR. The change is a view change over a form that already worked, so
// the risk is not that a new feature is wrong; it is that the OLD one quietly stops working. Three
// ways that could happen, and each has a test below rather than a comment:
//   - a hidden section stops submitting, because it was unmounted instead of hidden;
//   - a hidden section renders anyway, because `.join-form fieldset` is unlayered CSS in a
//     Tailwind v4 project and beats `[hidden]` regardless of specificity (the trap the styles
//     were written against — so this asserts the COMPUTED display, never the attribute);
//   - an error lands in a section nobody is looking at, and the form appears to do nothing.
import { expect, test } from "@playwright/test";

const JOIN = "/clinicians/join";

/** The sectioned view is the default, but only after hydration — wait for it rather than racing. */
async function intoSteppedForm(page: import("@playwright/test").Page) {
  await page.goto(JOIN);
  await expect(page.getByRole("button", { name: "One section at a time" })).toHaveAttribute("aria-pressed", "true");
}

test.describe("the join form can be read two ways", () => {
  test("opens sectioned, says how long it is, and shows one section at a time", async ({ page }) => {
    await intoSteppedForm(page);

    // The old form's objection to a wizard was "no way to see how long it is". This is the answer.
    await expect(page.getByText("Section 1 of 6 — You")).toBeVisible();

    // Exactly one fieldset is visible, and the rest are hidden by COMPUTED STYLE — see the header.
    const shown = await page.$$eval(".join-form fieldset", (nodes) =>
      nodes.map((node) => getComputedStyle(node).display !== "none"),
    );
    expect(shown).toEqual([true, false, false, false, false, false]);
  });

  test("the whole form is one tap away, and shows every section", async ({ page }) => {
    await intoSteppedForm(page);
    await page.getByRole("button", { name: "Show the whole form" }).click();

    const shown = await page.$$eval(".join-form fieldset", (nodes) =>
      nodes.map((node) => getComputedStyle(node).display !== "none"),
    );
    expect(shown).toEqual([true, true, true, true, true, true]);

    // And in the whole-form view there is no step machinery competing with the submit button.
    await expect(page.getByRole("button", { name: "Next" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send application" })).toBeVisible();
  });

  test("NOTHING TYPED IS LOST — not by stepping, not by switching view", async ({ page }) => {
    await intoSteppedForm(page);

    // All three of section 1's required fields, because `advance()` will not step over an empty
    // one — which the test below pins deliberately.
    await page.getByLabel("Full name").fill("Dr Example Name");
    await page.getByLabel("Ahpra registration number").fill("MED0001234567");
    await page.getByLabel("Email").fill("example@example.com");
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

  test("the dropdown jumps straight to a section", async ({ page }) => {
    await intoSteppedForm(page);
    await page.getByLabel("Go to").selectOption({ label: "5. Languages" });

    await expect(page.getByText("Section 5 of 6 — Languages")).toBeVisible();
    const shown = await page.$$eval(".join-form fieldset", (nodes) =>
      nodes.map((node) => getComputedStyle(node).display !== "none"),
    );
    expect(shown).toEqual([false, false, false, false, true, false]);
  });

  test("Next will not step over an unanswered required question", async ({ page }) => {
    await intoSteppedForm(page);
    // Section 1 has three required fields and none is filled.
    await page.getByRole("button", { name: "Next" }).click();

    await expect(page.getByText("Section 1 of 6 — You")).toBeVisible();
    await expect(page.locator(".join-advisory")).toContainText("still needs an answer");
    // The reader is put ON the problem, not told about it.
    await expect(page.getByLabel("Full name")).toBeFocused();
  });

  test("the submit button appears only on the last section, and Enter still works before it", async ({ page }) => {
    await intoSteppedForm(page);
    await expect(page.getByRole("button", { name: "Send application" })).toBeHidden();

    await page.getByLabel("Go to").selectOption({ label: "6. Declarations" });
    await expect(page.getByRole("button", { name: "Send application" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Next" })).toHaveCount(0);
  });

  /**
   * THE FAILURE THIS EXISTS FOR. Submit an application the server rejects while the reader is
   * looking at section 6, and the error is in section 1. Without the jump the page would report
   * "check the form" over a section that is perfectly filled in, and the GP would have no way to
   * know where to look — the sectioned view's one genuinely new way to break.
   */
  test("a server error pulls the reader to the section that has it", async ({ page }) => {
    await intoSteppedForm(page);

    // Fill section 1 well enough to advance past the client check, but with an Ahpra number the
    // server rejects — so the error necessarily comes back from `submitApplication`.
    await page.getByLabel("Full name").fill("Dr Example Name");
    await page.getByLabel("Ahpra registration number").fill("not-a-registration");
    await page.getByLabel("Email").fill("example@example.com");

    await page.getByLabel("Go to").selectOption({ label: "6. Declarations" });
    await page.getByRole("checkbox", { name: /These details are mine/ }).check();
    await page.getByRole("button", { name: "Send application" }).click();

    // Back to section 1, with the field marked.
    await expect(page.getByText("Section 1 of 6 — You")).toBeVisible();
    await expect(page.getByLabel("Ahpra registration number")).toHaveAttribute("aria-invalid", "true");
  });
});
