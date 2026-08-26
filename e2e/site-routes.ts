// O168: what "every surface" means, derived from the filesystem instead of transcribed.
//
// WHY THIS FILE EXISTS. `e2e/ownership-disclosure.spec.ts` swept a hardcoded PUBLIC array and a
// hardcoded CONSOLE array under a test named "the word is gone from every surface". At the moment
// this file was written those two arrays covered 34 of the 45 static routes in `app/` — eleven
// console screens, about a quarter of the site, swept by nothing while the suite ran green.
//
// AND THAT IS THE SAME FAULT O167 FIXED TWICE, ONE LEVEL UP. O167 found the sweep could not see the
// `<head>`, and could not see `/console/verticals` unless an unrelated spec had happened to seed it
// first. Both were the check running in the direction its author was facing. A hardcoded route
// array is that fault applied to the route list itself: it covers the pages somebody remembered on
// the day, and it stays green no matter how many land beside them. Adding the eleven missing
// strings would have fixed the gap and kept the shape that produced it, so the twelfth route would
// escape exactly the same way.
//
// NOTHING HERE IS NEW MACHINERY. `discoverSurfaces` (W102) already walks the App Router's file
// conventions, strips route groups, skips `_private` folders and keeps dynamic segments verbatim,
// and `public-surfaces.test.ts` already pins its output against a register in both directions. The
// only thing missing was a sweep using it. This file is the adapter, not a second discovery.

import { discoverSurfaces } from "../src/compliance/surfaces";

/** Every page route the app serves, dynamic segments included, straight off the filesystem. */
export const ALL_PAGE_ROUTES: readonly string[] = discoverSurfaces("app")
  .filter((s) => s.kind === "page")
  .map((s) => s.path);

const isDynamic = (path: string) => path.includes("[");

/** Routes with no parameters. Every one of these is visited. */
export const STATIC_ROUTES: readonly string[] = ALL_PAGE_ROUTES.filter((p) => !isDynamic(p));

/**
 * Routes behind the console's practice guard, and the rest.
 *
 * Derived from the path rather than listed, because it IS the path: `app/console/guard.tsx`'s
 * `requirePractice` is what every screen under `/console` calls, and `/console/signin` is the one
 * that cannot require it. A sweep has to visit the public set before signing in and the console set
 * after, so the partition has to exist somewhere; deriving it means a new console screen joins the
 * right half by being where it is.
 */
export const PUBLIC_ROUTES: readonly string[] = STATIC_ROUTES.filter((p) => !p.startsWith("/console"));
export const CONSOLE_ROUTES: readonly string[] = STATIC_ROUTES.filter((p) => p.startsWith("/console"));

/**
 * What to do with each parameterised route — a sample to visit, or an exclusion with a reason.
 *
 * THE POINT IS THAT THERE IS NO THIRD OPTION. A derived sweep that quietly skips anything with a
 * bracket in it has reinvented the hardcoded array in a new place: the dynamic routes become the
 * unswept set, and nothing says so. `dynamicRoutePlan` below fails on any dynamic route missing
 * from this record, so adding one forces its author to decide which it is and write down why.
 *
 * O165 drew this exact line for the compliance sweep's dynamic surfaces, for the same reason.
 */
export const DYNAMIC_ROUTE_PLAN: Readonly<Record<string, { sample: string } | { excluded: string }>> = {
  "/book/[token]": {
    excluded:
      "A booking page renders only for a token minted against a seeded invitation, and `e2e/booking.spec.ts` mints one and drives the whole flow. Visiting it with a made-up token sweeps an error state, which is a page this rule has nothing to say about. Covered there, deliberately not here.",
  },
  "/network/[clinician]": {
    sample: "/network/anubhav-saxena",
  },
  "/console/setup/[step]": {
    excluded:
      "Each step renders inside the onboarding wizard `e2e/console.spec.ts` walks end to end. The steps are enumerated by that spec from the wizard itself, so a new step is covered by being reachable rather than by being listed twice.",
  },
};

/** The dynamic routes on disk, checked against the plan. Returns those with no entry. */
export function undeclaredDynamicRoutes(): string[] {
  return ALL_PAGE_ROUTES.filter(isDynamic).filter((p) => !(p in DYNAMIC_ROUTE_PLAN));
}

/** Plan entries naming a route that no longer exists — the stale half, W102's own rule. */
export function staleDynamicPlanEntries(): string[] {
  const onDisk = new Set(ALL_PAGE_ROUTES);
  return Object.keys(DYNAMIC_ROUTE_PLAN).filter((p) => !onDisk.has(p));
}

/**
 * O181: reveal anything a page keeps behind progressive disclosure, before a sweep measures it.
 *
 * WHY EVERY CONTROL SWEEP NEEDS THIS. The join form gained a sectioned view, which hides five of
 * its six fieldsets by default. Nothing about those fields changed — they are still in the DOM,
 * still submitted, still need a label, a 44px hit area and a focus ring — but a sweep that only
 * measures what is VISIBLE stopped seeing about thirty controls and carried on passing. Two
 * non-vacuity floors caught it (`touch-floor` and `semantics` both went under their minimum
 * population), which is the only reason it was not a silent loss of coverage; `a11y`, `contrast`
 * and `keyboard-focus` had no floor low enough to notice and would have measured the smaller page
 * indefinitely.
 *
 * THE RULE THIS ENCODES: a sweep must measure the page a reader can reach, not the page as first
 * painted. Progressive disclosure is a legitimate design choice and it is not a reason for the
 * quality gates to look away — so the sweeps open it, deliberately, and any future collapsed
 * surface must add its opener here rather than quietly shrinking the population.
 */
export async function revealCollapsedSurfaces(page: {
  locator: (selector: string) => {
    count: () => Promise<number>;
    first: () => { click: (options?: { timeout?: number }) => Promise<void> };
  };
}): Promise<void> {
  // The join form's "whole form" view. Matched on the accessible name so a restyle cannot silently
  // stop the sweeps opening it.
  const wholeForm = page.locator('button:has-text("Show the whole form")');
  if ((await wholeForm.count()) > 0) {
    await wholeForm.first().click({ timeout: 5000 });
  }
}
