// The a11y sweep walks ROUTES; this walks STATES.
//
// `a11y.spec.ts` derives its list from the filesystem — every static route, the finder's stage
// machine, the console, and now the sampled dynamic routes — which is exactly right for the thing
// it is. But a route is not a screen here. The text-budget instrument reaches 84 SCREENS from
// those routes, because a returning person's hub, an open axis sheet, a lived-in manual, a search
// with results and a read module's first card are different renderings of the same URL, and the
// state is where the palettes and the dense content live.
//
// Some of those states already have their own scan in the spec that owns them (the map's axis
// sheet, the care plan's sheet, the games). This sweeps the rest from one list, so a new state
// added to the instrument is swept by existing rather than by somebody remembering.

import { expect } from "@playwright/test";
import { test } from "./support/test";
import { expectNoViolations } from "./support/a11y";
// The library is plain ESM the CLI shares; the types are loose on purpose.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { contextFor, reach, routes } from "../scripts/text-budget-lib.mjs";

type Route = { path: string; name: string; state?: string };

test("every stateful patient screen passes WCAG 2.1 AA", async ({ browser, baseURL }) => {
  test.setTimeout(900_000);
  const base = baseURL!;
  const options = contextFor(base) as Parameters<typeof browser.newContext>[0];
  let context = await browser.newContext(options);
  let page = await context.newPage();
  await page.emulateMedia({ reducedMotion: "reduce" });

  // Only the screens a route alone does not reach — the plain paths are `a11y.spec.ts`'s job.
  const stateful = (routes() as Route[]).filter((r) => r.state && !r.path.startsWith("/console"));
  expect(stateful.length, "the stateful list collapsed").toBeGreaterThan(15);

  const unreached: string[] = [];
  let swept = 0;
  for (const route of stateful) {
    try {
      if (route.state === "finder-results" || route.state === "finder-profile") {
        await context.close();
        context = await browser.newContext(options);
        page = await context.newPage();
        await page.emulateMedia({ reducedMotion: "reduce" });
      }
      await reach(page, route, base);
    } catch (error) {
      unreached.push(`${route.name}: ${String(error).slice(0, 60)}`);
      continue;
    }
    await expectNoViolations(page, route.name);
    swept += 1;
  }
  await context.close();

  expect(unreached, "a state this could not reach is a state nobody scanned").toEqual([]);
  expect(swept, "the state sweep scanned nothing").toBeGreaterThan(15);
});
