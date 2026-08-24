// O186 (founder-directed: conduct code refactor): the sign-in-and-onboard flow, in one place.
//
// MEASURED BEFORE IT WAS MOVED: eighteen spec files carried a hand-copied version of this flow,
// in at least eight textual variants of the same semantic action — sign in as the demo practice
// owner, create "Demo Family Practice" at a 10% holdout, land on /console. That is AR8's fixture
// finding one layer up: each copy was written correctly on its day, none could be corrected in
// one place, and the variants had already begun to drift (four different function names, two
// different post-create waits, one copy inlined into a test body).
//
// COMPOSABLE HALVES, BECAUSE THE OUTLIERS ARE REAL. Not every caller wants the composite:
// `two-practice.spec.ts` signs in once and creates TWO named practices (its whole subject), and
// `setup.spec.ts` leaves onboarding into the setup wizard, not /console. Forcing either through
// a single do-everything helper would parameterise away the very thing those specs test — so the
// halves are exported on their own, and the composite is just their obvious composition.

import type { Page } from "@playwright/test";

/** The demo practice owner every console spec signs in as. */
export const OWNER_EMAIL = "owner@demo.practice.example";

/**
 * Signs in and lands wherever the console sends a signed-in owner: `/console`, or
 * `/console/onboarding` when no practice exists yet. Callers that need a practice next call
 * `createPractice`; callers testing the signed-in-without-practice state stop here.
 */
export async function signInAsPracticeOwner(page: Page, email: string = OWNER_EMAIL): Promise<void> {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill(email);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
}

/**
 * Creates a practice through the onboarding form and waits for the console. `waitFor` exists for
 * the one flow that deliberately leaves onboarding somewhere else (`setup.spec.ts` exits into
 * `/console/setup/clinicians`); everything else takes the default.
 */
export async function createPractice(
  page: Page,
  options: { name?: string; holdout?: string; waitFor?: RegExp } = {},
): Promise<void> {
  const { name = "Demo Family Practice", holdout = "10", waitFor = /\/console$/ } = options;
  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill(name);
  await page.getByLabel("Holdout share (%)").fill(holdout);
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(waitFor);
}

/** The composite fifteen specs were each hand-writing: sign in, create the demo practice. */
export async function signInAndOnboard(page: Page): Promise<void> {
  await signInAsPracticeOwner(page);
  await createPractice(page);
}
