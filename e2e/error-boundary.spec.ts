// U3 (O228): the error boundary, reached in a real browser.
//
// `src/compliance/boundary-copy.test.ts` renders each boundary with a thrown error and holds it to
// its copy; this is the other half — a page that actually throws while Next renders it, and a
// browser that shows the boundary rather than a blank frame or the framework's own screen. The
// fault fixture (`app/api/mock/fault/[kind]/page.tsx`) is behind the mock-route guard, so this
// spec runs only where the mock routes do.

import { expect, test } from "@playwright/test";
import { BOUNDARY_COPY } from "../src/compliance/boundary-copy";

test("a render error lands on the route boundary, with its sentence and both doors", async ({ page }) => {
  const res = await page.goto("/api/mock/fault/render");
  expect(res?.status(), "a caught render error is a 500 with a boundary, not a 200 that hides it").toBe(500);

  const main = page.locator("main#main-content");
  await expect(main.locator("h1")).toHaveText(BOUNDARY_COPY.route.heading);
  await expect(main.getByText(BOUNDARY_COPY.route.body)).toBeVisible();
  await expect(main.getByRole("button", { name: BOUNDARY_COPY.route.retry })).toBeVisible();
  await expect(main.getByRole("link", { name: BOUNDARY_COPY.route.home })).toHaveAttribute("href", "/");

  // Nothing of the error itself reaches the reader — not the fixture's message, not a digest,
  // not the framework's wording.
  const text = await page.locator("body").innerText();
  expect(text).not.toMatch(/fault fixture|digest|Application error|Internal Server Error/i);

  // The second door is a real navigation out of the failed tree.
  await main.getByRole("link", { name: BOUNDARY_COPY.route.home }).click();
  await expect(page).toHaveURL(/\/$/);
  await expect(page.locator("main#main-content")).toBeVisible();
  await expect(page.getByText(BOUNDARY_COPY.route.heading)).toHaveCount(0);
});

test("the fixture is a 404 for any other kind, so a sweep cannot trip it by accident", async ({ page }) => {
  const res = await page.goto("/api/mock/fault/anything-else");
  expect(res?.status()).toBe(404);
});
