import { test, expect } from './support/test';
import { expectNoViolations } from './support/a11y';
import type { Page } from '@playwright/test';
test.setTimeout(120000);
const URL = '/lives/play/nina-the-first-line';
const game = (page: Page) => page.locator('.nw-game');
const COLS = 5, ROWS = 7;

async function board(page: Page) {
  return page.evaluate(({ COLS, ROWS }) => {
    const c = (el: Element) => ({ x: Math.round(+getComputedStyle(el).getPropertyValue('--cx') * COLS - .5), y: Math.round(+getComputedStyle(el).getPropertyValue('--cy') * ROWS - .5) });
    const pen = document.querySelector('.nw-pen');
    return { pen: pen ? c(pen) : null, want: [...document.querySelectorAll('.nw-chunk[data-needed="true"]')].map(c), avoid: [...document.querySelectorAll('.nw-blot, .nw-chunk:not([data-needed="true"])')].map(c) };
  }, { COLS, ROWS });
}
/** Breadth-first to the nearest needed phrase, round blots and tabs. */
function nextKey(b: Awaited<ReturnType<typeof board>>): string | null {
  if (!b.pen) return null;
  const blocked = new Set(b.avoid.map(a => `${a.x},${a.y}`)), goal = new Set(b.want.map(a => `${a.x},${a.y}`));
  const steps: [string, number, number][] = [['ArrowUp', 0, -1], ['ArrowDown', 0, 1], ['ArrowLeft', -1, 0], ['ArrowRight', 1, 0]];
  const seen = new Map<string, string | null>([[`${b.pen.x},${b.pen.y}`, null]]); const queue = [[b.pen.x, b.pen.y]];
  while (queue.length) {
    const [x, y] = queue.shift()!;
    const k = `${x},${y}`;
    if (goal.has(k)) return seen.get(k) ?? null;
    for (const [key, dx, dy] of steps) {
      const nx = x! + dx, ny = y! + dy, nk = `${nx},${ny}`;
      if (nx < 0 || ny < 0 || nx >= COLS || ny >= ROWS || seen.has(nk) || blocked.has(nk)) continue;
      seen.set(nk, seen.get(k) ?? key); queue.push([nx, ny]);
    }
  }
  return 'ArrowUp';
}
async function write(page: Page, until: string, via: 'keys' | 'pad' = 'keys') {
  const pad: Record<string, string> = { ArrowUp: 'Pen up', ArrowDown: 'Pen down', ArrowLeft: 'Pen left', ArrowRight: 'Pen right' };
  for (let guard = 0; guard < 300; guard++) {
    const phase = await game(page).getAttribute('data-phase');
    if (phase === until || phase === 'setup' || phase === 'complete') return;
    if (phase === 'line-done') { await page.locator('.nw-done .kit-primary').click(); continue; }
    const key = nextKey(await board(page));
    if (!key) continue;
    if (via === 'pad') await page.getByRole('button', { name: pad[key]! }).click();
    else await page.keyboard.press(key);
  }
  throw new Error(`never reached ${until}`);
}
async function setup(page: Page) {
  await expect(game(page)).toHaveAttribute('data-phase', 'setup');
  await expect(page.locator('.nw-paper p')).toHaveCount(3);
  await expect(page.getByRole('button', { name: 'Tomorrow' })).toBeDisabled();
  await page.getByRole('button', { name: 'Save the draft' }).click();
  await page.getByRole('button', { name: 'Leave a marker' }).click();
  await page.locator('.nw-steps button').first().click();
  await page.getByRole('button', { name: 'Tomorrow' }).click();
  await expect(game(page)).toHaveAttribute('data-phase', 'revisit');
}

test('library entry, three written lines, a setup and a fourth line on the same draft', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/lives/characters');
  await page.getByRole('link', { name: 'Play Nina’s moment →', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(URL));
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('A flyer for the garden.');
  await write(page, 'setup');
  await setup(page);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Back at the marker.');
  await write(page, 'complete', 'pad');
  await expect(page.locator('.nw-paper p')).toHaveCount(4);
  await expect(page.locator('.nw-paper')).toContainText('Sunday');
  await expect(page.getByRole('link', { name: 'Try a 60-second start' })).toHaveAttribute('href', '/lives/learn?module=sixty_second_start_v1');
  await page.getByRole('button', { name: 'Another draft' }).click();
  await expect(game(page)).toHaveAttribute('data-scenario', '1');
});

test('keyboard only, with sound on, reaches the end', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  await page.getByRole('button', { name: 'Sound off' }).click();
  await expect(page.getByRole('button', { name: 'Sound on' })).toBeVisible();
  await write(page, 'setup');
  await setup(page);
  await write(page, 'complete');
  await expect(game(page)).toHaveAttribute('data-phase', 'complete');
});

test('the pen travels on its own in real time, a swipe turns it, and pause holds it', async ({ page }) => {
  await page.goto(URL);
  await expect(game(page)).toHaveAttribute('data-still', 'false');
  const pen = page.locator('.nw-pen');
  const a = await pen.boundingBox();
  await page.keyboard.press('ArrowUp');
  await page.waitForTimeout(1000);
  expect((await pen.boundingBox())!.y).toBeLessThan(a!.y - 10);
  const page_ = page.locator('.nw-page');
  const box = (await page_.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down(); await page.mouse.move(box.x + box.width / 2 + 90, box.y + box.height / 2, { steps: 4 }); await page.mouse.up();
  await expect(pen).toHaveAttribute('data-dir', 'right');
  await page.getByRole('button', { name: 'Pause game' }).click();
  const held = await pen.boundingBox();
  await page.waitForTimeout(900);
  expect(await pen.boundingBox()).toEqual(held);
});

test('every size fits, the exit is reachable, and each phase passes accessibility', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  for (const [width, height] of [[320, 568], [390, 844], [768, 1024], [844, 390], [1440, 900]] as const) {
    await page.setViewportSize({ width, height });
    await page.goto(URL);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    for (const b of await page.locator('.nw-pad button').all()) { const box = (await b.boundingBox())!; expect(box.width).toBeGreaterThanOrEqual(44); expect(box.y + box.height).toBeLessThanOrEqual(height); }
    expect(await page.getByRole('link', { name: 'Back to games' }).evaluate(el => { const r = el.getBoundingClientRect(); return r.top >= 0 && r.bottom <= innerHeight && el.contains(document.elementFromPoint(r.x + r.width / 2, r.y + r.height / 2)); })).toBe(true);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto(URL);
  await expectNoViolations(page, 'Nina page');
  await write(page, 'line-done');
  await expectNoViolations(page, 'Nina line done');
  await write(page, 'setup');
  await expectNoViolations(page, 'Nina setup');
  await setup(page);
  await write(page, 'complete');
  await expectNoViolations(page, 'Nina complete');
});

test('the draft is never written to storage', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto(URL);
  const before = await page.evaluate(() => Object.keys(localStorage).sort().join());
  await write(page, 'setup');
  expect(await page.evaluate(() => JSON.stringify(localStorage))).not.toContain('neighbours');
  expect(await page.evaluate(() => Object.keys(localStorage).sort().join())).toBe(before);
});
