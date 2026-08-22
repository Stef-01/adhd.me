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

test("relationship copy and booking-source clutter stay absent", async ({ page }) => {
  await intoProfile(page);
  await expect(page.locator(".disclosure-line")).toHaveCount(0);
  await expect(page.getByText(/Declared interest in ADHD\.ME/i)).toHaveCount(0);
  await expect(page.getByText("Live on Healthengine", { exact: true })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "See available times" })).toBeVisible();
});
