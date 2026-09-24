import { test, expect } from './support/test';
import { expectNoViolations } from './support/a11y';
import type { Page } from '@playwright/test';
test.setTimeout(150000);
const URL = '/lives/play/maya-one-thing-at-a-time';
const game = (page: Page) => page.locator('.mw-game');
const COLS = 5, ROWS = 7;
const KEYS = { up: 'ArrowUp', down: 'ArrowDown', left: 'ArrowLeft', right: 'ArrowRight' } as const;
const PAD = { up: 'Step forward', down: 'Step back', left: 'Step left', right: 'Step right' } as const;

/** At the player's pace the dashed outlines show where each crowd will be after the next step. */
async function look(page: Page) {
  return page.evaluate(({ COLS, ROWS }) => {
    const board = document.querySelector('.mw-board')!.getBoundingClientRect();
    const cell = (el: Element) => ({ x: Math.round(+getComputedStyle(el).getPropertyValue('--cx') * COLS), y: Math.round(+getComputedStyle(el).getPropertyValue('--cy') * ROWS) });
    const ghosts = [...document.querySelectorAll('.mw-ghost')].map(g => { const r = g.getBoundingClientRect(); return { row: Number(g.getAttribute('data-row')), l: (r.left - board.left) / board.width * COLS, r: (r.right - board.left) / board.width * COLS }; });
    return { maya: cell(document.querySelector('.mw-maya')!), gate: cell(document.querySelector('.mw-gate')!).x, benches: [...document.querySelectorAll('.mw-bench')].map(cell),
      queue: document.querySelector('.mw-piece svg rect[fill="#c8513f"]') ? cell(document.querySelector('.mw-piece:has(rect[fill="#c8513f"])')!) : null,
      ghosts, over: document.querySelector('.mw-game')!.getAttribute('data-overwhelmed') === 'true' };
  }, { COLS, ROWS });
}
async function cross(page: Page, until: string, via: 'keys' | 'pad' = 'keys') {
  for (let guard = 0; guard < 400; guard++) {
    const phase = await game(page).getAttribute('data-phase');
    if (phase === until || phase === 'setup' || phase === 'complete') return;
    if (phase === 'arrived') { await page.locator('.mw-done .kit-primary').click(); continue; }
    const ping = page.locator('.mw-ping').first();
    if (await ping.count()) { await ping.click(); continue; }
    const v = await look(page);
    const free = (x: number, y: number) => x >= 0 && x < COLS && y >= 0 && y < ROWS && !(y === 0 && x !== v.gate) && !(v.queue && v.queue.x === x && v.queue.y === y) && !v.ghosts.some(g => g.row === y && x + .5 > g.l - .1 && x + .5 < g.r + .1);
    const { x, y } = v.maya;
    const toward = v.gate > x ? 'right' : 'left';
    const order: (keyof typeof KEYS)[] = v.over ? [toward === 'right' ? 'left' : 'right', toward, 'down'] : y === 1 && x !== v.gate ? [toward, 'down'] : ['up', toward, toward === 'right' ? 'left' : 'right', 'down'];
    const d = order.find(o => free(x + (o === 'left' ? -1 : o === 'right' ? 1 : 0), y + (o === 'up' ? -1 : o === 'down' ? 1 : 0))) ?? 'down';
    if (via === 'pad') await page.getByRole('button', { name: PAD[d] }).click();
    else await page.keyboard.press(KEYS[d]);
  }
  throw new Error(`never reached ${until}`);
}
async function setup(page: Page) {
  await expect(game(page)).toHaveAttribute('data-phase', 'setup');
  await expect(page.getByRole('button', { name: 'Next week' })).toBeDisabled();
  await page.getByRole('button', { name: 'Quiet the phone' }).click();
  await page.getByRole('button', { name: 'Headphones' }).click();
  await page.getByRole('button', { name: 'Meet Ari by the clock' }).click();
  await page.getByRole('button', { name: 'Next week' }).click();
  await expect(game(page)).toHaveAttribute('data-phase', 'revisit');
}

test('library entry, three crossings, boundaries set and a changed station crossed', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lives/characters');
  await page.getByRole('link', { name: 'Play Maya’s moment →', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(URL));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Platform 2.');
  await cross(page, 'setup');
  await setup(page);
  await expect(page.getByRole('status')).toContainText('queue');
  await cross(page, 'complete', 'pad');
  await expect(page.locator('.kit-stamp')).toContainText('Ari found you');
  await expect(page.getByRole('link', { name: 'Lower the sensory floor' })).toHaveAttribute('href', '/lives/learn?module=lower_sensory_floor_v1');
  await page.getByRole('button', { name: 'Another place' }).click();
  await expect(game(page)).toHaveAttribute('data-scenario', '1');
});

test('keyboard only, with sound on, reaches the end', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await page.getByRole('button', { name: 'Sound off' }).click();
  await expect(page.getByRole('button', { name: 'Sound on' })).toBeVisible();
  await cross(page, 'setup');
  await setup(page);
  await cross(page, 'complete');
  await expect(game(page)).toHaveAttribute('data-phase', 'complete');
});

test('the crowds flow in real time, a bump is not a failure, and pause holds everything', async ({ page }) => {
  await page.goto(URL);
  await expect(game(page)).toHaveAttribute('data-still', 'false');
  const crowd = page.locator('.mw-crowd').first();
  const a = await crowd.boundingBox();
  await page.waitForTimeout(600);
  expect(Math.abs((await crowd.boundingBox())!.x - a!.x)).toBeGreaterThan(4);
  // Walk straight into the first lane until a crowd arrives.
  await page.keyboard.press('ArrowUp');
  await page.keyboard.press('ArrowUp');
  await expect(page.getByRole('status')).toContainText('Bumped', { timeout: 20000 });
  await expect(game(page)).toHaveAttribute('data-phase', 'crossing');
  await page.getByRole('button', { name: 'Pause game' }).click();
  const held = await crowd.boundingBox();
  await page.waitForTimeout(700);
  expect(await crowd.boundingBox()).toEqual(held);
});

test('every size fits, the exit is reachable, and each phase passes accessibility', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [1440, 900]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(URL);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const b of await page.locator('.mw-pad button').all()) { const box = (await b.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.y + box.height).toBeLessThanOrEqual(height); }
    expect(await page.getByRole('link', { name: 'Back to games' }).evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL);
  await expectNoViolations(page, 'Maya concourse');
  await cross(page, 'arrived');
  await expectNoViolations(page, 'Maya arrived');
  await cross(page, 'setup');
  await expectNoViolations(page, 'Maya setup');
  await setup(page);
  await cross(page, 'complete');
  await expectNoViolations(page, 'Maya complete');
});

test('play writes nothing to storage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  const before = await page.evaluate(() => Object.keys(localStorage).sort().join());
  await cross(page, 'setup');
  expect(await page.evaluate(() => Object.keys(localStorage).sort().join())).toBe(before);
});
