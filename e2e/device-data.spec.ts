// What this browser holds, end to end: the map says where it lives, a copy carries it to another
// browser, and one delete removes every answer while keeping preferences and the consent choice.

import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";
import { test } from "./support/test";
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LIVED_RECORD } from "../scripts/text-budget-lib.mjs";

const MODEL_KEY = "adhdme.model.v1";
const LIVES_KEY = "adhdme.lives.v1";
const GOALS = { v: 1, savedStrategyIds: [], completedModuleIds: [], startedModuleIds: [], dismissedStrategyIds: [], resonanceSignals: [], selectedGoals: ["task_initiation", "sleep"], personalStrategies: [], saved: [], highScore: 0, completedAt: {} };
const ANSWER_KEYS = [MODEL_KEY, LIVES_KEY, "adhdme.learn.v1", "adhdme.learn.cursor.v1", "adhdme.learn.pane.v1", "adhdme.filters.v3"];
const SESSION_KEYS = ["adhdme.finder.v4", "adhdme.match.v1", "adhdme.match.view.v1"];
const KEPT_KEYS = ["adhdme.sound", "adhdme.lives.large", "adhdme.play.tutored", "adhdme-privacy-ack"];

async function seed(page: Page, items: Record<string, string>, session: Record<string, string> = {}): Promise<void> {
  await page.goto("/my-adhd");
  await page.evaluate(([local, sess]) => {
    for (const [k, v] of Object.entries(local)) localStorage.setItem(k, v);
    for (const [k, v] of Object.entries(sess)) sessionStorage.setItem(k, v);
  }, [items, session] as const);
  await page.reload();
}

async function openSettings(page: Page) {
  await page.getByRole("button", { name: "Settings" }).first().click();
  const sheet = page.getByRole("dialog");
  await expect(sheet).toBeVisible();
  return sheet;
}

test("the map says where it is saved", async ({ page }) => {
  await seed(page, { [MODEL_KEY]: JSON.stringify(LIVED_RECORD) });
  await expect(page.getByText("Saved on this device.")).toBeVisible();
});

test("a copy carries the map and the goals to an empty browser and back", async ({ page }) => {
  await seed(page, { [MODEL_KEY]: JSON.stringify(LIVED_RECORD), [LIVES_KEY]: JSON.stringify(GOALS) });
  const before = await page.evaluate(([m, l]) => [localStorage.getItem(m!), localStorage.getItem(l!)], [MODEL_KEY, LIVES_KEY]);

  let sheet = await openSettings(page);
  const [download] = await Promise.all([page.waitForEvent("download"), sheet.getByRole("button", { name: /^Save a copy/ }).click()]);
  expect(download.suggestedFilename()).toMatch(/^adhdme-backup-\d{4}-\d{2}-\d{2}\.json$/);
  const file = await download.path();

  await sheet.getByRole("button", { name: /^Delete/ }).click();
  await sheet.getByRole("button", { name: "Yes, delete it" }).click();
  await expect(sheet.getByText("Deleted from this browser.")).toBeVisible();
  expect(await page.evaluate((k) => localStorage.getItem(k), MODEL_KEY)).toBeNull();

  await sheet.getByTestId("restore-file").setInputFiles(file);
  await expect(sheet.getByText("Replace what is on this device?")).toBeVisible();
  await sheet.getByRole("button", { name: "Replace" }).click();
  await expect(sheet.getByText("Restored.")).toBeVisible();

  const after = await page.evaluate(([m, l]) => [localStorage.getItem(m!), localStorage.getItem(l!)], [MODEL_KEY, LIVES_KEY]);
  expect(JSON.parse(after[0]!)).toEqual(JSON.parse(before[0]!));
  expect(JSON.parse(after[1]!).selectedGoals).toEqual(GOALS.selectedGoals);
  expect(JSON.parse(readFileSync(file, "utf8")).schema).toBe(1);
});

test("a file that is not a copy is refused, and nothing changes", async ({ page }) => {
  await seed(page, { [MODEL_KEY]: JSON.stringify(LIVED_RECORD) });
  const before = await page.evaluate((k) => localStorage.getItem(k), MODEL_KEY);
  const sheet = await openSettings(page);
  await sheet.getByTestId("restore-file").setInputFiles({ name: "notes.json", mimeType: "application/json", buffer: Buffer.from('{"schema":1,"model":"nope"}') });
  await expect(sheet.getByText("That file isn't a copy from here. Nothing changed.")).toBeVisible();
  await expect(sheet.getByRole("button", { name: "Replace" })).toHaveCount(0);
  expect(await page.evaluate((k) => localStorage.getItem(k), MODEL_KEY)).toBe(before);
});

test("an empty browser can restore, and has nothing to save or delete", async ({ page }) => {
  await page.goto("/my-adhd");
  const sheet = await openSettings(page);
  await expect(sheet.getByText("Restore a copy")).toBeVisible();
  await expect(sheet.getByText("Save a copy")).toHaveCount(0);
  await expect(sheet.getByText("Your data")).toHaveCount(0);
});

test("delete shows for Lives alone, removes every answer, and keeps preferences", async ({ page }) => {
  const local = Object.fromEntries([...ANSWER_KEYS, ...KEPT_KEYS].map((k) => [k, k === LIVES_KEY ? JSON.stringify(GOALS) : "1"]));
  await seed(page, { [LIVES_KEY]: JSON.stringify(GOALS) });
  const sheet = await openSettings(page);
  await expect(sheet.getByText("Your data"), "Lives data alone is data").toBeVisible();
  await page.evaluate(([l, s]) => {
    for (const [k, v] of Object.entries(l)) localStorage.setItem(k, v);
    for (const k of s) sessionStorage.setItem(k, "1");
  }, [local, SESSION_KEYS] as const);
  await sheet.getByRole("button", { name: /^Delete/ }).click();
  await sheet.getByRole("button", { name: "Yes, delete it" }).click();
  const left = await page.evaluate(() => ({ local: Object.keys(localStorage).sort(), session: Object.keys(sessionStorage).filter((k) => k.startsWith("adhdme")).sort() }));
  for (const key of ANSWER_KEYS) expect(left.local, key).not.toContain(key);
  for (const key of KEPT_KEYS) expect(left.local, key).toContain(key);
  expect(left.session).toEqual([]);
});
