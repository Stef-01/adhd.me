// O174: a fixture that cannot seed says so, rather than throwing into a log nobody reads.
//
// WHY THIS EXISTS. `POST /api/mock/console` RESETS the console store. Three mock routes —
// credentials, capability, education — then read `console_.practices[0]` and, until this unit, did
// it through a non-null assertion. Posted after the reset, that assertion was false: they threw a
// `TypeError`, returned 500, and seeded nothing. No caller checked the status, so the fixtures
// silently did not land and `e2e/touch-floor.spec.ts` swept their unlinked refusal pages while
// reporting them covered. `/console/credentials` rendered 3 controls where 11 exist, and two of the
// missing ones were under O14's 44px floor.
//
// The lesson is not about mocks. A `!` is a claim to the type system that a value cannot be absent,
// and when the claim is false the failure surfaces as far as possible from the decision that caused
// it — here, as a silently shrunken compliance sweep two files away. W201 and W253 made the same
// correction in product code: replace the assertion with a refusal that states its reason.

import { expect, test } from "@playwright/test";
import { signInAndOnboard } from "./support/session";

/** The routes that act for the first seeded practice, and therefore need one to exist. */
const PRACTICE_DEPENDENT = ["credentials", "capability", "education"];

test("a fixture with no seeded practice refuses with a reason, and does not throw", async ({ request }) => {
  // The reset is the setup, not an accident: this is exactly the order that produced the 500s.
  await request.post("/api/mock/console?mode=empty").catch(() => undefined);
  await request.post("/api/mock/console");

  const results: string[] = [];
  for (const fixture of PRACTICE_DEPENDENT) {
    const response = await request.post(`/api/mock/${fixture}`);
    const body = await response.text();
    results.push(`${fixture} -> ${response.status()} ${body.slice(0, 80)}`);
    // 409, not 500: the difference between "this cannot be done and here is why" and "something
    // exploded". A 500 is what a false `!` produces, so asserting against it is the regression guard.
    expect(response.status(), `${fixture} did not refuse cleanly: ${body.slice(0, 120)}`).toBe(409);
    expect(body, `${fixture} refused without saying why`).toMatch(/no seeded practice/i);
  }
  console.log("MOCK_REFUSALS " + results.join(" | "));
});

test("the same fixtures seed normally once a practice exists", async ({ page, request }) => {
  // Non-vacuity, and it is the half that matters: a route that returned 409 to EVERYTHING would
  // satisfy the test above while breaking every sweep that depends on these fixtures.
  await request.post("/api/mock/console");
  await signInAndOnboard(page);

  for (const fixture of PRACTICE_DEPENDENT) {
    const response = await request.post(`/api/mock/${fixture}`);
    expect(response.ok(), `${fixture} refused with a practice seeded: ${response.status()}`).toBe(true);
  }

  // And the page the seeding exists FOR is actually populated, which is the thing the touch sweep
  // was silently missing. `linkEmail` is what turns the refusal into the real page; without it the
  // fixture seeds and the screen still shows its unlinked paragraph.
  await request.post("/api/mock/credentials?linkEmail=owner@demo.practice.example");
  await page.goto("/console/credentials");
  await page.waitForLoadState("networkidle");
  const controls = await page.evaluate(
    () => document.querySelectorAll("a,button,input,select,textarea,summary").length,
  );
  expect(controls, "the credentials page is still on its unlinked refusal — the fixture did nothing").toBeGreaterThan(5);
});
