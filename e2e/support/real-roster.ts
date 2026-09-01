// O226: the example roster ships ON (founder decision `synthetic-roster-tickbox`, amended), so a
// spec that asserts a REAL-roster ranking law — "Dr Anusha Saxena ranks first for the woman-GP
// ask", "the two GPs tie" — switches the examples off at the door, exactly the way a person
// would: through the welcome screen's folded testing options. Through the UI, deliberately, so
// these specs also keep the switch itself honest; a spec that re-navigates after calling this
// remounts the finder and gets the default back, which is why the helper OWNS the goto.
import { expect, type Page } from "@playwright/test";

export async function gotoFinderRealRosterOnly(page: Page): Promise<void> {
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
