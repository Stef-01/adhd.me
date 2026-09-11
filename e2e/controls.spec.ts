// Every control a finger aims at is reachable, and big enough to hit (founder, 2026-09-11:
// "make sure buttons work all the time consistently").
//
// THREE THINGS MAKE A BUTTON MISS, and the earlier work only covered one of them. Stage 6 fixed
// the handlers — drags that swallowed the tap they should have been, a `pointercancel` nobody let
// go of, a chosen answer that looked unchosen. That is the third cause. The other two are here:
//
//   1. SOMETHING IS PAINTED OVER IT. A fixed bar, a scrim, a decorative layer: the tap lands on
//      whatever `elementFromPoint` returns, and if that is not the control, the control does not
//      work however correct its handler is.
//   2. IT IS TOO SMALL. A 19px line of text is a 19px target. WCAG 2.2 SC 2.5.8 puts the legal
//      floor at 24px and this tree's own rule, stated in `app/app-tabs.tsx`, is 44 to 48 with 24
//      as "a floor and not a design target".
//
// WHAT IS MEASURED IS THE EFFECTIVE TARGET, NOT THE BOX. The filters screen's Reset all is 68x32
// and perfectly reachable, because a `::after` extends its hit area past its own edge — a rule
// this tree already uses deliberately. So the check walks outward from each control's centre
// asking `elementFromPoint` where each point lands, which is the same question a thumb asks.
//
// AND EVERY CONTROL IS SCROLLED TO FIRST. A control below the fold is not unreachable, it is
// scrolled to. The first version of this measurement skipped that and reported two perfectly good
// links as covered by the tab bar; both are fine, and the fix was to the instrument.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";

/** The tree's own floor, from `app/app-tabs.tsx`. 24 is the law; 44 is the rule. */
const FLOOR = 44;

const SURFACES: ReadonlyArray<{ name: string; path: string; act?: (page: Page) => Promise<void> }> = [
  { name: "Finder welcome", path: "/" },
  { name: "First step", path: "/first-step" },
  { name: "First step, the answer", path: "/first-step", act: async (p) => {
    await p.getByRole("button", { name: "Me", exact: true }).click();
    await p.getByRole("button", { name: "Still finding out" }).click();
  } },
  { name: "Support, cold", path: "/support" },
  { name: "Today", path: "/today" },
  { name: "Learn", path: "/approach" },
  { name: "Lives", path: "/lives" },
  { name: "Leo, ready", path: "/lives/play/leo-mosquito" },
  { name: "Leo, playing", path: "/lives/play/leo-mosquito", act: async (p) => { await p.getByRole("button", { name: "Play Leo’s moment" }).click(); } },
  { name: "Leo, the routine", path: "/lives/play/leo-mosquito", act: async (p) => {
    await p.getByRole("button", { name: "Play Leo’s moment" }).click();
    await p.getByRole("button", { name: "Skip this round" }).click();
  } },
  { name: "The Chaos Run", path: "/lives/play" },
  { name: "Toolkit", path: "/lives/toolkit" },
  { name: "My ADHD", path: "/my-adhd" },
  { name: "Profile", path: "/profile" },
  { name: "Urgent help", path: "/urgent" },
];

type Row = { label: string; reached: boolean; blocker: string; hitW: number; hitH: number; pe: string };

async function controls(page: Page): Promise<Row[]> {
  return page.evaluate(() => {
    const out: Row[] = [];
    const selector = "button:not([disabled]), a[href], [role=button]:not([aria-disabled=true])";
    for (const el of document.querySelectorAll<HTMLElement>(selector)) {
      const cs = getComputedStyle(el);
      if (cs.display === "none" || cs.visibility === "hidden" || cs.opacity === "0") continue;
      if (el.closest(".sr-only, .skip-link") || el.classList.contains("sr-only")) continue;
      if (el.closest("details:not([open])") && !el.closest("summary")) continue;
      let r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      el.scrollIntoView({ block: "center", inline: "nearest" });
      r = el.getBoundingClientRect();
      if (r.bottom <= 0 || r.top >= innerHeight || r.right <= 0 || r.left >= innerWidth) continue;
      const label = (el.getAttribute("aria-label") || el.textContent || el.tagName).trim().replace(/\s+/g, " ").slice(0, 40);
      const cx = Math.min(innerWidth - 1, Math.max(0, r.left + r.width / 2));
      const cy = Math.min(innerHeight - 1, Math.max(0, r.top + r.height / 2));
      const hits = (x: number, y: number) => {
        if (x < 0 || y < 0 || x >= innerWidth || y >= innerHeight) return false;
        const a = document.elementFromPoint(x, y);
        return a === el || el.contains(a);
      };
      const at = document.elementFromPoint(cx, cy);
      const reached = at === el || el.contains(at) || Boolean(at && at.contains(el));
      const blocker = reached || !at ? "" : `${at.tagName.toLowerCase()}.${(at.className || "").toString().split(" ").filter(Boolean).slice(0, 2).join(".")}`;
      const walk = (dx: number, dy: number) => { let n = 0; while (n < 40 && hits(cx + dx * (n + 1), cy + dy * (n + 1))) n++; return n; };
      out.push({ label, reached, blocker,
        hitW: reached ? walk(-1, 0) + walk(1, 0) + 1 : 0,
        hitH: reached ? walk(0, -1) + walk(0, 1) + 1 : 0,
        pe: cs.pointerEvents });
    }
    return out;
  });
}

test("every control is reachable and at least 44px, on a phone and on a desktop", async ({ page }) => {
  test.setTimeout(240_000);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => {
    localStorage.setItem("adhdme.play.tutored", "1");
    localStorage.setItem("adhdme.lives.tutored", "1");
  });
  const covered: string[] = [];
  const small: string[] = [];
  let checked = 0;
  for (const size of [{ w: 390, h: 844 }, { w: 1280, h: 800 }]) {
    await page.setViewportSize({ width: size.w, height: size.h });
    for (const surface of SURFACES) {
      await page.goto(surface.path);
      if (surface.act) await surface.act(page);
      for (const row of await controls(page)) {
        checked++;
        const where = `${surface.name} @${size.w} "${row.label}"`;
        if (!row.reached) covered.push(`${where} is covered by <${row.blocker}>`);
        else if (row.pe === "none") covered.push(`${where} has pointer-events: none`);
        else if (row.hitW < FLOOR || row.hitH < FLOOR) small.push(`${where} can be hit over ${row.hitW}x${row.hitH}`);
      }
    }
  }
  expect(checked, "the control sweep found nothing, so it proved nothing").toBeGreaterThan(150);
  expect(covered, "a control something is painted over does not work, however correct its handler").toEqual([]);
  expect(small, `a control smaller than ${FLOOR}px is one a thumb misses`).toEqual([]);
  console.log(`controls: ${checked} checked across ${SURFACES.length} surfaces at two widths, 0 covered, 0 under ${FLOOR}px`);
});
