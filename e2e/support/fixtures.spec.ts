// AR8: proves `seedFixtures` itself can go red, naming the fixture — a check that cannot fail is
// not a check (this lane's central law). O174's three silent failures (`credentials`, `capability`,
// `education` throwing into a server log nobody read) are the regression pins: this file reproduces
// their exact trigger — a practice-dependent fixture posted with no practice seeded — through the
// shared helper, and asserts the helper reports it rather than swallowing it the way the pre-O174
// code did.

import { expect, test } from "@playwright/test";
import { FixtureSeedError, seedFixtures } from "./fixtures";

test.describe("seedFixtures non-vacuity", () => {
  test("throws FixtureSeedError naming a practice-dependent fixture with no practice seeded", async ({ request }) => {
    // `POST /api/mock/console` always resets to an empty practice list (no `mode` query it reads —
    // see app/api/mock/console/route.ts); posting nothing else leaves exactly the state O174 hit.
    await request.post("/api/mock/console");

    await expect(seedFixtures(request, ["credentials"])).rejects.toThrow(FixtureSeedError);
    // A second, independent assertion that the failure names the RIGHT fixture and the RIGHT
    // status — a helper that threw on every input, or named the wrong one, would pass the line
    // above while catching nothing real.
    await expect(seedFixtures(request, ["credentials"])).rejects.toThrow(/credentials -> 409/);
  });

  test("names every failing fixture when more than one cannot seed, not just the first", async ({ request }) => {
    await request.post("/api/mock/console");
    // O174's exact three, all unseedable at once with no practice — proof the loop does not stop
    // (and does not silently drop) after the first failure.
    await expect(seedFixtures(request, ["credentials", "capability", "education"])).rejects.toThrow(
      /credentials -> 409.*capability -> 409.*education -> 409/s,
    );
  });

  test("does not throw once the same fixtures have a seeded practice to act on", async ({ page, request }) => {
    // Non-vacuity, and it is the half that matters: a helper that threw on EVERYTHING would satisfy
    // both tests above while breaking every sweep that calls it. Reusing the real sign-in flow
    // (not a shortcut) is what mock-fixtures.spec.ts's second test already established this proves.
    await request.post("/api/mock/console");
    await page.goto("/console/signin");
    await page.getByLabel("Work email").fill("owner@demo.practice.example");
    await page.getByRole("button", { name: "Sign in" }).click();
    await page.waitForURL(/\/console(\/onboarding)?$/);
    await page.goto("/console/onboarding");
    await page.getByLabel("Practice name").fill("Demo Family Practice");
    await page.getByLabel("Holdout share (%)").fill("10");
    await page.getByRole("button", { name: "Create practice" }).click();
    await page.waitForURL(/\/console$/);

    await expect(seedFixtures(request, ["credentials", "capability", "education"])).resolves.toBeUndefined();
  });
});
