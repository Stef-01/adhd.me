// O226: the example roster ships ON (founder decision `synthetic-roster-tickbox`, amended), so a
// spec that asserts a REAL-roster ranking law — "Dr Anusha Saxena ranks first for the woman-GP
// ask", "the two GPs tie" — switches the examples off at the door, exactly the way a person
// would: through the settings sheet the header opens. Through the UI, deliberately, so these
// specs also keep the switch itself honest; a spec that re-navigates after calling this remounts
// the finder and gets the default back, which is why the helper OWNS the goto.
//
// O230: the finder is `/` now, and the options are a bottom sheet rather than a `<details>`. The
// helper still walks the same door in the same order — open, uncheck — so what these specs prove
// about the switch is unchanged; only the container it lives in moved.
//
// U8: the finder's stages live in history entries, and a reload resumes the entry it is on. A
// `goto` to the URL the tab is already showing IS a reload to Chromium — the entry and its state
// survive — so a spec that walks to a profile and then calls this again would land back on that
// profile, not the welcome screen. Leaving first makes the second visit what it claims to be: a
// fresh arrival at the finder, on a new entry, from somewhere else.
import { expect, type Page } from "@playwright/test";

export async function gotoFinderRealRosterOnly(page: Page, place?: string): Promise<void> {
  if (new URL(page.url(), "http://e2e").pathname === "/") await page.goto("about:blank");
  // O237: a place is carried by the link (the one thing a finder URL learns) or set on the
  // profile; the results screen no longer has a field for it.
  await page.goto(place ? `/?place=${encodeURIComponent(place)}` : "/");
  await page.getByRole("button", { name: "Settings" }).click();
  await expect(page.getByRole("dialog", { name: "Settings" })).toBeVisible();
  await page.locator(".finder-demo-toggle input").uncheck();
  // A sheet is modal: it has to be dismissed before the welcome screen is operable again, and
  // Escape is the dismissal every spec after this one depends on working.
  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog", { name: "Settings" })).toHaveCount(0);
}

/** The same door, walked on into the demo scenario's results — the shape most ranking specs use. */
export async function demoResultsRealRosterOnly(page: Page, place?: string): Promise<void> {
  await gotoFinderRealRosterOnly(page, place);
  await page.getByRole("button", { name: "Try an example search" }).click();
  await page.getByRole("button", { name: "Search with this" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}
