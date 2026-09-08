// The ADHD Life PRD's critical journeys (§69), in a browser: onboarding to a recommendation, a
// module writing to My ADHD, a rejected insight never persisting as confirmed, the safety response
// interrupting a module, the support path reaching matching providers, the care map opening from
// the Learn page, and the finder broadened beyond GPs.

import { expect, test } from "@playwright/test";

const MODEL_KEY = "adhdme.model.v1";

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
  await page.getByRole("button", { name: "Next", exact: true }).click();
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
  await expect(page.locator(".play-verdict")).toContainText("Cleared");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 2: order.
  for (const label of ["Open the file", "Type the title", "Write one bad sentence"]) await page.getByRole("button", { name: label }).click();
  await expect(page.locator(".play-verdict")).toContainText("Cleared");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 3: tap — a wrong answer is a beat, not a loss.
  await page.getByRole("button", { name: "Try harder" }).click();
  await expect(page.locator(".play-verdict")).toContainText("Not this time");
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
  await expect(page.locator(".play-verdict")).toContainText("Cleared");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 7: sort each cause into its layer.
  for (const [cause, layer] of [["A vague brief", "Environment"], ["Five hours’ sleep", "Body"], ["A manager who will judge it", "People"]] as const) {
    await page.getByRole("group", { name: "Causes" }).getByRole("button", { name: cause }).click();
    await page.getByRole("group", { name: "Layers" }).getByRole("button", { name: new RegExp(layer) }).click();
  }
  await expect(page.locator(".play-verdict")).toContainText("Cleared");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Round 8: pick your bean (writes an answer).
  await page.getByRole("button", { name: /Vague ones/ }).click();
  await page.getByRole("button", { name: "That’s me" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Recognition: Next is held until a frequency is given.
  await expect(page.getByRole("button", { name: "Next", exact: true })).toBeDisabled();
  await page.getByRole("group", { name: "How often" }).getByRole("button", { name: "Often" }).click();
  await page.getByRole("slider").fill("7");
  await page.getByRole("group", { name: "Want it easier" }).getByRole("button", { name: "Yes" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Insight: rejected.
  await expect(page.locator(".play-kicker")).toContainText(/rounds cleared/);
  await page.getByRole("button", { name: "Not really" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "I’ll try this" }).click();
  await expect(page.locator(".strategy-accepted")).toContainText("On your list");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "Finish" }).click();
  await expect(page.locator(".learning-completion")).toContainText("Your picture just got sharper");
  const record = await page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? "{}"), MODEL_KEY);
  expect(record.resonance?.starting?.frequency).toBe("often");
  expect(record.resonance?.starting?.cost).toBe(7);
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
  await expect(page.locator(".play-verdict")).toContainText("Cleared", { timeout: 12000 });
  // Auto-advance, then round two waits for a gesture.
  await expect(page.locator(".play-kicker")).toContainText("Round 2 of 8", { timeout: 4000 });
  await expect(page.getByRole("button", { name: "Open the file" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: /Nothing to walk from yet/ })).toBeVisible();
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
  await expect(page.locator(".play-clock")).toHaveCount(0);
  await page.getByRole("button", { name: "Tap to play" }).focus();
  await page.keyboard.press("Enter");
  await expect(page.locator(".play-kicker")).toContainText("Round 1 of 8");
  await page.getByRole("button", { name: "I have them" }).click();
  await page.getByRole("button", { name: /Reply, then keep walking/ }).click();
  for (const item of ["Milk", "The parcel", "Stamps", "Sam’s script"]) await page.getByRole("group", { name: "What was on the list" }).getByRole("button", { name: item }).click();
  await page.getByRole("button", { name: "Check" }).click();
  await expect(page.locator(".play-verdict")).toContainText("Cleared");
  await expect(page.locator(".play-result")).toContainText("All four");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await expect(page.locator(".play-kicker")).toContainText("Round 2 of 8");
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
  await page.getByRole("button", { name: /Very — I circle it/ }).click();
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
  await expect(first).toContainText(/Works on task initiation — the thing you said is hardest/);
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
  const balance = page.getByTestId("nwia-balance");
  await expect(balance).toContainText(/touches work, spiritual values, intellectual/);
  await expect(balance).toContainText(/Nothing yet on physical, social, emotional/);
  await expect(balance).toContainText(/unasked/);
});

test("Play P3: the cast wakes as runs are cleared — discovery, never a streak", async ({ page }) => {
  await page.goto("/approach");
  const cast = page.getByRole("list", { name: /Beans collected: 0 of 20/ });
  await expect(cast).toBeVisible();
  await expect(cast.locator("li.is-awake")).toHaveCount(0);
  await page.evaluate(() => localStorage.setItem("adhdme.learn.v1", JSON.stringify({ v: 1, done: ["starting", "sleep"] })));
  await page.reload();
  await expect(page.getByRole("list", { name: /Beans collected: 2 of 20/ })).toBeVisible();
  await expect(page.locator(".play-cast li.is-awake")).toHaveCount(2);
  await expect(page.locator(".play-cast li.is-awake").first()).toContainText("Maya");
});

test("Play P6: the catch and balance mechanics play by buttons under reduced motion, and a run is never mostly tapping", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.goto("/approach?module=eating");
  await page.getByRole("button", { name: "Tap to play" }).click();
  await page.getByRole("button", { name: "I held off" }).click();
  await page.getByRole("button", { name: "Next", exact: true }).click();
  await page.getByRole("button", { name: "At 3pm, shaky" }).click();
  await expect(page.locator(".play-verdict")).toContainText("Cleared");
  await page.getByRole("button", { name: "Next", exact: true }).click();
  // Catch, by buttons: keep the three no-cook foods, leave the decoys.
  const keep = page.getByRole("group", { name: "What to keep" });
  for (const item of ["Yoghurt", "Boiled eggs", "Nuts"]) await keep.getByRole("button", { name: item, exact: true }).click();
  await page.getByRole("button", { name: "Keep these" }).click();
  await expect(page.locator(".play-verdict")).toContainText("Cleared");
  await expect(page.locator(".play-result")).toContainText("no cooking");
  // Balance, by buttons, in the gut run.
  await page.goto("/approach?module=gut");
  await page.getByRole("button", { name: "Tap to play" }).click();
  await page.getByRole("button", { name: "A regular-ish meal" }).click();
  await expect(page.locator(".play-verdict")).toContainText("Cleared");
  await expect(page.locator(".play-result")).toContainText("plain routine");
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
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.goto("/approach?module=starting");
  await page.addInitScript(() => { Object.defineProperty(navigator, "share", { value: undefined, configurable: true }); });
  await page.getByRole("button", { name: "Share this run" }).click();
  await expect(page.getByRole("button", { name: "Link copied" })).toBeVisible();
  const text = await page.evaluate(() => navigator.clipboard.readText());
  expect(text).toMatch(/\/approach\?module=starting$/);
  await expect(page.getByText("Nothing about you is in the link")).toBeVisible();
});

test("Medication experience (PRD §47): described in the person's words, kept on the device, never advised on", async ({ page }) => {
  await page.goto("/medication");
  await expect(page.getByRole("heading", { name: "What it changes, what it leaves, in your words." })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Most of it exists. Most people are never told." })).toBeVisible();
  // Nothing known: university leads, the track fewer people know exists.
  await expect(page.getByRole("tab", { name: "University and TAFE" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Study adjustments" })).toBeVisible();
  await page.getByRole("tab", { name: "Work" }).click();
  await expect(page.getByRole("heading", { name: "Workplace adjustments" })).toBeVisible();
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
  await expect(reading).toContainText("Only what you say yes to goes into your picture");
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
