// AR30: the honesty sweep, extended to the half of the site a signed-in person works in.
//
// W192 sweeps every surface a STRANGER can reach; O163 extended it to the one patient surface
// that is not a route. What remained unswept was the console — twenty-odd screens practice staff
// read all day, never checked against the marketing rules at all. The rules still apply there:
// a testimonial, a rating, a superlative or urgency pressure is dishonest whoever reads it, and
// CLAUDE.md law 6 bans testimonials and ratings ANYWHERE, not anywhere public.
//
// THE AUDIENCE IS PROFESSIONAL, AND THAT IS A CLASSIFICATION RATHER THAN A SOFTENING. Practice
// staff are the same class of reader as `/clinicians`: `rulesFor("professional")` drops the two
// patient-advertising rules (clinical claims, condition naming — a console that could not name a
// condition could not report a case-mix) and keeps every marketing rule in full.
//
// O189'S LAW GOVERNS THE FINDINGS. A console REPORTS stored facts — workflow states, stored
// declarations, role names the governance chain requires — and a marketing regex cannot tell a
// stored fact from a boast. So findings are classified, never suppressed: each must be fixed in
// the copy, or accepted in `CONSOLE_ACCEPTED_FINDINGS` with the data-vs-copy argument made per
// entry. Both directions are checked, W102's shape: an unaccepted finding fails, and an
// acceptance whose text no longer renders fails as stale.
//
// It reuses `sweepSurface` rather than re-implementing the rules — W139's law: a second copy of
// a rule set starts identical and drifts silently.
// taste-rule: honesty.no-testimonials

import { expect, test, type APIRequestContext, type Page } from "@playwright/test";
import { sweepSurface, unaccepted } from "../src/compliance/public-surfaces";
import { CONSOLE_ACCEPTED_FINDINGS } from "../src/compliance/console-honesty";
import { CONSOLE_ROUTES, revealCollapsedSurfaces } from "./site-routes";
import { seedFixtures } from "./support/fixtures";
import { signInAndOnboard } from "./support/session";

// O174's corrected order, via the shared helpers: `POST /api/mock/console` RESETS the console
// store so it goes first, the practice is created straight after, and the practice-dependent
// fixtures seed last (AR8's `seedFixtures` throws naming any that fail, so this sweep cannot
// silently measure an unlinked refusal page).
async function signInAndSeed(page: Page, request: APIRequestContext) {
  await request.post("/api/mock/console");
  await signInAndOnboard(page);
  await seedFixtures(request);
}

test("every console screen serves copy the professional marketing rules allow", async ({
  page,
  request,
}) => {
  test.setTimeout(180_000);
  // The derived list collapsing to a handful would make a green run vacuous — same floor as the
  // keyboard walk over the same list.
  expect(CONSOLE_ROUTES.length, "the derived console list collapsed").toBeGreaterThan(26);
  await signInAndSeed(page, request);

  const seen: ReturnType<typeof sweepSurface> = [];
  const refused: string[] = [];
  for (const route of CONSOLE_ROUTES) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    await revealCollapsedSurfaces(page);
    const text = await page.locator("body").innerText();
    // Vacuity guard per page: a blank render would satisfy every rule. Seeded console screens
    // all carry a heading, an explanation and data; 200 is far under any of them.
    expect(text.length, `${route} rendered nothing`).toBeGreaterThan(200);

    const findings = sweepSurface(route, "professional", text);
    // Collected rather than asserted per route, so one red run is the WHOLE measurement — a
    // per-route assert would report the alphabetically first offender and hide the rest.
    refused.push(
      ...unaccepted(findings, CONSOLE_ACCEPTED_FINDINGS).map(
        (f) => `${f.path} ${f.rule}: "${f.match}"`,
      ),
    );
    seen.push(...findings);
  }

  expect(
    refused,
    "a console screen serves copy the marketing rules refuse — fix the copy, or argue the " +
      "data-vs-copy case in CONSOLE_ACCEPTED_FINDINGS",
  ).toEqual([]);

  // The stale half, W102's shape: an acceptance for a finding the console no longer produces
  // reads as coverage while silently permitting something else.
  for (const accepted of CONSOLE_ACCEPTED_FINDINGS) {
    expect(
      seen.some(
        (f) => f.path === accepted.path && f.rule === accepted.rule && f.match === accepted.match,
      ),
      `${accepted.path} no longer serves "${accepted.match}" — delete the acceptance rather ` +
        `than leaving it`,
    ).toBe(true);
  }
});

test("the console sweep would notice a violation, so a clean run means something", async () => {
  // Non-vacuous end to end, on the professional rule set this sweep actually applies: the exempt
  // patient rules must NOT fire (a console names conditions by design), and the marketing rules
  // must. If this ever fails, the sweep above is decorative.
  const planted =
    "The best ADHD clinic — rated 5/5 by our patients. Specialist care, guaranteed. Act now.";
  const findings = sweepSurface("/console", "professional", planted);
  const rules = findings.map((f) => f.rule);
  expect(rules).toEqual(
    expect.arrayContaining(["no-superlatives", "no-ratings", "no-specialist", "no-guarantees", "no-urgency"]),
  );
  expect(rules).not.toContain("no-condition-targeting");
});
