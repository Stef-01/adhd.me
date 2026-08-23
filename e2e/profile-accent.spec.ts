// taste-rule: type.accent-live-tokens

import { expect, test, type Page } from "@playwright/test";

async function intoProfile(page: Page) {
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.locator(".clinician-row").filter({ hasText: "Dr Anubhav Saxena" }).click();
  await expect(page.locator(".profile-content")).toBeVisible();
}

test("profile highlights are a quiet text line, not dated colored bubbles", async ({ page }) => {
  await intoProfile(page);
  const styles = await page.locator(".profile-facts").evaluate((list) => {
    const listStyle = getComputedStyle(list);
    return {
      background: listStyle.backgroundColor,
      borderWidth: listStyle.borderTopWidth,
      radius: listStyle.borderRadius,
      shadows: listStyle.boxShadow,
      items: [...list.children].map((item) => {
        const style = getComputedStyle(item);
        return { background: style.backgroundColor, border: style.borderTopWidth, radius: style.borderRadius };
      }),
    };
  });
  expect(styles.background).toBe("rgba(0, 0, 0, 0)");
  // The list is grouped by quiet dividers, not a container/card treatment.
  expect(styles.borderWidth).toBe("1px");
  expect(styles.radius).toBe("0px");
  expect(styles.shadows).toBe("none");
  for (const item of styles.items) {
    expect(item.background).toBe("rgba(0, 0, 0, 0)");
    expect(item.border).toBe("0px");
    expect(item.radius).toBe("0px");
  }
});

/**
 * O185 FOUND THIS RED ON `main` AND FIXED THE ASSERTION, NOT THE PRODUCT — and established which
 * of the two it was rather than assuming, by stashing O185's own diff and re-running against
 * `origin/main`, where it fails identically.
 *
 * IT IS THE FOURTH FOSSIL FROM THE SAME COMMIT. `4b9c9ab` ("feat: strengthen matching and simplify
 * clinician profiles") deleted the ownership disclosure and rewrote THREE e2e assertions to require
 * its ABSENCE; O184 restored the disclosure and swept ownership-disclosure, profile-sweep and
 * profile-layout — this is a fourth assertion of the same kind, in a spec about accent discipline,
 * which nothing in that sweep had reason to open. `pnpm verify` is green either way because it does
 * not run the browser, so nothing said so. That is O183's finding in a THIRD form, and it is the
 * standing argument for AR14's gate-state signal, still `available`.
 *
 * THE DISCLOSURE IS SUPPOSED TO BE THERE. It is a factual claim about a named real person with a
 * commercial interest in this directory; `src/quality/contradictions.ts`'s `DISCLOSE-2` requires it
 * by name, and a test demanding its absence contradicts the register that guards it. Asserted
 * POSITIVELY and by its text, so it cannot pass on an empty profile the way `toHaveCount(0)` could.
 *
 * WHAT THE TEST IS STILL FOR IS UNCHANGED: the SHORT LABEL renders beside the listing and the long
 * sentence does not (O184's own distinction, and the one `profile-layout.spec.ts` measures the fold
 * against), and no booking-source clutter comes back.
 */
test("the disclosure label renders, and relationship prose and booking-source clutter stay absent", async ({ page }) => {
  await intoProfile(page);
  // Dr Anubhav Saxena's own declared label (`src/demo/roster.ts`), not a characterisation of ours.
  await expect(page.locator(".disclosure-line")).toHaveText("First clinic partner");
  // The LONG form of the same statement stays off the profile — the label is what renders here.
  // Anchored to a clause that appears ONLY in `disclosedInterest`: "first clinic partner" occurs in
  // the label too, so a regex built on it would pass whether or not the paragraph were present.
  await expect(page.getByText(/Disclosed because he appears in a directory/i)).toHaveCount(0);
  await expect(page.getByText("Live on Healthengine", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "See available times" })).toBeVisible();
});
