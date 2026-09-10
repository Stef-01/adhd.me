// The text budget: words a person sees on first paint at a phone width, per route, against the
// gold-standard apps. Headspace's home holds ~38 words above the fold (a card is 6 to 8: a
// title, a kind, minutes, a picture), a detail screen ~25, a category list ~60; Finch, built
// for ADHD, ~19 with rows of 2 to 4 words. So the budget is 40 words above the fold, a card
// under 8, and one explanatory sentence a screen, with the rest behind the walkthrough.
//
//   node scripts/text-budget.mjs                 # against http://localhost:3100
//   BASE=http://localhost:3620 node scripts/text-budget.mjs
//
// Counts VISIBLE words whose element intersects the first viewport (390 x 844), and the whole
// page's words for comparison. Fixed chrome (the tab bar, the header) is counted once as
// "chrome" so a screen is judged on what it adds. Writes qa/text-budget.json and prints a table.

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";

const BASE = process.env.BASE || "http://localhost:3100";
export const BUDGET = { aboveFold: 40, card: 8 };

const ROUTES = [
  { path: "/", name: "Support (finder welcome)" },
  { path: "/today", name: "Today" },
  { path: "/approach", name: "Learn" },
  { path: "/my-adhd", name: "My ADHD" },
  { path: "/support", name: "Support path" },
  { path: "/profile", name: "Profile (filters)" },
  { path: "/start", name: "Onboarding" },
  { path: "/lives", name: "Lives home" },
  { path: "/lives/learn", name: "Lives learn" },
  { path: "/lives/play", name: "Lives play" },
  { path: "/lives/toolkit", name: "Toolkit" },
  { path: "/lives/characters", name: "Characters" },
  { path: "/manual", name: "My Manual" },
  { path: "/match", name: "Match intake" },
  { path: "/match/results", name: "Match results", setup: "intake" },
  { path: "/match/prep", name: "Match prep", setup: "intake" },
  { path: "/gp/example-mei-chao", name: "GP profile" },
];

const NARRATIVE = "I think I have had ADHD my whole life. I want an adult assessment with someone who will not rush me. I have anxiety too, and telehealth would be easier.";

function words(text) {
  return text.trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

async function measure(page) {
  return page.evaluate(() => {
    const vh = window.innerHeight;
    const seen = new Set();
    const rows = [];
    const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    let node;
    while ((node = walker.nextNode())) {
      const text = node.textContent?.replace(/\s+/g, " ").trim();
      if (!text) continue;
      const el = node.parentElement;
      if (!el) continue;
      const style = getComputedStyle(el);
      if (style.visibility === "hidden" || style.display === "none" || style.opacity === "0") continue;
      if (el.closest("[aria-hidden='true'], .sr-only, script, style, noscript, template")) continue;
      const closed = el.closest("details:not([open])");
      if (closed && !el.closest("summary")) continue;
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      const fixedAncestor = el.closest("nav, header.platform-header, .app-tabs, .site-footer, footer");
      const chrome = !!fixedAncestor;
      const aboveFold = rect.top < vh && rect.bottom > 0;
      const tag = el.tagName.toLowerCase();
      rows.push({ text, chrome, aboveFold, tag, top: Math.round(rect.top) });
      seen.add(el);
    }
    return rows;
  });
}

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  storageState: {
    cookies: [],
    origins: [{ origin: BASE, localStorage: [{ name: "adhdme-privacy-ack", value: "1" }, { name: "adhdme.walkthrough.v1", value: '{"v":1,"on":false,"offered":true}' }] }],
  },
});
const page = await context.newPage();
const results = [];
for (const route of ROUTES) {
  if (route.setup === "intake") {
    await page.goto(`${BASE}/match`);
    await page.locator("#match-narrative").fill(NARRATIVE);
    await page.locator("#match-suburb").fill("Epping");
    await page.getByRole("button", { name: "Find my three" }).click();
    await page.waitForURL(/\/match\/results$/);
    await page.waitForTimeout(800);
  }
  await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(700);
  const rows = await measure(page);
  const fold = rows.filter((r) => r.aboveFold && !r.chrome).reduce((n, r) => n + words(r.text), 0);
  const chrome = rows.filter((r) => r.aboveFold && r.chrome).reduce((n, r) => n + words(r.text), 0);
  const total = rows.filter((r) => !r.chrome).reduce((n, r) => n + words(r.text), 0);
  const longest = rows.filter((r) => !r.chrome && r.aboveFold).map((r) => ({ w: words(r.text), text: r.text.slice(0, 90), tag: r.tag })).sort((a, b) => b.w - a.w).slice(0, 3);
  results.push({ ...route, aboveFold: fold, chrome, total, over: fold > BUDGET.aboveFold, longest });
}
await browser.close();

mkdirSync("qa", { recursive: true });
writeFileSync("qa/text-budget.json", JSON.stringify({ measuredAt: new Date().toISOString(), base: BASE, budget: BUDGET, results }, null, 2));
const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad("route", 26)}${pad("fold", 6)}${pad("chrome", 8)}${pad("total", 7)}budget`);
for (const r of results) console.log(`${pad(r.path, 26)}${pad(r.aboveFold, 6)}${pad(r.chrome, 8)}${pad(r.total, 7)}${r.over ? `OVER by ${r.aboveFold - BUDGET.aboveFold}` : "ok"}`);
console.log(`\n${results.filter((r) => r.over).length} of ${results.length} routes over the ${BUDGET.aboveFold}-word fold budget.`);
for (const r of results.filter((x) => x.over)) console.log(`  ${r.path}: ${r.longest.map((l) => `${l.w}w <${l.tag}> "${l.text}"`).join(" | ")}`);
