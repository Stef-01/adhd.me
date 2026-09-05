// The axe scan and the settle-first rule, shared by every scan in `a11y.spec.ts` so a route, a
// finder stage and a console screen are all held to the same tag set by the same function.
//
// WHY SETTLE FIRST. Caught mid-entrance, axe measures the composited colour of a fading element
// and reports a contrast failure against tokens that pass at rest — a measurement artefact that
// passes alone and fails under load. So the scan waits for the page to stop moving: `networkidle`
// first, because hydration and webfonts are what REGISTER the entrance animations at all (an
// empty animation list straight after `goto` means "not started", not "finished"), and only then
// for every finite animation to leave `running`. Infinite loops are excluded rather than waited
// on; a decorative loop never finishes.

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";

export async function settle(page: Page) {
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

/** WCAG 2.1 AA is PRODUCT.md's bar; the 2.2 AA tag adds only `target-size`, which the 44px floor exceeds. */
const TAGS = ["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"];

/**
 * Zero violations, with no exemption register: a finding is fixed, or the scan that cannot fix it
 * says so in its own file with the reason. Every node is named so a finding on a stage nobody can
 * reach by URL is locatable from the failure alone.
 */
export async function expectNoViolations(page: Page, label: string) {
  // The title first, with a retry: axe's document-title rule takes one instantaneous reading, and
  // a server action's revalidation swap can be caught mid-flight on a page whose title is pinned.
  await expect(page, `${label} must have a document title`).toHaveTitle(/.+/);
  await settle(page);
  const results = await new AxeBuilder({ page }).withTags(TAGS).analyze();
  const summary = results.violations.map(
    (v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`,
  );
  expect(summary, `${label} must have no WCAG 2.1 AA violations`).toEqual([]);
}
