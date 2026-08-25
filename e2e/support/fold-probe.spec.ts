// AR28: the fold family's mutation probe, per the AR9–AR12 architecture — the plumbing the
// inline bandCut probe never reached. On a real route: a clean measure first (so the probe is
// not vacuous), then BOTH violation kinds planted — a straddling claim+qualifier pair matched
// by an injected band entry, and the page's h1 forced below the fold — and the REAL detector's
// own accumulation must report each by kind with the route and rule id named. A walk that
// stops resolving selectors, measuring boxes, or accumulating findings turns this red.

import { expect, test } from "@playwright/test";
import { FOLD_RULE_ID, foldFindings } from "./fold-load";
import { probeVerdict } from "./probe";

const ROUTE = "/privacy";
const VIEWPORT = { width: 390, height: 844 };

test("the fold detector reports a planted straddling band and a sunk h1, by name", async ({ page }) => {
  await page.setViewportSize(VIEWPORT);
  await page.goto(ROUTE, { waitUntil: "networkidle" });
  await page.evaluate(() => document.fonts.ready);

  const clean = await foldFindings(page, ROUTE, VIEWPORT.height);
  expect(clean, "the probe needs a clean page to plant on — a pre-existing finding would make this vacuous").toEqual([]);

  await page.evaluate((foldY) => {
    const make = (className: string, top: number, text: string) => {
      const el = document.createElement("p");
      el.className = className;
      el.textContent = text;
      el.style.cssText = `position:absolute;left:0;top:${top}px;width:200px;height:60px;margin:0;`;
      document.body.append(el);
    };
    make("ar28-probe-claim", foldY - 30, "planted claim");
    make("ar28-probe-qualifier", foldY + 10, "planted qualifier");
    const h1 = document.querySelector("h1");
    if (h1) (h1 as HTMLElement).style.cssText += `position:relative;top:${foldY}px;`;
  }, VIEWPORT.height);

  const found = await foldFindings(page, ROUTE, VIEWPORT.height, [
    {
      route: ROUTE,
      name: "ar28 planted band",
      selectors: [".ar28-probe-claim", ".ar28-probe-qualifier"],
      why: "the probe's synthetic claim+qualifier pair, planted across the fold so the walk must see a cut",
    },
  ]);

  const details = found.map((finding) => finding.detail).join("\n");
  expect(details, "the sunk h1 must be reported").toContain("the idea is not above the fold");
  expect(details, "the planted band's cut must be reported").toContain("ar28 planted band");
  expect(found.every((finding) => finding.route === ROUTE)).toBe(true);

  // The shared verdict (AR9–AR12's contract): clean run silent, probed run red — anything else
  // is a detector that either cannot fail or fails for the wrong reason.
  const verdict = probeVerdict(FOLD_RULE_ID, ROUTE, details || null, clean.length ? clean.map((finding) => finding.detail).join("\n") : null);
  expect(verdict.kind, JSON.stringify(verdict)).toBe("discriminates");
  if (verdict.kind === "discriminates") expect(verdict.finding).toContain(FOLD_RULE_ID);
});
