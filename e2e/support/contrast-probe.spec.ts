// AR12: the mutation probe for the contrast sweep (docs/AESTHETIC-REVIEW-PLAN.md Phase 2,
// "a check that cannot fail is not a check") — the last of the four-probe quartet.
//
// This sweep HAS fired for real (O157: --muted and --faint at 4.24 and 4.48 on --stone), which
// proves the detector could fail on the day it was written and nothing since. Detectors rot the
// way O176's accent canvas rotted — a parse that stops matching a colour format, a floor
// comparison edited the wrong way — and this sweep's own history carries exactly that shape:
// its first draft parsed only rgb() and reported white-on-dark as 1.00:1, six confident false
// findings. The probe puts known-ratio text on a real page and requires the real detector —
// `contrastFindings`/`contrastFinding` from `e2e/support/contrast-load.ts`, the same functions
// the sweep calls — to read it correctly in both directions.

import { expect, test } from "@playwright/test";
import type { Page } from "@playwright/test";
import { PUBLIC_ROUTES } from "../site-routes";
import { probeVerdict } from "./probe";
import { CONTRAST_RULE_ID, contrastFinding, contrastFindings, injectText } from "./contrast-load";

const PROBED_ROUTE = PUBLIC_ROUTES[0]!;

/**
 * Known-ratio pairs on a white self-background, so the probe is independent of the page palette:
 *   #777777 on #ffffff = 4.48:1 — under the 4.5 normal-text floor by two hundredths;
 *   #767676 on #ffffff = 4.54:1 — over it by four hundredths (the classic AA boundary pair);
 *   #8b8b8b on #ffffff = 3.41:1 — over the 3:1 large-text floor, under the normal one, which is
 *     what lets one colour prove the large-text branch is live.
 */
const JUST_UNDER = { color: "#777777", background: "#ffffff", fontSizePx: 16 };
const JUST_OVER = { color: "#767676", background: "#ffffff", fontSizePx: 16 };
const LARGE_ONLY = { color: "#8b8b8b", background: "#ffffff", fontSizePx: 24 };
const LARGE_ONLY_AT_BODY_SIZE = { color: "#8b8b8b", background: "#ffffff", fontSizePx: 16 };

async function openProbedRoute(page: Page): Promise<void> {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(PROBED_ROUTE, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);
}

test("the contrast sweep goes red on under-floor text, naming the route and the rule id", async ({
  page,
}) => {
  await openProbedRoute(page);

  const clean = await contrastFindings(page);
  // The detector must be reading real text before a mutation means anything (AR10/AR11's guard).
  expect(clean.seen, `${PROBED_ROUTE} reports no text at all — the detector is blind`).toBeGreaterThan(0);
  const cleanFinding = contrastFinding(PROBED_ROUTE, clean.out);

  const label = await injectText(page, JUST_UNDER);
  const mutated = await contrastFindings(page);

  // The finding must be ABOUT the probe's own text, with the ratio the pair is known to have —
  // a detector that flagged it at some other ratio would be red for the wrong arithmetic.
  const own = mutated.out.filter((entry) => entry.includes(label));
  expect(own, "the detector did not report the probe's own 4.48:1 text").toHaveLength(1);
  expect(own[0]).toContain("4.48:1");
  expect(mutated.seen).toBe(clean.seen + 1);

  const probedFinding = contrastFinding(PROBED_ROUTE, mutated.out);
  const verdict = probeVerdict(CONTRAST_RULE_ID, PROBED_ROUTE, probedFinding, cleanFinding);
  expect(
    verdict.kind,
    verdict.kind === "discriminates" ? "" : (verdict as { reason: string }).reason,
  ).toBe("discriminates");
  expect(probedFinding).toContain(PROBED_ROUTE);
  expect(probedFinding).toContain(CONTRAST_RULE_ID);
});

test("the floors are live on both sides, and the large-text branch is real", async ({ page }) => {
  await openProbedRoute(page);
  expect(contrastFinding(PROBED_ROUTE, (await contrastFindings(page)).out)).toBeNull();

  // 4.54:1 at body size: green. A detector that flagged any injected text regardless of ratio
  // would have passed the red test above while the floor's value did no work.
  await injectText(page, JUST_OVER);
  const atFloor = await contrastFindings(page);
  expect(
    contrastFinding(PROBED_ROUTE, atFloor.out),
    "4.54:1 text was reported — the AA boundary is off",
  ).toBeNull();

  // 3.41:1 at 24px: green — the large-text floor is 3:1. The SAME colour at 16px: red. One
  // colour, two verdicts, which is the large branch proven live rather than decorative; a
  // detector applying 4.5 to everything fails here even though it makes the red test redder
  // (the fires-for-the-wrong-reason guard, this family's version).
  await injectText(page, LARGE_ONLY);
  const withLarge = await contrastFindings(page);
  expect(
    contrastFinding(PROBED_ROUTE, withLarge.out),
    "3.41:1 text at 24px was reported — the large-text branch is dead and everything is held to 4.5",
  ).toBeNull();

  const bodySized = await injectText(page, LARGE_ONLY_AT_BODY_SIZE);
  const withBoth = await contrastFindings(page);
  const flagged = withBoth.out.filter((entry) => entry.includes(bodySized));
  expect(flagged, "the same 3.41:1 colour at 16px must fail the 4.5 floor").toHaveLength(1);
  expect(flagged[0]).toContain("needs 4.5");
});
