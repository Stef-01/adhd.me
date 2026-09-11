// The ADHD Life PRD's critical journeys (§69), in a browser: onboarding to a recommendation, a
// module writing to My ADHD, a rejected insight never persisting as confirmed, the safety response
// interrupting a module, the support path reaching matching providers, the care map opening from
// the Learn page, and the finder broadened beyond GPs.

import { expect } from "@playwright/test";
import { test } from "./support/test";
import { CURSOR_KEY } from "../src/learn/cursor";
import { runStepCount } from "../src/learn/play";
import { RUNS } from "../src/learn/runs";

const MODEL_KEY = "adhdme.model.v1";
const TUTORED_KEY = "adhdme.play.tutored";

// §14 Calm: the tutorial shows once per device; every flow here starts on a device that has seen it,
// except the one test that is about the tutorial.
test.beforeEach(async ({ page }) => {
  await page.addInitScript((k) => { try { localStorage.setItem(k, "1"); } catch { /* denied storage: the tutorial shows, which is also right */ } }, TUTORED_KEY);
});

/** Play the perfectionism run under reduced motion up to its reflect beat. */
async function playToReflect(page: import("@playwright/test").Page) {
  await page.getByRole("button", { name: "Tap to play" }).click();
  await page.getByRole("button", { name: "I held off" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Permission to be rough" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "I held on" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Ask the reader" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "The night before" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("group", { name: "Perspectives" }).getByRole("button", { name: "Priya" }).click();
  await page.getByRole("group", { name: "Perspectives" }).getByRole("button", { name: "The reader" }).click();
  await page.getByRole("button", { name: "Both are true" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: /I guess, and aim high/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("group", { name: "How often" }).getByRole("button", { name: "Sometimes" }).click();
  await page.getByRole("group", { name: "Want it easier" }).getByRole("button", { name: "Maybe" }).click();
  await page.getByRole("button", { name: "Partly" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
}


test("E2E 1: a new person completes onboarding and is handed a first module", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/today");
  await page.getByRole("link", { name: /^Start/ }).click();
  await expect(page).toHaveURL(/\/start$/);
  await page.getByRole("button", { name: /^Start/ }).click();
  await page.getByRole("button", { name: "I think I may have ADHD" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Starting things" }).click();
  await page.getByRole("button", { name: "Work" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "I know what to do but cannot start" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Work", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("slider").fill("8");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "When something is due right now" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Q7 is generated from Q2–Q5: the starting goal must be on offer.
  await page.getByRole("button", { name: "Start assignments and work earlier" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "No", exact: true }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Practical things to try" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Around 10 minutes" }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toContainText(/priority seems to be start assignments/i);
  await expect(page.getByText("Why starting can be harder than doing")).toBeVisible();
  // Nothing scored, and the record is on the device only.
  const record = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), MODEL_KEY);
  expect(record.onboarding?.impact).toBe(8);
  expect(record.onboarding?.completedAt).toBeTruthy();
  expect(new URL(page.url()).search).toBe("");
  await page.getByRole("button", { name: /^Start/ }).click();
  await expect(page).toHaveURL(/module=starting/);
  await expect(page.locator(".play-title")).toContainText("The blank page");
});

test("E2E 3 & 5: a run's rounds write to My ADHD, and a rejected insight is never confirmed", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/approach?module=starting");
  await expect(page.locator(".play-title")).toContainText("The blank page");
  await page.getByRole("button", { name: "Tap to play" }).click();
  // Round 1: don't tap. Under reduced motion there is no clock; the person says they held.
  await expect(page.locator(".play-card[data-beat=play]")).toBeVisible();
  await page.getByRole("button", { name: "I held off" }).click();
  await expect(page.locator('.play-result[data-hit="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 2: order.
  for (const label of ["Open the file", "Type the title", "Write one bad sentence"]) await page.getByRole("button", { name: label }).click();
  await expect(page.locator('.play-result[data-hit="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 3: tap — a wrong answer is a beat, not a loss.
  await page.getByRole("button", { name: "Try harder" }).click();
  await expect(page.locator('.play-result[data-hit="false"]')).toBeVisible();
  await expect(page.locator(".play-result")).toContainText("Effort was never the missing piece");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 4: tap.
  await page.getByRole("button", { name: "Improve the report" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 5: hold.
  await page.getByRole("button", { name: "I held on" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 6: timing — under reduced motion, choose the moment.
  await page.getByRole("button", { name: "Ten minutes, then stop" }).click();
  await expect(page.locator('.play-result[data-hit="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 7: sort each cause into its layer.
  for (const [cause, layer] of [["A vague brief", "Environment"], ["Five hours’ sleep", "Body"], ["A manager who will judge it", "People"]] as const) {
    await page.getByRole("group", { name: "Causes" }).getByRole("button", { name: cause }).click();
    await page.getByRole("group", { name: "Layers" }).getByRole("button", { name: new RegExp(layer) }).click();
  }
  await expect(page.locator('.play-result[data-hit="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 8: pick your bean (writes an answer).
  await page.getByRole("button", { name: /Vague ones/ }).click();
  await page.getByRole("button", { name: "That’s me" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Recognition: one question per card (§14). How often, then whether they want it easier; no slider.
  await expect(page.getByRole("slider")).toHaveCount(0);
  await page.getByRole("group", { name: "How often" }).getByRole("button", { name: "Often" }).click();
  await page.getByRole("group", { name: "Want it easier" }).getByRole("button", { name: "Yes" }).click();
  // Insight: rejected. No kicker anywhere on the card.
  await expect(page.locator(".play-kicker")).toHaveCount(0);
  await page.getByRole("button", { name: "Not really" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "I’ll try this" }).click();
  await expect(page.locator(".strategy-accepted")).toContainText("On your list");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.locator(".learning-completion")).toContainText("Your picture just got sharper");
  const record = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), MODEL_KEY);
  expect(record.resonance?.starting?.frequency).toBe("often");
  // §14: no cost slider on the recognition card; the cost is the relate beats' mean (needs.ts).
  expect(record.resonance?.starting?.cost).toBeUndefined();
  expect(record.answers?.["starting.hardest-to-start"]).toEqual(["vague"]);
  expect(record.insights?.["starting-threshold"]).toBe("no");
  expect(Object.values(record.insights ?? {})).not.toContain("yes");
  expect(record.experiments?.[0]?.strategyId).toBe("first-physical-action");
  expect(record.completed).toContain("starting");

  await page.goto("/my-adhd");
  await expect(page.getByRole("heading", { name: /Starting work before deadline pressure/ })).toBeVisible();
  await expect(page.getByText("Activation for ambiguous tasks", { exact: true })).toBeVisible();
  await expect(page.getByText("Still testing")).toBeVisible();
  await expect(page.getByRole("button", { name: "Not really", pressed: true })).toBeVisible();

  // Today follows up the experiment before anything new, and the outcome lands in the history.
  await page.evaluate((k) => { const r = JSON.parse(localStorage.getItem(k) ?? "{}"); r.onboarding = { ...(r.onboarding ?? {}), completedAt: new Date().toISOString() }; localStorage.setItem(k, JSON.stringify(r)); }, MODEL_KEY);
  await page.goto("/today");
  await expect(page.getByRole("heading", { name: /Did “The first physical action” help/ })).toBeVisible();
  await page.getByRole("button", { name: "A lot" }).click();
  await expect(page.getByRole("heading", { name: /Did “The first physical action” help/ })).toHaveCount(0);
  await page.getByText("Why am I seeing this?").click();
  await expect(page.locator(".life-why code")).toContainText("rule ");
  await page.goto("/my-adhd");
  await expect(page.getByText("Things that help me")).toBeVisible();
});

test("Play: with motion on, the clock runs a round on its own and a held 'don't tap' clears", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/approach?module=starting");
  await page.getByRole("button", { name: "Tap to play" }).click();
  await expect(page.locator(".play-clock")).toBeVisible();
  await expect(page.locator('.play-result[data-hit="true"]')).toBeVisible({ timeout: 12000 });
  // The relate beat holds the result (no auto-advance on a round that asks a question); Next moves on, and round two waits for a gesture.
  await expect(page.getByRole("group", { name: "How much is this you?" })).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.getByRole("button", { name: "Open the file" })).toBeVisible({ timeout: 4000 });
  // §14: no label unless asked for; the "?" turns the round count and the rule on.
  await expect(page.locator(".play-label")).toHaveCount(0);
  await page.getByRole("button", { name: "Show the labels" }).click();
  await expect(page.locator(".play-label")).toContainText("Round 2 of 8");
  await expect(page.locator(".play-rule")).toBeVisible();
  // Touch floor on the round's controls.
  for (const box of await page.locator(".play-choice").evaluateAll((els) => els.map((e) => e.getBoundingClientRect().height))) expect(box).toBeGreaterThanOrEqual(44);
});

test("E2E 8: a safety response interrupts the module, pauses recommendations, and leaves nothing in a URL", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach?module=perfectionism");
  await playToReflect(page);
  await expect(page.locator(".reflect-field textarea")).toBeVisible();
  await page.locator(".reflect-field textarea").fill("I don't want to be here anymore");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const alert = page.getByRole("alertdialog");
  await expect(alert).toBeVisible();
  await expect(alert).toContainText("13 11 14");
  await expect(alert).not.toContainText(/diagnos/i);
  await expect(page.locator(".learn-dots")).toHaveCount(0);
  expect(page.url()).not.toContain("anymore");
  await page.goto("/today");
  await expect(page.getByRole("alertdialog")).toBeVisible();
  await page.getByRole("button", { name: "I have read this" }).click();
  await expect(page.getByRole("alertdialog")).toHaveCount(0);
});

test("E2E 6: the support path walks from the problem to professions, and 'See providers' narrows the finder", async ({ page }) => {
  await page.goto("/support");
  // COLD, this page ANSWERS rather than asks (2026-09-11). It used to say "Nothing to walk from
  // yet. Answer the ten questions and the path fills in." — a questionnaire, on the one page named
  // for starting from the problem, to the reader who does not yet know what they need. The kinds
  // of help are the page now, each opening the finder narrowed to it; the ten questions are still
  // offered below them and still build the ranked walk this test goes on to check.
  await expect(page.getByRole("heading", { name: "Which kind of help?" })).toBeVisible();
  await expect(page.locator(".cold-kind")).toHaveCount(6);
  await expect(page.locator(".cold-kind").first()).toContainText("GP");
  // The "not sure" line offers TWO questions, not ten: /first-step answers the same thing in two
  // taps, and the onboarding it used to point at is the toll this page was caught charging.
  await expect(page.getByRole("link", { name: /Two questions/ })).toBeVisible();
  await page.evaluate((k) => {
    localStorage.setItem(k, JSON.stringify({
      v: 1, onboarding: { improveFirst: "start-earlier", impact: 8, lookingFor: "professional", completedAt: new Date().toISOString() },
      resonance: { starting: { frequency: "often", cost: 8, priority: "yes", at: new Date().toISOString() }, ambiguity: { frequency: "often", cost: 8, priority: "yes", at: new Date().toISOString() } },
      answers: { "starting.hardest-to-start": ["vague"], "ambiguity.source": ["manager"] },
      insights: {}, experiments: [
        { strategyId: "first-physical-action", moduleId: "starting", acceptedAt: "2026-09-01T00:00:00Z", outcome: "no", outcomeAt: "2026-09-02T00:00:00Z" },
        { strategyId: "define-done", moduleId: "ambiguity", acceptedAt: "2026-09-03T00:00:00Z", outcome: "a-little", outcomeAt: "2026-09-04T00:00:00Z" },
      ], reflections: [], safety: [], completed: ["starting", "ambiguity"], survey: { day: "", answeredToday: 0, abandons: [], lastLongAt: null },
    }));
  }, MODEL_KEY);
  await page.reload();
  await expect(page.getByRole("heading", { name: "The problem", exact: true })).toBeVisible();
  await expect(page.locator(".support-step").nth(0)).toContainText(/Starting work before deadline pressure/);
  await expect(page.locator(".profession-card.is-first")).toContainText("Occupational therapist");
  await expect(page.locator(".profession-card.is-first")).toContainText("Why this one");
  await expect(page.getByText(/What I’d like help with/)).toBeVisible();
  await page.locator(".profession-card.is-first").getByRole("link", { name: /See occupational therapists/ }).click();
  await expect(page).toHaveURL(/\/$/);
  await page.getByRole("textbox").fill("help starting ambiguous work, by telehealth");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  const rows = page.locator(".clinician-row");
  await expect(rows.first()).toContainText("Occupational therapist");
  for (const text of await rows.allInnerTexts()) expect(text).toContain("Occupational therapist");
  await rows.first().click();
  await expect(page.getByText("Best for")).toBeVisible();
  await expect(page.getByText(/Why this provider is listed/).or(page.locator(".fit-evidence"))).toHaveCount(1);
});

test("Triage: two questions separate the pathways before any list, and the answer opens the finder narrowed", async ({ page }) => {
  // Charmaine Bernie, 2026-09-11: people land on the wrong waitlist for years because nothing
  // separated the pathways first — children on an autism assessment list for two years when it was
  // never the right list. This is the flow that asks instead, and the assertions are about the two
  // things that make it worth asking: the answers ROUTE somewhere different, and it costs two taps.
  await page.goto("/");
  await page.getByRole("link", { name: "Two questions" }).click();
  await expect(page).toHaveURL(/\/first-step$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Who is this for?");

  // The child assessment route: the misrouting she measured, named on the card that would cause it.
  await page.getByRole("button", { name: "A child or teenager" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Where are you up to?");
  await page.getByRole("button", { name: "Still finding out" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("A GP referral, to a paediatrician.");
  await expect(page.locator(".first-step-answer")).toContainText("The autism assessment list is a different list.");

  // Back undoes a tap rather than the whole flow, and the other stage is a different answer.
  await page.getByRole("button", { name: "Back" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Where are you up to?");
  await page.getByRole("button", { name: "The day-to-day is hard" }).click();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("School and home, not a clinic.");

  // And the answer is a door, not a verdict: it opens the finder already narrowed to that kind.
  await page.getByRole("link", { name: /See occupational therapists/ }).click();
  await expect(page).toHaveURL(/\/$/);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("adhdme.filters.v1") ?? "{}").professions)).toEqual(["occupational-therapist"]);
  await page.getByRole("textbox").fill("help with the day-to-day");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  for (const text of await page.locator(".clinician-row").allInnerTexts()) expect(text).toContain("Occupational therapist");
});

test("the finder reads a named profession out of the sentence, and every kind is still there without one", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("What kind of support are you looking for?");
  await page.getByRole("textbox").fill("a psychologist for emotional regulation near Chatswood");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  for (const text of await page.locator(".clinician-row").allInnerTexts()) expect(text).toContain("Psychologist");
  await page.getByRole("button", { name: "Start over" }).click();
  await page.getByRole("textbox").fill("someone who takes an ADHD assessment seriously");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  // The assessment sentence names nobody's profession, so the GPs — who declare assessment — lead.
  expect((await page.locator(".clinician-row").first().innerText())).not.toContain("Psychologist");
  // Filters screen: the kinds of support are chips, held on the device.
  await page.goto("/profile");
  await page.locator("summary", { hasText: "Kind of support" }).click();
  await page.getByRole("button", { name: "Psychologists" }).click();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem("adhdme.filters.v1") ?? "{}").professions)).toEqual(["psychologist"]);
});

test("the care map opens from the Learn page's map icon, and a node explains itself", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach");
  await page.getByRole("link", { name: "Open the care map" }).first().click();
  await expect(page).toHaveURL(/\/approach\/map$/);
  await expect(page.getByRole("heading", { name: "Four layers, one life." })).toBeVisible();
  await page.getByRole("button", { name: /^Starting \(Brain\)/ }).click();
  await expect(page.getByRole("heading", { name: "Starting" })).toBeVisible();
  await expect(page.getByRole("link", { name: /Why starting can be harder than doing/ })).toBeVisible();
  // Keyboard reaches a node too.
  await page.getByRole("button", { name: /^Sleep \(Body\)/ }).focus();
  await page.keyboard.press("Enter");
  await expect(page.getByRole("heading", { name: "Sleep" })).toBeVisible();
  // The four tabs the PRD names, with Learn current here.
  const bar = page.getByRole("navigation", { name: "Sections" });
  await expect(bar.getByRole("link", { name: "Learn", exact: true })).toHaveAttribute("aria-current", "page");
  await expect(bar.getByRole("link", { name: "My ADHD", exact: true })).toBeVisible();
});

test("E2E 9: under reduced motion a run has no clock, the recall round works by buttons, and the keyboard plays it", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach?module=working-memory");
  await expect(page.getByRole("button", { name: "Tap to play" })).toBeFocused();
  await expect(page.locator(".play-clock")).toHaveCount(0);
  await page.getByRole("button", { name: "Tap to play" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".play-kicker")).toHaveCount(0);
  await page.getByRole("button", { name: "I have them" }).click();
  await page.getByRole("button", { name: /Reply, then keep walking/ }).click();
  for (const item of ["Milk", "The parcel", "Stamps", "Sam’s script"]) await page.getByRole("group", { name: "What was on the list" }).getByRole("button", { name: item }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator('.play-result[data-hit="true"]')).toBeVisible();
  await expect(page.locator(".play-result")).toContainText("All four");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator('.play-card[data-beat="play"]')).toBeVisible();
  await expect(page.locator(".play-clock")).toHaveCount(0);
});

// ── Phase A ────────────────────────────────────────────────────────────────────────────────

test("Phase A: a topic survey is offered, not launched; answered one screen at a time; and its pattern reaches My ADHD", async ({ page }) => {
  await page.goto("/my-adhd");
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({
    v: 1, onboarding: { improveFirst: "start-earlier", impact: 8, completedAt: new Date().toISOString() },
    resonance: { starting: { frequency: "often", cost: 8, priority: "yes", at: new Date().toISOString() } },
    answers: {}, insights: {}, experiments: [], reflections: [], safety: [], completed: [], survey: { day: "", answeredToday: 0, abandons: [], lastLongAt: null }, surveys: {},
  })), MODEL_KEY);
  await page.reload();
  const offer = page.getByRole("link", { name: /Start the survey/ });
  await expect(offer).toBeVisible();
  await expect(page).toHaveURL(/\/my-adhd$/);
  await offer.click();
  await expect(page).toHaveURL(/\/survey\?id=work-study$/);
  await page.getByRole("button", { name: /Very, I circle it/ }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Much harder" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: /the night before/ }).click();
  for (let i = 0; i < 7; i += 1) await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
  await page.getByRole("slider").fill("9");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: /Once the problem is concrete/ }).click();
  await page.getByRole("button", { name: "See my pattern" }).click();
  await expect(page.getByRole("heading", { name: "Your work pattern." })).toBeVisible();
  await expect(page.getByRole("heading", { name: /Starting work before deadline pressure/ })).toBeVisible();
  await expect(page.getByText("Environmental amplifier")).toBeVisible();
  await expect(page.getByText("Sustained engagement once the problem becomes concrete", { exact: false })).toBeVisible();
  await expect(page.getByRole("button", { name: "I’ll try this" })).toBeVisible();
  const record = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), MODEL_KEY);
  expect(record.surveys["work-study"].completedAt).toBeTruthy();
  expect(record.survey.lastLongAt).toBeTruthy();
  await page.goto("/my-adhd");
  await expect(page.getByRole("link", { name: /Start the survey/ })).toHaveCount(0);
  await expect(page.getByText("Waiting for urgency", { exact: true })).toBeVisible();
});

test("Phase A: problem fit orders allied providers by the person's top need, and says why", async ({ page }) => {
  await page.goto("/");
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({
    v: 1, onboarding: null,
    resonance: { starting: { frequency: "often", cost: 8, priority: "yes", at: new Date().toISOString() } },
    answers: { "starting.hardest-to-start": ["vague"] }, insights: {}, experiments: [], reflections: [], safety: [], completed: [], survey: { day: "", answeredToday: 0, abandons: [], lastLongAt: null }, surveys: {},
  })), MODEL_KEY);
  await page.reload();
  await page.getByRole("textbox").fill("an OT or a coach who does telehealth");
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  const first = page.locator(".clinician-row").first();
  await expect(first).toContainText(/Works on task initiation, the thing you said is hardest/);
  await first.click();
  await expect(page.getByText("Why you’re seeing them")).toBeVisible();
});

test("Phase A: voice reflection appends the transcript, and an absent recogniser says so", async ({ page }) => {
  const { installFakeSpeech } = await import("./support/fake-speech");
  await installFakeSpeech(page);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach?module=perfectionism");
  await playToReflect(page);
  await page.getByRole("button", { name: "Say it instead" }).click();
  await expect(page.getByRole("button", { name: /Tap when you’ve finished/ })).toBeVisible();
  await page.evaluate(() => (window as unknown as { __speech: { say: (t: string, f: boolean) => void; finish: () => void } }).__speech.say("the brief was vague", true));
  await page.getByRole("button", { name: /Tap when you’ve finished/ }).click();
  await page.evaluate(() => (window as unknown as { __speech: { finish: () => void } }).__speech.finish());
  await expect(page.locator(".reflect-field textarea")).toHaveValue(/the brief was vague/);
});

test("NWIA: the paradigm is on the care map once and attributed, a node names its dimension, and My ADHD says the balance honestly", async ({ page }) => {
  await page.goto("/approach/map");
  const intro = page.locator(".care-map-nwia");
  await expect(intro).toHaveCount(1);
  await expect(intro).toContainText(/awareness, understanding and active decision-making/);
  await expect(intro.getByRole("link", { name: /National Wellness Institute of Australia/ })).toHaveAttribute("href", /wellnessaustralia\.org/);
  await page.getByRole("button", { name: /^Sleep \(Body\)/ }).click();
  await expect(page.locator(".care-map-nwia")).toContainText(/Wellness dimension\s*Physical/);
  await page.goto("/my-adhd");
  await page.evaluate((k) => localStorage.setItem(k, JSON.stringify({
    v: 1, onboarding: { improveFirst: "start-earlier", impact: 7, completedAt: new Date().toISOString() },
    resonance: { starting: { frequency: "often", cost: 7, priority: "yes", at: new Date().toISOString() } },
    answers: {}, insights: {}, experiments: [], reflections: [], safety: [], completed: [], survey: { day: "", answeredToday: 0, abandons: [], lastLongAt: null }, surveys: {},
  })), MODEL_KEY);
  await page.reload();
  // The balance line used to name all nine dimensions twice, about thirty words to say what a
  // shape says at a glance. The shape is /my-map; this is the count, the honest half ("unasked")
  // and the door, and the naming of every touched and untouched dimension is asserted there.
  const balance = page.getByTestId("nwia-balance");
  await expect(balance).toContainText(/3 of nine touched, the rest unasked/);
  await balance.getByRole("link", { name: "Your map" }).click();
  await expect(page).toHaveURL(/\/my-map$/);
  await expect(page.getByRole("button", { name: /^Work/ })).toContainText("Named");
  await expect(page.getByRole("button", { name: /^Physical/ })).toContainText("Not yet");
  // The honest half, said per axis rather than in one long sentence: an untouched dimension is
  // not a gap in a person, and the map says so on the one the reader opens.
  await page.getByRole("button", { name: /^Physical/ }).click();
  await expect(page.locator(".map-open")).toContainText("Nothing yet. Not a gap, unasked.");
});

test("§14 Calm: the shelf is a line, a button and the tiles; a finished run is a tick on its tile, never a count", async ({ page }) => {
  await page.goto("/approach");
  await expect(page.locator(".learn-chips")).toHaveCount(0);
  await expect(page.locator(".learn-progress")).toHaveCount(0);
  await expect(page.locator(".play-cast")).toHaveCount(0);
  await expect(page.locator(".learning-overline")).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("adhdme.learn.v1", JSON.stringify({ v: 1, done: ["starting", "sleep"] })));
  await page.reload();
  await expect(page.locator(".learn-card.is-done")).toHaveCount(2);
  await expect(page.locator(".learn-card.is-done").first()).toContainText("Done");
});

test("§14 Calm: the tutorial shows once per device, three sentences and a button, then never again", async ({ page }) => {
  // Clear the device's memory of the tutorial once for this tab, not on every load (the reload below must keep the flag "Got it" wrote).
  await page.addInitScript((k) => { try { if (!sessionStorage.getItem("tutorial-cleared")) { localStorage.removeItem(k); sessionStorage.setItem("tutorial-cleared", "1"); } } catch { /* fine */ } }, TUTORED_KEY);
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach?module=starting");
  const tutorial = page.getByRole("group", { name: "How to play" });
  await expect(tutorial).toContainText("The bar at the top is the clock");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(tutorial).toContainText("Waiting is the move");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(tutorial).toContainText("A miss costs nothing");
  await page.getByRole("button", { name: "Got it" }).click();
  await expect(page.getByRole("button", { name: "Tap to play" })).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), TUTORED_KEY)).toBe("1");
  await page.reload();
  await expect(page.getByRole("group", { name: "How to play" })).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Tap to play" })).toBeVisible();
});

test("Play P6: the catch and balance mechanics play by buttons under reduced motion, and a run is never mostly tapping", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach?module=eating");
  await page.getByRole("button", { name: "Tap to play" }).click();
  await page.getByRole("button", { name: "I held off" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "At 3pm, shaky" }).click();
  await expect(page.locator('.play-result[data-hit="true"]')).toBeVisible();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Catch, by buttons: keep the three no-cook foods, leave the decoys.
  const keep = page.getByRole("group", { name: "What to keep" });
  for (const item of ["Yoghurt", "Boiled eggs", "Nuts"]) await keep.getByRole("button", { name: item, exact: true }).click();
  await page.getByRole("button", { name: "Keep these" }).click();
  await expect(page.locator('.play-result[data-hit="true"]')).toBeVisible();
  await expect(page.locator(".play-result")).toContainText("no cooking");
  // Balance, by buttons, in the gut run.
  await page.goto("/approach?module=gut");
  await page.getByRole("button", { name: "Tap to play" }).click();
  await page.getByRole("button", { name: "A regular-ish meal" }).click();
  await expect(page.locator('.play-result[data-hit="true"]')).toBeVisible();
  await expect(page.locator(".play-result")).toContainText("plain routine");
});

test("PLAY-PLAN §11: props react on their own terms, once, in place, and stand still under reduced motion", async ({ page }) => {
  // The starting run opens on a desk; the desk's screen wakes. First the still equal.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach?module=starting");
  // The title card mounts after hydration; wait for the run, then tap if the card is up.
  const go = page.getByRole("button", { name: "Tap to play" });
  const play = async () => {
    await page.locator(".play-card.is-title, .play-scene").first().waitFor();
    if (await go.count()) await go.click();
  };
  await play();
  const scene = page.locator(".play-scene[data-prop]:not([data-prop='none'])").first();
  await expect(scene).toBeVisible();
  const prop = scene.locator(".play-prop").first();
  await expect(prop).toHaveCount(1);
  expect(await prop.evaluate((el) => getComputedStyle(el).animationName)).toBe("none");
  // With motion: one short animation, inside the prop's own box, and the drawing where it was when it is over.
  await page.emulateMedia({ reducedMotion: "no-preference" });
  await page.reload();
  await play();
  await expect(scene).toBeVisible();
  const art = scene.locator(".play-scene-art");
  const before = (await art.boundingBox())!;
  const style = await prop.evaluate((el) => { const cs = getComputedStyle(el); return { name: cs.animationName, duration: parseFloat(cs.animationDuration), count: cs.animationIterationCount }; });
  expect(style.name).not.toBe("none");
  expect(style.duration).toBeLessThanOrEqual(0.7);
  expect(style.count).toBe("1");
  await page.waitForTimeout(1000);
  const after = (await art.boundingBox())!;
  // The drawing's size and its place in the flow are what the prop must not disturb; the page's
  // own scrollbar arriving shifts x by its width and is not the prop's doing.
  expect(after.width).toBeCloseTo(before.width, 0);
  expect(after.height).toBeCloseTo(before.height, 0);
  expect(after.y).toBeCloseTo(before.y, 0);
  expect(await prop.evaluate((el) => getComputedStyle(el).opacity)).toBe("1");
});

test("Play P6: the exercise run's bean is drawn fit", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach?module=exercise");
  await page.getByRole("button", { name: "Tap to play" }).click();
  await expect(page.locator('.play-scene .bean[data-look="fit"]')).toHaveCount(1);
});

test("My Manual (PRD §27): written by the person, kept on the device, suggestions offered and never inserted", async ({ page }) => {
  await page.goto("/manual");
  await expect(page.getByRole("heading", { name: "How I work, in my own words." })).toBeVisible();
  // Empty to start: nothing written for the person, nothing to copy.
  await expect(page.getByRole("textbox", { name: "What helps me" })).toHaveValue("");
  await expect(page.getByRole("button", { name: /Copy as text/ })).toBeDisabled();
  await page.getByRole("textbox", { name: "What helps me" }).fill("A clear first step");
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "What helps me" })).toHaveValue("A clear first step");
  await expect(page.getByRole("button", { name: /Copy as text/ })).toBeEnabled();
  // A strategy that helped becomes a suggestion, and only a tap makes it text.
  await page.evaluate((k) => {
    const r = JSON.parse(localStorage.getItem(k) ?? "{}");
    r.onboarding = { stage: "think-so", hardest: ["starting"], impact: 7, improveFirst: "start-earlier", completedAt: new Date().toISOString() };
    r.experiments = [{ moduleId: "starting", strategyId: "first-physical-action", acceptedAt: new Date().toISOString(), outcome: "a-lot", outcomeAt: new Date().toISOString() }];
    localStorage.setItem(k, JSON.stringify(r));
  }, MODEL_KEY);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "What helps me" })).toHaveValue("A clear first step");
  await page.getByRole("group", { name: "Suggestions for what helps me" }).getByRole("button", { name: /The first physical action/ }).click();
  await expect(page.getByRole("textbox", { name: "What helps me" })).toHaveValue("A clear first step\nThe first physical action");
  expect(page.url()).not.toMatch(/first|step|starting/);
  // Reachable from My ADHD, and the tab claims it.
  await page.goto("/my-adhd");
  await page.getByRole("link", { name: "Open my manual" }).click();
  await expect(page).toHaveURL(/\/manual$/);
});

test("Support-person sharing (PRD §46): a run's link carries the module id and nothing about the person", async ({ page, context }) => {
  test.skip(test.info().project.name !== "chromium", "clipboard permissions are Chromium-only in Playwright");
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
  // §14: the share sits on the run's last card. Resume the run there via the device's cursor.
  const last = runStepCount(RUNS.find((r) => r.id === "starting")!) - 1;
  await page.goto("/approach");
  await page.evaluate(([k, step]) => localStorage.setItem(k as string, JSON.stringify({ v: 1, moduleId: "starting", step })), [CURSOR_KEY, last] as const);
  await page.goto("/approach?module=starting");
  await page.getByRole("button", { name: "Share this run" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/\/approach\?module=starting$/);
  await expect(page.getByText("Nothing about you is in the link")).toBeVisible();
});

test("Medication experience (PRD §47): described in the person's words, kept on the device, never advised on", async ({ page }) => {
  await page.goto("/medication");
  await expect(page.getByRole("heading", { name: "Medication, in your words." })).toBeVisible();
  await expect(page.getByRole("button", { name: /Copy as text/ })).toBeDisabled();
  await page.getByRole("textbox", { name: "What it seems to change" }).fill("Starting is easier before lunch");
  await page.waitForTimeout(600);
  await page.reload();
  await expect(page.getByRole("textbox", { name: "What it seems to change" })).toHaveValue("Starting is easier before lunch");
  await expect(page.getByRole("button", { name: /Copy as text/ })).toBeEnabled();
  const body = await page.locator("main, body").first().innerText();
  expect(body).not.toMatch(/\b(dose|dosage|mg)\b/i);
  expect(page.url()).not.toMatch(/lunch|easier/);
});

test("Adjustments on paper (PRD §45): the need's track leads, the other is one tap away, and My ADHD links it", async ({ page }) => {
  await page.goto("/adjustments");
  await expect(page.getByRole("heading", { name: "Most of it already exists." })).toBeVisible();
  // Nothing known: university leads, the track fewer people know exists.
  await expect(page.getByRole("tab", { name: "University and TAFE" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Extra time, quieter exam room");
  await page.getByRole("tab", { name: "Work" }).click();
  await expect(page.getByRole("tab", { name: "Work" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel")).toContainText("Flexible start times");
  await expect(page.locator(".profession-card.is-first")).toContainText("Occupational therapist");
  // A record whose top need is a workplace one leads with work.
  await page.evaluate((k) => {
    localStorage.setItem(k, JSON.stringify({
      v: 1, onboarding: { improveFirst: "reduce-work-overwhelm", impact: 8, affects: "work", completedAt: new Date().toISOString() },
      resonance: {}, answers: {}, insights: {}, experiments: [], reflections: [], safety: [], completed: [], survey: { day: "", answeredToday: 0, abandons: [], lastLongAt: null },
    }));
  }, MODEL_KEY);
  await page.reload();
  await expect(page.getByRole("tab", { name: "Work" })).toHaveAttribute("aria-selected", "true");
  expect(page.url()).not.toMatch(/work|overwhelm/);
  // The support path carries the step for an institutional need.
  await page.goto("/support");
  await expect(page.getByRole("heading", { name: "Adjustments on paper" })).toBeVisible();
  await page.goto("/my-adhd");
  await page.getByRole("link", { name: "See what is commonly available" }).click();
  await expect(page).toHaveURL(/\/adjustments$/);
});

test("Reflection interpretation (PRD §29): a reading is offered in the person's own words, and only a yes enters the model", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach?module=perfectionism");
  await playToReflect(page);
  await page.locator(".reflect-field textarea").fill("I hadn't slept and the brief was vague");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  const reading = page.getByRole("group", { name: "It sounds like two things were part of it." });
  await expect(reading).toBeVisible();
  expect(page.url()).not.toMatch(/slept|vague|brief/);
  await reading.getByRole("button", { name: "Short on sleep" }).click();
  // On to the try beat; the model holds the reading, not the text.
  await expect(page.locator(".play-run[data-phase=\"try\"]")).toBeVisible();
  const held = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}").interpretations, MODEL_KEY);
  expect(held).toHaveLength(1);
  expect(held[0]).toMatchObject({ moduleId: "perfectionism", subdomain: "sleep", note: "Short on sleep" });
  expect(JSON.stringify(held)).not.toMatch(/vague|brief/);
  // A reflection the lexicon cannot read goes straight on, with nothing offered. (Fresh device: the
  // run would otherwise resume where it left off.)
  await page.evaluate(() => localStorage.clear());
  await page.goto("/approach?module=perfectionism");
  await playToReflect(page);
  await page.locator(".reflect-field textarea").fill("It went fine, actually.");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".play-run[data-phase=\"try\"]")).toBeVisible();
  await expect(page.locator(".play-reading")).toHaveCount(0);
});

test("Play P7 (founder): a clue on the scene makes the hit inferable, and after the result the round asks how much it was you, buttons, then a slider", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach?module=starting");
  await page.getByRole("button", { name: "Tap to play" }).click();
  // Round 1 (dont-tap) has no right answer to infer, so no clue; its relate beat is the buttons.
  await expect(page.locator(".play-clue")).toHaveCount(0);
  await page.getByRole("button", { name: "I held off" }).click();
  const relate = page.getByRole("group", { name: "How much is this you?" });
  await expect(relate).toBeVisible();
  await relate.getByRole("button", { name: "Very me" }).click();
  await expect(relate.getByRole("button", { name: "Very me" })).toHaveAttribute("aria-pressed", "true");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 2 (order) has a right order, so the clue says which; its relate beat is the slider.
  await expect(page.locator(".play-clue")).toContainText("Opening a file is smaller");
  for (const step of ["Open the file", "Type the title", "Write one bad sentence"]) await page.getByRole("button", { name: step }).click();
  const slider = page.getByRole("slider", { name: "How much is this you?" });
  await expect(slider).toBeVisible();
  await slider.focus();
  await page.keyboard.press("End");
  await expect(slider).toHaveAttribute("aria-valuetext", /10 out of 10, very me/);
  const held = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}").relates, MODEL_KEY);
  expect(held.starting).toEqual({ coffee: 10, "first-move": 10 });
  expect(page.url()).not.toMatch(/relate|very/);
});
