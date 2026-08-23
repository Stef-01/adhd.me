import { expect, test, type Page } from "@playwright/test";

async function toProfile(page: Page) {
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.locator(".clinician-row").filter({ hasText: "Dr Anusha Saxena" }).click();
  await expect(page.locator(".profile-content")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const [name, viewport] of [
  ["desktop", { width: 1280, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test(`the bio and identity lead the profile (${name})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    await toProfile(page);

    const layout = await page.evaluate(() => {
      const rect = (selector: string) => document.querySelector(selector)!.getBoundingClientRect();
      const facts = document.querySelector(".profile-facts")!;
      const style = getComputedStyle(facts);
      return {
        portrait: rect(".profile-portrait").toJSON(),
        aboutTop: rect(".profile-about").top,
        firstDisclosureTop: rect(".profile-disclosures").top,
        factsBackground: style.backgroundColor,
        factsBorder: style.borderTopWidth,
        disclosureCount: document.querySelectorAll(".profile-disclosure").length,
        allClosed: [...document.querySelectorAll(".profile-disclosure")]
          .every((item) => !item.hasAttribute("open")),
        horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
        viewportHeight: innerHeight,
      };
    });

    expect(layout.aboutTop).toBeLessThan(layout.firstDisclosureTop);
    expect(layout.factsBackground).toBe("rgba(0, 0, 0, 0)");
    expect(layout.factsBorder).toBe("1px");
    expect(layout.disclosureCount).toBe(3);
    expect(layout.allClosed).toBe(true);
    expect(layout.horizontalOverflow).toBe(false);
    if (name === "phone") {
      expect(layout.portrait.width).toBeLessThanOrEqual(130);
      expect(layout.aboutTop).toBeLessThan(layout.viewportHeight / 2);
    }

    // O184: WAS `toHaveCount(0)` — a third guard that had been turned around to enforce the
    // disclosure's removal. This spec is about LAYOUT, so it should never have had an opinion about
    // whether a compliance notice exists; the count is asserted here only because the assertion was
    // already present and pointing the wrong way. The disclosure belongs in the identity block and
    // that is what this now checks.
    await expect(page.locator(".disclosure-line")).toHaveCount(1);
    await expect(page.getByText("Live on Healthengine", { exact: true })).toHaveCount(0);
    await expect(page.locator(".profile-footer").getByRole("button")).toHaveCount(1);
    await context.close();
  });
}

test("progressive disclosure opens known details without changing the page hierarchy", async ({ page }) => {
  await toProfile(page);
  const why = page.locator(".profile-disclosure").filter({ hasText: "Why matched" });
  await why.locator("summary").click();
  await expect(why).toHaveAttribute("open", "");
  await expect(why.locator(".profile-disclosure-body")).toBeVisible();
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
});
