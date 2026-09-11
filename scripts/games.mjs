// QA captures of every game, for a person to read after each change. Nothing here asserts.
//   BASE=http://localhost:PORT node scripts/games.mjs            # everything
//   ONLY=chaos|leo|runs BASE=... node scripts/games.mjs          # one family
// Chaos Run: each game by name through the lab's one-game run, caught mid-round (data-beat="active").
// Leo: the ready screen and a round in play. Bean runs: each run's title card and its first round.
import { chromium } from "@playwright/test";
import { mkdirSync, readFileSync } from "node:fs";

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
  // Every game by name through the lab's one-game run (/lives/lab/play?game=), so none is left to chance.
  const all = [...readFileSync("src/lives/games.ts", "utf8").matchAll(/^  \{ id: "([a-z_]+)"/gm)].map((m) => m[1]);
  const wanted = process.env.GAMES ? process.env.GAMES.split(",") : all;
  let caught = 0;
  for (const id of wanted) {
    await page.goto(`${BASE}/lives/lab/play?game=${id}&seed=qa`, { waitUntil: "networkidle" });
    const play = page.locator(".lives-play");
    if (!(await play.count())) { console.log("no start", id); continue; }
    await play.click();
    const card = page.locator(`.lives-game[data-beat="active"][data-game="${id}"]`);
    try { await card.waitFor({ timeout: 12000 }); } catch { console.log("not active", id); continue; }
    await page.waitForTimeout(900);
    await shot(`chaos-${id}`);
    caught += 1;
  }
  console.log(`chaos games captured: ${caught} of ${wanted.length}`);
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
