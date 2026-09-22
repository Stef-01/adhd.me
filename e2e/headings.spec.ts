// Every patient screen's heading is a sentence that ends, or is named as one that does not.
//
// The rule cannot be "every heading ends in a full stop": measured over the 73 patient screens the
// text-budget instrument reaches, 19 headings end in nothing and most of them are right — "Privacy
// policy" is a document, "Dr Mei Chao" is a person, "3 GPs" is a count. Four were wrong, against
// the product's own precedent: /match's three empty states read as sentences, and "What to bring"
// is the same shape as "What you tried." two screens away, which has a stop.
//
// So the bare ones are declared with reasons in `src/compliance/headings.ts`, the way
// `DYNAMIC_ROUTE_PLAN` declares dynamic routes, and this fails on any that are not. A new bare
// heading is a decision its author writes down rather than a drift nobody sees.

import { expect } from "@playwright/test";
import { test } from "./support/test";
import { staleBareHeadings, undeclaredBareHeadings } from "../src/compliance/headings";
// The library is plain ESM the CLI shares; the types are loose on purpose.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { contextFor, reach, routes } from "../scripts/text-budget-lib.mjs";

type Route = { path: string; name: string; state?: string };

test("a patient heading is a sentence that ends, or is declared bare on purpose", async ({ browser, baseURL }) => {
  test.setTimeout(300_000);
  const base = baseURL!;
  const options = contextFor(base) as Parameters<typeof browser.newContext>[0];
  let context = await browser.newContext(options);
  let page = await context.newPage();

  const headings: string[] = [];
  const unreached: string[] = [];
  for (const route of routes() as Route[]) {
    // The console is staff tooling with its own voice; this is the patient law.
    if (route.path.startsWith("/console")) continue;
    try {
      if (route.state === "finder-results" || route.state === "finder-profile") {
        await context.close();
        context = await browser.newContext(options);
        page = await context.newPage();
      }
      await reach(page, route, base);
    } catch (error) {
      unreached.push(`${route.name}: ${String(error).slice(0, 60)}`);
      continue;
    }
    const h = await page.evaluate(() => {
      const h1 = [...document.querySelectorAll("h1")].find(
        (e) => e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true }) && !e.classList.contains("sr-only"),
      );
      return h1 ? (h1.textContent ?? "").replace(/\s+/g, " ").trim() : null;
    });
    if (h) headings.push(h);
  }
  await context.close();

  // "0 findings" and "measured nothing" look identical otherwise.
  expect(unreached, "a screen this could not reach is a screen whose heading nobody checked").toEqual([]);
  expect(headings.length, "the heading sweep collected nothing").toBeGreaterThan(40);

  expect(
    undeclaredBareHeadings(headings),
    "a heading with no full stop that src/compliance/headings.ts does not account for — either end the sentence or say why it is a title",
  ).toEqual([]);
  expect(
    staleBareHeadings(headings),
    "BARE_HEADINGS names a heading no screen shows any more",
  ).toEqual([]);
});
