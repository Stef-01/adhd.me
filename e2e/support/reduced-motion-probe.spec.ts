// AR20's mutation probe, per the AR9–AR12 architecture: plant both violation kinds into a real
// route's DOM under reduce and demand the REAL detector (reduced-motion-load.ts — the same
// function the sweep calls) reports each by kind. A detector that stops seeing either kind
// turns this spec red, so the sweep cannot go quietly blind.

import { expect, test } from "@playwright/test";
import { reducedMotionFindings } from "./reduced-motion-load";

test("the reduced-motion detector sees a planted transform and planted hidden content", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/privacy", { waitUntil: "networkidle" });

  const clean = await reducedMotionFindings(page, "/privacy");
  expect(clean, "the probe needs a clean page to plant on — a pre-existing finding would make this vacuous").toEqual([]);

  await page.evaluate(() => {
    const transformed = document.createElement("div");
    transformed.className = "ar20-probe-transformed";
    transformed.style.transform = "translateY(20px)";
    transformed.textContent = "planted: rests transformed";
    const hidden = document.createElement("p");
    hidden.className = "ar20-probe-hidden";
    hidden.style.opacity = "0";
    hidden.textContent = "planted: hidden content";
    document.body.append(transformed, hidden);
  });

  const found = await reducedMotionFindings(page, "/privacy");
  expect(found.map((finding) => finding.kind).sort()).toEqual(["hidden-content", "rests-transformed"]);
  expect(found.map((finding) => finding.detail).join("\n")).toContain("ar20-probe");
});
