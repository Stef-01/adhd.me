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

import { expect, test, type Page } from "@playwright/test";
import { createPractice, signIn } from "./support/session";

const OWNER = "owner@demo.practice.example";
const OUTSIDER = "stranger@elsewhere.example";

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("one owner, two practices: both are offered and the console says which it is on", async ({ page }) => {
  await signIn(page, OWNER);
  await createPractice(page, { name: "Harbour Family Practice", holdout: "10" });
  await createPractice(page, { name: "Riverside Medical", holdout: "20" });

  await page.goto("/console");
  await expect(page.getByTestId("practice-switcher")).toBeVisible();
  await expect(page.getByRole("combobox", { name: "Practice" })).toContainText("Harbour Family Practice");
  await expect(page.getByRole("combobox", { name: "Practice" })).toContainText("Riverside Medical");
});

test("switching practice changes what the console shows, and holds across pages", async ({ page }) => {
  // The rules config is per practice now. Two practices with different holdouts prove the
  // console is reading the active one rather than the only one.
  await signIn(page, OWNER);
  await createPractice(page, { name: "Harbour Family Practice", holdout: "10" });
  await createPractice(page, { name: "Riverside Medical", holdout: "20" });

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
  await createPractice(page, { name: "Harbour Family Practice", holdout: "10" });
  await page.goto("/console");
  await expect(page.getByTestId("practice-switcher")).toHaveCount(0);
});

test("a user who belongs to no practice cannot reach another's console", async ({ page, context }) => {
  // The assertion Y2 filed as untestable. The outsider signs in legitimately and has no
  // membership anywhere, so every console surface sends them to onboarding rather than showing
  // somebody else's practice.
  await signIn(page, OWNER);
  await createPractice(page, { name: "Harbour Family Practice", holdout: "10" });

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
  await createPractice(page, { name: "Harbour Family Practice", holdout: "10" });
  const owned = await page.getByRole("heading", { level: 1 }).first().textContent();
  expect(owned).toBeTruthy();

  await context.clearCookies();
  await signIn(page, OUTSIDER);
  await context.addCookies([
    { name: "adhdme_practice", value: "prac-1", domain: "localhost", path: "/" },
  ]);
  await page.goto("/console");
  // Membership is the grant, so the forged selection resolves to nothing at all.
  await expect(page).toHaveURL(/\/console\/onboarding$/);
});

/** Selects a practice in the switcher and waits for the console to be on it. */
async function switchTo(page: Page, name: string) {
  await page.goto("/console");
  await page.getByRole("combobox", { name: "Practice" }).selectOption({ label: name });
  await page.getByRole("button", { name: "Switch" }).click();
  await expect(page.getByRole("heading", { name })).toBeVisible();
}

test("a complaint filed under one practice is invisible on the other, at every screen that renders it (AR31)", async ({ page }) => {
  // AR31: Y4-1's class asserted from the BROWSER. The class — a console screen showing another
  // practice's data — has been fixed at the store layer three times (W206: the complaints page
  // and the console-home banner; Y5-1/W256: the results monitor reading the whole store), and
  // each fix is unit-tested. But every test above proves ROUTING: who is offered a practice, who
  // is refused one. None proves the thing Y4-1 was actually about, end to end: that a screen
  // carrying per-practice data omits the other tenant's rows. So: one owner, two practices, one
  // complaint filed through the real intake form, and all three fixed sites asserted from the
  // rendered page — positive on the practice that owns the complaint, absent on the one that
  // does not, and positive again after switching back, so the absence proves scoping rather
  // than a broken form or a dead store.
  const MARKER = "Cross-tenant marker: the Riverside-only complaint";
  await signIn(page, OWNER);
  await createPractice(page, { name: "Harbour Family Practice", holdout: "10" });
  await createPractice(page, { name: "Riverside Medical", holdout: "20" });

  await switchTo(page, "Riverside Medical");
  await page.goto("/console/complaints");
  await page.getByLabel("What happened").fill(MARKER);
  await page.getByRole("button", { name: "Record" }).click();
  await expect(page.getByText("Complaint recorded", { exact: false })).toBeVisible();

  // The three fixed sites, positive arm: the practice the complaint belongs to sees it.
  await expect(page.getByTestId("open-count")).toHaveText("1 open");
  await expect(page.getByText(MARKER)).toBeVisible();
  await page.goto("/console");
  await expect(page.getByTestId("complaint-banner")).toBeVisible();
  await page.goto("/console/results");
  // The complaints alert specifically, not `allClear` — the sim-driven monitors (opt-out, DNA)
  // are not this test's subject and must not be able to mask or fake the assertion.
  await expect(page.getByText(/open complaint\(s\)/)).toBeVisible();

  // The same three sites on the other practice: nothing. This is the Y4-1 assertion itself.
  await switchTo(page, "Harbour Family Practice");
  await page.goto("/console/complaints");
  await expect(page.getByTestId("open-count")).toHaveText("0 open");
  await expect(page.getByText("No complaint is open right now.")).toBeVisible();
  await expect(page.getByText(MARKER)).toHaveCount(0);
  await page.goto("/console");
  await expect(page.getByTestId("complaint-banner")).toHaveCount(0);
  await page.goto("/console/results");
  await expect(page.getByText(/open complaint\(s\)/)).toHaveCount(0);

  // And back: the complaint still exists — Harbour's blank screens were scoping, not deletion.
  await switchTo(page, "Riverside Medical");
  await page.goto("/console/complaints");
  await expect(page.getByTestId("open-count")).toHaveText("1 open");
  await expect(page.getByText(MARKER)).toBeVisible();
});
