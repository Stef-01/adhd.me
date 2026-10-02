import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const label = process.argv[2] || 'after';
const base = process.env.BASE || 'http://localhost:3417';
const output = process.env.CAPTURE_DIR || 'qa/minimalism';
mkdirSync(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const results = [];
try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({ viewport: { width, height: width === 390 ? 844 : 960 }, reducedMotion: 'reduce' });
    await context.addInitScript(() => localStorage.setItem('adhdme-privacy-ack', '1'));
    for (const [name, path] of [['support', '/'], ['learn', '/approach?pane=games'], ['modules', '/approach?pane=modules'], ['my-adhd', '/my-adhd'], ['today', '/today']]) {
      const page = await context.newPage();
      await page.goto(base + path);
      await page.waitForFunction(() => Number(document.documentElement.getAttribute('data-hydrated')) >= 2);
      await page.locator('main h1').waitFor();
      if (name === 'learn') await page.locator('.learn-try[data-ready]').waitFor();
      if (name === 'modules') await page.locator('[data-pane="modules"]').waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.screenshot({ path: `${output}/${name}-${label}-${width}.png`, fullPage: true });
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth);
      results.push({ name, width, overflow });
      console.log(name, width, overflow ? 'OVERFLOW' : 'fits');
      await page.close();
    }
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${output}/${label}-layout.json`, JSON.stringify(results, null, 2));
if (results.some(row => row.overflow)) process.exitCode = 1;
