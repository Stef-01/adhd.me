// Every control on the results screen, held to the engine that ranks the list. The expected
// counts are computed here from the same roster and the same functions the finder runs, so a
// chip that narrowed to the wrong people, a kind that led to an empty screen, or a way out that
// stated a number the tap did not produce would fail against the engine rather than a fixture.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { rosterFor } from "../src/demo/synthetic-roster";
import { professionOf } from "../src/demo/clinicians";
import { BOOLEAN_FILTER_KEYS, BOOLEAN_FILTER_LABELS, emptyFilters, type BooleanFilterKey, type Filters } from "../src/finder/filters";
import { searchRoster, waysOut } from "../src/finder/pipeline";
import { resolvePlace } from "../src/geo/suburbs";

const REQUEST = "someone who can do the whole assessment";
const roster = rosterFor(true);
const hornsby = resolvePlace("Hornsby")!;
const byId = new Map(roster.map((c) => [c.id, c]));
const count = (filters: Filters) => searchRoster(roster, filters, REQUEST, hornsby).length;

async function search(page: Page) {
  await page.goto("/?place=Hornsby");
  await page.getByRole("textbox").fill(REQUEST);
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}

/** The list's size as the screen states it: the rows shown and the "n more" under them. */
async function total(page: Page): Promise<number> {
  const rows = await page.locator(".clinician-row").count();
  const more = page.locator(".show-all");
  return rows + ((await more.count()) ? Number(/^(\d+) more$/.exec((await more.innerText()).trim())![1]) : 0);
}

/** "n more" adds five rows at a time: tap it until the whole list is shown. */
async function showEveryone(page: Page) {
  const more = page.locator(".show-all");
  for (let guard = 0; guard < 60 && (await more.count()); guard++) await more.click();
  await expect(more).toHaveCount(0);
}

/**
 * A yes/no filter is switched on where the Filters door leads, the profile. The results strip
 * shows only the ones that are on, each a chip that switches it off.
 */
async function switchOn(page: Page, keys: readonly BooleanFilterKey[]) {
  await page.goto("/profile");
  for (const key of keys) await page.getByRole("switch", { name: new RegExp(BOOLEAN_FILTER_LABELS[key], "i") }).check();
}

async function rowIds(page: Page): Promise<string[]> {
  return page.locator(".clinician-row").evaluateAll((rows) => rows.map((r) => r.getAttribute("data-clinician") ?? ""));
}

test("a filter that is on narrows to exactly the providers who declare it, and its chip switches it off", async ({ page }) => {
  await search(page);
  const strip = page.getByRole("group", { name: "Your filters" });
  const everyone = count(emptyFilters());
  await expect.poll(() => total(page)).toBe(everyone);
  // Nothing on, no filter chips: an off filter repeated the heard chips above it.
  await expect(strip.locator("button.filter-chip")).toHaveCount(0);
  for (const key of BOOLEAN_FILTER_KEYS) {
    await switchOn(page, [key]);
    await search(page);
    const chip = strip.getByRole("button", { name: BOOLEAN_FILTER_LABELS[key], exact: true });
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    await expect(strip.locator("button.filter-chip")).toHaveCount(1);
    const expected = count({ ...emptyFilters(), [key]: true });
    expect(expected, `${key} has somebody to show`).toBeGreaterThan(0);
    await expect.poll(() => total(page)).toBe(expected);
    await expect(strip.getByRole("button", { name: "Clear", exact: true })).toBeVisible();
    await chip.click();
    await expect(chip).toHaveCount(0);
    await expect.poll(() => total(page)).toBe(everyone);
    await expect(strip.getByRole("button", { name: "Clear", exact: true })).toHaveCount(0);
  }
});

test("the kind pill narrows to one kind, every kind it offers leads somewhere, and all of them show", async ({ page }) => {
  await search(page);
  const kinds = page.getByLabel("Provider type");
  const offered: string[] = await kinds.locator("option:not([disabled])").evaluateAll((os) => os.map((o) => (o as HTMLOptionElement).value).filter(Boolean));
  expect(offered.length).toBeGreaterThan(1);
  for (const id of offered) {
    await kinds.selectOption(id);
    await expect(kinds).toHaveValue(id);
    await expect(page.locator(".results-empty")).toHaveCount(0);
    const expected = count({ ...emptyFilters(), professions: [id as Filters["professions"][number]] });
    await expect.poll(() => total(page)).toBe(expected);
    // Rows of the last kind leave on a short exit; every row still standing is of this kind.
    await expect.poll(async () => (await rowIds(page)).every((rowId) => professionOf(byId.get(rowId)!) === id)).toBe(true);
  }
  // Everybody of the last kind, once "more" has been tapped through.
  await showEveryone(page);
  await expect.poll(() => page.locator(".clinician-row").count()).toBe(count({ ...emptyFilters(), professions: [offered.at(-1)! as Filters["professions"][number]] }));
  await kinds.selectOption("");
  await expect(kinds).toHaveValue("");
  await expect.poll(() => total(page)).toBe(count(emptyFilters()));
});

test("an empty list names each way out with the number it brings back, and a tap does exactly that", async ({ page }) => {
  const held: Filters = { ...emptyFilters(), womanGp: true, telehealth: true, bulkBilling: true };
  expect(count(held)).toBe(0);
  await switchOn(page, ["womanGp", "telehealth", "bulkBilling"]);
  await search(page);
  const strip = page.getByRole("group", { name: "Your filters" });
  const empty = page.locator(".results-empty");
  await expect(empty).toContainText("No listed provider answers every filter you set.");
  await expect(page.locator(".clinician-row")).toHaveCount(0);
  const ways = waysOut(roster, held, REQUEST, hornsby);
  expect(ways.length).toBeGreaterThan(0);
  for (const way of ways.slice(0, 3)) {
    await expect(empty.getByRole("button", { name: `Without ${way.label} ${way.count}` })).toBeVisible();
  }
  const first = ways[0]!;
  await empty.getByRole("button", { name: `Without ${first.label} ${first.count}` }).click();
  await expect(page.locator(".results-empty")).toHaveCount(0);
  await expect.poll(() => total(page)).toBe(first.count);
  await expect(strip.getByRole("button", { name: first.label, exact: true })).toHaveCount(0);
  // The other two are still on; Clear takes them off and the device agrees.
  expect(await strip.locator('[aria-pressed="true"]').count()).toBe(2);
  await strip.getByRole("button", { name: "Clear", exact: true }).click();
  await expect(strip.locator('[aria-pressed="true"]')).toHaveCount(0);
  await expect.poll(() => total(page)).toBe(count(emptyFilters()));
  expect(await page.evaluate(() => localStorage.getItem("adhdme.filters.v1"))).toBeNull();
});

test("the profile's other filters ride on the Filters pill, narrow the list, and clear from it", async ({ page }) => {
  await page.goto("/profile");
  for (const name of ["Languages", "Distance", "Consult notes"]) await page.locator("summary", { hasText: name }).click();
  await page.getByRole("button", { name: "Spanish", exact: true }).click();
  await page.getByRole("button", { name: "20 km", exact: true }).click();
  await page.getByRole("button", { name: "No AI", exact: true }).click();
  await expect(page.getByText("3 on", { exact: true })).toBeVisible();
  await search(page);
  const strip = page.getByRole("group", { name: "Your filters" });
  await expect(strip.getByRole("link", { name: /Filters/ })).toContainText("3");
  const held: Filters = { ...emptyFilters(), languages: ["Spanish"], withinKm: 20, consultRecording: "no-ai" };
  const expected = count(held);
  if (expected === 0) {
    await expect(page.locator(".results-empty")).toBeVisible();
  } else {
    await expect.poll(() => total(page)).toBe(expected);
    for (const rowId of await rowIds(page)) expect(byId.get(rowId)!.languages).toContain("Spanish");
  }
  await page.getByRole("button", { name: /^Clear/ }).first().click();
  await expect(strip.getByRole("link", { name: /Filters/ })).not.toContainText("3");
  await expect.poll(() => total(page)).toBe(count(emptyFilters()));
});

test("more adds five at a time until everyone shows, and Start over keeps the device's filters for the next search", async ({ page }) => {
  await switchOn(page, ["wheelchair"]);
  await search(page);
  const strip = page.getByRole("group", { name: "Your filters" });
  const expected = count({ ...emptyFilters(), wheelchair: true });
  await expect.poll(() => total(page)).toBe(expected);
  const shown = await page.locator(".clinician-row").count();
  if (expected > shown) {
    // One tap, five more rows (or the rest), and focus on the first of them.
    await page.locator(".show-all").click();
    await expect(page.locator(".clinician-row")).toHaveCount(Math.min(expected, shown + 5));
    await expect(page.locator(".clinician-row").nth(shown)).toBeFocused();
  }
  await showEveryone(page);
  await expect(page.locator(".clinician-row")).toHaveCount(expected);
  for (const rowId of await rowIds(page)) expect(byId.get(rowId)!.wheelchairAccessible).toBe(true);
  // Start over sits in the search bar it restarts, not in a corner of the header.
  const startOver = page.getByRole("group", { name: "Your search" }).getByRole("button", { name: "Start over" });
  await expect(startOver).toBeVisible();
  await expect(page.locator("header.minimal-header").getByRole("button", { name: "Start over" })).toHaveCount(0);
  await startOver.click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("What kind of support");
  await page.getByRole("textbox").fill("a psychologist for anxiety");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await expect(strip.getByRole("button", { name: "Wheelchair access", exact: true })).toHaveAttribute("aria-pressed", "true");
});
