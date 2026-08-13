// W138 verify gate (surface half): no surface implies ADHD.ME is a party to clinical care.
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
//
// BLOCK BOUNDARIES ARE SENTENCE BOUNDARIES, AND ERASING THEM MANUFACTURES VIOLATIONS.
//
// This normaliser used to be `.replace(/\s+/g, " ")`, which flattened the newlines `innerText`
// puts between block elements into ordinary spaces. The W138 linter looks for the product as the
// SUBJECT OF A CARE VERB — a claim about grammar — so joining two unrelated blocks into one
// string invents grammar that nobody wrote.
//
// It was caught by a real failure rather than by reasoning: an eyebrow reading "Why we founded
// ADHD.ME" sits directly above a headline beginning "Getting assessed for ADHD…", and flattened
// they read as "ADHD.ME Getting assessed" — the brand, then a care verb, four words apart. The
// rule fired exactly as designed on a sentence that does not exist on the page.
//
// So line breaks become SENTENCE TERMINATORS and only intra-line whitespace is collapsed. A real
// violation lives inside one block and is unaffected: `innerText` does not break on soft wrap, so
// "we will review your results" in a paragraph still arrives on one line and is still caught.
// The tests at the bottom of this file assert both halves, because a normaliser that suppressed
// real findings would look identical to this one from the outside.

import { expect, test, type Page } from "@playwright/test";
import { discoverSurfaces } from "../src/compliance/surfaces";
import { lintPartyToCare } from "../src/compliance/party-to-care";

/**
 * Rendered text, with block structure preserved as punctuation.
 *
 * The terminator is a full stop because it is what the boundary MEANS, and because it reads
 * correctly in a failure message — the matched text is quoted back to whoever has to fix it.
 */
function renderedSentences(raw: string): string {
  return raw
    .split(/\r?\n+/)
    .map((line) => line.replace(/[^\S\r\n]+/g, " ").trim())
    .filter(Boolean)
    .join(". ");
}

const pageRoutes = discoverSurfaces("app")
  .filter((s) => s.kind === "page")
  .map((s) => s.path);

/** Routes needing a URL parameter. Handled by the booking test below, not by the sweep. */
const PARAMETERISED = (path: string) => path.includes("[");

async function lintRendered(page: Page, label: string) {
  // The visible text, not the HTML: class names and data-testids are not copy, and linting
  // them would produce findings nobody can act on.
  const text = renderedSentences(await page.locator("body").innerText());
  // Guard against a vacuous pass — an empty or errored page lints clean.
  expect(text.length, `${label} rendered almost nothing`).toBeGreaterThan(80);

  const findings = lintPartyToCare(text);
  expect(
    findings.map((f) => `${f.rule}: "${f.match}" — ${f.explanation}`),
    `${label} implies ADHD.ME is a party to clinical care`,
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

test("every public page keeps ADHD.ME out of the care relationship", async ({ page }) => {
  const publicRoutes = pageRoutes.filter((p) => !p.startsWith("/console") && !PARAMETERISED(p));
  expect(publicRoutes.length).toBeGreaterThan(4);

  for (const path of publicRoutes) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await lintRendered(page, path);
  }
});

test("every console page keeps ADHD.ME out of the care relationship", async ({ page }) => {
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

test("the patient-facing booking pages keep ADHD.ME out of it", async ({ page, request }) => {
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

  const text = renderedSentences(await page.locator("body").innerText());
  const findings = lintPartyToCare(text);
  expect(findings.map((f) => f.rule)).toContain("adhd-me-owns-clinicians");
});

test("the normaliser separates blocks without muting a real violation", async ({ page }) => {
  // BOTH HALVES, because the failure modes are opposite and a normaliser that got either wrong
  // would look identical from outside. The first half is the defect this function exists for; the
  // second is the way fixing it could go wrong — a separator that broke real sentences would turn
  // the whole sweep green and mean nothing.
  await page.goto("/privacy");
  await page.evaluate(() => {
    const eyebrow = document.createElement("p");
    eyebrow.textContent = "Why we founded ADHD.ME";
    const heading = document.createElement("h2");
    heading.textContent = "Getting assessed for ADHD in Australia is a test of stamina.";
    const real = document.createElement("p");
    real.textContent = "We will assess your symptoms and call you back.";
    document.body.append(eyebrow, heading, real);
  });

  const raw = await page.locator("body").innerText();

  // The phantom: flattening every whitespace run joins the two blocks into a claim nobody wrote.
  expect(lintPartyToCare(raw.replace(/\s+/g, " ")).map((f) => f.rule))
    .toContain("adhd-me-as-care-provider");

  // The fix drops it — and still catches the genuine one-block violation appended above.
  const findings = lintPartyToCare(renderedSentences(raw));
  expect(findings.map((f) => f.match).join(" ")).not.toMatch(/ADHD\.ME Getting/);
  expect(findings.map((f) => f.rule)).toContain("adhd-me-as-care-provider");
});
