// The QA record for ADHD Lives (PLAY-QA.md's "in the look"): captures of the home, the title card,
// every engine mid-game, a resolution, FASTER and the score screen at 390, with motion on, from a
// production server. `pnpm exec tsx scripts/capture-lives.mts` (server on E2E_PORT or 3200).
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = `http://localhost:${process.env.E2E_PORT ?? "3200"}`;
const OUT = "qa/lives";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });
await page.addInitScript(() => { try { localStorage.setItem("adhdme.lives.tutored", "1"); } catch { /* fine */ } });

await page.goto(`${BASE}/lives`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/home-390.png`, fullPage: true });
await page.goto(`${BASE}/lives/play?seed=qa`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/title-390.png` });
await page.getByRole("button", { name: "Play" }).click();

// Walk games — and runs, AGAIN after each score — until every engine has been captured live.
const seen = new Set<string>();
const ENGINES = 10;
let firstResolution = true;
for (let run = 0; run < 8 && seen.size < ENGINES; run++) {
  for (let i = 0; i < 40; i++) {
    await page.waitForSelector(".lives-game[data-beat='active'], .lives-results", { timeout: 8000 }).catch(() => null);
    if (await page.locator(".lives-results").count()) break;
    const engine = await page.locator(".lives-scene").getAttribute("data-engine").catch(() => null);
    if (engine && !seen.has(engine)) {
      await page.waitForTimeout(600);
      await page.screenshot({ path: `${OUT}/engine-${engine}-390.png` });
      seen.add(engine);
    }
    await page.waitForSelector(".lives-game[data-beat='resolution'], .lives-faster, .lives-results", { timeout: 12000 }).catch(() => null);
    if (firstResolution && (await page.locator(".lives-game[data-beat='resolution']").count())) { await page.screenshot({ path: `${OUT}/resolution-390.png` }); firstResolution = false; }
    if (await page.locator(".lives-faster").count()) await page.screenshot({ path: `${OUT}/faster-390.png` });
    if (await page.locator(".lives-results").count()) break;
    await page.waitForTimeout(300);
  }
  await page.waitForSelector(".lives-results", { timeout: 60_000 }).catch(() => null);
  if (run === 0) await page.screenshot({ path: `${OUT}/results-390.png`, fullPage: true });
  // A new seed each run, so the director deals different games (the same seed replays the same run).
  if (seen.size < ENGINES) { await page.goto(`${BASE}/lives/play?seed=qa${run + 1}`, { waitUntil: "networkidle" }); await page.getByRole("button", { name: "Play" }).click(); }
}
console.log(`captured engines: ${[...seen].join(", ")}`);
await page.goto(`${BASE}/lives/learn?module=meeting_anchor_v1`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/module-390.png` });
await page.goto(`${BASE}/lives/characters`, { waitUntil: "networkidle" });
await page.screenshot({ path: `${OUT}/characters-390.png`, fullPage: true });
await browser.close();
