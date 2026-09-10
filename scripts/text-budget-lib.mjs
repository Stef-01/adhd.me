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
//   node scripts/text-budget.mjs                 # against http://localhost:3100 (this file is the library;
//                                                  # the CLI is scripts/text-budget.mjs, the gate e2e/text-budget.spec.ts)
//   BASE=http://localhost:3620 node scripts/text-budget.mjs
//
// Counts VISIBLE words (closed folds excluded, sr-only excluded, chrome counted separately).
// Routes come off the filesystem, so a new page is measured by existing. Writes
// qa/text-budget.json and prints every screen with its verdict.

import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

export const BENCHMARK = { headspaceHome: 38, headspaceDetail: 26, headspaceList: 60, finchHome: 19 };
export const BUDGET = { screen: 60, target: 40, card: 8 };

/** Every static page route under app/, route groups stripped, console and api left out. */
export function discoverRoutes() {
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
export const EXTRA = [
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

export const LONG_FORM = new Set(["/story", "/faq", "/privacy", "/privacy/automated-decisions", "/privacy/counsel-review", "/terms", "/practices", "/clinicians", "/clinicians/join", "/examples", "/about", "/approach/map", "/lives/lab", "/demo"]);

export const NARRATIVE = "I think I have had ADHD my whole life. I want an adult assessment with someone who will not rush me. I have anxiety too, and telehealth would be easier.";

export function words(text) {
  return text.trim().split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
}

export async function measure(page) {
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
      if (rect.right <= 0 || rect.bottom <= 0 || rect.left >= window.innerWidth) continue;
      if (rect.width === 0 || rect.height === 0) continue;
      const chrome = !!el.closest("nav, header.platform-header, .app-tabs, .site-footer, footer, .consent-bar, .privacy-consent");
      const aboveFold = rect.top < vh && rect.bottom > 0;
      rows.push({ text, chrome, aboveFold, tag: el.tagName.toLowerCase() });
    }
    return rows;
  });
}

export async function reach(page, route, base) {
  if (route.state === "intake") {
    await page.goto(`${base}/match`);
    await page.locator("#match-narrative").fill(NARRATIVE);
    await page.locator("#match-suburb").fill("Epping");
    await page.getByRole("button", { name: "Find my three" }).click();
    await page.waitForURL(/\/match\/results$/);
    await page.waitForTimeout(600);
    await page.goto(`${base}${route.path}`, { waitUntil: "networkidle" });
    return;
  }
  await page.goto(`${base}${route.path}`, { waitUntil: "networkidle" });
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

export function routes() {
  return [...discoverRoutes().map((path) => ({ path, name: path })), ...EXTRA.filter((r) => !r.skip)];
}

/** The browser context every measurement uses: a phone, reduced motion, the first-visit bars agreed. */
export function contextFor(base) {
  return {
    viewport: { width: 390, height: 844 },
    reducedMotion: "reduce",
    storageState: {
      cookies: [],
      origins: [{ origin: base, localStorage: [{ name: "adhdme-privacy-ack", value: "1" }, { name: "adhdme.play.tutored", value: "1" }, { name: "adhdme.lives.tutored", value: "1" }] }],
    },
  };
}

/** One screen's numbers from its rows. */
export function summarise(route, rows) {
  const total = rows.filter((r) => !r.chrome).reduce((n, r) => n + words(r.text), 0);
  const fold = rows.filter((r) => r.aboveFold && !r.chrome).reduce((n, r) => n + words(r.text), 0);
  const chrome = rows.filter((r) => r.chrome).reduce((n, r) => n + words(r.text), 0);
  const longest = rows.filter((r) => !r.chrome).map((r) => ({ w: words(r.text), text: r.text.slice(0, 80), tag: r.tag })).sort((a, b) => b.w - a.w).slice(0, 3);
  const longForm = LONG_FORM.has(route.path);
  const verdict = total <= BUDGET.target ? "target" : total <= BUDGET.screen ? "ceiling" : longForm ? "long-form" : "OVER";
  return { path: route.path, name: route.name, state: route.state ?? null, total, fold, chrome, ratio: Math.round((total / BUDGET.target) * 10) / 10, verdict, longest };
}

