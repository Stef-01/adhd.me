import { chromium } from '@playwright/test';
import { mkdir, writeFile } from 'node:fs/promises';

const out = 'docs/design/2026-platform/implemented';
const base = process.env.REDESIGN_URL ?? 'http://127.0.0.1:3116';
await mkdir(out, { recursive: true });
const browser = await chromium.launch({ channel: 'chrome', headless: true });
const audit = [];
for (const width of [1440, 390]) {
  const page = await browser.newPage({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  for (const [name, route] of [['find', '/'], ['learn', '/approach'], ['profile', '/profile']]) {
    await page.goto(`${base}${route}`);
    await page.evaluate(() => document.fonts.ready);
    await page.waitForLoadState('networkidle');
    const agree = page.getByRole('button', { name: 'Agree', exact: true });
    if (await agree.isVisible()) await agree.click();
    await page.screenshot({ path: `${out}/${name}-${width}.png`, fullPage: true });
    audit.push(await geometry(page, `${name}-${width}`));
    if (name === 'learn') {
      await page.getByRole('button', { name: /Everyday strategies/ }).click();
      await page.locator('.learn-lesson.is-current').waitFor({ state: 'visible' });
      await page.getByRole('heading', { name: 'Small things, made visible.' }).waitFor({ state: 'visible' });
      await page.screenshot({ path: `${out}/lesson-${width}.png`, fullPage: true });
      audit.push(await geometry(page, `lesson-${width}`));
    }
  }
  await page.goto(`${base}/approach?module=finding`);
  await page.locator('.learn-lesson.is-current').waitFor();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.locator('.learning-care-explorer').screenshot({ path: `${out}/care-explorer-${width}.png` });
  await page.goto(`${base}/approach?module=myth-or-fact`);
  await page.locator('.learn-option').first().click();
  await page.locator('.learn-reveal').first().waitFor();
  await page.screenshot({ path: `${out}/quiz-${width}.png`, fullPage: true });
  await page.goto(`${base}/`);
  await page.getByRole('textbox').fill('a woman GP near Beecroft who does ADHD assessment');
  await page.keyboard.press('Enter');
  await page.locator('.clinician-row').first().waitFor();
  await page.screenshot({ path: `${out}/results-${width}.png`, fullPage: true });
  audit.push(await geometry(page, `results-${width}`));
  await page.goto(`${base}/faq`);
  await page.screenshot({ path: `${out}/public-${width}.png`, fullPage: true });
  await page.goto(`${base}/console/signin`);
  await page.screenshot({ path: `${out}/console-signin-${width}.png`, fullPage: true });
  await page.close();
}
for (const [width, height] of [[320,568],[430,932],[768,1024],[1024,768],[1280,720],[1920,1080],[844,390]]) {
  const page = await browser.newPage({ viewport: { width, height }, reducedMotion: 'reduce' });
  for (const route of ['/', '/profile', '/approach', '/approach?module=everyday']) {
    await page.goto(`${base}${route}`);
    await page.evaluate(() => document.fonts.ready);
    await page.getByRole('region', { name: 'Privacy' }).waitFor({ state: 'visible' });
    if (route.includes('module=')) await page.locator('.learn-lesson.is-current').waitFor();
    else await page.getByRole('heading', { level: 1 }).first().waitFor();
    audit.push(await geometry(page, `${route}-${width}x${height}-consent`));
  }
  await page.close();
}
await writeFile(`${out}/geometry.json`, JSON.stringify(audit, null, 2));
await browser.close();
async function geometry(page, name) {
  return page.evaluate(name => ({ name, width: innerWidth, documentWidth: document.documentElement.scrollWidth,
    elements: [...document.querySelectorAll('.learn-lesson.is-current, .learn-card-body, .platform-header, .app-tabs')]
      .filter(el => el.getBoundingClientRect().width).map(el => ({ selector: el.className, width: el.clientWidth, scrollWidth: el.scrollWidth, height: el.clientHeight }))
  }), name);
}
