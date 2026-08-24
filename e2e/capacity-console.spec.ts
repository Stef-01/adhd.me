// W229 verify gate (e2e half): the page renders the lane and styles none of it as a judgement.
// The unit half is src/console/capacity.test.ts; the axe scan is in a11y.spec.ts, which now
// includes this route.
//
// The assertion a unit test cannot reach is the STYLING one. W228 refuses to say which side moved
// when the ranges stop matching; a page that renders `drifted` in red has resolved that in CSS,
// where no test of the model would ever see it. So the drift block's computed colour is read from
// the browser and required to be the same as an ordinary paragraph's.

import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";
import { MANAGER_EMAIL, signInAndOnboard } from "./support/session";

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("signed-out access redirects to sign-in", async ({ page }) => {
  await page.goto("/console/capacity");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("renders the sessions, the score and the ranges", async ({ page }) => {
  await signInAndOnboard(page, MANAGER_EMAIL);
  await page.goto("/console/capacity");

  const table = page.getByTestId("capacity-sessions");
  await expect(table).toBeVisible();
  // Non-vacuity: an empty table would satisfy everything below.
  await expect(page.getByTestId("capacity-row")).toHaveCount(70);
  await expect(page.getByTestId("capacity-score")).toContainText("A wider range is right more often");
  await expect(page.getByTestId("capacity-recommendations")).toContainText("more slots were opened on");
  await expect(page.getByTestId("capacity-empty-no_data")).toHaveCount(0);
});

test("does not style the drift verdict as a grade", async ({ page }) => {
  await signInAndOnboard(page, MANAGER_EMAIL);
  await page.goto("/console/capacity");

  const drift = page.getByTestId("capacity-drift");
  await expect(drift).toBeVisible();
  // Whatever the verdict is, the colour is the body colour. Read from the browser, because this is
  // the one decision that lives entirely in CSS.
  // RESOLVED THROUGH A CANVAS, NOT A REGEX. Tailwind v4 emits `oklch()`, and the first version of
  // this test parsed digits out of the string — turning `oklch(0.444 0.011 73.639)` into
  // [444, 11, 73639] and reporting a channel spread of 444 on a colour that is very nearly grey.
  // The tree already learned this once, in the contrast probe; `ctx.fillStyle` resolves any colour
  // the browser can parse, and reaching for the regex again is how a lesson stays unlearned.
  const colours = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="capacity-drift"]');
    if (!el) return null;
    const ctx = document.createElement("canvas").getContext("2d")!;
    const parse = (c: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0]!, d[1]!, d[2]!];
    };
    const style = getComputedStyle(el);
    return {
      verdict: el.getAttribute("data-verdict"),
      text: parse(style.color),
      background: parse(style.backgroundColor),
      border: parse(style.borderTopColor),
      raw: style.color,
    };
  });
  expect(colours, "the drift block is not on the page").not.toBeNull();
  expect(["tracking", "drifted", "improved", "withheld"]).toContain(colours!.verdict);

  // THE COLOUR CHECK ALONE IS NOT ENOUGH AND SAYING SO IS THE POINT. The simulation's verdict is
  // `tracking`, so a red branch for `drifted` would never render here — seeded, this test stayed
  // green. The styling is therefore a CONSTANT in the page with no verdict in scope, and that is
  // what is asserted: the colour below proves the constant is neutral, and the scan proves no
  // verdict can reach it.
  const source = readFileSync(path.join(process.cwd(), "app/console/capacity/page.tsx"), "utf8");
  expect(source).toContain("const DRIFT_BLOCK_CLASS =");
  // Matched EXACTLY, not by a pattern. My first version was `/className=\{[^}]*verdict/`, and
  // `[^}]*` stops at the first closing brace — so a seeded
  // `className={`${DRIFT_BLOCK_CLASS} ${…verdict === "drifted" ? "text-red-800" : ""}`}` slipped
  // straight past it and the test stayed green. Third instrument this session that was weaker than
  // the sentence above it. An exact match cannot be evaded by rearranging the expression.
  const driftBlock = source.slice(source.indexOf('data-testid="capacity-drift"'));
  const openingTag = driftBlock.slice(0, driftBlock.indexOf(">"));
  expect(openingTag, "the drift block no longer uses the constant verbatim").toContain(
    "className={DRIFT_BLOCK_CLASS}",
  );
  expect(openingTag.replace("data-verdict={view.drift.compared ? view.drift.verdict : \"withheld\"}", ""),
    "the drift block styles itself from the verdict").not.toContain("verdict");
  // No red, no green, no amber: the channels must not be pulled apart on any of the three surfaces
  // a verdict could be graded through.
  for (const [name, rgb] of [
    ["text", colours!.text],
    ["background", colours!.background],
    ["border", colours!.border],
  ] as const) {
    const spread = Math.max(...rgb) - Math.min(...rgb);
    expect(spread, `the drift ${name} is tinted (${colours!.raw})`).toBeLessThan(24);
  }
});

test("states the calendar gap rather than folding it into the numbers", async ({ page }) => {
  await signInAndOnboard(page, MANAGER_EMAIL);
  await page.goto("/console/capacity");
  await expect(page.getByTestId("capacity-calendar-gap")).toContainText(
    "gap in what has been recorded rather than a finding",
  );
});

test("prints the view's own label, so no branch lives in the template", async ({ page }) => {
  await signInAndOnboard(page, MANAGER_EMAIL);
  await page.goto("/console/capacity");
  // This ASSERTS WHAT IT CAN. Every rendered cell is a percentage or an em dash — but no session
  // in the simulation has a null rate, so this test cannot reach the em dash and could not catch
  // `pct(x ?? 0)`; seeding that change left it green. The branch is guarded in
  // src/console/capacity.test.ts, where a two-line fixture reaches it, and the page now prints a
  // label composed there rather than choosing between them itself.
  const cells = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="capacity-row"]')].map(
      (row) => row.querySelectorAll("td")[3]?.textContent ?? "",
    ),
  );
  expect(cells.length).toBe(70);
  for (const cell of cells) expect(cell).toMatch(/^(—|\d+%)$/);

  const source = readFileSync(path.join(process.cwd(), "app/console/capacity/page.tsx"), "utf8");
  expect(source, "the page chooses the label itself again").not.toMatch(/utilisation\s*===\s*null|utilisation\s*\?\?/);
});
