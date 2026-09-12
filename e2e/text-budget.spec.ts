// The one law, as a gate: every app screen under the 60-word ceiling, measured the way
// scripts/text-budget.mjs measures it (the whole screen at 390 x 844, closed folds excluded,
// chrome counted separately). A screen that grows past the ceiling fails here by name, with its
// three longest lines, rather than shipping green. Long-form public documents are measured and
// reported, not budgeted.
//
// One screen has a raised ceiling, reasoned and bounded in `CEILING` in the library beside this
// file — the finder's results, which carries its results as well as its screen. The gate reads
// that map rather than the flat number so a raise is a decision recorded in one place, and so a
// screen without an entry still fails at 60.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
// The library is plain ESM the CLI shares; the types are loose on purpose.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { BUDGET, CEILING, LONG_FORM, contextFor, measure, reach, routes, summarise } from "../scripts/text-budget-lib.mjs";

type Route = { path: string; name: string; state?: string };
type Result = { path: string; name: string; total: number; verdict: string; longest: { w: number; tag: string; text: string }[] };

test("every app screen holds under the 60-word ceiling", async ({ browser, baseURL }) => {
  test.setTimeout(240_000);
  const base = baseURL!;
  const options = contextFor(base) as Parameters<typeof browser.newContext>[0];
  let context = await browser.newContext(options);
  let page: Page = await context.newPage();
  const results: Result[] = [];
  const unreachable: string[] = [];
  for (const route of routes() as Route[]) {
    try {
      if (route.state === "finder-results" || route.state === "finder-profile") {
        await context.close();
        context = await browser.newContext(options);
        page = await context.newPage();
      }
      await reach(page, route, base);
    } catch (error) {
      unreachable.push(`${route.name}: ${String(error).slice(0, 80)}`);
      continue;
    }
    results.push(summarise(route, await measure(page)) as Result);
  }
  await context.close();

  expect(unreachable, "a screen the instrument could not reach is a screen nobody measured").toEqual([]);
  const app = results.filter((r) => !(LONG_FORM as Set<string>).has(r.path));
  expect(app.length, "the route register collapsed").toBeGreaterThan(25);
  const ceilingFor = (name: string) => (CEILING as Map<string, number>).get(name) ?? BUDGET.screen;
  const over = app.filter((r) => r.total > ceilingFor(r.name)).map((r) => `${r.name}: ${r.total} words over ${ceilingFor(r.name)} :: ${r.longest.map((l) => `${l.w}w <${l.tag}> "${l.text}"`).join(" | ")}`);
  expect(over, `over the ${BUDGET.screen}-word ceiling`).toEqual([]);
  // Reported, so the run's log carries the number the commit should quote.
  const totals = app.map((r) => r.total).sort((a, b) => a - b);
  console.log(`text budget: ${app.length} app screens, median ${totals[Math.floor(totals.length / 2)]} words, ${app.filter((r) => r.total <= BUDGET.target).length} at or under ${BUDGET.target}, ${over.length} over ${BUDGET.screen}`);
});
