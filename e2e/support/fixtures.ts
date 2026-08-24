// AR8: e2e/support/fixtures.ts — the fixture-liveness check O174 fixed once, generalised
// (docs/AESTHETIC-REVIEW-PLAN.md AR8: "fixture liveness, O174 generalised").
//
// O174 found three mock routes (`credentials`, `capability`, `education`) throwing a `TypeError`
// into a server log nobody read when posted after `POST /api/mock/console` reset the practice they
// act on: the routes returned 500, nothing checked the status, and `touch-floor`'s console sweep
// silently measured their unlinked refusal pages while reporting them covered. The fix landed by
// hand, twice — `touch-floor.spec.ts` and `keyboard-focus.spec.ts` each grew the identical
// eleven-line "post every fixture, check `.ok()`, collect failures, assert empty" block, each with
// its own hand-typed copy of the same eleven-fixture list — and `contrast.spec.ts` and
// `semantics.spec.ts`, which sweep the SAME console routes, never grew it at all: `contrast`'s
// console test never seeds the practice-dependent fixtures its own routes need (so it has always
// measured their unlinked refusal pages, not the populated ones), and `semantics` posts five of
// eleven with no status check whatsoever — O174's exact silent-failure shape, still live in the one
// spec of the four that never got the fix.
//
// `seedFixtures` is the one place the list and the check are written, so all four sweeps call it
// instead of each re-deriving (or, twice, never deriving) it.

import type { APIRequestContext } from "@playwright/test";

/**
 * The mock fixtures a signed-in console sweep depends on, beyond `console` itself (which must be
 * posted first — it RESETS the practice these routes act on — and is not part of this list because
 * every caller posts it before signing in, not after).
 */
export const PRACTICE_DEPENDENT_FIXTURES = [
  "referrals", "registers", "usefulness", "ops", "credentials",
  "capability", "case-mix", "education", "pathways", "verticals", "state",
] as const;

/** Fixtures that render an unlinked refusal instead of seeding unless tied to the signed-in identity. */
export const LINKED_FIXTURES: ReadonlySet<string> = new Set(["credentials", "education"]);

export const DEFAULT_LINK_EMAIL = "owner@demo.practice.example";

export class FixtureSeedError extends Error {
  constructor(failed: readonly string[]) {
    super(
      `a fixture did not seed, so a sweep depending on it would measure a page it did not ` +
        `populate: ${failed.join(", ")}`,
    );
    this.name = "FixtureSeedError";
  }
}

/**
 * Posts each fixture in order and throws `FixtureSeedError` naming every one that did not seed (a
 * non-2xx response), rather than letting the sweep that depends on it silently measure an empty or
 * refused page — O174's fault, generalised so a sweep gets the check by calling this instead of
 * inventing (or omitting) it. Defaults to the full practice-dependent set so an ordinary console
 * sweep is a one-line call; a caller proving the check itself (e2e/support/fixtures.spec.ts) passes
 * a narrower list to seed a single fixture deliberately out of order.
 */
export async function seedFixtures(
  request: APIRequestContext,
  fixtures: readonly string[] = PRACTICE_DEPENDENT_FIXTURES,
  linked: ReadonlySet<string> = LINKED_FIXTURES,
  linkEmail: string = DEFAULT_LINK_EMAIL,
): Promise<void> {
  const failed: string[] = [];
  for (const fixture of fixtures) {
    const query = linked.has(fixture) ? `?linkEmail=${encodeURIComponent(linkEmail)}` : "";
    const response = await request.post(`/api/mock/${fixture}${query}`);
    if (!response.ok()) failed.push(`${fixture} -> ${response.status()}`);
  }
  if (failed.length > 0) throw new FixtureSeedError(failed);
}
