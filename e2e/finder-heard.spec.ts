// The finder's "What we heard" row (docs/matching/LLM-MATCHING-PLAN.md §15): the request read back
// as chips, each a button that takes its facet out of the ranking. The list re-ranks in the browser
// through `rankClinicians`' needs argument, with no reload and no request of any kind, and the
// expected orders here come from that same engine call.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { clinicians, needsFor, rankClinicians } from "../src/demo/clinicians";
import { emptyFilters } from "../src/finder/filters";
import { searchRoster } from "../src/finder/pipeline";
import { facetKey, type NeedSignal } from "../src/matching/needs";

const REQUEST = "an adult ADHD assessment, telehealth, not rushed";
const roster = searchRoster(clinicians, emptyFilters(), REQUEST, null);
const topFive = (keep: (need: NeedSignal) => boolean) =>
  rankClinicians(REQUEST, roster, new Date(), needsFor(REQUEST, roster).filter(keep)).slice(0, 5).map((c) => c.id);
const rowIds = (page: Page) => page.locator(".clinician-row").evaluateAll((rows) => rows.map((r) => r.getAttribute("data-clinician")));

async function search(page: Page, request: string) {
  await page.goto("/");
  await page.getByRole("textbox").fill(request);
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}

test("a heard chip comes out, the list re-ranks with no request, and the chip puts it back", async ({ page }) => {
  await search(page, REQUEST);
  const heard = page.getByRole("group", { name: "What we heard" });
  const chips = heard.getByRole("button");
  await expect(chips).toHaveText(["Telehealth", "ADHD assessment", "Not rushed"]);
  for (const name of ["Remove telehealth", "Remove ADHD assessment", "Remove not rushed"]) {
    // The layout box, not the painted one: the screen's arrival scales it for a moment.
    const box = await heard.getByRole("button", { name, exact: true }).evaluate((el: HTMLElement) => ({ width: el.offsetWidth, height: el.offsetHeight }));
    expect(box.height, `${name} clears the touch floor`).toBeGreaterThanOrEqual(44);
    expect(box.width).toBeGreaterThanOrEqual(44);
  }

  const before = await rowIds(page);
  expect(before).toEqual(topFive(() => true));
  const after = topFive((need) => facetKey(need.facet) !== "pref:telehealth-first");
  expect(after, "taking telehealth out changes the first five").not.toEqual(before);

  // Every request from here on that could carry the words: the page's own calls (a server
  // re-render is one) and navigations. Portraits, a link's prefetched chunk and the Web Vitals
  // beacon (app/web-vitals.tsx, the pathname alone) cannot, and any of them may land in the window.
  const requests: { type: string; url: string }[] = [];
  page.on("request", (request) => requests.push({ type: request.resourceType(), url: request.url() }));
  const CARRIES = new Set(["fetch", "xhr", "document", "eventsource", "websocket"]);
  const notAPortrait = () => requests.filter((r) => CARRIES.has(r.type) && !new URL(r.url).pathname.startsWith("/api/vitals"));
  const url = page.url();

  await heard.getByRole("button", { name: "Remove telehealth", exact: true }).click();
  await expect.poll(() => rowIds(page)).toEqual(after);
  const back = heard.getByRole("button", { name: "Put back telehealth", exact: true });
  await expect(back).toHaveText("Telehealth");
  await expect(back).toBeFocused();
  await page.waitForTimeout(500);
  expect(notAPortrait(), "the re-rank ran in the browser").toEqual([]);
  expect(page.url()).toBe(url);

  await back.click();
  await expect.poll(() => rowIds(page)).toEqual(before);
  await expect(heard.getByRole("button", { name: "Remove telehealth", exact: true })).toBeVisible();
  await page.waitForTimeout(500);
  expect(notAPortrait()).toEqual([]);
  expect(page.url()).toBe(url);
});

test("with every heard chip out, the list stops claiming to be matches", async ({ page }) => {
  await search(page, REQUEST);
  const heading = page.locator(".results-list-head h2");
  await expect(heading).toHaveText("Matches");
  const heard = page.getByRole("group", { name: "What we heard" });
  for (const name of ["telehealth", "ADHD assessment", "not rushed"]) await heard.getByRole("button", { name: `Remove ${name}`, exact: true }).click();
  await expect(heading).toHaveText("All listed providers");
  await expect(page.locator(".clinician-row.is-lead")).toHaveCount(0);
  await heard.getByRole("button", { name: "Put back ADHD assessment", exact: true }).click();
  await expect(heading).toHaveText("Matches");
});

test("five facets heard, four chips shown: the strongest, in the ranker's order", async ({ page }) => {
  await search(page, "I want a woman GP who bulk bills and speaks Hindi, my anxiety is bad and I need a longer appointment");
  await expect(page.getByRole("group", { name: "What we heard" }).getByRole("button")).toHaveText([
    "Hindi-speaking",
    "Bulk billing",
    "Longer appointment",
    "Woman clinician",
  ]);
});
