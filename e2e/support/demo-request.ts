// The finder, arrived at fresh, and the request the ranking specs search with.
//
// U8: the finder's stages live in history entries, and a reload resumes the entry it is on. A
// `goto` to the URL the tab is already showing IS a reload to Chromium — the entry and its state
// survive — so a spec that walks to a profile and then calls this again would land back on that
// profile, not the welcome screen. Leaving first makes the second visit what it claims to be: a
// fresh arrival at the finder, on a new entry, from somewhere else.
import { careArchetypes } from "../../src/demo/care-archetypes";
import { expect, type Page } from "@playwright/test";

export async function gotoFinder(page: Page, place?: string): Promise<void> {
  if (new URL(page.url(), "http://e2e").pathname === "/") await page.goto("about:blank");
  // O237: a place is carried by the link (the one thing a finder URL learns) or set on the
  // profile; the results screen no longer has a field for it.
  await page.goto(place ? `/?place=${encodeURIComponent(place)}` : "/");
}

/**
 * The request the ranking specs search with: the first long example on /examples, which the
 * finder's old scenarios stage used to offer as "Search with this". Typed now, since the stage is
 * gone (docs/design/ux-evaluation-2026-09/PLAN.md W6b), so every spec keeps the same request.
 */
export const DEMO_REQUEST = careArchetypes[0]!.request;

/** Type the demo request into the finder's box and search. */
export async function searchDemoRequest(page: Page): Promise<void> {
  await page.getByRole("textbox").fill(DEMO_REQUEST);
  await page.keyboard.press("Enter");
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}

/** A fresh arrival, on into the demo request's results — the shape most ranking specs use. */
export async function demoResults(page: Page, place?: string): Promise<void> {
  await gotoFinder(page, place);
  await searchDemoRequest(page);
}
