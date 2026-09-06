// The finder's own flow, captured stage by stage — the screens scripts/shots.mjs cannot
// reach because they are behind a search rather than behind a URL.
//   node scripts/finder-flow-shots.mjs before|after
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
const TAG = process.argv[2] ?? 'before';
const OUT = `qa/polish/${TAG}`;
mkdirSync(OUT, { recursive: true });
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
await p.goto('http://localhost:3000/', { waitUntil: 'networkidle' });
await p.waitForTimeout(500);
// dismiss consent so it stops covering chrome
try { await p.getByRole('button', { name: /agree/i }).click({ timeout: 3000 }); } catch {}
await p.waitForTimeout(400);
await p.screenshot({ path: `${OUT}/f0-welcome.png`, fullPage: true });

await p.fill('#welcome-request', 'a woman GP near Beecroft who bulk bills and speaks Mandarin');
await p.waitForTimeout(300);
await p.screenshot({ path: `${OUT}/f1-typed.png`, fullPage: true });
await p.keyboard.press('Enter');
await p.waitForTimeout(3500);
await p.screenshot({ path: `${OUT}/f2-results.png`, fullPage: true });

// open first clinician profile
try {
  const link = p.locator('.clinician-list a, .clinician-card a, .clinician-list button').first();
  await link.click({ timeout: 4000 });
  await p.waitForTimeout(1500);
  await p.screenshot({ path: `${OUT}/f3-profile.png`, fullPage: true });
} catch (e) { console.log('profile skip', e.message.split('\n')[0]); }

// tabs
for (const [name, label] of [['f4-profile-tab','Profile'], ['f5-learn-tab','Learn']]) {
  try {
    await p.getByRole('link', { name: new RegExp(label, 'i') }).first().click({ timeout: 4000 });
    await p.waitForTimeout(1200);
    await p.screenshot({ path: `${OUT}/${name}.png`, fullPage: true });
  } catch (e) { console.log(name, 'skip', e.message.split('\n')[0]); }
}
console.log('done');
await b.close();
