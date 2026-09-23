import { test, expect } from './support/test';
import { expectNoViolations } from './support/a11y';
import type { Page } from '@playwright/test';
test.setTimeout(120000);
const URL = '/lives/play/arjun-hold-the-thread';
const game = (page: Page) => page.locator('.aw-game');

/** At the player's own pace: catch what answers the question, park ideas, clear stray cards, let the rest pass. */
async function meet(page: Page, until: string, keys = false) {
  for (let guard = 0; guard < 160; guard++) {
    const phase = await game(page).getAttribute('data-phase');
    if (phase === until) return;
    if (phase === 'decided') { await page.locator('.aw-overlay .kit-primary').click(); continue; }
    if (phase === 'setup') return;
    const stray = page.locator('.aw-card[data-off="true"]').first();
    if (await stray.count()) { await stray.click(); continue; }
    const retrieve = page.getByRole('button', { name: 'Use the saved idea' });
    if (await retrieve.count()) { await retrieve.click(); continue; }
    const keep = page.locator('.aw-bubble[data-relevant="true"]').first();
    if (await keep.count()) { if (keys) { await keep.focus(); await page.keyboard.press('Enter'); } else await keep.click(); continue; }
    await page.getByRole('button', { name: 'Let one pass' }).click();
  }
  throw new Error(`never reached ${until}`);
}
async function setup(page: Page) {
  await expect(game(page)).toHaveAttribute('data-phase', 'setup');
  await page.getByRole('button', { name: 'Pin the next question' }).click();
  await page.getByRole('button', { name: 'Hand the follow-up to Rae' }).click();
  await page.getByRole('button', { name: 'Today', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('today is full');
  await page.getByRole('button', { name: 'Tomorrow', exact: true }).click();
  await page.getByRole('button', { name: 'Next meeting' }).click();
  await expect(game(page)).toHaveAttribute('data-phase', 'revisit');
}

test('library entry, three live rounds, a real setup and a changed revisit', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lives/characters');
  await page.getByRole('link', { name: 'Play Arjun’s moment →', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(URL));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Where do we meet?');
  await expect(page.locator('.aw-bubble').first()).toBeVisible();
  await meet(page, 'setup');
  await setup(page);
  await expect(page.locator('.aw-pin-note')).toContainText('Next week');
  await meet(page, 'complete');
  await expect(page.locator('.aw-stamp')).toContainText('Rae follows up tomorrow');
  await expect(page.getByRole('link', { name: 'Try a meeting anchor' })).toHaveAttribute('href', '/lives/learn?module=meeting_anchor_v1');
  await page.getByRole('button', { name: 'Another meeting' }).click();
  await expect(game(page)).toHaveAttribute('data-scenario', '1');
});

test('keyboard only, with sound on, reaches the end', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await page.getByRole('button', { name: 'Sound off' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: 'Sound on' })).toHaveAttribute('aria-pressed', 'true');
  await meet(page, 'setup', true);
  await setup(page);
  await meet(page, 'complete', true);
  await expect(game(page)).toHaveAttribute('data-phase', 'complete');
});

test('the live meeting moves, a missed round becomes a recap, and pause holds everything', async ({ page }) => {
  await page.goto(URL);
  await expect(game(page)).toHaveAttribute('data-still', 'false');
  const first = page.locator('.aw-bubble').first();
  await expect(first).toBeVisible();
  const a = await first.boundingBox();
  await page.waitForTimeout(600);
  const b = await first.boundingBox();
  expect(Math.abs((b?.x ?? 0) - (a?.x ?? 0)) + Math.abs((b?.y ?? 0) - (a?.y ?? 0))).toBeGreaterThan(4);
  await page.getByRole('button', { name: 'Pause game' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  const held = await page.locator('.aw-bubble').first().boundingBox();
  await page.waitForTimeout(700);
  expect(await page.locator('.aw-bubble').first().boundingBox()).toEqual(held);
  await page.getByRole('button', { name: 'Resume' }).click();
  // Nobody catches anything: the meeting ends in a recap, not a failure.
  await expect(game(page)).toHaveAttribute('data-phase', 'recap', { timeout: 60000 });
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Catch up.');
  for (let i = 0; i < 6 && await game(page).getAttribute('data-phase') === 'recap'; i++) {
    const stray = page.locator('.aw-card[data-off="true"]').first();
    if (await stray.count()) await stray.click(); else await page.locator('.aw-bubble').first().click();
  }
  await expect(game(page)).toHaveAttribute('data-phase', 'decided');
});

test('every size fits, the exit is reachable, and each phase passes accessibility', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [1440, 900]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(URL);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const bubble of await page.locator('.aw-bubble').all()) {
      const box = (await bubble.boundingBox())!;
      expect(box.height).toBeGreaterThanOrEqual(44);
      expect(box.x + box.width).toBeLessThanOrEqual(width + 1);
    }
    expect(await page.getByRole('link', { name: 'Back to games' }).evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL);
  await expectNoViolations(page, 'Arjun meeting');
  await meet(page, 'setup');
  await expectNoViolations(page, 'Arjun setup');
  await setup(page);
  await expectNoViolations(page, 'Arjun revisit');
  await meet(page, 'complete');
  await expectNoViolations(page, 'Arjun completion');
});

test('play writes nothing to storage beyond the sound preference', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  const before = await page.evaluate(() => Object.keys(localStorage).sort().join());
  await meet(page, 'setup');
  expect(await page.evaluate(() => Object.keys(localStorage).sort().join())).toBe(before);
});
