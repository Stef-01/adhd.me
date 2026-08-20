// O134: the shared capture helper for qa/ evidence.
//
// WHY THIS IS NOT A THREE-LINE SCREENSHOT CALL. Twice in one day an ad-hoc capture script
// produced a confident false finding. Auditing /about, a fullPage screenshot showed a founder's
// plate as an empty gap — it looked like a broken image on a brand-new page.
//
// THE CAUSE, MEASURED RATHER THAN ASSUMED, because I assumed wrong first. I put it down to a
// `whileInView` reveal that had not fired. It is `loading="lazy"`: below-fold images had
// `complete === false` and `naturalWidth === 0` at screenshot time, which is Next's Image doing
// exactly what the interface guidelines ask of below-fold images. The PAGE was behaving well and
// the CAPTURE was not. Both causes — lazy images and unfired reveals — are cured by walking the
// page, which is why the walk comes first and the check comes after it.
//
// O90 hit a version of this, wrote the fix in its ledger, and the fix went nowhere reusable, so
// the next script written from scratch rediscovered the bug instead of the lesson.
//
// Captures are the EVIDENCE for every unit in the UI lane and the thing a DESIGN-QA entry
// points at. A capture that silently shows a half-rendered page does not just look wrong; it
// turns the lane's record into something nobody can rely on, and it invites a fix to a page
// that has nothing wrong with it.
//
// So this does the things no unit should have to remember, and then CHECKS ITSELF: after
// walking, no image may be incomplete or zero-sized. It throws rather than writing a picture of
// a page that had not finished arriving.

import { createRequire } from "node:module";

const require = createRequire("/home/user/ADHD/package.json");
const { chromium } = require("@playwright/test");

export const CHROMIUM = "/opt/pw-browsers/chromium";
export const VIEWPORTS = { mobile: { width: 390, height: 844 }, desktop: { width: 1280, height: 900 } };

/**
 * Walk the whole page so scroll-linked reveals fire, then wait for every image to decode.
 *
 * The walk is in half-viewport steps because `whileInView` thresholds are fractions of the
 * element, not of the page: stepping a full viewport can jump an element past its own trigger
 * band without ever satisfying it.
 */
export async function settlePage(page) {
  await page.evaluate(async () => {
    const step = Math.max(200, Math.round(window.innerHeight * 0.5));
    for (let y = 0; y <= document.body.scrollHeight; y += step) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 90));
    }
    window.scrollTo(0, 0);
    await new Promise((r) => setTimeout(r, 350));
    await Promise.all([...document.images].map((img) => img.decode().catch(() => {})));
  });
}

/**
 * Throws if anything in the shot has not arrived. A capture is evidence or it is nothing.
 *
 * `complete && naturalWidth > 0` is the pair that matters: a lazy image that has not started
 * loading reports `complete === false`, and one that FAILED reports `complete === true` with a
 * zero width. Checking either alone misses half the ways a picture can be missing.
 */
export async function assertFullyRendered(page, label) {
  const broken = await page.evaluate(() =>
    [...document.images]
      .filter((img) => !img.complete || img.naturalWidth === 0)
      .map((img) => img.getAttribute("alt") || img.getAttribute("src") || "(unnamed image)"),
  );
  if (broken.length > 0) {
    throw new Error(
      `qa-capture: ${label} has ${broken.length} unrendered image(s) — capturing it would put a ` +
        `half-rendered page in qa/ as evidence: ${broken.join(", ")}`,
    );
  }
}

/**
 * Capture one page at one viewport, settled and self-checked.
 *
 * `prepare` runs after navigation and before settling, for pages that need driving into a state
 * (a query typed, a row chosen). Consent is dismissed before load because the privacy bar is
 * fixed over the bottom of every page and would otherwise sit in every capture.
 */
export async function capture({ url, path, viewport = "mobile", prepare, fullPage = true, clip }) {
  const browser = await chromium.launch({ executablePath: CHROMIUM });
  try {
    const context = await browser.newContext({
      viewport: VIEWPORTS[viewport] ?? viewport,
      reducedMotion: "reduce",
    });
    await context.addInitScript(() => {
      try { localStorage.setItem("adhdme-privacy-ack", "1"); } catch { /* private mode */ }
    });
    const page = await context.newPage();
    await page.goto(url, { waitUntil: "networkidle" });
    if (prepare) await prepare(page);
    await settlePage(page);
    await assertFullyRendered(page, path);
    if (clip) await page.locator(clip).screenshot({ path });
    else await page.screenshot({ path, fullPage });
    return page;
  } finally {
    await browser.close();
  }
}
