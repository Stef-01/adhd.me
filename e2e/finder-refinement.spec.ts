import { expect } from '@playwright/test';
import { test } from './support/test';
import { expectNoViolations } from './support/a11y';

for (const width of [320, 390, 768, 1440]) {
  test(`finder professions and controls work at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.emulateMedia({ reducedMotion: width === 1440 ? 'no-preference' : 'reduce' });
    await page.goto('/?place=Hornsby');
    await page.getByRole('textbox').fill('I want a GP for ADHD assessment and help with daily routines');
    await page.keyboard.press('Enter');
    await expect(page.locator('.clinician-list')).toBeVisible();
    const profession = page.getByLabel('Provider profession');
    await profession.selectOption('occupational-therapist');
    await expect(page.locator('.clinician-row').first()).toContainText('Occupational therapist');
    await profession.selectOption('psychologist');
    await expect(page.locator('.clinician-row').first()).toContainText('Psychologist');
    await profession.selectOption('gp');
    await expect(page.locator('.clinician-row').first()).toBeVisible();
    await profession.selectOption('');
    await expect(profession).toHaveValue('');
    const telehealth = page.getByRole('button', { name: 'Telehealth', exact: true });
    await telehealth.click(); await expect(telehealth).toHaveAttribute('aria-pressed', 'true');
    await telehealth.click(); await expect(telehealth).toHaveAttribute('aria-pressed', 'false');
    await page.getByRole('button', { name: 'Map', exact: true }).click();
    await expect(page.locator('.nearby-map')).toBeVisible();
    const list = await page.locator('.clinician-list').boundingBox();
    const map = await page.locator('.nearby-map').boundingBox();
    if (width >= 1000) expect(map!.x).toBeGreaterThanOrEqual(list!.x + list!.width);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.getByRole('button', { name: 'Hide map', exact: true }).click();
    if (width === 390) await expectNoViolations(page, 'Refined finder');
    await page.locator('.clinician-row').first().focus(); await page.keyboard.press('Enter');
    await expect(page.locator('.profile-screen')).toBeVisible();
  });
}
