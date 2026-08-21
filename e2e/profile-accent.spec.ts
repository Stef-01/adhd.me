// O166: the accent carries ONE meaning on the clinician profile, asserted through a canvas.
//
// `adhdme-taste` reserves the accent for LIVE TOKENS — "the value that changes, the word that
// matters" — and says outright: "If everything is accented, nothing is." Before this unit a canvas
// sweep of this screen found the accent painting SIX elements in FOUR unrelated meanings: a section
// eyebrow, a material-interest disclosure, the matched-cue pills, a map link, and the booking-source
// note. Individually each looked reasonable; together they were the reason the screen read as noise.
//
// WHY A CANVAS AND NOT A CLASS LIST. Tailwind v4 and this stylesheet both emit `oklch()`, and the
// accent arrives through a custom property that a component can inherit, alias or `color-mix()`.
// Grepping for `var(--accent)` finds the declarations somebody wrote; it does not find the colour
// somebody's element actually paints. W229 drew this line for a drift verdict that must never be
// graded in CSS, and it is the same technique: resolve the token through a canvas, resolve every
// rendered element the same way, compare.
//
// THE ONE ALLOWED SITE IS THE MATCHED CUE, and it is the only thing on the screen that changes with
// what the reader typed. Everything else is a label, a fact or a link, and each now reads in ink or
// muted. The disclosure specifically moved to INK rather than muted — it is a statement about a real
// named person's material interest, sited where the listing is read, so taking it off the accent had
// to make it louder, not quieter. Ink on paper is the highest-contrast pair in the palette.

import { expect, test, type Page } from "@playwright/test";

/** The class that may paint the accent. Everything else on this screen may not. */
const LIVE_TOKEN = "fit-evidence-label";

async function intoProfile(page: Page) {
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.locator(".clinician-row", { hasText: "Dr Anubhav Saxena" }).first().click();
  await expect(page.locator(".profile-content")).toBeVisible();
}

/** Every element on the profile whose rendered colour is the accent, by class. */
async function accentSites(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const rgb = (value: string): [number, number, number, number] => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const d = ctx.getImageData(0, 0, 1, 1).data;
      return [d[0]!, d[1]!, d[2]!, d[3]!];
    };
    const accent = rgb(getComputedStyle(document.documentElement).getPropertyValue("--accent").trim());
    // A tolerance, because the accent reaches some elements through `color-mix` and a blur layer.
    // Wide enough to catch a near-miss shade, narrow enough that ink and muted do not qualify.
    const near = (a: [number, number, number, number]) =>
      a[3] > 0 &&
      Math.abs(a[0] - accent[0]) < 26 &&
      Math.abs(a[1] - accent[1]) < 26 &&
      Math.abs(a[2] - accent[2]) < 26;

    const out: string[] = [];
    for (const el of document.querySelectorAll(".profile-screen *")) {
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.height === 0) continue;
      const cs = getComputedStyle(el);
      for (const value of [cs.color, cs.backgroundColor, cs.borderTopColor]) {
        if (near(rgb(value))) {
          out.push(String(el.className || el.tagName.toLowerCase()));
          break;
        }
      }
    }
    return out;
  });
}

test("the accent paints only the matched cue, and paints it at all", async ({ page }) => {
  await intoProfile(page);
  const sites = await accentSites(page);

  // Non-vacuity first, and it is the half that matters: a sweep finding NOTHING would satisfy the
  // assertion below while proving the detector is broken — and it would also mean the live token
  // had lost its accent, which is a different regression this same test should catch.
  expect(sites.length, "no element on the profile paints the accent — the sweep is looking at nothing").toBeGreaterThan(0);

  const strays = sites.filter((className) => !className.includes(LIVE_TOKEN));
  expect(
    strays,
    `the accent is carrying more than one meaning on this screen: ${[...new Set(strays)].join(", ")}`,
  ).toEqual([]);
});

test("the disclosure got louder, not quieter, when it came off the accent", async ({ page }) => {
  // The direction is the point. A material-interest disclosure about a named real person moved from
  // accent to ink; if that had been a move to `muted` it would have made a compliance-bearing line
  // harder to see while tidying the palette, which is a worse screen and a worse product.
  await intoProfile(page);
  const contrast = await page.evaluate(() => {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = 1;
    const ctx = canvas.getContext("2d", { willReadFrequently: true })!;
    const lum = (value: string) => {
      ctx.clearRect(0, 0, 1, 1);
      ctx.fillStyle = value;
      ctx.fillRect(0, 0, 1, 1);
      const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
      const chan = (c: number) => {
        const s = c / 255;
        return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
      };
      return 0.2126 * chan(r!) + 0.7152 * chan(g!) + 0.0722 * chan(b!);
    };
    const ratio = (a: string, b: string) => {
      const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p);
      return (x! + 0.05) / (y! + 0.05);
    };
    const root = getComputedStyle(document.documentElement);
    const paper = root.getPropertyValue("--paper").trim();
    const accent = root.getPropertyValue("--accent").trim();
    const line = document.querySelector(".disclosure-line");
    return {
      disclosure: line ? ratio(getComputedStyle(line).color, paper) : null,
      accent: ratio(accent, paper),
      text: line?.textContent?.trim() ?? "",
    };
  });

  expect(contrast.disclosure, "there is no disclosure line on this profile").not.toBeNull();
  expect(contrast.text.length, "the disclosure line is empty").toBeGreaterThan(3);
  expect(
    contrast.disclosure!,
    "the disclosure is now lower-contrast than the accent it replaced — that is the wrong direction",
  ).toBeGreaterThan(contrast.accent);
  // And it clears WCAG AA for small text on its own, which the accent did not have to.
  expect(contrast.disclosure!).toBeGreaterThanOrEqual(4.5);
});

test("every matched cue renders the same shape, whatever the cue is called", async ({ page }) => {
  // The other half of what made this screen incoherent. `.fit-evidence li` was `flex-wrap: wrap`,
  // so a short pill kept its phrase beside it and a long one pushed the phrase to the next line —
  // two rows of identical content rendering two different ways, decided by how many characters the
  // lexicon happened to use for a label. Now every row is a grid and every row is the same shape.
  await intoProfile(page);
  const rows = await page.evaluate(() =>
    [...document.querySelectorAll(".fit-evidence li")].map((li) => {
      const label = li.querySelector(".fit-evidence-label")!.getBoundingClientRect();
      const said = li.querySelector(".fit-evidence-said")!.getBoundingClientRect();
      return { stacked: said.top >= label.bottom - 1, labelWidth: Math.round(label.width) };
    }),
  );
  expect(rows.length, "no matched cues rendered — this test is looking at nothing").toBeGreaterThan(1);
  // Non-vacuity for the claim: the rows must differ in pill width, or "they all look the same" is
  // true for a reason that has nothing to do with the fix.
  expect(new Set(rows.map((r) => r.labelWidth)).size, "every cue pill is the same width").toBeGreaterThan(1);
  for (const row of rows) {
    expect(row.stacked, "a cue row put its phrase beside the pill while another stacked it").toBe(true);
  }
});
