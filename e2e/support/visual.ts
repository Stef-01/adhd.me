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
//   * O222: the FILE-BACKED STORES pinned to a fresh `.data-visual/` per invocation (the
//     `pnpm e2e:visual` script sets all four ADHDME_*_PATH envs) — found the hard way: the
//     matching console renders `tallyOutbound()` and the background audit, the FULL e2e suite
//     appends to both stores every run, so `console/matching`'s four cells re-hashed at every
//     cross-commit comparison while agreeing within every same-tree protocol. A deterministic
//     harness that reads an accumulating store is deterministic only until something else runs.

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

  // The pause below is per-shot: the clock must RESUME before the next navigation (a paused
  // clock stops rAF, and a page that hydrates under a stopped clock never runs its entrances),
  // and pauseAt demands a monotonically later instant each time — hence the counter.
  let shot = 0;
  const shoot = async (key: CaptureKey) => {
    shot += 1;
    await page.clock.resume();
    await page.setViewportSize({ width: key.width, height: key.width === 390 ? 844 : 900 });
    await page.emulateMedia({ reducedMotion: key.motion === "reduce" ? "reduce" : "no-preference" });
    await page.goto(key.route, { waitUntil: "networkidle" });
    // AR15's third measured instability, pinned by pixel diff: the map label's entrance
    // animation promotes its text to a compositor layer, and whether that layer is torn down
    // by shoot time differs per run — the SAME glyphs raster with different antialiasing
    // (identical ink extents, 295 large per-pixel deltas between two settled runs). Both
    // states pass a settle proof, so the fix is to make the state impossible: capture mode
    // strips CSS animations/transitions entirely. End states equal base states (every
    // entrance here finishes at identity), no animation ever forces a layer, and the
    // reduce/no-preference axis keeps its meaning — it captures what the PRODUCT's media
    // queries change, which was always the axis's point; transient animation frames were
    // never baseline material.
    // will-change joins the strip: motion/react promotes its animated elements to compositor
    // layers via will-change, and whether that layer is torn down by shoot time is the last
    // measured bistability — two runs with BYTE-IDENTICAL snapped DOM still rastered the
    // figure's text with different antialiasing (composited grayscale vs non-composited
    // subpixel). With will-change dead, text never rasters on an animation-owned layer.
    await page.addStyleTag({ content: "*, *::before, *::after { animation: none !important; transition: none !important; will-change: auto !important; }" });
    await page.evaluate(() => document.fonts.ready);
    // AR15's second measured instability: `animations: "disabled"` pins CSS and WAAPI, but
    // motion/react drives its springs on the main thread with requestAnimationFrame, which no
    // screenshot option can pause — home under no-preference hashed differently between two
    // same-day runs because the capture landed mid-entrance. And a two-frame proof alone had a
    // measured hole: the story landing's mount-gated parallax is a DELAYED one-shot (hydration
    // lands after networkidle), so two identical pre-hydration frames passed the proof in one
    // run of three while the other two captured post-hydration. Two barriers close it: an
    // idle-callback wait (hydration has run once the main thread goes idle), then quiescence
    // PROVEN over three identical frames spanning ~800ms. A route that never settles has
    // indefinite motion without a stop — the taste register's own ban — so the harness fails
    // loudly naming the route instead of committing a coin flip to the baseline.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          "requestIdleCallback" in window
            ? requestIdleCallback(() => resolve(null), { timeout: 3_000 })
            : setTimeout(resolve, 500),
        ),
    );
    let png = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
    let hash = createHash("sha256").update(png).digest("hex");
    for (let attempt = 0, stableRuns = 0; ; attempt += 1) {
      await page.waitForTimeout(400);
      const next = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
      const nextHash = createHash("sha256").update(next).digest("hex");
      if (nextHash === hash) {
        stableRuns += 1;
        if (stableRuns >= 2) break;
      } else {
        stableRuns = 0;
        if (attempt >= 15) throw new Error(`capture never settled on ${key.route} @${key.width}·${key.motion} — indefinite motion without a stop`);
        png = next;
        hash = nextHash;
      }
    }
    // AR15's fourth measured instability, run to ground across three probe rounds: the hero's
    // scroll-linked spring (story-portrait-drift) is PERTURBED BY THE CAPTURE ITSELF — a
    // fullPage screenshot expands the viewport, the scroll-linked target shifts, the spring
    // chases, and the freeze lands mid-chase-back, anywhere along a ~0.2px decay curve. Two
    // moves close it, in order: the page's clock is PAUSED (rAF stops, so motion can never
    // re-render — a quantize attempt without the pause lost a race to motion's own frame loop),
    // then fractional translations are snapped to a CANONICAL value. Rounding was measured
    // insufficient (frozen values straddle the round boundary between runs, shifting the whole
    // figure 1px); sub-8px fractional translations are decorative spring residue by
    // construction — real offsets in this tree are whole pixels (entrance y:20/26) — so they
    // snap to ZERO, which every possible freeze point agrees on. Larger fractionals round.
    await page.clock.pauseAt(new Date(new Date(FIXED_CLOCK_ISO).getTime() + 30 * 60_000 + shot * 60_000));
    await page.evaluate(() => {
      for (const el of document.querySelectorAll<HTMLElement>("[style*='transform']")) {
        const m = new DOMMatrixReadOnly(getComputedStyle(el).transform === "none" ? undefined : getComputedStyle(el).transform);
        if (m.is2D && (!Number.isInteger(m.e) || !Number.isInteger(m.f))) {
          const snap = (v: number) => (Math.abs(v) < 8 ? 0 : Math.round(v));
          el.style.transform = `matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, ${snap(m.e)}, ${snap(m.f)})`;
        }
      }
    });
    const settled = await page.screenshot({ fullPage: true, animations: "disabled", caret: "hide" });
    hash = createHash("sha256").update(settled).digest("hex");
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
