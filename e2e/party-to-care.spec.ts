// W138 verify gate (surface half): no surface implies Meherr is a party to clinical care.
//
// The route list is DERIVED from W102's census rather than typed out here. Three enumerated
// coverage lists in this tree have already fallen behind the routes they cover (the dossier
// surface map twice, the axe sweep once), and a hand-maintained list in this file would be the
// fourth. A new page is swept the day it lands, without anyone remembering.
//
// It lints what a browser actually renders, not the source. The source is where the copy is
// written; the rendered page is where a patient reads it, and the two differ wherever a value
// is interpolated — which is exactly where a sentence about "our clinicians" would arrive from
// a practice name or a clinician display name.

import { expect, test, type Page } from "@playwright/test";
import { discoverSurfaces } from "../src/compliance/surfaces";
import { lintPartyToCare } from "../src/compliance/party-to-care";

const pageRoutes = discoverSurfaces("app")
  .filter((s) => s.kind === "page")
  .map((s) => s.path);

/** Routes needing a URL parameter. Handled by the booking test below, not by the sweep. */
const PARAMETERISED = (path: string) => path.includes("[");

async function lintRendered(page: Page, label: string) {
  // The visible text, not the HTML: class names and data-testids are not copy, and linting
  // them would produce findings nobody can act on.
  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  // Guard against a vacuous pass — an empty or errored page lints clean.
  expect(text.length, `${label} rendered almost nothing`).toBeGreaterThan(80);

  const findings = lintPartyToCare(text);
  expect(
    findings.map((f) => `${f.rule}: "${f.match}" — ${f.explanation}`),
    `${label} implies Meherr is a party to clinical care`,
  ).toEqual([]);
}

async function signInAndOnboard(page: Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("owner@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/state");
  await request.post("/api/mock/console");
});

test("the census finds the routes this sweep covers", () => {
  // If discovery breaks, every sweep below passes by covering nothing.
  expect(pageRoutes.length).toBeGreaterThan(15);
  expect(pageRoutes).toContain("/privacy");
  expect(pageRoutes).toContain("/console");
});

test("every public page keeps Meherr out of the care relationship", async ({ page }) => {
  const publicRoutes = pageRoutes.filter((p) => !p.startsWith("/console") && !PARAMETERISED(p));
  expect(publicRoutes.length).toBeGreaterThan(4);

  for (const path of publicRoutes) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await lintRendered(page, path);
  }
});

test("every console page keeps Meherr out of the care relationship", async ({ page }) => {
  test.setTimeout(120_000);
  await signInAndOnboard(page);

  const consoleRoutes = pageRoutes.filter(
    (p) => p.startsWith("/console") && !PARAMETERISED(p) && p !== "/console/signin",
  );
  expect(consoleRoutes.length).toBeGreaterThan(8);

  for (const path of consoleRoutes) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await lintRendered(page, path);
  }
});

test("the patient-facing booking pages keep Meherr out of it", async ({ page, request }) => {
  // The parameterised route the sweep skips, and the surface a patient is most likely to read
  // as "who is contacting me".
  const seeded = (await (await request.get("/api/mock/state")).json()) as {
    invitations: Array<{ token: string }>;
  };
  const token = seeded.invitations[0]!.token;

  await page.goto(`/book/${token}`);
  await lintRendered(page, "/book/[token] offer");

  await page.getByRole("button", { name: "Confirm booking" }).click();
  await page.getByRole("heading", { name: "Your appointment is booked" }).waitFor();
  await lintRendered(page, "/book/[token] confirmed");
});

test("the privacy policy states who is responsible, in the canonical words", async ({ page }) => {
  await page.goto("/privacy");
  const statement = page.getByTestId("responsibility-statement");
  await expect(statement).toBeVisible();
  await expect(statement).toContainText("Your practice provides your care");
  await expect(statement).toContainText("not part of your care team");
  await expect(statement).toContainText("goes to your practice, not to us");
});

test("the sweep would actually catch a violation", async ({ page }) => {
  // Proves the linter is running against real rendered text rather than passing on an empty
  // string or a selector that matches nothing. Injected into the live DOM, not committed.
  await page.goto("/privacy");
  await page.evaluate(() => {
    const p = document.createElement("p");
    p.textContent = "Our doctors will review your results and call you back.";
    document.body.appendChild(p);
  });

  const text = (await page.locator("body").innerText()).replace(/\s+/g, " ");
  const findings = lintPartyToCare(text);
  expect(findings.map((f) => f.rule)).toContain("meherr-owns-clinicians");
});
