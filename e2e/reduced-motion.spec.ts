// "Reduced motion is honoured" is in PRODUCT.md and in the games standard, and nothing measured it.
//
// The measurement is less obvious than it sounds, and the first version of this reported five
// screens as offenders when none of them were. The tree does not switch animations off with
// `animation: none` — it gives them a duration of `1e-05s`. That is deliberate and better: a
// zero-duration animation still applies its final keyframe and still fires `animationend`, so a
// scene that reveals itself through an animation is fully revealed rather than never revealed, and
// code waiting on the event is not left hanging. `animation: none` would break both.
//
// So the question is not "is an animation declared" but "is anything still MOVING for long enough
// to be motion". Anything under a millisecond is a state change, not an animation.

import { expect } from "@playwright/test";
import { test } from "./support/test";
// The library is plain ESM the CLI shares; the types are loose on purpose.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { contextFor, reach, routes } from "../scripts/text-budget-lib.mjs";

type Route = { path: string; name: string; state?: string };

/** Under a millisecond is a state change applied instantly, not motion somebody has to watch. */
const MOTION_FLOOR_MS = 1;

test("nothing moves on a patient screen under reduced motion", async ({ browser, baseURL }) => {
  test.setTimeout(300_000);
  const base = baseURL!;
  const options = { ...(contextFor(base) as Parameters<typeof browser.newContext>[0]), reducedMotion: "reduce" as const };
  let context = await browser.newContext(options);
  let page = await context.newPage();

  const moving: string[] = [];
  const unreached: string[] = [];
  let measured = 0;
  for (const route of routes() as Route[]) {
    // The console is staff tooling on a desktop; this is the patient law.
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
    measured += 1;
    const found = await page.evaluate((floorMs) => {
      const out: string[] = [];
      const seconds = (v: string) => (v.endsWith("ms") ? parseFloat(v) : parseFloat(v) * 1000);
      for (const el of document.querySelectorAll("body *")) {
        const s = getComputedStyle(el);
        if (s.animationName === "none" || s.animationPlayState !== "running") continue;
        if (!(seconds(s.animationDuration) >= floorMs)) continue;
        out.push(`<${el.tagName.toLowerCase()} class="${String(el.className || "").slice(0, 30)}"> runs ${s.animationName} for ${s.animationDuration}`);
      }
      return [...new Set(out)];
    }, MOTION_FLOOR_MS);
    for (const f of found) moving.push(`${route.name}: ${f}`);
  }
  await context.close();

  // "0 findings" and "measured nothing" look identical otherwise.
  expect(unreached, "a screen this could not reach is a screen whose motion nobody checked").toEqual([]);
  expect(measured, "the reduced-motion sweep walked nothing").toBeGreaterThan(40);
  expect(moving, "an animation that outlives a reduced-motion preference").toEqual([]);
});
