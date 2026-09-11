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
  for (const text of await axes.allInnerTexts()) expect(text).toContain("Unasked");
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
  await expect(axis(page, "Cultural values")).toContainText("Unasked");

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

test("playing a run advances the axis that run is about, and the run says so", async ({ page }) => {
  // The loop, end to end and with nothing seeded: an empty map, a run played through the real UI,
  // the run's last card naming the axis it moved, and the map showing it moved. This is the whole
  // reason the map exists, so none of it is written into localStorage by the test.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.addInitScript(() => localStorage.setItem("adhdme.play.tutored", "1"));
  await page.goto("/my-map");
  await expect(axis(page, "Physical")).toContainText("Unasked");

  await page.goto("/approach?module=sleep");
  await page.getByRole("button", { name: "Tap to play" }).click();
  // Walk it by always taking the run's own forward control.
  for (let i = 0; i < 80; i++) {
    if (await page.locator(".play-map-moved").count()) break;
    const clicked = await page.evaluate(() => {
      const forward = [...document.querySelectorAll<HTMLElement>(".play-tempt.is-go:not([disabled]), .play-choice:not([disabled]), .play-card button:not([disabled])")]
        .filter((b) => { const r = b.getBoundingClientRect(); return r.width > 10 && r.height > 10; })
        .filter((b) => !/back|exit|leave|settings|urgent|share|copy/i.test(b.getAttribute("aria-label") || b.textContent || ""));
      if (!forward.length) return false;
      (forward.find((x) => x.classList.contains("is-go")) ?? forward[forward.length - 1]!).click();
      return true;
    });
    if (!clicked) break;
    await page.waitForTimeout(220);
  }

  // The run's last card names the axis it just moved. Without this the map could be advancing
  // silently, which is the half of the direction the map alone did not do.
  await expect(page.locator(".play-map-moved")).toHaveText("Your map: Physical");
  await page.getByRole("link", { name: /Your map: Physical/ }).click();
  await expect(page).toHaveURL(/\/my-map$/);
  await expect(axis(page, "Physical")).not.toContainText("Unasked");
  await expect(axis(page, "Cultural values"), "one run moves its own axis and no other").toContainText("Unasked");
});
