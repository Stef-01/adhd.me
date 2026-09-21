// Walks every screen the text-budget instrument reaches and measures four defects a screenshot
// hides: a screen that scrolls sideways, a control sliced by the viewport edge without the page
// scrolling at all, a control a thumb cannot land on, and text clipped by its own box. Nothing here asserts — it prints, and a person reads it, the way
// scripts/screens.mjs does. BASE=http://localhost:PORT, widths from WIDTHS below.
//
// The naive version of each of these check is wrong, and each was wrong here first:
//
//  - VISIBILITY. Chromium lays out and exposes rects for content inside a CLOSED <details>, so
//    that content is findable. A non-zero rect is therefore not proof a person can see a thing:
//    the first run of this reported 33 filter chips on /profile as undersized targets, and every
//    one of them was behind a closed fold. checkVisibility plus an explicit closed-fold guard.
//  - TARGET SIZE. The tree extends small controls with a transparent ::after pad (`.me-close::after
//    { inset: -6px }` makes a 32px button a 44px target), and a label associated by `for` is part
//    of its control's target. Neither is in the element's own box, so the box is the wrong thing
//    to measure. This probes the four edges of a 44px square around the centre and asks the
//    document what is actually there — where a thumb lands, not what CSS declared.
//  - CLIPPING. An .sr-only element is 1px wide by design and every one of them "clips".
//
// After those three corrections the app reports one finding, which is real and is recorded in
// AESTHETIC.md under "The care map's twenty-five nodes".
import { chromium } from "@playwright/test";
import { contextFor, launchOptions, reach, routes } from "./text-budget-lib.mjs";
const BASE = process.env.BASE || "http://localhost:3100";
/* The two phone widths the tree already walks: the narrowest it supports, and the reference. */
const WIDTHS = (process.env.WIDTHS || "320,390").split(",").map(Number);
const b = await chromium.launch(launchOptions(chromium));
const findings = [];
const unreachable = [];
for (const width of WIDTHS) {
  let ctx = await b.newContext({ ...contextFor(BASE), viewport: { width, height: 844 } });
  let page = await ctx.newPage();
  for (const route of routes()) {
    try {
      if (route.state === "finder-results" || route.state === "finder-profile") {
        await ctx.close();
        ctx = await b.newContext({ ...contextFor(BASE), viewport: { width, height: 844 } });
        page = await ctx.newPage();
      }
      await reach(page, route, BASE);
    } catch (error) {
      unreachable.push(`${route.name} @${width}: ${String(error).slice(0, 70)}`);
      continue;
    }
    const r = await page.evaluate(() => {
      const out = { sideways: document.documentElement.scrollWidth - document.documentElement.clientWidth, small: [], clipped: [], cut: [] };
      // Chromium exposes layout rects for content inside a CLOSED <details> (skipped content is
      // findable now), so a rect is not proof of visibility. checkVisibility plus an explicit
      // closed-fold guard is what actually matches what a person can see and tab to.
      const vis = (e) => {
        if (e.closest("details:not([open])") && !e.closest("summary")) return false;
        if (typeof e.checkVisibility === "function" &&
            !e.checkVisibility({ checkOpacity: true, checkVisibilityCSS: true, contentVisibilityAuto: true })) return false;
        const b = e.getBoundingClientRect();
        return b.width > 0 && b.height > 0;
      };
      for (const e of document.querySelectorAll('a[href], button, input:not([type=hidden]), select, textarea, [role=button], [role=tab], [role=slider]')) {
        if (!vis(e) || e.closest('[aria-hidden="true"], [inert]')) continue;
        const b = e.getBoundingClientRect();
        const inProse = e.tagName === "A" && e.closest("p, li, td, figcaption, blockquote") && getComputedStyle(e).display.startsWith("inline");
        if (inProse) continue;
        // A control can sit outside the viewport without the DOCUMENT scrolling, when an ancestor
        // hides its overflow — the control is simply sliced, and the sideways check above cannot
        // see it. That is how the Chaos Run shipped a choice with 12px cut off its right edge. A
        // control inside a real horizontal scroller is fine: a person can reach it.
        const vw = document.documentElement.clientWidth;
        const scroller = (() => {
          for (let a = e.parentElement; a; a = a.parentElement) {
            const ox = getComputedStyle(a).overflowX;
            if ((ox === "auto" || ox === "scroll") && a.scrollWidth > a.clientWidth + 1) return true;
          }
          return false;
        })();
        if (!scroller && (b.right > vw + 0.5 || b.left < -0.5)) {
          const name = (e.getAttribute("aria-label") || e.textContent || e.tagName).replace(/\s+/g, " ").trim().slice(0, 30);
          const cut = b.left < -0.5 ? Math.round(-b.left) : Math.round(b.right - vw);
          out.cut.push(`${cut}px off the ${b.left < -0.5 ? "left" : "right"} "${name}"`);
        }
        if (b.height >= 44 && b.width >= 44) continue;
        // The tree extends small controls with an ::after hit pad (`.me-close::after { inset: -6px }`),
        // and a label associated by `for` is part of its control's target too. Neither shows up in the
        // element's own box, so the only honest measure is where a thumb actually lands: probe the
        // four edges of a 44px box around the centre and ask the document what is there.
        const cx = b.x + b.width / 2, cy = b.y + b.height / 2;
        const owns = (t) => !!t && (t === e || e.contains(t) || t.contains(e) ||
          (e.labels && [...e.labels].some((l) => l === t || l.contains(t))) ||
          (t.tagName === "LABEL" && t.control === e));
        const probes = [[cx, cy - 21], [cx, cy + 21], [cx - 21, cy], [cx + 21, cy]];
        const missed = probes.filter(([x, y]) => x >= 0 && y >= 0 && x < innerWidth && y < innerHeight && !owns(document.elementFromPoint(x, y)));
        if (!missed.length) continue;
        const name = (e.getAttribute("aria-label") || e.textContent || e.tagName).trim().slice(0, 34);
        out.small.push(`${Math.round(b.width)}x${Math.round(b.height)} miss${missed.length}/4 "${name}"`);
      }
      for (const e of document.querySelectorAll("h1,h2,h3,h4,p,span,li,button,a,label,td,th")) {
        if (!vis(e) || e.children.length) continue;
        if (e.clientWidth < 8 || e.closest(".sr-only") || e.classList.contains("sr-only")) continue;
        const s = getComputedStyle(e);
        if (s.overflow === "visible" && s.overflowX === "visible") continue;
        if (e.scrollWidth > e.clientWidth + 1 && s.overflowX !== "auto" && s.overflowX !== "scroll") {
          out.clipped.push(`${e.scrollWidth}>${e.clientWidth} "${e.textContent.trim().slice(0, 34)}"`);
        }
      }
      return out;
    });
    if (r.sideways > 0 || r.small.length || r.clipped.length || r.cut.length) {
      findings.push({ width, name: route.name, ...r });
    }
  }
  await ctx.close();
}
await b.close();
for (const f of findings) {
  console.log(`\n## ${f.name} @${f.width}`);
  if (f.sideways > 0) console.log(`  SIDEWAYS +${f.sideways}px`);
  for (const s of [...new Set(f.small)]) console.log(`  SMALL  ${s}`);
  for (const c of [...new Set(f.clipped)]) console.log(`  CLIP   ${c}`);
  for (const c of [...new Set(f.cut)]) console.log(`  CUT    ${c}`);
}
console.log(`\n${findings.length} screen/width pairs with findings`);
// A run that reached nothing prints "0 findings", which reads exactly like a clean sweep. It is how
// the first run of this script reported the whole app clean against a server that was not up.
if (unreachable.length) {
  console.log(`\n${unreachable.length} screen/width pairs UNREACHED — this run measured nothing for them:`);
  for (const u of unreachable.slice(0, 10)) console.log(`  ${u}`);
  process.exitCode = 1;
}
