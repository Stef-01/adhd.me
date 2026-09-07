import { chromium } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';
import { writeFile } from 'node:fs/promises';

const base = process.env.REDESIGN_URL ?? 'http://127.0.0.1:3116';
const browser = await chromium.launch({ channel: 'chrome' });
const results = [];
for (const width of [390, 1440]) {
  const context = await browser.newContext({ viewport: { width, height: 900 }, reducedMotion: 'reduce' });
  const page = await context.newPage();
  await page.goto(base);
  const agree = page.getByRole('button', { name: 'Agree', exact: true });
  if (await agree.isVisible()) await agree.click();
  for (const id of ['everyday', 'finding', 'myth-or-fact']) {
    await page.goto(`${base}/approach?module=${id}`);
    await page.locator('.learn-lesson.is-current').waitFor();
    let words = 0;
    const count = id === 'everyday' ? 4 : id === 'finding' ? 3 : 1;
    for (let step = 0; step < count; step++) {
      words += (await page.locator('.learn-lesson.is-current').innerText()).split(/\s+/).length;
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      if (audit.violations.length) throw new Error(JSON.stringify(audit.violations.map(v => ({ id: v.id, nodes: v.nodes.map(n => n.target) }))));
      if (step < count - 1) await page.getByRole('button', { name: 'Next', exact: true }).click();
    }
    results.push({ width, module: id, visibleWords: words, steps: count, accessibilityViolations: 0 });
    if (id !== 'myth-or-fact') {
      await page.getByRole('button', { name: 'Finish', exact: true }).click();
      await page.locator('.learning-completion').waitFor();
      if (id === 'everyday') await page.screenshot({ path: `docs/design/2026-platform/implemented/completion-${width}.png`, fullPage: true });
      const audit = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze();
      if (audit.violations.length) throw new Error(JSON.stringify(audit.violations.map(v => v.id)));
    }
  }
  await context.close();
}
await browser.close();
await writeFile('docs/design/2026-platform/implemented/learning-check.json', JSON.stringify(results, null, 2));
console.log(JSON.stringify(results));
