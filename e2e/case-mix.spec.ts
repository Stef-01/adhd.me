// W81 verify gate: a GP states their preferred case mix in the console.
// The rules (own interest only, appetite not ability) are unit-tested in
// src/capability/interest.test.ts; this drives the real surface.

import { expect, test } from "@playwright/test";

type Page = import("@playwright/test").Page;
type Request = import("@playwright/test").APIRequestContext;

const GP = "gp@demo.practice.example";

async function signInOnboardAndLink(page: Page, request: Request, linkEmail: string | null) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill(GP);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);

  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);

  // Seed the roster and link (or deliberately do not link) this sign-in to it. Driving the
  // W41 wizard here would test the wizard, not the case-mix surface.
  await request.post(`/api/mock/case-mix${linkEmail ? `?linkEmail=${encodeURIComponent(linkEmail)}` : ""}`);
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
  await request.post("/api/mock/registers");
});

test("signed-out access to the case-mix page redirects to sign-in", async ({ page }) => {
  await page.goto("/console/case-mix");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("a sign-in not linked to a clinician is refused, not guessed at", async ({ page, request }) => {
  await signInOnboardAndLink(page, request, null);
  await page.goto("/console/case-mix");

  await expect(page.getByTestId("case-mix-unlinked")).toBeVisible();
  // No preference form at all — there is nobody to record one for.
  await expect(page.getByTestId("strength-placeholder_register_a")).toHaveCount(0);
});

test("a linked GP states their case mix and it persists", async ({ page, request }) => {
  await signInOnboardAndLink(page, request, GP);
  await page.goto("/console/case-mix");
  await expect(page.getByRole("heading", { name: "Your case mix" })).toBeVisible();

  await page.getByTestId("strength-placeholder_register_a").selectOption("4");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByTestId("case-mix-saved")).toBeVisible();

  const after = (await (await request.get("/api/mock/case-mix")).json()) as {
    interests: Array<{ clinicianId: string; conditionCode: string; strength: number; source: string }>;
  };
  expect(after.interests).toHaveLength(1);
  expect(after.interests[0]!.conditionCode).toBe("placeholder_register_a");
  expect(after.interests[0]!.strength).toBe(4);
  // Stamped self-reported — the only provenance an interest may carry (W79).
  expect(after.interests[0]!.source).toBe("clinician_self_reported");

  // Shows back what was stated, not the default.
  await page.goto("/console/case-mix");
  await expect(page.getByTestId("strength-placeholder_register_a")).toHaveValue("4");
});

test("clearing a preference records absence, not a zero", async ({ page, request }) => {
  await signInOnboardAndLink(page, request, GP);
  await page.goto("/console/case-mix");

  await page.getByTestId("strength-placeholder_register_a").selectOption("3");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByTestId("case-mix-saved")).toBeVisible();

  await page.getByTestId("strength-placeholder_register_a").selectOption("none");
  await page.getByRole("button", { name: "Save" }).first().click();
  await expect(page.getByTestId("case-mix-saved")).toBeVisible();

  const after = (await (await request.get("/api/mock/case-mix")).json()) as { interests: unknown[] };
  expect(after.interests).toEqual([]);
});

test("the page offers appetite, never a skill rating", async ({ page, request }) => {
  await signInOnboardAndLink(page, request, GP);
  await page.goto("/console/case-mix");
  await expect(page.getByRole("heading", { name: "Your case mix" })).toBeVisible();

  const body = ((await page.textContent("body")) ?? "").toLowerCase();
  expect(body).toContain("would take");
  for (const banned of ["expert", "specialist", "skilled", "advanced", "qualified", "rating"]) {
    expect(body, `case-mix page must not offer "${banned}"`).not.toContain(banned);
  }
});
