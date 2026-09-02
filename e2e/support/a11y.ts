// U9: the axe scan and the settle-first rule, lifted out of a11y.spec.ts so the finder's stages
// (finder-a11y.spec.ts) are scanned by the SAME function as the routes — the label, the tag set
// and the exemption register's two-way check included. The reasoning behind `settle` — the
// mid-fade contrast readings that made the suite pass alone and fail under load — stays in
// a11y.spec.ts's header, where it was written; nothing here changed.

import AxeBuilder from "@axe-core/playwright";
import { expect, type Page } from "@playwright/test";
import { filterExemptViolations } from "../../src/quality/a11y-exemptions";

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

export async function expectNoViolations(page: Page, label: string) {
  // Assert the title before scanning. axe's document-title rule takes a single
  // instantaneous reading, so a server action's revalidation swap — the confirm-booking
  // one in particular — can be caught mid-flight and reported as a missing <title> on a
  // page that has one pinned (W49 follow-up). This is the same requirement with a
  // retry, so a genuinely title-less page still fails, and fails more legibly.
  await expect(page, `${label} must have a document title`).toHaveTitle(/.+/);
  await settle(page);
  const results = await new AxeBuilder({ page })
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  const { unexempted, unusedExemptions } = filterExemptViolations(label, results.violations);
  const unexemptedIds = new Set(unexempted.map((v) => v.id));
  const summary = results.violations
    .filter((v) => unexemptedIds.has(v.id))
    // U9: the nodes are named, so a finding on a stage nobody can reach by URL is locatable from
    // the failure alone.
    .map((v) => `${v.id} (${v.impact}): ${v.nodes.length} node(s) — ${v.help}: ${v.nodes.map((n) => n.target.join(" ")).join(", ")}`);
  expect(summary, `${label} must have no unexempted WCAG 2.2 AA violations`).toEqual([]);
  expect(
    unusedExemptions,
    `${label}'s a11y-exemptions.ts entries must match a real, current finding — a stale exemption hides nothing`,
  ).toEqual([]);
}
