// The care plan on the map, end to end (docs/adhd-life/CARE-PLAN-PRD.md §10, §14).
//
// The lines this holds hardest are the two the feature is most likely to drift across.
//
// NO MONEY. The whole appeal of a care plan is financial, and `src/directory/fees.ts` refuses
// rebate arithmetic by construction — "what we charge is a fact, what you will pay is not". The
// model's own test refuses it over keys and exports; this refuses it over what reaches a screen.
//
// NO NUMBER ABOUT THE PERSON. The tab's standing rule (`my-adhd.spec.ts`) is that nothing on it
// counts anybody. A care plan is the one surface where a count is legitimate — services left is a
// fact about a plan, not a measure of a person — so the boundary is asserted rather than assumed:
// the plan's own count may appear, and a score, a percentage or a cost may not.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { expectNoViolations } from "./support/a11y";
// The library is plain ESM the CLI shares; the types are loose on purpose.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LIVED_RECORD } from "../scripts/text-budget-lib.mjs";

const MODEL_KEY = "adhdme.model.v1";
const STEPS = ["duration", "goals", "providers", "team", "services"] as const;

/**
 * The plan lives on `/today` rather than the hub: the hub had four words of headroom and now
 * carries three recommendation surfaces, so the two features together put it over 60. See
 * `app/today-screen.tsx` for the measurement and CARE-PLAN-PRD.md §6 for the founder's call.
 */
async function seed(page: Page, record: unknown = LIVED_RECORD): Promise<void> {
  await page.goto("/today");
  await page.evaluate(([k, rec]) => localStorage.setItem(k!, rec!), [MODEL_KEY, JSON.stringify(record)]);
  await page.reload();
}

/** The same person, before they have told us about a plan — the state everybody meets first. */
function withoutPlan(): unknown {
  const { carePlan, ...rest } = LIVED_RECORD as Record<string, unknown>;
  return rest;
}

/** Opens the sheet on one step. Each step is its own screen, so each is reached from the card. */
async function openStep(page: Page, step: (typeof STEPS)[number]) {
  await page.locator(".plan-card").click();
  await page.locator(`.plan-step[data-step="${step}"]`).click();
  await expect(page.locator(`.plan-sheet[data-view="${step}"]`)).toBeVisible();
}

test("the card says what is left, in two words and a row of dots", async ({ page }) => {
  await seed(page);
  const card = page.locator(".plan-card");
  await expect(card).toBeVisible();
  // Two words on screen. The count is in the accessible name: three hollow dots among five say
  // "3 left" to anybody who can see them, and the words were the difference between a screen
  // inside its ceiling and one over it.
  await expect(card.locator(".plan-card-name")).toHaveText("Care plan");
  await expect(card).toHaveAccessibleName(/Care plan: 3 of 5 services left/);
  // Five dots for five services, two of them spent.
  await expect(card.locator(".plan-dot")).toHaveCount(5);
  await expect(card.locator(".plan-dot[data-used]")).toHaveCount(2);
});

test("before a plan the card asks, and the sheet lists the five things a GP will, none of them settled", async ({ page }) => {
  await seed(page, withoutPlan());
  const card = page.locator(".plan-card");
  await expect(card).toHaveAttribute("data-empty", "true");
  await expect(card).toContainText("Ask your GP");
  await expect(card.locator(".plan-dot")).toHaveCount(0);

  await card.click();
  const steps = page.locator(".plan-step");
  await expect(steps).toHaveCount(5);
  await expect(page.locator(".plan-step[data-done]")).toHaveCount(0);
  // The four a person answers before the visit come first; the numbers only a written plan can
  // give come last, and say so.
  await expect(steps.first()).toContainText("Six months");
  await expect(steps.last()).toContainText("Services");
  await expect(steps.last()).toContainText("Not yet");
  // No instruction, no progress, no count of rows done: the ticks are the state.
  const text = await page.locator(".plan-sheet").innerText();
  expect(text).not.toMatch(/\d+ of \d+|complete|progress|step \d/i);

  await steps.last().click();
  await expect(page.locator(".plan-numbers")).toBeVisible();
  await expectNoViolations(page, "The care plan's numbers");
});

test("the list says each answer beside its name, in the words the app already uses", async ({ page }) => {
  await seed(page);
  await page.locator(".plan-card").click();
  const sheet = page.locator(".plan-sheet");
  await expect(sheet).toBeVisible();
  await expect(sheet.locator(".plan-step[data-done]")).toHaveCount(4);
  await expect(sheet.locator('.plan-step[data-step="duration"]')).toContainText("Yes");
  await expect(sheet.locator('.plan-step[data-step="goals"]')).toContainText("Starting, Sleep & energy");
  await expect(sheet.locator('.plan-step[data-step="providers"]')).toContainText("Psychologist");
  await expect(sheet.locator('.plan-step[data-step="team"]')).not.toHaveAttribute("data-done");
  await expect(sheet.locator(".plan-state")).toContainText("3 left");
  await expectNoViolations(page, "The care plan sheet");
});

test("the team step names the kinds the person's own map points at, and marks the one a plan cannot pay for", async ({ page }) => {
  await seed(page);
  await openStep(page, "team");
  const sheet = page.locator(".plan-sheet");

  const rows = sheet.locator(".plan-row");
  expect(await rows.count()).toBeGreaterThan(1);

  // Every row names a kind and the axis it came from, and the axis is a word rather than a
  // sentence — `Need.label` is "Starting long independent work." and would not fit.
  for (const row of await rows.all()) {
    await expect(row.locator(".plan-row-kind")).not.toBeEmpty();
    const why = (await row.locator(".plan-row-why").innerText()).trim();
    expect(why.length).toBeGreaterThan(0);
    expect(why).not.toMatch(/\.$/);
  }

  // A GP writes the plan and is never suggested under it.
  await expect(sheet).not.toContainText(/^GP$/);

  // The uncovered kind is shown and marked, not dropped. MAP-CONNECTIONS measured `adhd-coach` as
  // the map's answer for 13 of 17 subdomains with no real provider, and a coach is the one kind a
  // plan can never cover — hiding it would make this sheet disagree with /support silently. It is
  // not a row to keep, because a plan cannot pay for it.
  const marked = sheet.locator(".plan-row:not([data-covered])");
  await expect(marked).toHaveCount(1);
  await expect(marked.locator(".plan-row-mark")).toHaveText("Not covered");
  await expect(marked.locator("button")).toHaveCount(0);

  // Every covered row starts kept, because the map proposed it; one tap drops it.
  const kept = sheet.locator('.plan-toggle[aria-pressed="true"]');
  const covered = await sheet.locator(".plan-row[data-covered]").count();
  await expect(kept).toHaveCount(covered);
  await expectNoViolations(page, "The team step");

  await sheet.locator(".plan-toggle").first().click();
  await expect(kept).toHaveCount(covered - 1);
  await page.getByRole("button", { name: "Save", exact: true }).click();
  const row = page.locator('.plan-step[data-step="team"]');
  await expect(row).toHaveAttribute("data-done", "true");
  await expect(row).not.toContainText(/coach/i);
});

test("no step says anything about money, or anything about the person", async ({ page }) => {
  await seed(page);
  await page.locator(".plan-card").click();
  const texts = [await page.locator(".plan-sheet").innerText()];
  await page.keyboard.press("Escape");
  for (const step of STEPS) {
    await openStep(page, step);
    texts.push(await page.locator(".plan-sheet").innerText());
    await page.keyboard.press("Escape");
    await expect(page.locator(".plan-sheet")).toBeHidden();
  }
  const text = texts.join("\n");
  // fees.ts refuses rebate arithmetic by construction. Nothing here may reintroduce it on screen.
  expect(text, "a care plan screen must not do rebate arithmetic").not.toMatch(/\$|\bcost\b|\brebate\b|\bgap\b|\bsaving|\bworth\b|\bfree\b/i);
  // Nothing here decides who qualifies: that is the GP's, and the sheet only asks.
  expect(text).not.toMatch(/eligib|qualif|entitle/i);
  // A percentage would turn three of five into a score.
  expect(text).not.toMatch(/%/);
  // The only digits allowed are the plan's own count — a fact about a plan, not a measure of
  // anybody. The seeded record holds a cost of 8 out of 10 that must never reach this surface.
  const digits = text.match(/\d+/g) ?? [];
  expect(digits.length).toBeGreaterThan(0);
  for (const d of digits) expect(Number(d)).toBeLessThanOrEqual(5);
});

test("the numbers are the person's own, by pointer and by keyboard", async ({ page }) => {
  await seed(page, withoutPlan());
  await openStep(page, "services");
  await expect(page.locator(".plan-numbers")).toBeVisible();

  const allows = page.locator(".plan-stepper").filter({ hasText: "My plan allows" });
  const used = page.locator(".plan-stepper").filter({ hasText: "Used so far" });

  // Announced as a number, with its bounds, rather than as bare text.
  const allowsValue = allows.locator("[role=spinbutton]");
  await expect(allowsValue).toHaveAttribute("aria-valuenow", "5");
  await expect(allowsValue).toHaveAccessibleName(/My plan allows/);

  await allows.getByRole("button", { name: /one more/ }).click();
  await expect(allowsValue).toHaveAttribute("aria-valuenow", "6");

  // Keyboard, on the value itself.
  await allowsValue.focus();
  await page.keyboard.press("ArrowDown");
  await expect(allowsValue).toHaveAttribute("aria-valuenow", "5");

  // `used` can never exceed what the plan allows, so the control stops rather than the model
  // having to floor a nonsense pair afterwards.
  const usedValue = used.locator("[role=spinbutton]");
  const oneMoreUsed = used.getByRole("button", { name: /one more/ });
  // Click until the control stops rather than a fixed number of times: the point is that it stops.
  for (let i = 0; i < 12 && (await oneMoreUsed.isEnabled()); i++) await oneMoreUsed.click();
  await expect(usedValue).toHaveAttribute("aria-valuenow", "5");
  await expect(oneMoreUsed).toBeDisabled();

  // Saving lands back on the list, with the dots the numbers imply.
  await page.getByRole("button", { name: "Save", exact: true }).click();
  // Scoped to the sheet: the hub's card is behind it and draws the same dots, so an unscoped
  // count matches both rows and reads 10.
  const state = page.locator(".plan-state");
  await expect(state).toContainText("0 left");
  await expect(state.locator(".plan-dot[data-used]")).toHaveCount(5);

  // And it survives a reload, because it is on the record rather than in the sheet.
  await page.reload();
  await expect(page.locator(".plan-card")).toHaveAccessibleName(/0 of 5 services left/);
});

test("every target on every step is one a thumb can land on", async ({ page }) => {
  await seed(page, withoutPlan());
  await page.setViewportSize({ width: 320, height: 844 });
  const small: string[] = [];
  const measure = async (view: string) => {
    // Half a pixel of tolerance, and the real height in the message. A `min-height: 44px` control
    // in a flex row measures 43.99 in Chromium, which a bare `< 44` reports as "44px" — a failure
    // that reads as a contradiction and sends the next person looking for a bug that is not there.
    small.push(...(await page.evaluate((v) =>
      [...document.querySelectorAll(".plan-sheet button, .plan-sheet input, .plan-sheet [role=spinbutton]")]
        .map((e) => ({ name: (e.getAttribute("aria-label") ?? e.textContent ?? "").trim().slice(0, 24), r: e.getBoundingClientRect() }))
        .filter((x) => x.r.height < 43.5)
        .map((x) => `${v} ${x.name}: ${x.r.height.toFixed(2)}px`), view)));
  };
  await page.locator(".plan-card").click();
  await measure("list");
  await page.keyboard.press("Escape");
  for (const step of STEPS) {
    await openStep(page, step);
    await measure(step);
    await page.keyboard.press("Escape");
    await expect(page.locator(".plan-sheet")).toBeHidden();
  }
  expect(small, "a control a thumb cannot land on is a control on a phone").toEqual([]);
});

test("four taps and a few words, and the GP has it", async ({ page }) => {
  await seed(page, withoutPlan());
  const list = page.locator(".plan-sheet[data-view=list]");

  // Six months: one tap is the answer, and it lands straight back on the list.
  await openStep(page, "duration");
  await page.getByRole("button", { name: "Yes", exact: true }).click();
  await expect(list).toBeVisible();
  await expect(page.locator('.plan-step[data-step="duration"]')).toContainText("Yes");
  await page.keyboard.press("Escape");

  // Goals: up to three, and the fourth chip stops rather than the model trimming afterwards.
  await openStep(page, "goals");
  await page.getByRole("button", { name: "Starting", exact: true }).click();
  await page.getByRole("button", { name: "Sleep & energy", exact: true }).click();
  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await expect(page.getByRole("button", { name: "Organisation", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Focus", exact: true }).click();
  await page.getByLabel("In your words").fill("Get out the door on time.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator('.plan-step[data-step="goals"]')).toContainText("Starting, Sleep & energy");
  await page.keyboard.press("Escape");

  // Who I see: the kinds the app already knows, minus the GP who writes the plan.
  await openStep(page, "providers");
  await expect(page.getByRole("button", { name: "GP", exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Psychologist", exact: true }).click();
  await page.getByLabel("Names, if you like").fill("Dr Lee, fortnightly.");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator('.plan-step[data-step="providers"]')).toContainText("Psychologist");
  await page.keyboard.press("Escape");

  // My team: the map's proposal, kept as proposed.
  await openStep(page, "team");
  await page.getByRole("button", { name: "Save", exact: true }).click();
  await expect(page.locator(".plan-step[data-done]")).toHaveCount(4);

  // Phase 6: the way onward is the surface that already exists, opened in place rather than by a
  // navigation that would have dropped the person back on the hub. The summary lives on the hub,
  // so this one navigates — and the hub reads `?share=1` on arrival so the promise is kept.
  await page.getByRole("button", { name: /Take this to my GP/ }).click();
  await page.waitForURL(/\/my-adhd/);
  const summary = page.locator(".map-sheet");
  await expect(summary).toBeVisible();
  await summary.getByRole("button", { name: "My GP" }).click();

  // Rows the record already held, under a heading. No drafted prose: `summary.ts` writes none,
  // and the person's own words arrive byte for byte.
  await expect(page.getByText("Care plan", { exact: true }).first()).toBeVisible();
  await expect(page.getByText(/Six months or more:\s*yes/)).toBeVisible();
  await expect(page.getByText(/Goals:\s*Starting, Sleep & energy/)).toBeVisible();
  await expect(page.getByText("Get out the door on time.", { exact: true })).toBeVisible();
  await expect(page.getByText(/Current providers:\s*Psychologist/)).toBeVisible();
  await expect(page.getByText("Dr Lee, fortnightly.", { exact: true })).toBeVisible();
  // Only kinds a plan can pay for: a GP reading this does not need the coach the map suggested.
  await expect(page.getByText(/Preferred team:/)).not.toContainText(/coach/i);
  // Nothing a plan cannot hold yet: no numbers until a GP has written them.
  await expect(page.getByText(/Plan allows:/)).toHaveCount(0);
});

test("a plan already held reaches the GP summary as rows, with the map's proposal until a team is chosen", async ({ page }) => {
  await seed(page);
  await page.locator(".plan-card").click();
  await page.getByRole("button", { name: /Take this to my GP/ }).click();
  await page.waitForURL(/\/my-adhd/);
  const summary = page.locator(".map-sheet");
  await expect(summary).toBeVisible();
  await summary.getByRole("button", { name: "My GP" }).click();

  await expect(page.getByText(/Plan allows:\s*5/)).toBeVisible();
  await expect(page.getByText(/Used so far:\s*2/)).toBeVisible();
  await expect(page.getByText(/Six months or more:\s*yes/)).toBeVisible();
  await expect(page.getByText(/Current providers:\s*Psychologist/)).toBeVisible();
  await expect(page.getByText(/Proposed team:/)).not.toContainText(/coach/i);
});
