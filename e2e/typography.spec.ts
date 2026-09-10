// The platform plan's shared-typography line, measured rather than asserted from a design note:
// every rendered text element on Find, Profile, Learn, My ADHD, Today, the match screens, the
// Lives home and the console sign-in resolves to one of the two declared families (DESIGN.md:
// Inter for UI and body, Newsreader for patient questions) or a monospace stack for figures and
// code, and every real control clears the 44px floor.

import { expect } from "@playwright/test";
import { test } from "./support/test";

const ROUTES = ["/", "/approach", "/profile", "/my-adhd", "/today", "/lives", "/match", "/support", "/faq", "/console/signin"] as const;
const ALLOWED = /^(inter|newsreader|ui-monospace|sfmono|menlo|consolas|monaco|liberation mono|courier|monospace|geist mono|jetbrains mono)/i;

test("every text element on the app's screens uses a declared family", async ({ page }) => {
  test.setTimeout(120_000);
  const strays: string[] = [];
  for (const route of ROUTES) {
    await page.goto(route);
    const found = await page.evaluate(() => {
      const out = new Map<string, string>();
      for (const el of document.querySelectorAll<HTMLElement>("body *")) {
        if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent?.trim())) continue;
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        const first = cs.fontFamily.split(",")[0]!.replace(/["']/g, "").trim();
        if (!out.has(first)) out.set(first, `<${el.tagName.toLowerCase()}> "${(el.textContent ?? "").trim().slice(0, 40)}"`);
      }
      return [...out.entries()];
    });
    for (const [family, sample] of found) if (!ALLOWED.test(family)) strays.push(`${route}: ${family} on ${sample}`);
  }
  expect(strays).toEqual([]);
});

test("every real control on the app's screens clears the 44px floor", async ({ page }) => {
  test.setTimeout(120_000);
  await page.setViewportSize({ width: 390, height: 844 });
  const short: string[] = [];
  for (const route of ROUTES) {
    await page.goto(route);
    const found = await page.evaluate(() => {
      const out: string[] = [];
      const controls = "button, [role='button'], [role='tab'], [role='switch'], input:not([type='hidden']), select, textarea, summary, a.lives-row, a.me-primary, a.learn-primary";
      for (const el of document.querySelectorAll<HTMLElement>(controls)) {
        const cs = getComputedStyle(el);
        if (cs.display === "none" || cs.visibility === "hidden") continue;
        if (el.closest("details:not([open])") && !el.closest("summary")) continue;
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.height < 44 && r.width < 44) out.push(`<${el.tagName.toLowerCase()}> "${(el.getAttribute("aria-label") ?? el.textContent ?? "").trim().slice(0, 40)}" ${Math.round(r.width)}x${Math.round(r.height)}`);
      }
      return out;
    });
    for (const f of found) short.push(`${route}: ${f}`);
  }
  expect(short).toEqual([]);
});
