// Keyboard access, walked with real Tab presses over every surface: each stop must show where it
// is, and the number of stops must be at least the number of visible, enabled, in-tab-order
// controls. A page can honour the ring rule perfectly and still strand a control nobody can tab
// to, which is why both are measured.
//
// WHY REAL TABS. `:focus-visible` is the browser's own judgement about whether focus came from a
// keyboard; a probe that called `.focus()` would measure `:focus` styles and report a ring the
// keyboard user never sees. So the walk presses Tab, and compares each focused control's computed
// outline, shadow, underline, background and colour against the same control at rest — a ring is
// any difference, so a design that marks focus with colour rather than an outline still counts.
//
// Surfaces are derived (`site-routes.ts`, `STAGES`), never listed. This is the automated half of
// the console-depth item's "keyboard access" and the re-sweep's manual gap; like `a11y.spec.ts`
// it is a check with no exemption register.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { CONSOLE_ROUTES, PUBLIC_ROUTES } from "./site-routes";
import { installFakeSpeech } from "./support/fake-speech";
import { STAGES, openStage } from "./support/finder-stages";
import { derivedFloor } from "./support/floors";
import { seedFixtures } from "./support/fixtures";
import { signInAndOnboard } from "./support/session";

const CONTROLS = 'a[href], button, input:not([type=hidden]), select, summary, textarea, [role="button"]';
const PHONE = { width: 390, height: 844 };

type Surface = { readonly name: string; readonly open: (page: Page) => Promise<void> };
const byUrl = (routes: readonly string[]): Surface[] =>
  routes.map((route) => ({ name: route, open: (page) => page.goto(route, { waitUntil: "networkidle" }).then(() => undefined) }));

async function walk(page: Page, surfaces: readonly Surface[]) {
  const ringless: string[] = [];
  const unreachable: string[] = [];
  let totalStops = 0;

  for (const { name, open } of surfaces) {
    await open(page);
    await page.evaluate(() => document.fonts.ready);
    await page.evaluate(() => (document.activeElement as HTMLElement | null)?.blur());

    await page.evaluate((selector) => {
      document.querySelectorAll(selector).forEach((el, i) => {
        const cs = getComputedStyle(el);
        el.setAttribute("data-focus-probe", String(i));
        el.setAttribute("data-focus-rest", `${cs.outlineStyle} ${cs.outlineWidth}|${cs.boxShadow}|${cs.textDecorationLine}|${cs.backgroundColor}|${cs.color}`);
      });
    }, CONTROLS);

    let stops = 0;
    let first = "";
    let passedBody = false;
    // Safari reaches links with Option+Tab unless a preference is set; plain Tab skips them.
    const tab = test.info().project.name === "webkit" ? "Alt+Tab" : "Tab";
    for (let i = 0; i < 200; i += 1) {
      await page.keyboard.press(tab);
      const info = await page.evaluate(() => {
        const el = document.activeElement as HTMLElement | null;
        if (!el || el === document.body) return null;
        const cs = getComputedStyle(el);
        const now = `${cs.outlineStyle} ${cs.outlineWidth}|${cs.boxShadow}|${cs.textDecorationLine}|${cs.backgroundColor}|${cs.color}`;
        const rest = el.getAttribute("data-focus-rest");
        return {
          key: el.getAttribute("data-focus-probe") ?? `${el.tagName}.${el.className}|${(el.textContent || "").trim().slice(0, 20)}`,
          ring: rest === null ? true : now !== rest,
          tag: el.tagName.toLowerCase(),
          text: (el.textContent || "").trim().slice(0, 32),
        };
      });
      if (!info) {
        if (passedBody) break;
        passedBody = true;
        continue;
      }
      if (stops > 0 && info.key === first) break;
      if (stops === 0) first = info.key;
      stops += 1;
      if (!info.ring) ringless.push(`${name} <${info.tag}> "${info.text}"`);
    }

    const controls = await page.evaluate((selector) => {
      let n = 0;
      for (const el of Array.from(document.querySelectorAll(selector))) {
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height) continue;
        const closedDetails = el.closest("details:not([open])");
        if (closedDetails && !el.closest("summary")) continue;
        const tabAttr = el.getAttribute("tabindex");
        if (tabAttr !== null && Number(tabAttr) < 0) continue;
        if ((el as HTMLInputElement).disabled) continue;
        n += 1;
      }
      return n;
    }, CONTROLS);

    totalStops += stops;
    if (stops < controls) unreachable.push(`${name}: ${stops} tab stops for ${controls} controls`);
  }

  return { ringless, unreachable, totalStops };
}

test("every public control is reachable by keyboard and shows where it is", async ({ page }) => {
  test.setTimeout(240_000);
  await page.setViewportSize(PHONE);
  expect(PUBLIC_ROUTES.length, "the derived public list collapsed").toBeGreaterThan(8);
  const { ringless, unreachable, totalStops } = await walk(page, byUrl(PUBLIC_ROUTES));
  expect(totalStops).toBeGreaterThan(derivedFloor(PUBLIC_ROUTES.length, 6));
  expect(ringless, `focused with no visible indicator:\n${ringless.join("\n")}`).toEqual([]);
  expect(unreachable, `controls no keyboard can reach:\n${unreachable.join("\n")}`).toEqual([]);
});

test("every console control is reachable by keyboard and shows where it is", async ({ page, request }) => {
  test.setTimeout(600_000);
  await request.post("/api/mock/console");
  await signInAndOnboard(page);
  // Seeded, so each screen is walked populated rather than on its one-paragraph refusal.
  await seedFixtures(request);
  await page.setViewportSize(PHONE);
  expect(CONSOLE_ROUTES.length, "the derived console list collapsed").toBeGreaterThan(20);
  const { ringless, unreachable, totalStops } = await walk(page, byUrl(CONSOLE_ROUTES));
  expect(totalStops, "the console walk stopped tabbing, a clean result here would mean nothing").toBeGreaterThan(derivedFloor(CONSOLE_ROUTES.length, 5));
  expect(ringless, `focused with no visible indicator:\n${ringless.join("\n")}`).toEqual([]);
  expect(unreachable, `controls no keyboard can reach:\n${unreachable.join("\n")}`).toEqual([]);
});

test("every finder stage is reachable by keyboard and shows where it is", async ({ page }) => {
  test.setTimeout(240_000);
  await installFakeSpeech(page);
  await page.setViewportSize(PHONE);
  const { ringless, unreachable, totalStops } = await walk(
    page,
    STAGES.map((stage) => ({ name: `/ (${stage})`, open: (p: Page) => openStage(p, stage) })),
  );
  expect(totalStops).toBeGreaterThan(derivedFloor(STAGES.length, 3));
  expect(ringless, `focused with no visible indicator:\n${ringless.join("\n")}`).toEqual([]);
  expect(unreachable, `controls no keyboard can reach:\n${unreachable.join("\n")}`).toEqual([]);
});
