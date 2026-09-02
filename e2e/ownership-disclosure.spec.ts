import { test, expect } from "@playwright/test";
import { signInAndOnboard as signIn } from "./support/session";
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
 * The WORD is intentionally absent from the public product, and this sweep keeps that true across
 * every rendered route.
 *
 * O184: this paragraph used to say the relationship DISCLOSURE was intentionally absent too. That
 * was never the directive and is corrected here rather than left standing — O158 removed the word
 * by rewording the disclosure, not by deleting it, and a later commit deleted it with no argument
 * recorded. A sweep's own prose is where the next reader learns what the rule is, so a wrong
 * sentence here regenerates the wrong removal.
 *
 * The source grep that preceded this missed four rendered sentences — in /privacy, two console
 * screens and a pathways note — because they were prose rather than labels. Reading the rendered
 * text is what "thorough" had to mean.
 */
test("the word and the old relationship disclosure are gone from every surface", async ({ page }) => {
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
  await page.goto("/");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.locator(".clinician-row").filter({ hasText: "Dr Anubhav" }).first().click();
  await expect(page.locator(".profile-content")).toBeVisible();
  const prof = await page.evaluate(() => document.body.innerText);
  for (const line of prof.split("\n")) if (/founder/i.test(line)) hits.push(`profile: ${line.trim().slice(0, 90)}`);
  // O184: THIS ASSERTION WAS INVERTED, AND THE INVERSION IS THE POINT.
  //
  // It read `toHaveCount(0)` — the disclosure must be ABSENT — which is what turned a removal
  // nobody argued for into an enforced rule. O156's directive was to remove the WORD "founder";
  // O158 answered it by REWORDING the disclosure so neither string says it, and pinned that. A
  // later commit removed the disclosure itself and rewrote this line to require its absence, so
  // the guard came to enforce the regression.
  //
  // Both halves of the rule now hold together on this page: the word stays gone (asserted above,
  // over every rendered surface), and the disclosure stays present on the listing it concerns.
  await expect(page.locator(".disclosure-line")).toHaveCount(1);
  // The LABEL renders, not the long sentence — see profile-stage.tsx. Asserted on the specific
  // wording so a future edit cannot satisfy this with an empty element.
  await expect(page.locator(".disclosure-line")).toContainText(/clinic partner|declared interest/i);
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
