// Does every interactive thing on a page answer a pointer?
//   node scripts/hover-audit.mjs        (needs `pnpm dev` up)
// Hovers every visible `main a, main button` and diffs TEN computed properties before and
// after. The ten matter: the first version of this watched `text-decoration-color` but not
// `text-decoration-line`, and so reported a breadcrumb as inert while `.crumbs a:hover` had
// been underlining it all along. A hover probe has to watch the property the hover changes.
import { chromium } from '@playwright/test';
const ROUTES = ['/faq','/examples','/clinicians','/terms','/privacy','/story','/practices'];
const SNAP = `(e)=>{const c=getComputedStyle(e);return [c.color,c.backgroundColor,c.borderColor,c.transform,c.textDecorationLine,c.textDecorationColor,c.textDecorationThickness,c.opacity,c.boxShadow,c.filter].join('|')}`;
const b = await chromium.launch();
const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
const p = await ctx.newPage();
const inertAll = [];
for (const r of ROUTES) {
  await p.goto('http://localhost:3000' + r, { waitUntil: 'networkidle' });
  await p.waitForTimeout(400);
  const els = p.locator('main a, main button');
  const n = await els.count();
  let responds = 0; const inert = [];
  for (let i = 0; i < n; i++) {
    const el = els.nth(i);
    if (!(await el.isVisible().catch(() => false))) continue;
    const before = await el.evaluate(eval(`(${SNAP})`)).catch(() => null);
    if (before === null) continue;
    await el.hover({ timeout: 1200 }).catch(() => {});
    await p.waitForTimeout(200);
    const after = await el.evaluate(eval(`(${SNAP})`)).catch(() => null);
    // move away to reset
    await p.mouse.move(5, 5); await p.waitForTimeout(80);
    if (before === after) {
      const info = await el.evaluate(e => `${e.tagName}.${(e.className||'').toString().slice(0,30)} "${(e.textContent||'').trim().slice(0,28)}"`);
      inert.push(info);
    } else responds++;
  }
  console.log(`${r.padEnd(12)} responds=${responds}  inert=${inert.length}`);
  inert.forEach(i => { console.log(`     · ${i}`); inertAll.push(r + '  ' + i); });
}
console.log(`\nTOTAL INERT: ${inertAll.length}`);
await b.close();
