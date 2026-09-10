import type { Page } from "@playwright/test";

/**
 * Phase T: every shelf on the Modules pane but "For you" starts closed, and a tile inside a closed
 * shelf has no box to click. Specs that reach a module by name open the shelves first. The tap
 * itself is exercised in learn-panes.spec.ts; here the point is the module, not the fold.
 */
export async function openShelves(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const d of document.querySelectorAll<HTMLDetailsElement>("details.learn-shelf")) d.open = true;
  });
}

export async function openModuleShelves(page: Page): Promise<void> {
  await page.getByTestId("learn-tab-modules").click();
  await openShelves(page);
}
