// Route captures at three widths, for a design pass's before/after record.
//   node scripts/shots.mjs before   →  qa/polish/before/<width>-<route>.png
//   node scripts/shots.mjs after    →  qa/polish/after/...
// Needs `pnpm dev` up (or BASE= a deployed origin). The raw sets are gitignored — the
// committed record is the two-up sheets scripts/compare.mjs builds from them.
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:3000';
const TAG = process.argv[2] ?? 'before';
const OUT = `qa/polish/${TAG}`;
mkdirSync(OUT, { recursive: true });

const ROUTES = [
  ['home', '/'],
  ['story', '/story'],
  ['practices', '/practices'],
  ['about', '/about'],
  ['approach', '/approach'],
  ['clinicians', '/clinicians'],
  ['faq', '/faq'],
  ['examples', '/examples'],
  ['profile', '/profile'],
];

const VIEWPORTS = [
  ['1440', 1440, 900],
  ['1920', 1920, 1080],
  ['390', 390, 844],
];

const browser = await chromium.launch();
for (const [vname, width, height] of VIEWPORTS) {
  const ctx = await browser.newContext({ viewport: { width, height }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  for (const [name, route] of ROUTES) {
    try {
      await page.goto(BASE + route, { waitUntil: 'networkidle', timeout: 45000 });
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${OUT}/${vname}-${name}.png`, fullPage: true });
      console.log('ok', vname, name);
    } catch (e) {
      console.log('FAIL', vname, name, e.message.split('\n')[0]);
    }
  }
  await ctx.close();
}
await browser.close();
