// AR37: the working-truth sweep — every route proves it rendered ITS OWN content.
//
// The register (e2e/support/working-truth.ts) explains what a proof is and why length floors are
// not one. This spec is the adapter: it walks the derived route list — public before sign-in,
// console signed-in and seeded (AR8's `seedFixtures`, O174's ordering), dynamic routes per the
// O165/DYNAMIC_ROUTE_PLAN precedent of sample-or-declare — and holds every page to its declared
// proof, both directions.
//
// The failure output carries a snippet of what the route DID render, so a red run is a
// measurement rather than a scavenger hunt.

import { expect, test } from "@playwright/test";
import { CONSOLE_ROUTES, PUBLIC_ROUTES, revealCollapsedSurfaces } from "./site-routes";
import { seedFixtures } from "./support/fixtures";
import { signInAndOnboard } from "./support/session";
import { ROUTE_PROOFS } from "./support/working-truth";

function snippet(text: string): string {
  return text.replace(/\s+/g, " ").trim().slice(0, 200);
}

/** Applies a route's proof, collecting the verdict rather than asserting per route. */
function judge(route: string, text: string, missing: string[], failed: string[], seen: Set<string>) {
  seen.add(route);
  const entry = ROUTE_PROOFS[route];
  if (!entry) {
    missing.push(`${route} :: ${snippet(text)}`);
    return;
  }
  if (!entry.proof.test(text)) {
    failed.push(`${route} expected ${entry.proof} :: ${snippet(text)}`);
  }
}

test("every route renders the content that proves it worked", async ({ page, request }) => {
  test.setTimeout(240_000);
  const missing: string[] = [];
  const failed: string[] = [];
  const seen = new Set<string>();

  // Public first, signed out — the page a stranger gets is the page being proven.
  expect(PUBLIC_ROUTES.length, "the derived public list collapsed").toBeGreaterThan(10);
  for (const route of PUBLIC_ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await revealCollapsedSurfaces(page);
    judge(route, await page.locator("body").innerText(), missing, failed, seen);
  }

  // The one dynamic public surface, through a real minted token (O165's rule: sample or declare,
  // never silently skip). The mock state post also seeds the store the booking page reads.
  const seeded = (await (await request.post("/api/mock/state")).json()) as {
    invitations: Array<{ token: string }>;
  };
  await page.goto(`/book/${seeded.invitations[0]!.token}`);
  await page.waitForLoadState("networkidle");
  judge("/book/[token]", await page.locator("body").innerText(), missing, failed, seen);

  // Console: reset, sign in, onboard, seed everything — O174's order via the shared helpers.
  await request.post("/api/mock/console");
  await signInAndOnboard(page);
  await seedFixtures(request);
  expect(CONSOLE_ROUTES.length, "the derived console list collapsed").toBeGreaterThan(26);
  for (const route of CONSOLE_ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    judge(route, await page.locator("body").innerText(), missing, failed, seen);
  }

  // The dynamic console route, sampled at a real step (its wizard is walked end to end by
  // e2e/console.spec.ts; here it only has to prove it renders its own content).
  await page.goto("/console/setup/clinicians");
  await page.waitForLoadState("networkidle");
  judge("/console/setup/[step]", await page.locator("body").innerText(), missing, failed, seen);

  expect(missing, "routes with no declared proof — pick one from the snippet").toEqual([]);
  expect(failed, "routes whose proof did not match what rendered").toEqual([]);

  // The stale half: a proof for a route the sweep no longer visits reads as coverage.
  const stale = Object.keys(ROUTE_PROOFS).filter((route) => !seen.has(route));
  expect(stale, "proofs naming routes the sweep never visited — delete or re-route them").toEqual([]);
});

test("a proof would notice a dead page, so a green sweep means something", async () => {
  // Non-vacuous by fixture: the register's own proofs must refuse the two nothing-pages this
  // sweep exists to catch — a Next error shell and a styled empty state.
  const errorShell = "Application error: a client-side exception has occurred (see the browser console for more information).";
  const emptyState = "Practice console\nNothing here yet.\nNo data has been recorded.";
  const proofs = Object.values(ROUTE_PROOFS);
  expect(proofs.length).toBeGreaterThan(40);
  for (const { proof } of proofs) {
    expect(proof.test(errorShell), `${proof} matches an error shell`).toBe(false);
    expect(proof.test(emptyState), `${proof} matches a generic empty state`).toBe(false);
  }
  // And every entry argues itself: a fixture proof names seeded data, a copy proof carries the
  // page's own sentence; either way the reason is written down.
  for (const [route, entry] of Object.entries(ROUTE_PROOFS)) {
    expect(entry.why.length, route).toBeGreaterThan(40);
  }
});
