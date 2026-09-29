// The voice finder (src/voice), on the scripted call (src/voice/fake-link.ts): no microphone, no
// network, no spend. The screen is the prototype's, the orb and one stop button; the call asks at
// most eight questions and then reveals the matches for what the person said.

import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
import { MAX_FOLLOW_UPS, OPENING_QUESTION } from "../src/voice/interviewer";

// Answers to the scripted call's questions (src/voice/fake-link.ts), none a bare yes or no, so the request is their join.
const ANSWERS = ["an adult ADHD assessment", "Hornsby, or telehealth", "someone who has ADHD themselves would be good", "Hindi would help", "I have anxiety too", "an assessment", "mornings", "nothing that comes to mind", "that's everything", "nothing more"];

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
  // Each answer is its own sentence in the request (stage 2 of docs/matching/RCA-NIGHT-2026-09-29.md).
  expect(request).toBe(ANSWERS.slice(0, MAX_FOLLOW_UPS + 1).join(". "));
});

test("the stop button ends the call and puts what was said in the box", async ({ page }) => {
  await openVoice(page, ANSWERS.slice(0, 2));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Would you like someone who has ADHD themselves?", { timeout: 10000 });
  await page.getByRole("button", { name: "End voice" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "welcome");
  await expect(page.getByRole("textbox")).toHaveValue("an adult ADHD assessment, Hornsby, or telehealth");
});

/** Every record the page sent to the finder's journal, in order. */
async function journal(page: Page) {
  const posts: { type: string; record: Record<string, unknown> }[] = [];
  await page.route("**/api/finder/track", async (route) => {
    posts.push(JSON.parse(route.request().postData() ?? "{}"));
    await route.fulfill({ status: 204, body: "" });
  });
  return () => posts.filter((post) => post.type === "voice").map((post) => post.record);
}

test("a call is on record turn by turn under one id, and its end fills the same row (stage 5)", async ({ page }) => {
  const calls = await journal(page);
  await openVoice(page, ANSWERS);
  await expect(page.locator("main")).toHaveAttribute("data-stage", "results", { timeout: 20000 });
  await expect.poll(() => calls().at(-1)?.outcome, { timeout: 10000 }).toBe("revealed");
  const sent = calls();
  expect(sent.length).toBeGreaterThan(2);
  expect(new Set(sent.map((call) => call.id)).size, "one row for the whole call").toBe(1);
  for (const call of sent.slice(0, -1)) expect(call.outcome).toBe("stopped");
  expect((sent[0]!.turns as unknown[]).length).toBeLessThan((sent.at(-1)!.turns as unknown[]).length);
  expect(sent.at(-1)!.searchId, "the end names its search").toBeTruthy();
  expect(sent.at(-1)!.request).toBe(ANSWERS.slice(0, MAX_FOLLOW_UPS + 1).join(". "));
  // O260: the card prints the first twenty words of the nine answers, and the rest live behind "Change what you said".
  const card = (await page.locator(".results-summary-text").textContent()) ?? "";
  expect(card.endsWith("…")).toBe(true);
  expect(card.split(/\s+/).length).toBeLessThanOrEqual(21);
});

test("a call stopped in the middle keeps every turn said so far (stage 5)", async ({ page }) => {
  const calls = await journal(page);
  await openVoice(page, ANSWERS.slice(0, 2));
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Would you like someone who has ADHD themselves?", { timeout: 10000 });
  await expect.poll(() => calls().length).toBeGreaterThan(0);
  await page.getByRole("button", { name: "End voice" }).click();
  await expect(page.locator("main")).toHaveAttribute("data-stage", "welcome");
  await expect.poll(() => calls().at(-1)?.outcome, { timeout: 10000 }).toBe("stopped");
  const sent = calls();
  expect(new Set(sent.map((call) => call.id)).size).toBe(1);
  const turns = sent.at(-1)!.turns as { who: string; text: string }[];
  expect(turns.filter((turn) => turn.who === "person").map((turn) => turn.text)).toEqual(ANSWERS.slice(0, 2));
});

test("under reduced motion the orb holds still, and the call still runs", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openVoice(page, ANSWERS);
  await expect(page.locator("main")).toHaveAttribute("data-stage", "results", { timeout: 20000 });
});

/** The animations running on the orb's drawing: the float, or nothing. */
const floating = (page: Page) => () =>
  page.locator(".voice-orb-canvas, .voice-orb-still").first().evaluate((el) => el.getAnimations().map((a) => (a as CSSAnimation).animationName));

test("live, the orb floats over its shadow", async ({ page }) => {
  await openVoice(page, true);
  await expect(page.locator('.voice-orb[data-phase="live"]')).toBeVisible();
  await expect.poll(floating(page)).toEqual(["voice-float"]);
});

test("under reduced motion the orb rests on its shadow", async ({ page }) => {
  await page.emulateMedia({ reducedMotion: "reduce" });
  await openVoice(page, true);
  await expect(page.locator('.voice-orb[data-phase="live"]')).toHaveAttribute("data-still", "");
  await expect.poll(floating(page)).toEqual([]);
});

/** The frame the orb has just drawn: the share of its canvas the sphere covers, and a sum of its colour. */
const drawn = (page: Page) =>
  page.locator(".voice-orb-canvas").evaluate(
    (canvas: HTMLCanvasElement) =>
      new Promise<{ cover: number; colour: number }>((resolve) =>
        // Called after the orb's own frame and before the browser presents it, so the pixels are there.
        requestAnimationFrame(() => {
          const gl = canvas.getContext("webgl2")!;
          const pixels = new Uint8Array(canvas.width * canvas.height * 4);
          gl.readPixels(0, 0, canvas.width, canvas.height, gl.RGBA, gl.UNSIGNED_BYTE, pixels);
          let cover = 0;
          let colour = 0;
          for (let i = 0; i < pixels.length; i += 4) {
            if (pixels[i + 3]! > 127) cover += 1;
            colour += pixels[i]! + pixels[i + 1]! + pixels[i + 2]!;
          }
          resolve({ cover: cover / (canvas.width * canvas.height), colour });
        }),
      ),
  );

test("the orb flows while nobody speaks, and swells with either voice", async ({ page }) => {
  await openVoice(page, true);
  await expect(page.locator('.voice-orb[data-phase="live"]')).toBeVisible();
  // Drawn exactly when the engine can: the sphere with WebGL2, and a still disc without it.
  if (!(await page.evaluate(() => Boolean(document.createElement("canvas").getContext("webgl2"))))) {
    await expect(page.locator(".voice-orb-still")).toBeVisible();
    return;
  }
  const quiet = await drawn(page);
  expect(quiet.cover).toBeGreaterThan(0.15);
  await expect.poll(async () => (await drawn(page)).colour).not.toBe(quiet.colour);
  const play = (level: { input: number; output: number }) =>
    page.evaluate((value) => {
      (window as { __adhdmeVoiceLevel?: { input: number; output: number } }).__adhdmeVoiceLevel = value;
    }, level);
  for (const voice of [{ input: 0.8, output: 0 }, { input: 0, output: 0.8 }]) {
    await play(voice);
    await expect.poll(async () => (await drawn(page)).cover).toBeGreaterThan(quiet.cover * 1.4);
    await play({ input: 0, output: 0 });
    await expect.poll(async () => (await drawn(page)).cover, { timeout: 10000 }).toBeLessThan(quiet.cover * 1.15);
  }
});
