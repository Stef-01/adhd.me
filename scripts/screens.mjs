// Captures every screen the text-budget instrument measures, at a phone width, into qa/screens/.
// A person (or a model with eyes) reads them; nothing here asserts. BASE=http://localhost:PORT
//
// TWO SHOTS PER SCREEN, and the second one is the one to trust about anything fixed:
//
//   qa/screens/<name>.png           the whole page, for reading content that scrolls
//   qa/screens/viewport/<name>.png  what a person actually sees, 390 x 844
//
// A `fullPage` screenshot renders a fixed or sticky element ONCE, at the top of the page, and then
// keeps painting the rest of the document underneath it. So the tab bar lands mid-page, a sticky
// booking bar appears to cover the rows it is really floating above, and an open modal sheet shows
// the screen behind it continuing below its own bottom edge as though the sheet's own content went
// on. AESTHETIC.md has two false findings on record from exactly this — "the sticky booking bar
// covering the profile's section rows" and "the tab bar sitting mid-page on Learn", both chased
// before anyone noticed the capture was the problem — and it nearly bought a third on the map's
// axis sheet. Judge anything fixed, sticky or modal from the viewport shot.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { contextFor, reach, routes } from "./text-budget-lib.mjs";

const BASE = process.env.BASE || "http://localhost:3100";
mkdirSync("qa/screens/viewport", { recursive: true });
const browser = await chromium.launch();
const CONTEXT = contextFor(BASE);
let context = await browser.newContext(CONTEXT);
let page = await context.newPage();
let unreached = 0;
for (const route of routes()) {
  const slug = route.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "home";
  try {
    if (route.state === "finder-results" || route.state === "finder-profile") {
      await context.close();
      context = await browser.newContext(CONTEXT);
      page = await context.newPage();
    }
    await reach(page, route, BASE);
    await page.screenshot({ path: `qa/screens/${slug}.png`, fullPage: true });
    await page.screenshot({ path: `qa/screens/viewport/${slug}.png` });
    console.log("ok", slug);
  } catch (error) {
    unreached += 1;
    console.log("SKIP", route.name, String(error).slice(0, 80));
  }
}
await browser.close();
// A run that reached nothing still prints a tidy list of "ok" for zero screens, so say the number.
console.log(`\n${routes().length - unreached} of ${routes().length} screens captured, two shots each.`);
if (unreached) process.exitCode = 1;
