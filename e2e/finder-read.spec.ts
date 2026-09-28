// The finder's read route (docs/matching/LLM-MATCHING-PLAN.md §15, build step 2) at both levels.
//
// Level 0 is the suite's own server: the finder reads the words itself, the list is the engine's
// own order, and no request leaves the page for them. Level 1 is the same build with two things
// changed in the browser, because the level is taken when `/` is prerendered: the served page
// carries `readLevel: 1`, and `/api/finder/read` is answered by the route's own handler, run here at
// level 1 in cassette mode, so the model path runs end to end with no network. The expected orders
// come from `rankClinicians` on the same keys, as finder-heard.spec.ts does.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { needsFor, rankClinicians } from "../src/demo/clinicians";
import { rosterFor } from "../src/demo/synthetic-roster";
import { emptyFilters } from "../src/finder/filters";
import { heardChips } from "../src/finder/heard";
import { searchRoster } from "../src/finder/pipeline";
import { CASSETTES } from "../src/lib/llm/cassettes";
import { lexiconReading } from "../src/lib/matching/llm-read";
import { facetKey, needForKey, type NeedSignal } from "../src/matching/needs";
import { POST } from "../app/api/finder/read/route";

/** The C6 narrative: the model hears one facet more than the lexicon, and its weights reorder the list. */
const NARRATIVE = CASSETTES.find((c) => c.class === "C6")!;
const REQUEST = NARRATIVE.input;
const roster = searchRoster(rosterFor(true), emptyFilters(), REQUEST, null);
const model = NARRATIVE.expect.keys.flatMap((key) => needForKey(key) ?? []);
const topFive = (needs?: readonly NeedSignal[]) => rankClinicians(REQUEST, roster, new Date(), needs).slice(0, 5).map((c) => c.id);
const chips = (needs: readonly NeedSignal[]) => heardChips(needs, 4).map((chip) => chip.label);
const rowIds = (page: Page) => page.locator(".clinician-row").evaluateAll((rows) => rows.map((r) => r.getAttribute("data-clinician")));
const listTop = (page: Page) => page.locator(".clinician-list").evaluate((el) => el.getBoundingClientRect().top + window.scrollY);

async function typeRequest(page: Page) {
  await page.goto("/");
  await page.getByRole("textbox").fill(REQUEST);
}

async function withEnv<T>(env: Record<string, string>, run: () => Promise<T>): Promise<T> {
  const held = Object.keys(env).map((key) => [key, process.env[key]] as const);
  Object.assign(process.env, env);
  try {
    return await run();
  } finally {
    for (const [key, value] of held) value === undefined ? delete process.env[key] : (process.env[key] = value);
  }
}

test("level 0: the finder reads the words itself and asks nothing", async ({ page }) => {
  await typeRequest(page);
  // Web vitals and the like still go out, and the search's record (docs/data/FINDER-DATA.md) does,
  // once its list shows; nothing goes to the read route or anywhere else with the words.
  const asked: string[] = [];
  page.on("request", (request) => {
    if (request.url().includes("/api/finder/track")) return;
    if (request.url().includes("/api/finder/") || (request.postData() ?? "").includes(REQUEST.slice(0, 40))) asked.push(request.url());
  });
  await page.keyboard.press("Enter");
  await expect.poll(() => rowIds(page), { timeout: 20000 }).toEqual(topFive());
  await expect(page.getByRole("group", { name: "What we heard" }).getByRole("button")).toHaveText(chips(needsFor(REQUEST, roster)));
  await expect(page.locator(".reading-line, .row-skeleton")).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(asked, "no request for the words").toEqual([]);

  // The route on this server answers from the lexicon.
  const reply = await page.request.post("/api/finder/read", { data: { text: REQUEST } });
  expect(await reply.json()).toEqual({ keys: lexiconReading(REQUEST).keys, source: "lexicon" });
});

test("level 1: one read per search, a line and three blank rows while it runs, then the model's order", async ({ page }) => {
  await page.route((url) => url.pathname === "/", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    const atOne = html.replace('\\"readLevel\\":0', '\\"readLevel\\":1');
    expect(atOne, "the page carries its level").not.toBe(html);
    await route.fulfill({ response, body: atOne });
  });
  const posts: string[] = [];
  let answer = () => {};
  const held = new Promise<void>((resolve) => (answer = resolve));
  await page.route("**/api/finder/read", async (route) => {
    const body = route.request().postData() ?? "";
    posts.push(JSON.parse(body).text);
    await held;
    const reply = await withEnv({ ADHDME_LLM_LEVEL: "1", ADHDME_LLM_CASSETTES: "1" }, () =>
      POST(new Request("http://localhost/api/finder/read", { method: "POST", body })),
    );
    await route.fulfill({ status: reply.status, contentType: "application/json", body: await reply.text() });
  });

  await typeRequest(page);
  await page.keyboard.press("Enter");
  const line = page.locator(".reading-line");
  await expect(line).toHaveText("Reading what you asked", { timeout: 20000 });
  await expect(page.locator(".row-skeleton")).toHaveCount(3);
  await expect(page.locator(".clinician-row")).toHaveCount(0);
  await expect(page.getByRole("group", { name: "What we heard" })).toHaveCount(0);
  await expect(line).toContainText("A few more seconds", { timeout: 8000 });
  const top = await listTop(page);

  answer();
  await expect.poll(() => rowIds(page)).toEqual(topFive(model));
  expect(topFive(model), "the model's keys order this list differently").not.toEqual(topFive());
  const heard = page.getByRole("group", { name: "What we heard" });
  await expect(heard.getByRole("button")).toHaveText(chips(model));
  await expect(line).toHaveCount(0);
  expect(await listTop(page), "the rows land where the blank rows were").toBeCloseTo(top, 0);
  expect(posts).toEqual([REQUEST]);

  // A chip out re-ranks in the browser, with no second read.
  const withoutTelehealth = model.filter((need) => facetKey(need.facet) !== "pref:telehealth-first");
  expect(topFive(withoutTelehealth), "taking telehealth out changes the first five").not.toEqual(topFive(model));
  await heard.getByRole("button", { name: "Remove telehealth", exact: true }).click();
  await expect.poll(() => rowIds(page)).toEqual(topFive(withoutTelehealth));
  await page.waitForTimeout(500);
  expect(posts).toEqual([REQUEST]);
});

test("level 1: a short request the lexicon already heard lists at once, with no read (read-policy.ts)", async ({ page }) => {
  await page.route((url) => url.pathname === "/", async (route) => {
    const response = await route.fetch();
    const html = await response.text();
    await route.fulfill({ response, body: html.replace('\\"readLevel\\":0', '\\"readLevel\\":1') });
  });
  const posts: string[] = [];
  await page.route("**/api/finder/read", async (route) => {
    posts.push(route.request().postData() ?? "");
    await route.fulfill({ status: 500, body: "the model should not be asked" });
  });
  await page.goto("/");
  await page.getByRole("textbox").fill("an ADHD assessment by telehealth");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-row").first()).toBeVisible();
  await expect(page.locator(".reading-line")).toHaveCount(0);
  await page.waitForTimeout(500);
  expect(posts, "no read for words the lexicon already heard").toEqual([]);
});
