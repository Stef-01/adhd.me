// W49 verify gate (automated half): axe-core WCAG 2.1 A/AA scans over every console
// surface and the patient-facing booking states. Zero violations is the bar — a
// finding is fixed or explicitly ruled, never ignored. The manual half lives in
// docs/A11Y-W49.md.

import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

// Scan the settled page, not a frame of its entrance animation. The care finder's
// `.screen` fades opacity 0→1 over 260ms; caught mid-fade, axe measures the composited
// colour (e.g. --muted #6e706a reads as #73756f, 4.46:1) and reports a contrast
// violation against tokens that pass at rest (4.7:1 and 5.1:1). That made the suite
// pass in isolation and fail under load — a measurement artefact, not a defect.
// prefers-reduced-motion is the app's own escape hatch (globals.css collapses every
// animation to 0.01ms), so this scans a state the product actually ships, and it is
// the state a reduced-motion user sees. It does not relax the zero-violation bar.
//
// A11Y-1: THAT ESCAPE HATCH STOPPED REACHING THE LANDING PAGE. The storybook (5843fab)
// animates with motion/react, whose reduced-motion gate is a HOOK read during render —
// `initial={reduce ? false : "hidden"}` — not a CSS rule. `emulateMedia` after `goto`
// re-evaluates CSS at any time, which is why it worked for `.screen`; it cannot reach a
// decision JavaScript already made at mount. So the suite went on scanning mid-fade.
//
// THE FIX IS `settle()`, NOT THE EMULATION. Measured rather than assumed: with `settle()`
// in place the public-pages scan passes even with the emulation removed entirely. The
// emulation is kept because W49 chose to scan the state a reduced-motion user sees and
// that intent still holds, and it is moved before the first navigation so it takes effect
// at all — but it is not what makes this green, and saying otherwise would leave the next
// reader defending the wrong line.
//
// THE TRAP INSIDE `settle()` IS WORTH STATING, because it is in every "wait for the
// animations" helper: immediately after `goto` the eyebrow sits at opacity 0 with
// `document.getAnimations()` returning ZERO — React has not hydrated, so the animations
// do not exist yet. An empty list means NOT STARTED, and reading it as FINISHED scans the
// most misleading frame there is. Hence networkidle first (hydration and fonts), and only
// then a wait for the animation list to stop running.
//
// The values under all this are fine and were never the problem: `--s-sage` #55663f on
// `--s-paper` #f7f3ea is 5.65:1. The 1.14:1 and 3.97:1 readings that failed this suite
// were that same token composited at ~0% and ~83% opacity mid-fade.

interface MockState {
  invitations: Array<{ id: string; status: string; token: string }>;
}

/**
 * Wait for the page to stop moving.
 *
 * Deliberately two steps, in this order. `networkidle` gets hydration and webfonts done,
 * which is what causes the entrance animations to be REGISTERED at all; only then is an
 * empty animation list trustworthy as "nothing left to run".
 *
 * Infinite animations are excluded rather than waited on — a decorative loop never
 * reaches `finished`, and blocking on one would hang the suite instead of failing it.
 */
async function settle(page: Page) {
  await page.waitForLoadState("networkidle");
  await page.waitForFunction(
    () =>
      document
        .getAnimations()
        .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
        .every((a) => a.playState !== "running"),
    undefined,
    { timeout: 15_000 },
  );
}

async function expectNoViolations(page: Page, label: string) {
  // Assert the title before scanning. axe's document-title rule takes a single
  // instantaneous reading, so a server action's revalidation swap — the confirm-booking
  // one in particular — can be caught mid-flight and reported as a missing <title> on a
  // page that has one pinned (W49 follow-up). This is the same requirement with a
  // retry, so a genuinely title-less page still fails, and fails more legibly.
  await expect(page, `${label} must have a document title`).toHaveTitle(/.+/);
  await settle(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
    .analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}`,
  );
  expect(summary, `${label} must have no WCAG A/AA violations`).toEqual([]);
}

test.beforeEach(async ({ page, request }) => {
  // BEFORE any navigation, so it is active for the FIRST paint of every page this file
  // loads — applied after `goto` it is too late for a framework that reads the preference
  // once during render. Not load-bearing for the zero-violation result (see the header);
  // it keeps W49's choice to scan what a reduced-motion user sees.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await request.post("/api/mock/state");
  await request.post("/api/mock/console");
  await page.goto("/console");
  await page.getByLabel("Work email").fill("manager@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
  // W113: seed and link, so the credentials page is scanned POPULATED. The unlinked refusal
  // renders one paragraph and no form — scanning that instead would pass while leaving the
  // list, the status chips and the withdraw forms untested.
  await request.post("/api/mock/credentials?linkEmail=manager@demo.practice.example");
  await request.post("/api/mock/pathways");
  await request.post("/api/mock/referrals");
  // W151: linked, so the education page is scanned with a POPULATED reading record rather than
  // with the unlinked refusal, which renders one paragraph and no list.
  await request.post("/api/mock/education?linkEmail=manager@demo.practice.example");
  await request.post("/api/mock/verticals"); // W164: scanned POPULATED, not on its zero state
});

test("console surfaces pass WCAG A/AA", async ({ page }) => {
  test.setTimeout(120_000);
  const surfaces = [
    "/console",
    "/console/rules",
    "/console/dashboard",
    "/console/results",
    "/console/usefulness",
    "/console/ops",
    "/console/roi",
    "/console/privacy",
    "/console/complaints",
    "/console/registers", // W60
    "/console/capability", // W83
    "/console/interest",
    "/console/case-mix", // W81
    "/console/outreach", // W95 — landed after the W101 sweep was claimed
    "/console/credentials", // W113
    "/console/pathways", // W127
    "/console/referrals", // W137
    "/console/education", // W151
    "/console/verticals", // W164
    "/console/outcomes", // W173 — scanned POPULATED via the referral seed below
    "/console/reporting", // W199 — same referral seed populates it
    "/console/setup/practice",
  ];
  for (const path of surfaces) {
    await page.goto(path);
    await page.waitForLoadState("networkidle");
    await expectNoViolations(page, path);
  }
});

test("sign-in and onboarding pass WCAG A/AA", async ({ page, request }) => {
  await page.getByRole("button", { name: "Sign out" }).click();
  await page.waitForURL(/\/console\/signin$/);
  await page.waitForLoadState("networkidle");
  await expect(page).toHaveTitle(/Sign in/);
  await expectNoViolations(page, "/console/signin");

  // W101: this test has been named "and onboarding" since W49 while only ever scanning
  // sign-in. Onboarding is the first authenticated form a practice ever meets, so it is
  // scanned properly now — reaching it needs a signed-in session with NO practice yet.
  await request.post("/api/mock/console");
  await page.goto("/console");
  await page.getByLabel("Work email").fill("manager@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console\/onboarding$/);
  await page.waitForLoadState("networkidle");
  await expectNoViolations(page, "/console/onboarding");
});

test("patient booking states pass WCAG A/AA", async ({ page, request }) => {
  const seeded = (await (await request.get("/api/mock/state")).json()) as MockState;
  const token = seeded.invitations[0]!.token;

  await page.goto(`/book/${token}`);
  await expectNoViolations(page, "booking offer page");

  await page.getByRole("button", { name: "Confirm booking" }).click();
  await page.getByRole("heading", { name: "Your appointment is booked" }).waitFor();
  await expectNoViolations(page, "booking confirmation page");

  await page.goto("/book/not-a-token");
  await expectNoViolations(page, "invalid-link page");
});

test("public pages pass WCAG A/AA", async ({ page }) => {
  // The public root is the community program; the synthetic finder lives separately.
  // Every public surface remains on the same zero-violation rule.
  for (const path of ["/", "/finder", "/practices", "/clinicians", "/privacy", "/privacy/automated-decisions", "/demo"]) {
    await page.goto(path);
    await expectNoViolations(page, path);
  }
});
