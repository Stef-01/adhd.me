// O160: the structure a screen reader navigates by — heading hierarchy, the `main` landmark, and
// whether every form field has an accessible name. Swept across the public site and the console.
//
// It found nothing, and that is recorded rather than dressed up: this gate holds ground rather
// than fixing a defect. It earns its place because semantic structure is what rots silently as
// pages are edited, and it is invisible to every other sweep already standing — touch, focus,
// overflow and contrast all pass happily on a page with three h1s and an unlabelled input.

import { test, expect, type Page } from "@playwright/test";

const PUBLIC = ["/", "/about", "/approach", "/clinicians", "/clinicians/join", "/demo", "/examples",
  "/faq", "/finder", "/practices", "/privacy", "/terms", "/thanks",
  "/privacy/automated-decisions", "/privacy/counsel-review"];
const CONSOLE = ["/console", "/console/rules", "/console/registers", "/console/usefulness",
  "/console/matching", "/console/interview", "/console/privacy", "/console/referrals",
  "/console/complaints", "/console/pathways"];

async function signIn(page: Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("owner@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

const PROBE = () => {
  const out: string[] = [];
  const hs = Array.from(document.querySelectorAll("h1,h2,h3,h4,h5,h6"))
    .filter((h) => { const b = h.getBoundingClientRect(); return b.width > 0 && b.height > 0; });
  const levels = hs.map((h) => Number(h.tagName[1]));
  const h1s = levels.filter((l) => l === 1).length;
  if (h1s !== 1) out.push(`h1 count = ${h1s}`);
  for (let i = 1; i < levels.length; i += 1) {
    if (levels[i]! - levels[i - 1]! > 1) {
      out.push(`heading jump h${levels[i - 1]}->h${levels[i]} at "${(hs[i]!.textContent || "").trim().slice(0, 26)}"`);
    }
  }
  if (!document.querySelector("main")) out.push("no <main> landmark");
  let fields = 0;
  for (const el of Array.from(document.querySelectorAll("input:not([type=hidden]),select,textarea"))) {
    const b = el.getBoundingClientRect();
    if (!b.width || !b.height) continue;
    fields += 1;
    const id = el.getAttribute("id");
    const named = el.getAttribute("aria-label") || el.getAttribute("aria-labelledby")
      || (id && document.querySelector(`label[for="${id}"]`)) || el.closest("label");
    if (!named) out.push(`unnamed <${el.tagName.toLowerCase()}> name=${el.getAttribute("name") ?? "?"}`);
  }
  return { out, headings: hs.length, fields };
};

test.beforeEach(async ({ request }) => { await request.post("/api/mock/console"); });

test("headings, landmarks and field names hold across the site", async ({ page, request }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const findings: string[] = [];
  let headings = 0, fields = 0;
  const scan = async (route: string) => {
    const res = await page.goto(route);
    if (res && res.status() === 404) return;
    await page.evaluate(() => document.fonts.ready);
    const r = await page.evaluate(PROBE);
    for (const f of r.out) findings.push(`${route}: ${f}`);
    headings += r.headings; fields += r.fields;
  };
  for (const route of PUBLIC) await scan(route);
  await signIn(page);
  for (const f of ["referrals", "registers", "usefulness", "ops", "pathways"]) await request.post(`/api/mock/${f}`);
  for (const route of CONSOLE) await scan(route);
  // Non-vacuity, and it is load-bearing: a selector that stopped matching would otherwise report a
  // flawless sweep of nothing. Measured at 152 headings and 101 fields when this was written.
  expect(headings, "the heading probe stopped matching").toBeGreaterThan(100);
  expect(fields, "the form-field probe stopped matching").toBeGreaterThan(60);
  expect(findings, `semantic defects:\n${findings.join("\n")}`).toEqual([]);
});
