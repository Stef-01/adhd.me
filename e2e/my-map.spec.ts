// Your map: the shape moves because the person did something, and every rung is an act.
//
// The loop this proves is the one the map exists for — play a run, the axis it is about advances,
// and the dimension opens onto the kinds of care for that part of a life. It also holds the line
// the map is most at risk of crossing: a radar of a person is one adjective away from a score of
// one, so the axes carry WORDS and the page carries no number about anybody.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { expectNoViolations } from "./support/a11y";

const MODEL_KEY = "adhdme.model.v1";

/** A record of somebody who has been here: a run finished on sleep, a strategy that worked on starting. */
const LIVED = {
  v: 1,
  onboarding: { improveFirst: "start-earlier", impact: 8, lookingFor: "professional", completedAt: "2026-09-01T00:00:00.000Z" },
  resonance: { starting: { frequency: "often", cost: 8, priority: "yes", at: "2026-09-01T00:00:00.000Z" } },
  answers: {}, insights: {},
  experiments: [{ strategyId: "first-physical-action", moduleId: "starting", acceptedAt: "2026-09-01T00:00:00Z", outcome: "a-lot", outcomeAt: "2026-09-02T00:00:00Z" }],
  reflections: [], relates: {}, interpretations: [], safety: [], completed: ["sleep"],
  survey: { day: "", answeredToday: 0, abandons: [], lastLongAt: null }, surveys: {},
  manual: {}, medication: {}, checkpoints: [],
};

const axis = (page: Page, name: string) => page.getByRole("button", { name: new RegExp(`^${name}`) });

test("the map starts empty and honest, and says so without saying it about the person", async ({ page }) => {
  await page.goto("/my-map");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Your map.");
  // Nine axes, every one of them a word rather than a number.
  const axes = page.locator(".map-axis");
  await expect(axes).toHaveCount(9);
  for (const text of await axes.allInnerTexts()) expect(text).toContain("Not yet");
  await expect(page.locator(".map-open")).toContainText("Nothing yet. Not a gap, unasked.");
  // No number about anybody, anywhere on the page.
  const words = (await page.locator("main").innerText()).replace(/ADHD\.ME/g, "");
  expect(words, "a count of a person is the one thing this page is built not to be").not.toMatch(/\d/);
  await expectNoViolations(page, "Your map, empty");
});

test("the map moves because the person did something, and opens on what they built", async ({ page }) => {
  await page.goto("/my-map");
  await page.evaluate(([k, rec]) => localStorage.setItem(k!, rec!), [MODEL_KEY, JSON.stringify(LIVED)]);
  await page.reload();

  // A strategy that worked on a starting run puts Work and Intellectual at the top rung; a
  // finished sleep run puts Physical on "Explored"; the goal at the door names Spiritual values.
  await expect(axis(page, "Work")).toContainText("Working");
  await expect(axis(page, "Physical")).toContainText("Explored");
  await expect(axis(page, "Spiritual values")).toContainText("Named");
  await expect(axis(page, "Cultural values")).toContainText("Not yet");

  // It opens on the dimension furthest out — the first thing the map says is what you have built.
  await expect(page.locator(".map-open h2")).toHaveText(/Work|Intellectual/);
  await expect(page.locator(".map-open")).toContainText("You said a strategy here worked.");
  await expect(page.locator(".map-strength")).toContainText("What works here");
  await expectNoViolations(page, "Your map, lived in");
});

test("a dimension opens onto the kinds of care for that part of a life", async ({ page }) => {
  await page.goto("/my-map");
  await page.evaluate(([k, rec]) => localStorage.setItem(k!, rec!), [MODEL_KEY, JSON.stringify(LIVED)]);
  await page.reload();
  await axis(page, "Physical").click();
  await expect(page.locator(".map-open h2")).toHaveText("Physical");
  await page.getByRole("link", { name: /Who helps here/ }).click();
  await expect(page).toHaveURL(/\/$/);
  // Narrowed to the kinds Physical's own runs name — a sleep clinician among them, and not the
  // whole roster: a university support service is not what a body is about.
  const kinds = await page.evaluate(() => JSON.parse(localStorage.getItem("adhdme.filters.v1") ?? "{}").professions as string[]);
  expect(kinds).toContain("sleep-clinician");
  expect(kinds).toContain("exercise-physiologist");
  expect(kinds).not.toContain("university-support");
});

test("playing a run advances the axis that run is about", async ({ page }) => {
  // The loop, end to end and with nothing seeded: the map is empty, a run is played, and the axis
  // that run is about has moved. This is the whole reason the map exists, so it is walked through
  // the real UI rather than by writing a record.
  //
  // The rung it reaches is `named`: saying "yes, this happens to me" IS the act, and it is the one
  // a person reaches in the first minute. The rungs above it need a strategy kept and an outcome
  // recorded, which are days apart in real life and are covered by `src/wellness/map.test.ts`.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("adhdme.play.tutored", "1"));
  await page.goto("/my-map");
  await expect(axis(page, "Physical")).toContainText("Not yet");

  await page.goto("/approach?module=sleep");
  await page.getByRole("button", { name: "Tap to play" }).click();
  for (let i = 0; i < 24; i++) {
    const done = await page.evaluate(() => Boolean(JSON.parse(localStorage.getItem("adhdme.model.v1") ?? "{}").resonance?.sleep));
    if (done) break;
    const next = page.locator(".play-choice:enabled, .play-tempt:enabled, .play-card button:enabled").last();
    if (!(await next.count())) break;
    await next.click();
    await page.waitForTimeout(180);
  }
  // Without this the assertion below could pass because the run never ran, not because it did.
  expect(
    await page.evaluate(() => Boolean(JSON.parse(localStorage.getItem("adhdme.model.v1") ?? "{}").resonance?.sleep)),
    "the run has to actually record something, or this test proves nothing",
  ).toBe(true);

  await page.goto("/my-map");
  await expect(axis(page, "Physical")).toContainText("Named");
  await expect(axis(page, "Cultural values"), "one run moves its own axis and no other").toContainText("Not yet");
});
