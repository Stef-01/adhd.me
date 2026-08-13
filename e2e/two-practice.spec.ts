// W166 verify gate: "the console renders two practices, and the scoping assertions impossible
// since Y2 finding B2 now run end-to-end."
//
// Y2's audit filed B2 as a PROCESS finding rather than a defect: `ConsoleState.practice` was a
// single nullable practice and the id was the literal `prac-console` in three places, so a second
// practice could not exist and console-side scoping could not be tested in a browser at all. Y3's
// audit carried it forward untouched. These are the tests that could not be written.
//
// Note what is asserted and what is not. A browser session is ONE signed-in identity, so what it
// can prove is that a user who belongs to two practices sees them apart, and that a user who
// belongs to one cannot reach the other by asking. Two simultaneous sessions are still out of
// scope for Playwright here (W83's rule against theatre), and the cross-practice write isolation
// they would test is unit-tested instead.

import { expect, test } from "@playwright/test";

const OWNER = "owner@demo.practice.example";
const OUTSIDER = "stranger@elsewhere.example";

async function signIn(page: import("@playwright/test").Page, email: string) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
}

async function onboard(page: import("@playwright/test").Page, name: string, holdout: string) {
  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill(name);
  await page.getByLabel("Holdout share (%)").fill(holdout);
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("one owner, two practices: both are offered and the console says which it is on", async ({ page }) => {
  await signIn(page, OWNER);
  await onboard(page, "Harbour Family Practice", "10");
  await onboard(page, "Riverside Medical", "20");

  await page.goto("/console");
  await expect(page.getByTestId("practice-switcher")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Practice" })).toContainText("Harbour Family Practice");
  await expect(page.getByRole("combobox", { name: "Practice" })).toContainText("Riverside Medical");
});

test("switching practice changes what the console shows, and holds across pages", async ({ page }) => {
  // The rules config is per practice now. Two practices with different holdouts prove the
  // console is reading the active one rather than the only one.
  await signIn(page, OWNER);
  await onboard(page, "Harbour Family Practice", "10");
  await onboard(page, "Riverside Medical", "20");

  await page.goto("/console");
  await page.getByRole("combobox", { name: "Practice" }).selectOption({ label: "Harbour Family Practice" });
  await page.getByRole("button", { name: "Switch" }).click();
  // The heading, not any text — the switcher's own <option> carries the same words.
  await expect(page.getByRole("heading", { name: "Harbour Family Practice" })).toBeVisible();

  // The selection survives navigation — it is a cookie, not a query parameter.
  await page.goto("/console/rules");
  await page.goto("/console");
  await expect(page.getByRole("combobox", { name: "Practice" })).toHaveValue(/prac-/);
});

test("a single-practice user is offered no switcher", async ({ page }) => {
  // A control offering one choice is furniture. Also the non-vacuity guard for the test above:
  // without this, the switcher assertions could be passing on a component that always renders.
  await signIn(page, OWNER);
  await onboard(page, "Harbour Family Practice", "10");
  await page.goto("/console");
  await expect(page.getByTestId("practice-switcher")).toHaveCount(0);
});

test("a user who belongs to no practice cannot reach another's console", async ({ page, context }) => {
  // The assertion Y2 filed as untestable. The outsider signs in legitimately and has no
  // membership anywhere, so every console surface sends them to onboarding rather than showing
  // somebody else's practice.
  await signIn(page, OWNER);
  await onboard(page, "Harbour Family Practice", "10");

  await context.clearCookies();
  await signIn(page, OUTSIDER);
  // Practice-scoped surfaces only. `/console/dashboard` is deliberately NOT in this list: it
  // renders the deterministic simulation (W14), not any practice's data, so it has no practice
  // to scope to. Worth knowing rather than assuming — the day it shows a real practice's
  // numbers it belongs here, and this comment is what should make that obvious.
  for (const path of ["/console", "/console/rules", "/console/verticals"]) {
    await page.goto(path);
    await expect(page, path).toHaveURL(/\/console\/onboarding$/);
  }
  await expect(page.getByText("Harbour Family Practice")).toHaveCount(0);
});

test("asking for a practice you do not belong to is refused, not honoured", async ({ page, context }) => {
  // The cookie is a PREFERENCE, never a grant. Forging it must pick nothing.
  await signIn(page, OWNER);
  await onboard(page, "Harbour Family Practice", "10");
  const owned = await page.getByRole("heading", { level: 1 }).first().textContent();
  expect(owned).toBeTruthy();

  await context.clearCookies();
  await signIn(page, OUTSIDER);
  await context.addCookies([
    { name: "meherr_practice", value: "prac-1", domain: "127.0.0.1", path: "/" },
  ]);
  await page.goto("/console");
  // Membership is the grant, so the forged selection resolves to nothing at all.
  await expect(page).toHaveURL(/\/console\/onboarding$/);
});
