// O226: the example roster ships ON (founder decision `synthetic-roster-tickbox`, amended), so a
// spec that asserts a REAL-roster ranking law — "Dr Anusha Saxena ranks first for the woman-GP
// ask", "the two GPs tie" — switches the examples off at the door, exactly the way a person
// would: through the welcome screen's folded testing options. Through the UI, deliberately, so
// these specs also keep the switch itself honest; a spec that re-navigates after calling this
// remounts the finder and gets the default back, which is why the helper OWNS the goto.
//
// U8: the finder's stages live in history entries, and a reload resumes the entry it is on. A
// `goto` to the URL the tab is already showing IS a reload to Chromium — the entry and its state
// survive — so a spec that walks to a profile and then calls this again would land back on that
// profile, not the welcome screen. Leaving first makes the second visit what it claims to be: a
// fresh arrival at the finder, on a new entry, from somewhere else.
import { expect, type Page } from "@playwright/test";

export async function gotoFinderRealRosterOnly(page: Page): Promise<void> {
  if (new URL(page.url(), "http://e2e").pathname === "/finder") await page.goto("about:blank");
  await page.goto("/finder");
  await page.locator(".finder-demo-tools summary").click();
  await page.locator(".finder-demo-toggle input").uncheck();
}

/** The same door, walked on into the demo scenario's results — the shape most ranking specs use. */
export async function demoResultsRealRosterOnly(page: Page): Promise<void> {
  await gotoFinderRealRosterOnly(page);
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}
