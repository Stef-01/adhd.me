import { chromium } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';

const base = process.env.BASE || 'http://localhost:3417';
const output = process.env.CAPTURE_DIR || 'qa/finder-refinement';
mkdirSync(output, { recursive: true });

const browser = await chromium.launch({ executablePath: process.env.PW_CHROMIUM_PATH || undefined });
const results = [];

try {
  for (const width of [390, 1440]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 844 : 960 },
      reducedMotion: 'reduce',
    });
    await context.addInitScript(() => localStorage.setItem('adhdme-privacy-ack', '1'));
    const page = await context.newPage();

    await page.goto(base);
    await page.waitForFunction(() => Number(document.documentElement.getAttribute('data-hydrated')) >= 2);
    await page.locator('#welcome-request').fill('A woman GP near Hornsby for adult ADHD assessment, by telehealth');
    await page.getByRole('button', { name: 'Find support' }).click();
    await page.locator('.clinician-list .clinician-row').first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${output}/results-after-${width}.png`, fullPage: true });
    results.push({ screen: 'results', width, overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth) });

    await page.locator('.clinician-row').first().click();
    await page.locator('.profile-screen').waitFor();
    await page.waitForTimeout(350);
    await page.evaluate(() => document.fonts.ready);
    await page.screenshot({ path: `${output}/profile-after-${width}.png`, fullPage: true });
    results.push({ screen: 'profile', width, overflow: await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth) });

    await context.close();
  }
} finally {
  await browser.close();
}

for (const result of results) console.log(result.screen, result.width, result.overflow ? 'OVERFLOW' : 'fits');
writeFileSync(`${output}/finder-layout.json`, JSON.stringify(results, null, 2));
if (results.some((result) => result.overflow)) process.exitCode = 1;
