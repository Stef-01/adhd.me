// The text budget CLI. The counting, the routes and the verdicts live in text-budget-lib.mjs, which
// e2e/text-budget.spec.ts also runs as a gate. This file drives a browser over every screen,
// prints the table and writes qa/text-budget.json.
//
//   BASE=http://localhost:3620 node scripts/text-budget.mjs
//   DUMP=1 BASE=... node scripts/text-budget.mjs   # every counted line of an over-budget screen

import { chromium } from "@playwright/test";
import { mkdirSync, writeFileSync } from "node:fs";
import { BENCHMARK, BUDGET, LONG_FORM, contextFor, measure, reach, routes, summarise, words } from "./text-budget-lib.mjs";

const BASE = process.env.BASE || "http://localhost:3100";
const browser = await chromium.launch();
const CONTEXT = contextFor(BASE);
let context = await browser.newContext(CONTEXT);
let page = await context.newPage();
const results = [];
for (const route of routes()) {
  try {
    // The finder writes its stage back to the tab on unload, so a cleared tab is not a fresh one.
    if (route.state === "finder-results" || route.state === "finder-profile") {
      await context.close();
      context = await browser.newContext(CONTEXT);
      page = await context.newPage();
    }
    await reach(page, route, BASE);
  } catch (error) {
    results.push({ ...route, error: String(error).slice(0, 120) });
    continue;
  }
  const rows = await measure(page);
  const result = summarise(route, rows);
  results.push(result);
  if (process.env.DUMP && (result.verdict === "OVER" || (process.env.DUMP === "all" && result.verdict === "ceiling"))) {
    console.log(`
--- ${route.name} (${result.total})`);
    for (const r of rows.filter((r) => !r.chrome)) console.log(`  ${String(words(r.text)).padStart(2)}w <${r.tag}> ${r.text.slice(0, 110)}`);
  }
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
