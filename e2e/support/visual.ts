// AR15: the deterministic capture harness — every route, both widths, both motion settings,
// one theme, hashed (docs/AESTHETIC-REVIEW-PLAN.md Phase 3: "deterministic (fixed seed, fixed
// clock, fonts pre-loaded, motion pinned)"; "a flaky baseline is worse than none").
//
// THE MATRIX IS DERIVED, NEVER TRANSCRIBED (O168's law, applied to captures): routes come from
// the same lists every sweep reads, and THEMES is a list of one with the reason recorded — the
// plan wrote "2 themes" and the tree has one (`globals.css`: "One theme, one accent"; no
// prefers-color-scheme, no data-theme). The day a second theme ships, adding it HERE doubles
// the matrix by construction and the manifest diff names every capture the new theme adds.
//
// WHY HASHES AND NOT COMMITTED PIXELS. 180 PNGs are ~40-70MB of repo per acceptance — the
// baseline that gets committed is a sha256 manifest instead. In the zero-diff regime the plan
// itself demands (three consecutive runs, ZERO diff, before any baseline is accepted) a hash IS
// the picture's identity: any pixel change flips it, there is no tolerance band to tune, and
// the archive of actual pixels is regenerable from any commit by running the capture spec.
// AR16's accepted-diff discipline then reviews manifest changes, each carrying its unit id.
//
// DETERMINISM, PIECE BY PIECE, EACH PINNED TO ITS FAILURE MODE:
//   * fixed clock (`page.clock.install`) — console pages render dates; a run at 23:59 must not
//     differ from one at 00:01 (client-side Date only; the mock store's own seed dates are
//     already deterministic);
//   * fonts settled before every shot — O146's flap (a link measured 265x44 on one run and not
//     the next) was font metrics arriving mid-measure;
//   * `animations: "disabled"` + reduced-motion emulation per combo — motion pinned at the
//     screenshot layer AND the media layer, because either alone leaves the other's timing in
//     the pixels;
//   * `caret: "hide"` — a blinking caret is a coin flip in any capture with a focused field.

import { createHash } from "node:crypto";
import type { APIRequestContext, Page } from "@playwright/test";
import { CONSOLE_ROUTES, PUBLIC_ROUTES } from "../site-routes";
import { seedFixtures } from "./fixtures";
import { signInAndOnboard } from "./session";

/** One theme today, and the list exists so a second one is an append, not a rewrite. */
export const THEMES = ["light"] as const;
export const WIDTHS = [390, 1280] as const;
export const MOTION = ["no-preference", "reduce"] as const;

/** 2026-03-03T03:03:03Z — arbitrary, fixed, and outside any date the seeded stores render. */
export const FIXED_CLOCK_ISO = "2026-03-03T03:03:03.000Z";

export interface CaptureKey {
  readonly route: string;
  readonly width: (typeof WIDTHS)[number];
  readonly motion: (typeof MOTION)[number];
  readonly theme: (typeof THEMES)[number];
}

export function captureId(key: CaptureKey): string {
  const slug = key.route === "/" ? "home" : key.route.replace(/^\//, "").replaceAll("/", "__");
  return `${slug}@${key.width}·${key.theme}·${key.motion}`;
}

/** Every capture the matrix holds, in a stable order: route-major, then width, then motion. */
export function captureMatrix(): CaptureKey[] {
  const keys: CaptureKey[] = [];
  for (const route of [...PUBLIC_ROUTES, ...CONSOLE_ROUTES]) {
    for (const width of WIDTHS) {
      for (const motion of MOTION) {
        for (const theme of THEMES) keys.push({ route, width, motion, theme });
      }
    }
  }
  return keys;
}

/**
 * Signs in and seeds once, then walks the whole matrix, hashing every screenshot. Public routes
 * are captured before sign-in so they show what a signed-out visitor sees; the session then
 * carries the console half, seeded exactly as the sweeps seed (console reset first, practice,
 * dependents — O174's ordering).
 */
export async function captureAll(
  page: Page,
  request: APIRequestContext,
  options: { onCapture?: (id: string, hash: string) => void } = {},
): Promise<Record<string, string>> {
  const manifest: Record<string, string> = {};
  await page.clock.install({ time: new Date(FIXED_CLOCK_ISO) });

  const shoot = async (key: CaptureKey) => {
    await page.setViewportSize({ width: key.width, height: key.width === 390 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: key.motion === "reduce" ? "reduce" : "no-preference" });
    await page.goto(key.route, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
    const hash = createHash("sha256").update(png).digest("hex");
    const id = captureId(key);
    manifest[id] = hash;
    options.onCapture?.(id, hash);
  };

  const keys = captureMatrix();
  for (const key of keys.filter((k) => !k.route.startsWith("/console"))) await shoot(key);
  await request.post("/api/mock/console");
  await signInAndOnboard(page);
  await seedFixtures(request);
  for (const key of keys.filter((k) => k.route.startsWith("/console"))) await shoot(key);
  return manifest;
}

/** The two manifests' disagreement, named per capture — empty means a stable run. */
export function manifestDiff(a: Record<string, string>, b: Record<string, string>): string[] {
  const out: string[] = [];
  for (const id of new Set([...Object.keys(a), ...Object.keys(b)]).values()) {
    if (!(id in a)) out.push(`${id}: only in the second run`);
    else if (!(id in b)) out.push(`${id}: only in the first run`);
    else if (a[id] !== b[id]) out.push(`${id}: pixels changed between runs`);
  }
  return out.sort();
}
