// W246 verify gate (e2e half): the page shows the absences first and shows no success anywhere.
// The unit half is src/console/interop.test.ts; the axe scan is in a11y.spec.ts.
//
// The assertion a unit test cannot reach is the STYLING one, and here it matters more than it did
// on the capacity console: a practice that believes its referrals are flowing will stop chasing
// them. So every colour on the page is resolved through a canvas and required to be neutral — no
// green, no tick, no status light — and the ORDER is checked, because a reader who stops after the
// first screen should stop having read the true thing.

import { readFileSync } from "node:fs";
import path from "node:path";
import { expect, test, type Page } from "@playwright/test";

async function signInAsMember(page: Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("manager@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

test("signed-out access redirects to sign-in", async ({ page }) => {
  await page.goto("/console/interop");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("leads with the fact that nothing was attempted", async ({ page }) => {
  await signInAsMember(page);
  await page.goto("/console/interop");
  await expect(page.getByTestId("interop-headline")).toContainText(
    "because nothing was attempted, not because everything succeeded",
  );
  await expect(page.getByTestId("interop-gate")).toContainText("G1");
});

test("puts the absences above the counts", async ({ page }) => {
  await signInAsMember(page);
  await page.goto("/console/interop");

  const items = page.getByTestId("interop-not-exchanged").locator("li");
  // Non-vacuity: an empty list would satisfy the ordering check below.
  await expect(items).toHaveCount(5);
  await expect(page.getByTestId("interop-counts").locator("div")).toHaveCount(4);

  // Node.DOCUMENT_POSITION_FOLLOWING === 4: the counts follow the absences.
  const order = await page.evaluate(() => {
    const absences = document.querySelector('[data-testid="interop-not-exchanged"]');
    const counts = document.querySelector('[data-testid="interop-counts"]');
    return absences && counts ? absences.compareDocumentPosition(counts) & Node.DOCUMENT_POSITION_FOLLOWING : 0;
  });
  expect(order, "the counts come before the absences").toBe(4);
});

test("shows no success styling anywhere on the page", async ({ page }) => {
  await signInAsMember(page);
  await page.goto("/console/interop");
  await page.evaluate(() => document.fonts.ready);

  // Resolved through a CANVAS, not a regex — Tailwind v4 emits oklch(), and the tree has learned
  // that twice. Every element carrying text or a background is checked, because a green tick could
  // be anywhere and this is the one decision that lives entirely in CSS.
  const tinted = await page.evaluate(() => {
    const ctx = document.createElement("canvas").getContext("2d")!;
    const parse = (c: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = "#000";
      ctx.fillStyle = c;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      // Tuple, not number[]: the inferred array type makes every destructured channel
      // `number | undefined`, which the spec run happily executes and the typecheck rejects.
      return [d[0]!, d[1]!, d[2]!, d[3]!] as [number, number, number, number];
    };
    const out: string[] = [];
    const main = document.querySelector("main") ?? document.body;
    for (const el of main.querySelectorAll("*")) {
      const style = getComputedStyle(el);
      for (const [what, value] of [
        ["colour", style.color],
        ["background", style.backgroundColor],
        ["border", style.borderTopColor],
      ] as const) {
        const [r, g, b, a] = parse(value);
        if (a === 0) continue;
        // A green or amber tint pulls one channel away from the others. Neutral greys do not.
        if (Math.max(r, g, b) - Math.min(r, g, b) >= 24) {
          out.push(`${el.tagName.toLowerCase()} ${what} ${value}`);
        }
      }
    }
    return out;
  });
  expect(tinted, `coloured elements on a page that must show no state: ${tinted.join("; ")}`).toEqual([]);
});

test("renders no tick, badge or status word", async ({ page }) => {
  await signInAsMember(page);
  await page.goto("/console/interop");
  const body = await page.locator("main").innerText();
  // Words a reader would take as a working integration. "connected" and "healthy" especially: this
  // page's whole job is to stop somebody concluding the referrals are flowing quietly.
  // The ban is absolute, negations included — this fired once on the heading "Why nothing is
  // connected", which reads correctly to a human and matches all the same. The page was reworded
  // rather than the rule taught about negation: a reader skimming headings sees the word, not the
  // "nothing", and a guard that accepts "not connected" accepts every sentence that can be bent
  // into that shape.
  expect(body).not.toMatch(/\b(connected|healthy|active|online|synced|up to date|all good)\b/i);
  expect(body).not.toMatch(/[✓✔√]/);
  // And the page source carries no success-coloured class, which the colour sweep would only catch
  // if the element were rendered on this particular state.
  const source = readFileSync(path.join(process.cwd(), "app/console/interop/page.tsx"), "utf8");
  expect(source, "a success colour is one state away from rendering").not.toMatch(
    /\b(bg|text|border)-(green|emerald|lime|teal)-\d{2,3}\b/,
  );
});

test("every count carries the sentence saying which kind of zero it is", async ({ page }) => {
  await signInAsMember(page);
  await page.goto("/console/interop");
  const cells = await page.evaluate(() =>
    [...document.querySelectorAll('[data-testid="interop-counts"] > div')].map((el) => el.textContent ?? ""),
  );
  expect(cells).toHaveLength(4);
  for (const cell of cells) {
    expect(cell).toContain("0");
    expect(cell, "a count is rendered without its meaning").toContain("not a count of successful exchanges");
  }
});
