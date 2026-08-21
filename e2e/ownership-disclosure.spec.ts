import { test, expect, type Page } from "@playwright/test";
import {
  CONSOLE_ROUTES,
  DYNAMIC_ROUTE_PLAN,
  PUBLIC_ROUTES,
  STATIC_ROUTES,
  staleDynamicPlanEntries,
  undeclaredDynamicRoutes,
} from "./site-routes";

// O168: the route lists are derived from `app/` now, not transcribed here.
//
// They used to be two hardcoded arrays covering 34 of the 45 static routes — eleven console screens
// swept by nothing, under a test named "the word is gone from every surface". `./site-routes` has
// the reasoning; the short version is that a hardcoded list sweeps what somebody remembered and
// stays green beside everything added afterwards.
async function signIn(page: Page) {
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
  await request.post("/api/mock/console");
  // O167: SEEDED, BECAUSE THIS SWEEP WAS ORDER-DEPENDENT AND ONLY SOMETIMES SAW WHAT IT AUDITS.
  // The vertical specs live in a process-global store that `/api/mock/console` does not touch, so
  // whether `/console/verticals` rendered its populated branch or its "nothing declared" zero state
  // depended on whether `verticals.spec.ts` had already run in the same worker. Run alone, this
  // test passed over a page reading "the founder to sign it off"; run after that spec, it failed.
  // A sweep whose coverage is decided by test ordering is not a sweep. `a11y.spec.ts` had already
  // drawn this exact line for the same route ("scanned POPULATED, not on its zero state"); this
  // inherits it.
  await request.post("/api/mock/verticals");
});
/**
 * O156 (founder-directed): "remove all mentions of founder on entire site do throough code audit".
 *
 * TWO ASSERTIONS THAT ONLY MEAN SOMETHING TOGETHER. The word must be gone from every rendered
 * surface — and the DISCLOSURE it used to sit inside must still be there, in its new words.
 *
 * Removing the word alone would have been easy and wrong: `disclosedInterest` exists to tell a
 * patient that the GP in front of them owns the directory recommending him, and a conflict notice
 * that stops naming the conflict has stopped working. So the sweep proves the absence and the
 * profile check proves the presence, in one test, because a later unit deleting the disclosure to
 * satisfy the first assertion is exactly the failure this pairing prevents.
 *
 * The source grep that preceded this missed four rendered sentences — in /privacy, two console
 * screens and a pathways note — because they were prose rather than labels. Reading the rendered
 * text is what "thorough" had to mean.
 */
test("the word is gone from every surface, and the ownership disclosure is not", async ({ page }) => {
  const hits: string[] = [];
  /** Routes that answered with something other than themselves, so the sweep did not read them. */
  const redirected: string[] = [];
  const scan = async (route: string) => {
    const res = await page.goto(route);
    if (res && res.status() === 404) return;
    // O168: a route that redirects has NOT been swept, and counting it as swept is how a guarded
    // screen hides. Recorded and asserted on below rather than silently passing.
    const landed = new URL(page.url()).pathname;
    if (landed !== route) redirected.push(`${route} -> ${landed}`);
    // O167: the head is part of the site. A title is the first text a reader meets.
    const surfaces = await page.evaluate(() => [
      document.body.innerText,
      document.title,
      document.querySelector('meta[name="description"]')?.getAttribute("content") ?? "",
    ]);
    for (const text of surfaces) {
      for (const line of text.split("\n")) {
        if (/founder/i.test(line)) hits.push(`${route}: ${line.trim().slice(0, 90)}`);
      }
    }
  };
  for (const r of PUBLIC_ROUTES) await scan(r);
  // The finder's profile, where the ownership disclosure actually renders.
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.locator(".clinician-row").filter({ hasText: "Dr Anubhav" }).first().click();
  await expect(page.locator(".profile-content")).toBeVisible();
  const prof = await page.evaluate(() => document.body.innerText);
  for (const line of prof.split("\n")) if (/founder/i.test(line)) hits.push(`profile: ${line.trim().slice(0, 90)}`);
  // And the disclosure is genuinely THERE, not merely wordless.
  // O158: the disclosure must be PRESENT and must not claim ownership of the entity. Asserting a
  // fixed string here is what carried a false one — "Owner of ADHD.ME" — through a green suite.
  const line = await page.locator(".disclosure-line").innerText();
  expect(line.trim().length, "the disclosure vanished from the profile").toBeGreaterThan(0);
  expect(line, "the disclosure claims ownership of ADHD.ME; he owns his clinic (O158)")
    .not.toMatch(/(owns|owner of|ownership (interest )?(in|of)) ADHD\.ME/i);
  await signIn(page);
  for (const r of CONSOLE_ROUTES) await scan(r);
  console.log(`FOUNDER_HITS ${hits.length} over ${STATIC_ROUTES.length} routes`);
  for (const h of hits.slice(0, 10)) console.log("   " + h);
  if (redirected.length) console.log(`REDIRECTED ${redirected.join(", ")}`);
  expect(hits, `"founder" still rendered:\n${hits.join("\n")}`).toEqual([]);

  // NON-VACUITY, AND IT IS THE HALF THAT MAKES THE DERIVATION SAFE. A broken `discoverSurfaces`
  // returning nothing would satisfy every assertion above by sweeping no pages at all. The floor is
  // the 34 the hardcoded arrays used to cover, so the derivation can grow but cannot silently
  // collapse back below what it replaced.
  expect(STATIC_ROUTES.length, "the derived route list is smaller than the arrays it replaced").toBeGreaterThanOrEqual(34);
  // Every console route the sweep visited actually rendered its own screen. `/console/signin` is
  // the exception by construction: signed in, it sends you on.
  expect(
    redirected.filter((r) => !r.startsWith("/console/signin")),
    `a route redirected instead of rendering, so it was never swept: ${redirected.join(", ")}`,
  ).toEqual([]);
});

test("no page route escapes the sweep by taking a parameter", async ({}) => {
  // The hole a derived list opens if nobody closes it: filter out everything with a bracket and the
  // dynamic routes become the new unswept set, with nothing saying so. Each needs a sample to visit
  // or a named exclusion, and both directions are checked — W102's own rule, because a plan entry
  // for a route that has moved is the failure that makes a register actively misleading.
  expect(Object.keys(DYNAMIC_ROUTE_PLAN).length, "no dynamic routes are planned for at all").toBeGreaterThan(0);
  expect(
    undeclaredDynamicRoutes(),
    "a dynamic page route has no entry in DYNAMIC_ROUTE_PLAN — give it a sample to sweep or say in writing why it is excluded",
  ).toEqual([]);
  expect(
    staleDynamicPlanEntries(),
    "DYNAMIC_ROUTE_PLAN names a route that no longer exists on disk",
  ).toEqual([]);
});
