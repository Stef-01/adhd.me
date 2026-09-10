// QA captures of every game, for a person to read after each change. Nothing here asserts.
//   BASE=http://localhost:PORT node scripts/games.mjs            # everything
//   ONLY=chaos|leo|runs BASE=... node scripts/games.mjs          # one family
// Chaos Run: walks seeds until each of the games has been caught mid-round (data-beat="active").
// Leo: the ready screen and a round in play. Bean runs: each run's title card and its first round.
import { chromium } from "@playwright/test";
import { mkdirSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100";
const ONLY = process.env.ONLY || "all";
const OUT = "qa/games";
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  storageState: {
    cookies: [],
    origins: [{ origin: BASE, localStorage: [{ name: "adhdme-privacy-ack", value: "1" }, { name: "adhdme.play.tutored", value: "1" }, { name: "adhdme.lives.tutored", value: "1" }] }],
  },
});
const page = await context.newPage();
const shot = async (name) => { await page.screenshot({ path: `${OUT}/${name}.png` }); console.log("ok", name); };

if (ONLY === "all" || ONLY === "chaos") {
  const seen = new Set();
  const wanted = Number(process.env.GAMES || 32);
  // A rare game can take many seeds to come up; the capture stops at its budget rather than stall.
  const deadline = Date.now() + Number(process.env.CHAOS_MS || 6 * 60_000);
  for (let seed = 1; seed <= 90 && seen.size < wanted && Date.now() < deadline; seed += 1) {
    await page.goto(`${BASE}/lives/play?seed=qa-${seed}`, { waitUntil: "networkidle" });
    const play = page.locator(".lives-play");
    if (!(await play.count())) continue;
    await play.click();
    for (let round = 0; round < 14; round += 1) {
      const card = page.locator('.lives-game[data-beat="active"]');
      try { await card.waitFor({ timeout: 9000 }); } catch { break; }
      const id = await card.getAttribute("data-game");
      if (id && !seen.has(id)) {
        seen.add(id);
        await page.waitForTimeout(900);
        await shot(`chaos-${id}`);
      }
      try { await page.locator('.lives-game[data-beat="active"]').waitFor({ state: "detached", timeout: 12000 }); } catch { break; }
      if (await page.locator(".lives-results").count()) break;
    }
  }
  console.log(`chaos games captured: ${seen.size}`);
}

if (ONLY === "all" || ONLY === "leo") {
  await page.goto(`${BASE}/lives/play/leo-mosquito`, { waitUntil: "networkidle" });
  await shot("leo-ready");
  await page.getByRole("button", { name: /Play Leo/ }).click();
  await page.waitForTimeout(2500);
  await shot("leo-playing");
}

if (ONLY === "all" || ONLY === "runs") {
  const ids = ["context", "starting", "working-memory", "more-than-attention", "deadlines", "hyperfocus", "ambiguity", "interruption", "perfectionism", "not-listening", "forgotten-commitments", "conflict", "household", "sleep", "exercise", "eating", "gut", "money", "mornings", "screens"];
  for (const id of ids) {
    await page.goto(`${BASE}/approach?module=${id}`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await shot(`run-${id}-title`);
    const go = page.getByRole("button", { name: "Tap to play" });
    if (await go.count()) {
      await go.click();
      await page.waitForTimeout(1400);
      await shot(`run-${id}-round1`);
    }
  }
}

await browser.close();
