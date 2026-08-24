// O190: every walkthrough stage fits one screen — the founder's instruction made a pin.
//
// "Fits" is stated precisely: after each stage change (which resets to top, instantly — the
// smooth scroll that travelled against the entry fade was the founder's "weird scrolling" and
// is gone), the STAGE ELEMENT's bottom sits within the viewport at both widths, so a reader
// never scrolls to reach content or controls. The Acknowledgement of Country band DELIBERATELY
// stays on the page, one scroll below the fold, exactly as it stands on every other surface —
// fitting the flow on one screen is not a licence to remove the acknowledgement.
//
// The briefing stage's forward control cycles its resources before it advances, so the walk
// clicks until the practice stage's own funnel appears (the same twelve-action bound as the
// funnel pin in join-page.spec.ts).

import { expect, test } from "@playwright/test";

test("every stage's full content sits inside the first viewport at both widths", async ({ page }) => {
  test.setTimeout(240_000);
  for (const [w, h] of [[390, 844], [1280, 900]] as const) {
    await page.setViewportSize({ width: w, height: h });
    await page.goto("/clinicians", { waitUntil: "networkidle" });
    let stagesSeen = 0;
    for (let hops = 0; hops < 14; hops += 1) {
      const box = await page.locator(".cv2-stage").boundingBox();
      expect(box, `@${w}: no stage rendered`).not.toBeNull();
      expect(
        box!.y + box!.height,
        `@${w}: a stage overflows the viewport (bottom=${Math.round(box!.y + box!.height)} > ${h}) — the flow must fit one screen`,
      ).toBeLessThanOrEqual(h + 1);
      stagesSeen += 1;
      if (await page.getByRole("link", { name: /Start your journey today/ }).count()) {
        // The design record: first and last stages, both widths (adhdme-taste review procedure).
        await page.screenshot({ path: `qa/_runs/walkthrough-o190/practice-${w}.png` });
        break;
      }
      if (hops === 0) await page.screenshot({ path: `qa/_runs/walkthrough-o190/goal-${w}.png` });
      const next = page.locator(".cv2-action > button, .cv2-learning-card > button").first();
      if (!(await next.count())) break;
      await next.click();
      await page.waitForTimeout(350);
    }
    // Non-vacuity: the walk must actually have crossed all four stages' checks.
    expect(stagesSeen, `@${w}: the walk saw too few stages to mean anything`).toBeGreaterThanOrEqual(4);
  }
});
