import { test as base, type Page } from "@playwright/test";

/**
 * The suite's `test`: every `page.goto` also waits for React to attach (`app/hydrated.tsx` stamps
 * `data-hydrated` on the document). A spec that typed into the finder straight after `goto`
 * passed on Chromium by speed and failed on WebKit by the same margin; the wait is the fix, once,
 * here, rather than a sleep in every spec. Pages without the root layout (raw API responses) have
 * no stamp and fall through after a short wait.
 */
/**
 * The root layout stamps the document once; the (app) template stamps it again when the screen
 * inside the group's loading boundary is live (app/hydrated.tsx counts). An app-group route is
 * settled at two, every other route at one; then the network goes quiet.
 */
const APP_GROUP = /^\/(profile|approach|lives|match|my-adhd|today|support|survey|start|manual|medication|adjustments)?(\/|\?|$)/;
async function settled(page: Page): Promise<void> {
  const path = new URL(page.url()).pathname + new URL(page.url()).search;
  const wanted = APP_GROUP.test(path) ? 2 : 1;
  await page.waitForFunction((n) => Number(document.documentElement.getAttribute("data-hydrated") ?? "0") >= n, wanted, { timeout: 10_000 }).catch(() => undefined);
  // The finder's stages arrive as their own chunks after the shell; wait for the network to go
  // quiet as well, or a stage's input is filled before its code is there to read it.
  await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
}

/** Under a fake clock the fixture's timer-driven waits are frozen; this one polls from the test side. */
export async function hydratedUnderFakeClock(page: Page): Promise<void> {
  await page.waitForFunction(() => Number(document.documentElement.getAttribute("data-hydrated") ?? "0") >= 2, undefined, { polling: 100, timeout: 10_000 });
}

export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      // A spec that names its own `waitUntil` (the fake-clock specs do) keeps Playwright's plain goto.
      if (options?.waitUntil) return response;
      await settled(page);
      return response;
    };
    // A reload is a goto in every way that matters here.
    const reload = page.reload.bind(page);
    page.reload = async (options) => {
      const response = await reload(options);
      if (options?.waitUntil) return response;
      await settled(page);
      return response;
    };
    await use(page);
  },
});

export { expect } from "@playwright/test";
