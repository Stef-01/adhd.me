// The finder, personalised by the person's own map — Phase 5's acceptance (MAP-PRD §10, §15) held
// on the surface it was never held on.
//
// WHY THIS FILE EXISTS. `my-adhd.spec.ts` pins the same guarantee on `/support` ("support names the
// person whose declared expertise answers this need"), and that is where O253 left it. The FINDER
// renders the same reading from the same record through a different path — `care-finder.tsx` reads
// the model on mount, `orderByProblemFit` reorders the allied entries, `fitReason` writes the row's
// line and `fitTags` fills the chips on the profile — and nothing asserted any of it. Four joins,
// no test: the chips could have stopped rendering, the effect could have stopped reading, or the
// reorder could have started moving GPs, and every existing finder spec would still have passed.
//
// WHAT IT ASSERTS, AND WHY IT IS THE HARD VERSION. Not "some chips rendered" — the chips are
// recomputed here from the seeded record through `topNeed` and `fitTags` and compared to the DOM,
// so the test fails if the screen shows a tag the person's own cells do not justify. That is the
// difference between a match and an advert, and it is the whole claim of `honesty.claim-earned`.
//
// THE ROSTER, DELIBERATELY DEFAULT. Examples ship ON, and the expertise taxonomy is declared by
// allied providers — the real roster's GPs carry no `expertise` at all, so a GP scenario personalises
// NOTHING by design (PRD §10: "GPs stay where the engine ranked them"). The sentence below asks for
// the allied professions on purpose; a GP-only search is the empty case, pinned in its own test.
// taste-rule: honesty.claim-earned

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
// The library is plain ESM the CLI shares; the types are loose on purpose. The same seed
// `my-adhd.spec.ts` and the text budget walk, so the person this drives is the person they measure.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LIVED_RECORD } from "../scripts/text-budget-lib.mjs";
import type { ModelRecord } from "../src/model/store";
import { topNeed } from "../src/model/needs";
import { fitTags } from "../src/support/problem-fit";
import { EXPERTISE_LABELS } from "../src/support/professions";
import { rosterFor } from "../src/demo/synthetic-roster";

const MODEL_KEY = "adhdme.model.v1";

/** The sentence that reaches the professions who declare the taxonomy the map is read through. */
const ALLIED_SENTENCE = "An occupational therapist or ADHD coach in Sydney to help me start work tasks";

/**
 * Seed on a page that is NOT the finder, then arrive. U8: the finder's stages live in history
 * entries and a `goto` to the URL the tab already shows is a reload that resumes the entry it is
 * on — so seeding on `/my-adhd` and walking in from there is what makes the visit a fresh arrival.
 */
async function seed(page: Page, record: unknown | null = LIVED_RECORD): Promise<void> {
  await page.goto("/my-adhd");
  if (record === null) await page.evaluate((k) => localStorage.removeItem(k), MODEL_KEY);
  else await page.evaluate(([k, rec]) => localStorage.setItem(k!, rec!), [MODEL_KEY, JSON.stringify(record)]);
}

async function search(page: Page, sentence: string): Promise<void> {
  await page.goto("/");
  await page.getByRole("textbox").fill(sentence);
  await page.getByRole("button", { name: "Find support" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}

/** What this person's map says, computed the way the screen computes it. */
const need = topNeed(LIVED_RECORD as ModelRecord);

test("the row says why this person is seeing them, in the words of their own map", async ({ page }) => {
  await seed(page);
  await search(page, ALLIED_SENTENCE);

  // `fitReason`'s two forms: the need's own subdomain is "the thing you said is hardest", a
  // contributor's is "part of what you described". At least one row earns the first.
  const rows = page.locator(".clinician-row .row-focus");
  await expect(rows.filter({ hasText: "the thing you said is hardest" }).first()).toBeVisible();

  // The line is ABOUT the person and must never put a number on them — the law the whole tab is
  // built on, held here because this is the first sentence on the finder that reads their record.
  for (const text of await page.locator(".clinician-row .row-focus").allInnerTexts()) {
    expect(text).not.toMatch(/\d/);
  }
});

test("the profile's chips are the person's own cells, not the provider's sales list", async ({ page }) => {
  await seed(page);
  await search(page, ALLIED_SENTENCE);
  await page.locator(".clinician-row").first().click();
  await expect(page.locator(".profile-screen")).toBeVisible();

  const name = (await page.getByRole("heading", { level: 1 }).innerText()).trim();
  const clinician = rosterFor(true).find((c) => c.name === name);
  expect(clinician, `the opened profile "${name}" is on the default roster`).toBeTruthy();

  // THE ASSERTION THIS FILE IS FOR. The expected chips are derived from the seeded record, not
  // from the provider's declared expertise — `fitTags` returns only the tags the person's own
  // need and its contributors reach, in the taxonomy's order, and the screen shows the first three.
  const expected = fitTags(clinician!, need).slice(0, 3).map((t) => EXPERTISE_LABELS[t]);
  expect(expected.length, "the first allied result answers this need").toBeGreaterThan(0);
  await expect(page.locator(".profile-fit-tags li")).toHaveText(expected);

  // The chips are labelled as the person's map read back, which is what makes them traceable.
  await expect(page.locator(".profile-fit-tags")).toHaveAttribute("aria-label", "What this matches in your map");

  // Two sentences ride with the chips and both are read off the record: `fitReason` says which of
  // the person's cells this provider answers, and `strengthReason` says what the person said WORKS
  // for them. The strength line is the half no screen asserted anywhere, on either surface.
  await expect(page.locator(".profile-fit").first()).toContainText("Works on");
  await expect(page.locator(".profile-fit").filter({ hasText: "which you said helps" })).toHaveCount(1);
});

test("with no map, the finder says nothing about a person it knows nothing about", async ({ page }) => {
  // The empty case is the honest one, and it is the case a broken read looks exactly like — which
  // is why the test above asserts content and this one asserts silence. `fitTags` returns [] with a
  // null need, so the chips must not render at all rather than render empty.
  await seed(page, null);
  await search(page, ALLIED_SENTENCE);

  await expect(page.locator(".profile-fit-tags")).toHaveCount(0);
  expect(await page.locator(".clinician-list").innerText()).not.toContain("you said");

  await page.locator(".clinician-row").first().click();
  await expect(page.locator(".profile-screen")).toBeVisible();
  await expect(page.locator(".profile-fit-tags")).toHaveCount(0);
  await expect(page.locator(".profile-fit")).toHaveCount(0);
});
