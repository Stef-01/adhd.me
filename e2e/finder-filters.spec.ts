// Every control on the results screen, held to the engine that ranks the list. The expected
// counts are computed here from the same roster and the same functions the finder runs, so a
// chip that narrowed to the wrong people, a kind that led to an empty screen, or a way out that
// stated a number the tap did not produce would fail against the engine rather than a fixture.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { rosterFor } from "../src/demo/synthetic-roster";
import { professionOf } from "../src/demo/clinicians";
import { BOOLEAN_FILTER_KEYS, BOOLEAN_FILTER_LABELS, emptyFilters, type Filters } from "../src/finder/filters";
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

/** The list's size as the screen states it: the "of m" total while folded, the rows once shown in full. */
async function total(page: Page): Promise<number> {
  const counter = page.locator(".results-count");
  if (await counter.count()) return Number(/of (\d+)/.exec(await counter.innerText())![1]);
  return page.locator(".clinician-row").count();
}

async function rowIds(page: Page): Promise<string[]> {
  return page.locator(".clinician-row").evaluateAll((rows) => rows.map((r) => r.getAttribute("data-clinician") ?? ""));
}

test("every quick filter narrows to exactly the providers who declare it, and off again", async ({ page }) => {
  await search(page);
  const strip = page.getByRole("group", { name: "Your filters" });
  const everyone = count(emptyFilters());
  await expect.poll(() => total(page)).toBe(everyone);
  for (const key of BOOLEAN_FILTER_KEYS) {
    const chip = strip.getByRole("button", { name: BOOLEAN_FILTER_LABELS[key], exact: true });
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "true");
    const expected = count({ ...emptyFilters(), [key]: true });
    expect(expected, `${key} has somebody to show`).toBeGreaterThan(0);
    await expect.poll(() => total(page)).toBe(expected);
    await expect(strip.getByRole("button", { name: "Clear", exact: true })).toBeVisible();
    await chip.click();
    await expect(chip).toHaveAttribute("aria-pressed", "false");
    await expect.poll(() => total(page)).toBe(everyone);
  }
  await expect(strip.getByRole("button", { name: "Clear", exact: true })).toHaveCount(0);
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
  // Everybody of the last kind, once "more" is tapped.
  const more = page.locator(".show-all");
  if (await more.count()) await more.click();
  await expect.poll(() => page.locator(".clinician-row").count()).toBe(count({ ...emptyFilters(), professions: [offered.at(-1)! as Filters["professions"][number]] }));
  await kinds.selectOption("");
  await expect(kinds).toHaveValue("");
  await expect.poll(() => total(page)).toBe(count(emptyFilters()));
});

test("an empty list names each way out with the number it brings back, and a tap does exactly that", async ({ page }) => {
  await search(page);
  const strip = page.getByRole("group", { name: "Your filters" });
  const held: Filters = { ...emptyFilters(), womanGp: true, telehealth: true, bulkBilling: true };
  expect(count(held)).toBe(0);
  for (const key of ["womanGp", "telehealth", "bulkBilling"] as const) {
    await strip.getByRole("button", { name: BOOLEAN_FILTER_LABELS[key], exact: true }).click();
  }
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
  await expect(strip.getByRole("button", { name: first.label, exact: true })).toHaveAttribute("aria-pressed", "false");
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

test("more shows everyone, and Start over keeps the device's filters for the next search", async ({ page }) => {
  await search(page);
  const strip = page.getByRole("group", { name: "Your filters" });
  await strip.getByRole("button", { name: "Wheelchair access", exact: true }).click();
  const expected = count({ ...emptyFilters(), wheelchair: true });
  await expect.poll(() => total(page)).toBe(expected);
  await page.locator(".show-all").click();
  await expect(page.locator(".clinician-row")).toHaveCount(expected);
  await expect(page.locator(".show-all")).toHaveCount(0);
  for (const rowId of await rowIds(page)) expect(byId.get(rowId)!.wheelchairAccessible).toBe(true);
  await page.getByRole("button", { name: "Start over" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText("What kind of support");
  await page.getByRole("textbox").fill("a psychologist for anxiety");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await expect(strip.getByRole("button", { name: "Wheelchair access", exact: true })).toHaveAttribute("aria-pressed", "true");
});
