import { test as base, type Page } from "@playwright/test";

/**
 * The suite's `test`: every `page.goto` also waits for React to attach (`app/hydrated.tsx` stamps
 * `data-hydrated` on the document). A spec that typed into the finder straight after `goto`
 * passed on Chromium by speed and failed on WebKit by the same margin; the wait is the fix, once,
 * here, rather than a sleep in every spec. Pages without the root layout (raw API responses) have
 * no stamp and fall through after a short wait.
 */
export const test = base.extend<{ page: Page }>({
  page: async ({ page }, use) => {
    const goto = page.goto.bind(page);
    page.goto = async (url, options) => {
      const response = await goto(url, options);
      // A spec that names its own `waitUntil` (the fake-clock specs do) keeps Playwright's plain goto.
      if (options?.waitUntil) return response;
      await page.waitForSelector("html[data-hydrated]", { state: "attached", timeout: 10_000 }).catch(() => undefined);
      // The finder's stages arrive as their own chunks after the shell; wait for the network to
      // go quiet as well, or a stage's input is filled before its code is there to read it.
      await page.waitForLoadState("networkidle", { timeout: 5_000 }).catch(() => undefined);
      return response;
    };
    await use(page);
  },
});

export { expect } from "@playwright/test";
