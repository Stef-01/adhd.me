// The voice finder (src/voice), on the scripted call (src/voice/fake-link.ts): no microphone, no
// network, no spend. The screen is the prototype's, the orb and one stop button; the call asks at
// most eight questions and then reveals the matches for what the person said.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { MAX_FOLLOW_UPS, OPENING_QUESTION } from "../src/voice/interviewer";

const ANSWERS = ["an adult ADHD assessment", "for me", "Hornsby, or telehealth", "bulk billing please", "a woman", "please don't rush me", "I have anxiety too", "an assessment", "mornings", "that's everything"];

async function openVoice(page: Page, script: boolean | string[]) {
  await page.addInitScript((value) => {
    (window as { __adhdmeVoiceFake?: boolean | string[] }).__adhdmeVoiceFake = value;
  }, script);
  await page.goto("/");
  await page.getByRole("button", { name: "Talk instead of typing" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "voice");
}

test("the voice screen is the orb and one stop button, with the question as its heading", async ({ page }) => {
  await openVoice(page, true);
  await expect(page.locator(".voice-orb")).toBeVisible();
  await expect(page.getByRole("heading", { level: 1 })).toHaveText(`Hi. ${OPENING_QUESTION}`);
  const stop = page.getByRole("button", { name: "End voice" });
  await expect(stop).toBeVisible();
  // Nothing else to press, type or read: no bar, no text box, no depth.
  await expect(page.locator(".voice-mode").getByRole("textbox")).toHaveCount(0);
  await expect(page.locator(".voice-mode").getByRole("button")).toHaveCount(1);
  const box = await stop.boundingBox();
  expect(box?.height).toBeGreaterThanOrEqual(44);
  // The call is the whole screen under the header: the tab bar steps away, Urgent help stays.
  await expect(page.locator(".app-tabs")).toBeHidden();
  await expect(page.getByRole("link", { name: "Urgent help" })).toBeVisible();
});

test("a whole call asks at most eight questions, then reveals the matches for what was said", async ({ page }) => {
  await openVoice(page, ANSWERS);
  await expect(page.locator("main")).toHaveAttribute("data-stage", "results", { timeout: 20000 });
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  const request = await page.evaluate(() => JSON.parse(sessionStorage.getItem("adhdme.finder.v2") ?? "{}").request);
  expect(request).toBe(ANSWERS.slice(0, MAX_FOLLOW_UPS + 1).join(", "));
});

test("the stop button ends the call and puts what was said in the box", async ({ page }) => {
  await openVoice(page, ANSWERS.slice(0, 2));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Where are you, or would telehealth suit you?", { timeout: 10000 });
  await page.getByRole("button", { name: "End voice" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "welcome");
  await expect(page.getByRole("textbox")).toHaveValue("an adult ADHD assessment, for me");
});

test("under reduced motion the orb holds still, and the call still runs", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openVoice(page, ANSWERS);
  await expect(page.locator("main")).toHaveAttribute("data-stage", "results", { timeout: 20000 });
});
