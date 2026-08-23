// O150 (founder-reported, second time): the profile's layout, pinned by measurement.

import { expect, test, type Page } from "@playwright/test";

const QUERY =
  "I need an ADHD assessment and titration, I speak hindi, and I have anxiety and depression and low mood";

async function toProfile(page: Page) {
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /Change what you said/i }).click();
  await page.getByRole("textbox").fill(QUERY);
  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.locator(".clinician-row").filter({ hasText: "Dr Anubhav" }).first().click();
  await expect(page.locator(".profile-content")).toBeVisible();
  await page.evaluate(() => document.fonts.ready);
}

for (const [name, viewport] of [
  ["desktop", { width: 1280, height: 900 }],
  ["phone", { width: 390, height: 844 }],
] as const) {
  test(`the profile's focus list is one column and evenly ruled (${name})`, async ({ browser }) => {
    const context = await browser.newContext({ viewport, reducedMotion: "reduce" });
    const page = await context.newPage();
    await toProfile(page);

    const list = await page.evaluate(() => {
      const ul = document.querySelector(".profile-content section ul") as HTMLElement;
      const items = Array.from(ul.querySelectorAll("li"));
      return {
        columns: getComputedStyle(ul).gridTemplateColumns.split(" ").length,
        width: Math.round(items[0]!.getBoundingClientRect().width),
        heights: [...new Set(items.map((li) => Math.round(li.getBoundingClientRect().height)))],
        count: items.length,
      };
    });

    // Non-vacuity: an empty list would satisfy every assertion below.
    expect(list.count).toBeGreaterThan(2);
    // ONE column. As `1fr 1fr` this measured 289px per column on desktop and 164px on a phone —
    // about 34 and 19 characters against the tree's own 45-75 measure law. Nineteen characters is
    // two words a line.
    expect(list.columns, "the focus list went back to two columns").toBe(1);
    // And because the items are of unequal length, two columns also made the rows ragged: 43px
    // beside 21px on desktop, 64 beside 43 on a phone. One column makes every row its neighbour's
    // height, which is what stops the list reading as debris.
    expect(list.heights, `focus list rows are uneven: ${list.heights.join("/")}`).toHaveLength(1);

    await context.close();
  });
}

test("the profile groups its blocks instead of spacing them all alike", async ({ browser }) => {
  const context = await browser.newContext({ viewport: { width: 1280, height: 900 }, reducedMotion: "reduce" });
  const page = await context.newPage();
  await toProfile(page);

  const gaps = await page.evaluate(() => {
    const at = (s: string) => document.querySelector(`.profile-content ${s}`)!.getBoundingClientRect();
    return {
      // Inside the identity block: tight, so name/meta/credential/disclosure read as one thing.
      metaToCredential: Math.round(at(".credential-line").top - at(".clinician-meta").bottom),
      credentialToDisclosure: Math.round(at(".disclosure-line").top - at(".credential-line").bottom),
      // Between groups: open, so the eye knows a new idea has started.
      disclosureToEvidence: Math.round(at(".fit-evidence").top - at(".disclosure-line").bottom),
      missedToClarify: Math.round(at(".profile-clarify").top - at(".fit-missed").bottom),
    };
  });

  // THE WHOLE POINT, AS A NUMBER. Before this unit every gap on the screen was between 6 and 13px,
  // so nine semantically different blocks looked like one undifferentiated list — "proximity tells
  // you what belongs together" with the proximity switched off. A within-group gap must stay
  // clearly tighter than a between-group one, whatever the exact values become later.
  const withinGroup = Math.max(gaps.metaToCredential, gaps.credentialToDisclosure);
  const betweenGroups = Math.min(gaps.disclosureToEvidence, gaps.missedToClarify);
  expect(
    betweenGroups,
    `groups are not separated: within=${withinGroup}px between=${betweenGroups}px (${JSON.stringify(gaps)})`,
  ).toBeGreaterThanOrEqual(withinGroup * 2);

  await context.close();
});
