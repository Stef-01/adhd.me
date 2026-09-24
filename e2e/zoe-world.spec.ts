import { test, expect } from './support/test';
import { expectNoViolations } from './support/a11y';
import type { Page } from '@playwright/test';
test.setTimeout(120000);
const URL = '/lives/play/zoe-before-you-send';
const game = (page: Page) => page.locator('.zw-game');

/** At the player's pace the whole reply is there: cool every sharp phrase, then send. */
async function reply(page: Page, { keys = false, cool = true } = {}) {
  if (cool) while (await page.locator('.zw-word.is-hot').count()) {
    const hot = page.locator('.zw-word.is-hot').first();
    if (keys) { await hot.focus(); await page.keyboard.press('Enter'); } else await hot.click();
  }
  const send = page.getByRole('button', { name: 'Send', exact: true });
  if (keys) { await send.focus(); await page.keyboard.press('Enter'); } else await send.click();
}
async function three(page: Page, keys = false) {
  for (let beat = 0; beat < 3; beat++) {
    await reply(page, { keys });
    await expect(game(page)).toHaveAttribute('data-phase', 'reply');
    await page.locator('.zw-actions .kit-primary').click();
  }
}
async function setup(page: Page) {
  await expect(game(page)).toHaveAttribute('data-phase', 'setup');
  await expect(page.getByRole('button', { name: 'Saturday comes' })).toBeDisabled();
  await page.getByRole('button', { name: 'Rae', exact: true }).click();
  await page.getByRole('button', { name: 'Thursday', exact: true }).click();
  await expect(page.getByRole('status')).toContainText('Thursday’s full');
  await page.getByRole('button', { name: 'Saturday', exact: true }).click();
  await page.getByRole('button', { name: 'Put it in the calendar' }).click();
  await page.getByRole('button', { name: 'Keep the jar' }).click();
  await page.getByRole('button', { name: 'Saturday comes' }).click();
  await expect(game(page)).toHaveAttribute('data-phase', 'revisit');
}

test('library entry, three replies, a shared plan and a revisit that follows through', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lives/characters');
  await page.getByRole('link', { name: 'Play Zoe’s moment →', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(URL));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Before you send.');
  await expect(page.locator('.zw-word.is-hot').first()).toBeVisible();
  await three(page);
  await setup(page);
  await expect(page.locator('.zw-word.is-plan')).toHaveText('Saturday at 7.');
  await reply(page);
  await expect(game(page)).toHaveAttribute('data-phase', 'complete');
  await expect(page.locator('.kit-stamp')).toContainText('Saturday at 7');
  await expect(page.getByRole('link', { name: 'Pause before send' })).toHaveAttribute('href', '/lives/learn?module=pause_before_send_v1');
  await page.getByRole('button', { name: 'Another conversation' }).click();
  await expect(game(page)).toHaveAttribute('data-scenario', '1');
});

test('a sharp send is repaired, not reset, and the feeling is kept in the jar', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await page.locator('.zw-word.is-hot').first().click();
  await expect(page.locator('.zw-jar')).toHaveAttribute('aria-label', '1 feelings kept in the jar');
  await reply(page, { cool: false });
  await expect(game(page)).toHaveAttribute('data-phase', 'repair');
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('That came out sharp.');
  await page.getByRole('button', { name: 'Say sorry' }).click();
  await expect(game(page)).toHaveAttribute('data-phase', 'reply');
  await expect(page.getByText('Sorry, that came out sharp.')).toBeVisible();
});

test('keyboard only, with sound on, reaches the end', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await page.getByRole('button', { name: 'Sound off' }).click();
  await expect(page.getByRole('button', { name: 'Sound on' })).toBeVisible();
  await three(page, true);
  await setup(page);
  await reply(page, { keys: true });
  await expect(game(page)).toHaveAttribute('data-phase', 'complete');
});

test('the reply types itself, the fuse sends it, breathe and pause hold it', async ({ page }) => {
  await page.goto(URL);
  await expect(game(page)).toHaveAttribute('data-still', 'false');
  await expect(page.locator('.zw-words .zw-word')).toHaveCount(1, { timeout: 3000 });
  await page.getByRole('button', { name: 'Breathe' }).click();
  await expect(game(page)).toHaveAttribute('data-holding', 'true');
  const words = await page.locator('.zw-words .zw-word').count();
  await page.waitForTimeout(1200);
  expect(await page.locator('.zw-words .zw-word').count()).toBe(words);
  await page.getByRole('button', { name: 'Pause game' }).click();
  await page.waitForTimeout(3000);
  await expect(game(page)).toHaveAttribute('data-phase', 'typing');
  await page.getByRole('button', { name: 'Resume' }).click();
  await expect(game(page)).toHaveAttribute('data-phase', 'repair', { timeout: 15000 });
});

test('every size fits, the exit is reachable, and each phase passes accessibility', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [1440, 900]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(URL);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const b of await page.locator('.zw-word.is-hot, .zw-send, .zw-breathe').all()) { const box = (await b.boundingBox())!; expect(box.height).toBeGreaterThanOrEqual(40); expect(box.y + box.height).toBeLessThanOrEqual(height); }
    expect(await page.getByRole('link', { name: 'Back to games' }).evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL);
  await expectNoViolations(page, 'Zoe typing');
  await reply(page, { cool: false });
  await expectNoViolations(page, 'Zoe repair');
  await page.getByRole('button', { name: 'Say sorry' }).click();
  await page.locator('.zw-actions .kit-primary').click();
  for (let beat = 1; beat < 3; beat++) { await reply(page); await page.locator('.zw-actions .kit-primary').click(); }
  await expectNoViolations(page, 'Zoe setup');
  await setup(page);
  await reply(page);
  await expectNoViolations(page, 'Zoe complete');
});

test('no message text is written to storage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  const before = await page.evaluate(() => Object.keys(localStorage).sort().join());
  await three(page);
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('Whatever');
  expect(await page.evaluate(() => Object.keys(localStorage).sort().join())).toBe(before);
});
