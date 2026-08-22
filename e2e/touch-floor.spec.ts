// O145/O148: the 44px touch floor (O14), swept mechanically instead of remembered per unit.

import { expect, test, type Page } from "@playwright/test";

// O170: the routes are derived from `app/` now, not listed here.
//
// This sweep covered all 15 public routes and 16 of the 30 console screens. The fourteen never
// measured for touch target size were the SAME twelve `contrast` was missing — both arrays were
// copied from one list on one day and neither grew afterwards, which is the whole argument O168
// made for deriving rather than extending.
//
// O148's note below still holds and is why the console half exists at all: it is where practice
// staff work, sometimes on a phone between patients.
import { CONSOLE_ROUTES, PUBLIC_ROUTES, revealCollapsedSurfaces } from "./site-routes";

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
  await revealCollapsedSurfaces(page);
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
    // O170: predicted before it was hit, not diagnosed after. O169 found `contrast` sitting under
    // Playwright's 30s default, survivable only because its route list was short. This spec had
    // the same shape and the same short list.
    test.setTimeout(180_000);
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
    // O174: the public list was already complete at 15 routes. The figure is stated as a RANGE
    // because it is not run-order independent — 160 with this spec alone, 163 inside the full
    // suite, since `/demo` is swept populated and what earlier specs seeded moves the count. Pinning
    // the standalone number would have been a figure that goes stale on a full run, which is the
    // exact staleness O170 found in the console floor and O174 found again one row later.
    console.log(`POP_PUBLIC ${population} (floor 150, observed 160-163 by run order)`);
    expect(population, "the public sweep collapsed").toBeGreaterThan(150);
    expect(offenders, `controls under the 44px floor:\n${offenders.join("\n")}`).toEqual([]);
  });

  test("no control in the console is under the floor", async ({ page, request }) => {
    test.setTimeout(300_000);
    // O159: SEED EVERY FIXTURE, and that is the whole point of these lines.
    //
    // The sweep measures whichever state it happens to find, not the set of controls the product
    // can render. Run with only the console fixture, `/console/referrals` shows no decline form and
    // `/demo` shows no booking links — so the sweep reported a clean pass while three controls sat
    // under the floor, and it took another spec seeding data in the same batch to expose them
    // (O152). A gate whose population depends on run order is a gate that gives false assurance.
    //
    // O174: AND THE ORDER BENEATH THAT COMMENT REINTRODUCED THE FAULT THE COMMENT DESCRIBES.
    // `console` led the list and `POST /api/mock/console` RESETS the console store, so the three
    // fixtures that read `practices[0]` — credentials, capability, education — threw and returned
    // 500. Nothing checked the status, so they silently did not seed and this sweep measured their
    // unlinked refusal pages: `/console/credentials` rendered 3 controls where 11 exist.
    // `preferences` was a fourth no-op for a different reason — that route has no POST handler at
    // all and answered 405 to every run of this list.
    //
    // Three changes, and the third is the one that makes the other two stay true:
    //   * `console` is posted FIRST and the practice created straight after, so the resetting
    //     fixture still runs (it seeds the demo memberships and clinicians the console pages read)
    //     but nothing afterwards reads an emptied store. Dropping it instead cost six controls —
    //     measured, not assumed;
    //   * credentials and education carry `linkEmail`, without which they render the refusal even
    //     when they seed — a11y already did this and this spec did not;
    //   * every response is ASSERTED ok, so a fixture that stops seeding fails the test instead of
    //     quietly shrinking what the sweep covers.
    await page.setViewportSize({ width: 390, height: 844 });
    // The resetting fixture, then the practice, then everything that depends on the practice.
    await request.post("/api/mock/console");
    await signInAsPracticeOwner(page);

    const LINKED = new Set(["credentials", "education"]);
    const failed: string[] = [];
    for (const fixture of [
      "referrals", "registers", "usefulness", "ops", "credentials",
      "capability", "case-mix", "education", "pathways", "verticals", "state",
    ]) {
      const query = LINKED.has(fixture) ? "?linkEmail=owner@demo.practice.example" : "";
      const response = await request.post(`/api/mock/${fixture}${query}`);
      if (!response.ok()) failed.push(`${fixture} -> ${response.status()}`);
    }
    expect(failed, `a fixture did not seed, so this sweep is measuring a page it did not populate: ${failed.join(", ")}`).toEqual([]);
    const offenders: string[] = [];
    let population = 0;
    for (const route of CONSOLE_ROUTES) {
      const { out, seen } = await sweep(page, route);
      population += seen;
      for (const entry of out) offenders.push(`${route} ${entry}`);
    }
    // O170: the floor was 120, set when this sweep visited 16 console routes. It now visits 28 and
    // the observed population is 207 across 30 routes, so 120 would no longer notice it collapsing to
    // roughly the list it replaced. Measured first, then stated beside the ceiling — W48's rule.
    //
    // O174 RE-MEASURED IT RATHER THAN INHERITING IT, which is the same discipline one row later:
    // fixing the fixture seeding moved this from 196 to 207, because eleven controls on
    // `/console/credentials` had never been in the population at all. A figure written beside a
    // floor is a claim about a run, and it goes stale the moment the run changes.
    console.log(`POP_CONSOLE ${population} (floor 170, observed 207 at 30 routes)`);
    expect(population, "the console sweep collapsed — a clean pass here would mean nothing").toBeGreaterThan(170);
    expect(offenders, `controls under the 44px floor:\n${offenders.join("\n")}`).toEqual([]);
  });
});
