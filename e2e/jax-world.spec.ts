import { test, expect } from './support/test';
import { expectNoViolations } from './support/a11y';
import type { Page } from '@playwright/test';
test.setTimeout(120000);
const URL = '/lives/play/jax-just-the-list';
const game = (page: Page) => page.locator('.jw-game');
const LANE = ['Steer left', 'Steer middle', 'Steer right'];

/** At the player's pace: line up under what the list needs, knock lures away, roll on; pay at the till. */
async function shop(page: Page, until: string, { keys = false, buyWish = false } = {}) {
  for (let guard = 0; guard < 200; guard++) {
    const phase = await game(page).getAttribute('data-phase');
    if (phase === until || phase === 'setup' || phase === 'complete') return;
    if (phase === 'till' || phase === 'revisit-till') {
      while (await page.locator('.jw-total[data-over="true"]').count()) await page.locator('.jw-back').last().click();
      await page.getByRole('button', { name: 'Pay' }).click();
      continue;
    }
    const lane = Number(await game(page).getAttribute('data-lane'));
    const targets = page.locator(buyWish ? '.jw-item[data-need="true"], .jw-item[data-kind="wish"]' : '.jw-item[data-need="true"]');
    const target = await targets.evaluateAll(els => els.map((e, i) => ({ i, lane: Number(e.getAttribute('data-lane')), y: Number(getComputedStyle(e).getPropertyValue('--y')) })).sort((a, b) => b.y - a.y)[0]);
    if (target && target.lane !== lane) {
      // Tapping a list item steers to it; arrows do the same from the keyboard.
      if (keys) await page.keyboard.press(target.lane < lane ? 'ArrowLeft' : 'ArrowRight');
      else await targets.nth(target.i).click();
      continue;
    }
    const lures = page.locator('.jw-item[data-need="false"]' + (buyWish ? ':not([data-kind="wish"])' : ''));
    const nearest = await lures.evaluateAll(els => els.map((e, i) => ({ i, y: Number(getComputedStyle(e).getPropertyValue('--y')) })).sort((a, b) => b.y - a.y)[0]?.i);
    if (nearest !== undefined) {
      if (keys) { await page.locator('.kit-caption h1').focus(); await page.keyboard.press(' '); }
      else await lures.nth(nearest).click();
      continue;
    }
    await page.getByRole('button', { name: 'Roll on' }).click();
  }
  throw new Error(`never reached ${until}`);
}
async function setup(page: Page) {
  await expect(game(page)).toHaveAttribute('data-phase', 'setup');
  await expect(page.getByRole('button', { name: 'Next shop' })).toBeDisabled();
  await page.getByRole('button', { name: 'Stick the list up' }).click();
  await page.getByRole('button', { name: 'Put food away' }).click();
  await page.locator('.jw-wish-board').click();
  await page.getByRole('button', { name: 'Next shop' }).click();
  await expect(game(page)).toHaveAttribute('data-phase', 'revisit');
}

test('library entry, three trips and tills, a home setup and a revisit with the wish on sale', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lives/characters');
  await page.getByRole('link', { name: 'Play Jax’s moment →', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(URL));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Just milk.');
  await expect(page.locator('.jw-item').first()).toBeVisible();
  await shop(page, 'setup');
  await setup(page);
  await expect(page.locator('.jw-item[data-kind="wish"] .jw-tag')).toContainText('Sale');
  await shop(page, 'complete', { buyWish: true });
  await expect(page.locator('.kit-stamp')).toContainText('on sale');
  await expect(page.getByRole('link', { name: 'Park the new idea' })).toHaveAttribute('href', '/lives/learn?module=park_the_idea_v1');
  await page.getByRole('button', { name: 'Another shop' }).click();
  await expect(game(page)).toHaveAttribute('data-scenario', '1');
});

test('the till adds up exactly', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await shop(page, 'till');
  await expect(game(page)).toHaveAttribute('data-phase', 'till');
  const prices = await page.locator('.jw-receipt li b').allTextContents();
  const total = prices.reduce((n, p) => n + Number(p), 0);
  await expect(page.locator('.jw-total b')).toHaveText(new RegExp(`^${total} of `));
});

test('keyboard only, with sound on, reaches the end', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await page.getByRole('button', { name: 'Sound off' }).click();
  await expect(page.getByRole('button', { name: 'Sound on' })).toBeVisible();
  await shop(page, 'setup', { keys: true });
  await setup(page);
  await shop(page, 'complete', { keys: true });
  await expect(game(page)).toHaveAttribute('data-phase', 'complete');
});

test('the aisle moves in real time and pause holds it', async ({ page }) => {
  await page.goto(URL);
  await expect(game(page)).toHaveAttribute('data-still', 'false');
  const first = page.locator('.jw-item').first();
  await expect(first).toBeVisible();
  const a = await first.boundingBox();
  await page.waitForTimeout(500);
  expect((await first.boundingBox())!.y).toBeGreaterThan(a!.y + 3);
  await page.getByRole('button', { name: 'Pause game' }).click();
  const held = await first.boundingBox();
  await page.waitForTimeout(600);
  expect(await first.boundingBox()).toEqual(held);
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.keyboard.press('ArrowLeft');
  await expect(game(page)).toHaveAttribute('data-lane', '0');
});

test('every size fits, the exit is reachable, and each phase passes accessibility', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [1440, 900]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(URL);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const item of await page.locator('.jw-item, .jw-lane').all()) {
      const box = (await item.boundingBox())!;
      expect(Math.min(box.width, box.height)).toBeGreaterThanOrEqual(44);
    }
    expect(await page.getByRole('link', { name: 'Back to games' }).evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL);
  await expectNoViolations(page, 'Jax aisle');
  await shop(page, 'till');
  await expectNoViolations(page, 'Jax till');
  await shop(page, 'setup');
  await expectNoViolations(page, 'Jax setup');
  await setup(page);
  await shop(page, 'complete');
  await expectNoViolations(page, 'Jax complete');
});

test('play writes nothing to storage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  const before = await page.evaluate(() => Object.keys(localStorage).sort().join());
  await shop(page, 'setup');
  expect(await page.evaluate(() => Object.keys(localStorage).sort().join())).toBe(before);
});
