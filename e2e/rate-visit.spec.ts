// The stars after a visit (app/finder-stages/rate-visit.tsx): a tap on "Book" is remembered, a day
// later the home screen asks once, one tap on a star is the answer, a note may follow, and "Not
// yet" puts the question away. Nothing about it is shown anywhere else.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { clinicians } from "../src/demo/clinicians";

const who = clinicians[0]!;
const HANDOFF = "11111111-1111-4111-8111-111111111111";
const QUESTION = `How was your visit with ${who.name}?`;

async function seedDueVisit(page: Page) {
  await page.addInitScript(({ id, name, handoffId }) => {
    if (localStorage.getItem("adhdme.visits") === null) {
      const at = Date.now() - 2 * 24 * 60 * 60 * 1000;
      localStorage.setItem("adhdme.visits", JSON.stringify([{ handoffId, clinicianId: id, name, at, asked: ["pref:woman-gp"], met: ["pref:woman-gp"], asks: 0, nextAt: at + 20 * 60 * 60 * 1000 }]));
    }
  }, { id: who.id, name: who.name, handoffId: HANDOFF });
}

test("a visit a day old is asked about once; one star tap is the answer and a note may follow", async ({ page }) => {
  await seedDueVisit(page);
  await page.goto("/");
  const card = page.getByRole("region", { name: QUESTION });
  await expect(card).toBeVisible();
  const stars = card.getByRole("button", { name: /star/ });
  await expect(stars).toHaveCount(5);
  for (const star of await stars.all()) expect((await star.boundingBox())!.height).toBeGreaterThanOrEqual(44);

  const first = page.waitForRequest((r) => r.url().endsWith("/api/ratings") && r.method() === "POST");
  await card.getByRole("button", { name: "4 stars" }).click();
  expect((await first).postDataJSON()).toMatchObject({ handoffId: HANDOFF, clinicianId: who.id, stars: 4, asked: ["pref:woman-gp"], met: ["pref:woman-gp"] });
  await expect(page.getByRole("status").filter({ hasText: "Thanks." })).toBeVisible();

  const second = page.waitForRequest((r) => r.url().endsWith("/api/ratings") && r.method() === "POST");
  await page.getByRole("textbox", { name: "Anything to add" }).fill("She listened properly.");
  await page.keyboard.press("Enter");
  expect((await second).postDataJSON()).toMatchObject({ handoffId: HANDOFF, stars: 4, feedback: "She listened properly." });
  await expect(card).toBeHidden();

  await page.reload();
  await expect(page.getByRole("region", { name: QUESTION })).toBeHidden();
});

test("'Not yet' puts the question away", async ({ page }) => {
  await seedDueVisit(page);
  await page.goto("/");
  await page.getByRole("region", { name: QUESTION }).getByRole("button", { name: "Not yet" }).click();
  await expect(page.getByRole("region", { name: QUESTION })).toBeHidden();
  await page.reload();
  await expect(page.getByRole("region", { name: QUESTION })).toBeHidden();
});

test("the tap on Book is remembered for a visit, and not asked about the same day", async ({ page, context }) => {
  await context.route("**/go/**", (route) => route.fulfill({ status: 200, body: "practice" }));
  await page.goto("/");
  await page.getByRole("textbox").fill("an adult ADHD assessment, telehealth");
  await page.keyboard.press("Enter");
  await page.locator(".clinician-list").waitFor();
  await page.locator(".clinician-row").first().click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "profile");
  const booked = (await page.getByRole("heading", { level: 1 }).textContent())?.trim() ?? "";
  await page.locator(".profile-screen .primary-button").first().click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "booking");
  const popup = page.waitForEvent("popup");
  await page.locator(".booking-screen a.primary-button").click();
  await (await popup).close();
  const visits = await page.evaluate(() => JSON.parse(localStorage.getItem("adhdme.visits") ?? "[]"));
  expect(visits).toHaveLength(1);
  expect(visits[0].name).toBe(booked);
  await page.goto("/");
  await expect(page.locator(".rate-visit")).toHaveCount(0);
});
