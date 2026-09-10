// Captures every screen the text-budget instrument measures, at a phone width, into qa/screens/.
// A person (or a model with eyes) reads them; nothing here asserts. BASE=http://localhost:PORT
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";
import { contextFor, reach, routes } from "./text-budget-lib.mjs";

const BASE = process.env.BASE || "http://localhost:3100";
mkdirSync("qa/screens", { recursive: true });
const browser = await chromium.launch();
const CONTEXT = contextFor(BASE);
let context = await browser.newContext(CONTEXT);
let page = await context.newPage();
for (const route of routes()) {
  const file = `qa/screens/${route.name.replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "").toLowerCase() || "home"}.png`;
  try {
    if (route.state === "finder-results" || route.state === "finder-profile") {
      await context.close();
      context = await browser.newContext(CONTEXT);
      page = await context.newPage();
    }
    await reach(page, route, BASE);
    await page.screenshot({ path: file, fullPage: true });
    console.log("ok", file);
  } catch (error) {
    console.log("skip", route.name, String(error).slice(0, 80));
  }
}
await browser.close();
