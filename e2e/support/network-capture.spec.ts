// O192: the qa/ captures for the network gallery (`honesty.qa-capture`, `review.screenshot-both-
// viewports`). Opt-in like the visual-stability harness — it writes files, so it runs when asked
// rather than on every suite run.

import { test } from "@playwright/test";
import { NETWORK_CLINICIANS } from "../../src/network/gallery";

const RUN = process.env.ADHDME_CAPTURE === "1";

test.describe("network captures", () => {
  test.skip(!RUN, "set ADHDME_CAPTURE=1 to write qa/ captures");

  test("deck and profile, mobile and desktop", async ({ page }) => {
    const first = NETWORK_CLINICIANS[0]!;

    for (const [label, size] of [
      ["mobile", { width: 390, height: 844 }],
      ["desktop", { width: 1280, height: 900 }],
    ] as const) {
      await page.setViewportSize(size);

      await page.goto("/network");
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `qa/_runs/o192/network-deck-${label}.png`, fullPage: true });

      await page.goto(`/network/${first.id}`);
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `qa/_runs/o192/network-profile-${label}.png`, fullPage: true });

      await page.goto("/finder");
      await page.waitForLoadState("networkidle");
      await page.screenshot({ path: `qa/_runs/o192/finder-launch-${label}.png` });
    }
  });
});
