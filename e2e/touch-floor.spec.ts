// O145/O148: the 44px touch floor (O14), swept mechanically instead of remembered per unit.

import { expect, test, type Page } from "@playwright/test";

const PUBLIC_ROUTES = [
  "/", "/about", "/approach", "/clinicians", "/clinicians/join", "/demo", "/examples", "/faq",
  "/finder", "/practices", "/privacy", "/terms", "/thanks", "/privacy/automated-decisions",
  "/privacy/counsel-review",
];

// O148: the console was never swept, because O145 scoped itself to what a patient sees. It is
// where practice staff work, sometimes on a phone between patients.
const CONSOLE_ROUTES = [
  "/console", "/console/dashboard", "/console/matching", "/console/interview",
  "/console/applications", "/console/allocation", "/console/rules", "/console/registers",
  "/console/privacy", "/console/ops", "/console/outcomes", "/console/referrals",
  "/console/complaints", "/console/reporting", "/console/usefulness", "/console/case-mix",
];

/**
 * Every control on `route` whose HIT AREA is under 44px, with the population it was drawn from.
 *
 * Three exclusions, each principled rather than convenient:
 *   * a link sitting inline inside a sentence — WCAG 2.5.8 exempts these explicitly, and counting
 *     them drowns the real findings. O148 had to widen this past `closest("p")`: a citation link
 *     inside a `<div>` of prose on /console/registers is the same thing and was being reported as
 *     a defect;
 *   * anything out of the tab order, which is honeypots and the like — not a control a person
 *     reaches for;
 *   * `.sr-only` inputs, where the visible affordance is somewhere else.
 *
 * And it measures the hit area, NOT the glyph: an 18px checkbox inside a 44px label is compliant.
 * Measuring the input reported 70 findings where there were 61, all of them styled checkboxes.
 */
async function sweep(page: Page, route: string) {
  await page.goto(route, { waitUntil: "networkidle" });
  // Fonts change metrics and so layout. Without this the sweep reported /about's "Final-year MD
  // candidate" link at 265x44 as an offender on one run and not the next (O146).
  await page.evaluate(() => document.fonts.ready);
  return page.evaluate(() => {
    const out: string[] = [];
    let seen = 0;
    const inlineInProse = (el: Element) => {
      if (el.tagName !== "A") return false;
      if (el.closest("p")) return true;
      const parent = el.parentElement;
      if (!parent) return false;
      if (getComputedStyle(el).display !== "inline") return false;
      return (parent.textContent || "").replace(el.textContent || "", "").trim().length > 0;
    };
    const selector = 'a, button, input:not([type=hidden]), select, summary, [role="button"]';
    for (const el of Array.from(document.querySelectorAll(selector))) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;
      if (inlineInProse(el)) continue;
      // O153: EXPLICIT negative tabindex only. `el.tabIndex` is -1 for a `[role="button"]` div
      // that simply has no tabindex — precisely the accidentally-unreachable control this should
      // catch — so filtering on it excused the defect. A deliberate `tabindex="-1"` (the
      // honeypot) is still excused, because that is a decision rather than an oversight.
      const tabAttr = el.getAttribute("tabindex");
      if (tabAttr !== null && Number(tabAttr) < 0) continue;
      if (el.classList.contains("sr-only")) continue;

      let box = rect;
      const label =
        el.closest("label") ?? (el.id ? document.querySelector(`label[for="${el.id}"]`) : null);
      if (label) {
        const lr = (label as HTMLElement).getBoundingClientRect();
        if (lr.width * lr.height > box.width * box.height) box = lr;
      }
      seen += 1;
      if (box.height < 44 || box.width < 44) {
        const name = (el.getAttribute("aria-label") || el.textContent || (label && label.textContent) || "").trim().slice(0, 40);
        out.push(`<${el.tagName.toLowerCase()}> "${name}" ${Math.round(box.width)}x${Math.round(box.height)}`);
      }
    }
    return { out, seen };
  });
}

async function signInAsPracticeOwner(page: Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("owner@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

test.describe("O14's 44px touch floor", () => {
  test("no control on a public route is under the floor", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    const offenders: string[] = [];
    let population = 0;
    for (const route of PUBLIC_ROUTES) {
      const { out, seen } = await sweep(page, route);
      population += seen;
      for (const entry of out) offenders.push(`${route} ${entry}`);
    }
    // O159: /demo again, POPULATED. Its "Open booking link" anchors render only once invitations
    // exist, so the pass above measures an empty page and says nothing about them — they were
    // 115x40 and went unnoticed until another spec seeded state in the same batch (O152).
    await page.goto("/demo");
    await page.getByRole("button", { name: /Launch demo|Reset demo to the start/ }).click();
    await page.waitForURL(/\/console$/);
    const populated = await sweep(page, "/demo");
    population += populated.seen;
    for (const entry of populated.out) offenders.push(`/demo (populated) ${entry}`);

    // Non-vacuity: a selector that stopped matching would report a perfectly clean sweep.
    expect(population).toBeGreaterThan(150);
    expect(offenders, `controls under the 44px floor:\n${offenders.join("\n")}`).toEqual([]);
  });

  test("no control in the console is under the floor", async ({ page, request }) => {
    // O159: SEED EVERY FIXTURE FIRST, and that is the whole point of this line.
    //
    // The sweep measures whichever state it happens to find, not the set of controls the product
    // can render. Run with only the console fixture, `/console/referrals` shows no decline form and
    // `/demo` shows no booking links — so the sweep reported a clean pass while three controls sat
    // under the floor, and it took another spec seeding data in the same batch to expose them
    // (O152). A gate whose population depends on run order is a gate that gives false assurance.
    for (const fixture of [
      "console", "referrals", "registers", "usefulness", "ops", "credentials",
      "capability", "case-mix", "education", "preferences", "pathways", "verticals", "state",
    ]) {
      await request.post(`/api/mock/${fixture}`);
    }
    await page.setViewportSize({ width: 390, height: 844 });
    await signInAsPracticeOwner(page);
    const offenders: string[] = [];
    let population = 0;
    for (const route of CONSOLE_ROUTES) {
      const { out, seen } = await sweep(page, route);
      population += seen;
      for (const entry of out) offenders.push(`${route} ${entry}`);
    }
    expect(population).toBeGreaterThan(120);
    expect(offenders, `controls under the 44px floor:\n${offenders.join("\n")}`).toEqual([]);
  });
});
