// The text budget, measured honestly: EVERY page the app serves, the WHOLE screen's words, against
// the gold-standard apps. Read from the screens themselves (App Store listings, 2026-09-10):
//
//   Headspace Today (home)      38 words on the screen: a greeting, "Start your day", four cards
//                                  of title + kind + minutes, three tab names.
//   Headspace course detail     26 words: a title, kind and minutes, one 13-word sentence, four
//                                  names, one button.
//   Headspace Sleep (a list)    60 words: six cards of a 2-word title and one line under 12 words.
//   Finch home (built for ADHD) 19 words: a status row, "3 goals left today!", three 2-to-4-word rows.
//
// So a SCREEN is 20 to 60 words in total, with 40 as the middle. Not above the fold: in total.
// A screen that scrolls to 300 words is not a Headspace screen with more below; it is a
// different, heavier thing, and a person with ADHD pays for every word whether or not they
// reach it. The budget is therefore on the whole screen: 60 is the ceiling, 40 the target.
//
//   node scripts/text-budget.mjs                 # against http://localhost:3100
//   BASE=http://localhost:3620 node scripts/text-budget.mjs
//
// Counts VISIBLE words (closed folds excluded, sr-only excluded, chrome counted separately).
// Routes come off the filesystem, so a new page is measured by existing. Writes
// qa/text-budget.json and prints every screen with its verdict.

import { chromium } from "@playwright/test";
import { mkdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const BASE = process.env.BASE || "http://localhost:3100";
export const BENCHMARK = { headspaceHome: 38, headspaceDetail: 26, headspaceList: 60, finchHome: 19 };
export const BUDGET = { screen: 60, target: 40, card: 8 };

/** Every static page route under app/, route groups stripped, console and api left out. */
function discoverRoutes() {
  const found = [];
  const walk = (dir, segments) => {
    for (const entry of readdirSync(dir).sort()) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry.startsWith("_") || entry === "api" || entry === "console") continue;
        if (entry.startsWith("(") && entry.endsWith(")")) walk(full, segments);
        else if (entry.startsWith("[")) continue;
        else walk(full, [...segments, entry]);
      } else if (entry === "page.tsx") {
        found.push(`/${segments.join("/")}`);
      }
    }
  };
  walk("app", []);
  return [...new Set(found)].sort();
}

/** Dynamic and stateful screens the walk cannot reach on its own. */
const EXTRA = [
  { path: "/gp/example-mei-chao", name: "GP profile" },
  { path: "/go/anubhav-saxena", skip: "a redirect" },
  { path: "/", state: "finder-results", name: "Finder results (after a search)" },
  { path: "/", state: "finder-profile", name: "Finder profile (a GP opened)" },
  { path: "/approach?module=everyday", name: "A read module, first card" },
  { path: "/approach?module=starting", name: "A game run, title card" },
  { path: "/lives/play", state: "lives-run", name: "The Chaos Run, first round" },
  { path: "/match/results", state: "intake", name: "Match results" },
  { path: "/match/prep", state: "intake", name: "Match prep" },
];

const LONG_FORM = new Set(["/story", "/faq", "/privacy", "/privacy/automated-decisions", "/privacy/counsel-review", "/terms", "/practices", "/clinicians", "/clinicians/join", "/examples", "/about", "/approach/map", "/lives/lab", "/demo"]);

const NARRATIVE = "I think I have had ADHD my whole life. I want an adult assessment with someone who will not rush me. I have anxiety too, and telehealth would be easier.";

function words(text) {
  return text.trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

async function measure(page) {
  return page.evaluate(() => {
    const vh = window.innerHeight;
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
      const chrome = !!el.closest("nav, header.platform-header, .app-tabs, .site-footer, footer, .consent-bar, .privacy-consent");
      const aboveFold = rect.top < vh && rect.bottom > 0;
      rows.push({ text, chrome, aboveFold, tag: el.tagName.toLowerCase() });
    }
    return rows;
  });
}

async function reach(page, route) {
  if (route.state === "intake") {
    await page.goto(`${BASE}/match`);
    await page.locator("#match-narrative").fill(NARRATIVE);
    await page.locator("#match-suburb").fill("Epping");
    await page.getByRole("button", { name: "Find my three" }).click();
    await page.waitForURL(/\/match\/results$/);
    await page.waitForTimeout(600);
    await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
    return;
  }
  await page.goto(`${BASE}${route.path}`, { waitUntil: "networkidle" });
  if (route.state === "finder-results" || route.state === "finder-profile") {
    await page.getByRole("textbox").fill("an adult ADHD assessment, telehealth, not rushed");
    await page.keyboard.press("Enter");
    await page.locator(".clinician-list").waitFor({ timeout: 20000 });
    if (route.state === "finder-profile") {
      await page.locator(".clinician-row").first().click();
      await page.getByRole("heading", { level: 1 }).waitFor();
    }
  }
  if (route.state === "lives-run") {
    await page.getByRole("button", { name: "Play" }).click();
    await page.waitForTimeout(1200);
  }
  await page.waitForTimeout(600);
}

const routes = [
  ...discoverRoutes().map((path) => ({ path, name: path })),
  ...EXTRA.filter((r) => !r.skip),
];

const browser = await chromium.launch();
const context = await browser.newContext({
  viewport: { width: 390, height: 844 },
  reducedMotion: "reduce",
  storageState: {
    cookies: [],
    origins: [{ origin: BASE, localStorage: [{ name: "adhdme-privacy-ack", value: "1" }, { name: "adhdme.play.tutored", value: "1" }, { name: "adhdme.lives.tutored", value: "1" }] }],
  },
});
const page = await context.newPage();
const results = [];
for (const route of routes) {
  try {
    await reach(page, route);
  } catch (error) {
    results.push({ ...route, error: String(error).slice(0, 120) });
    continue;
  }
  const rows = await measure(page);
  const total = rows.filter((r) => !r.chrome).reduce((n, r) => n + words(r.text), 0);
  const fold = rows.filter((r) => r.aboveFold && !r.chrome).reduce((n, r) => n + words(r.text), 0);
  const chrome = rows.filter((r) => r.chrome).reduce((n, r) => n + words(r.text), 0);
  const longest = rows.filter((r) => !r.chrome).map((r) => ({ w: words(r.text), text: r.text.slice(0, 80), tag: r.tag })).sort((a, b) => b.w - a.w).slice(0, 3);
  const longForm = LONG_FORM.has(route.path);
  const verdict = total <= BUDGET.target ? "target" : total <= BUDGET.screen ? "ceiling" : longForm ? "long-form" : "OVER";
  results.push({ path: route.path, name: route.name, state: route.state ?? null, total, fold, chrome, ratio: Math.round((total / BUDGET.target) * 10) / 10, verdict, longest });
}
await browser.close();

mkdirSync("qa", { recursive: true });
writeFileSync("qa/text-budget.json", JSON.stringify({ measuredAt: new Date().toISOString(), base: BASE, benchmark: BENCHMARK, budget: BUDGET, results }, null, 2));

const pad = (s, n) => String(s).padEnd(n);
console.log(`${pad("screen", 44)}${pad("total", 7)}${pad("fold", 6)}${pad("x40", 6)}verdict`);
for (const r of results) {
  if (r.error) console.log(`${pad(r.path, 44)}ERROR ${r.error}`);
  else console.log(`${pad(r.name.slice(0, 43), 44)}${pad(r.total, 7)}${pad(r.fold, 6)}${pad(r.ratio, 6)}${r.verdict}`);
}
const measured = results.filter((r) => !r.error);
const over = measured.filter((r) => r.verdict === "OVER");
const app = measured.filter((r) => !LONG_FORM.has(r.path));
console.log(`\n${measured.length} screens measured. Benchmarks: Headspace home ${BENCHMARK.headspaceHome}, detail ${BENCHMARK.headspaceDetail}, list ${BENCHMARK.headspaceList}; Finch ${BENCHMARK.finchHome}.`);
console.log(`App screens at or under the 40-word target: ${app.filter((r) => r.total <= BUDGET.target).length} of ${app.length}. Under the 60-word ceiling: ${app.filter((r) => r.total <= BUDGET.screen).length} of ${app.length}. Over: ${over.length}.`);
console.log(`Median app screen: ${app.map((r) => r.total).sort((a, b) => a - b)[Math.floor(app.length / 2)]} words, ${Math.round((app.map((r) => r.total).sort((a, b) => a - b)[Math.floor(app.length / 2)] / BENCHMARK.headspaceHome) * 10) / 10}x Headspace's home.`);
for (const r of over) console.log(`  ${r.name}: ${r.total} :: ${r.longest.map((l) => `${l.w}w <${l.tag}> "${l.text}"`).join(" | ")}`);
