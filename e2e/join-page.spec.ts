// O188 (founder-directed): the application form is retired — joining is one email. This spec
// pins the retirement in both directions: the email invitation is present, correct and usable,
// and the form is GONE — not hidden, not collapsed, absent. The second half exists because a
// "retired" surface that still renders is the disclosure-deletion shape (4b9c9ab/O184) pointed
// the other way: a decision reversed by nobody in particular.

import { expect, test } from "@playwright/test";
import { JOIN_EMAIL } from "../app/clinicians/join/email";

test.describe("the join page after O188", () => {
  test("joining is one email — present, correct, and a real target", async ({ page }) => {
    await page.goto("/clinicians/join");
    const cta = page.getByRole("link", { name: JOIN_EMAIL });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute("href", `mailto:${JOIN_EMAIL}?subject=Joining%20the%20directory`);
    // O14's floor, on the one control this page now has.
    const box = await cta.boundingBox();
    expect(box!.height).toBeGreaterThanOrEqual(44);
    expect(box!.width).toBeGreaterThanOrEqual(44);

    // The design record (adhdme-taste review procedure): the surface as it ships, both widths.
    await page.screenshot({ path: "qa/_runs/join-o188/email-desktop.png", fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: "qa/_runs/join-o188/email-mobile.png", fullPage: true });
  });

  test("the form is absent, not hidden", async ({ page }) => {
    await page.goto("/clinicians/join");
    // The eight-section form's own furniture, each asserted at zero: fields, the submit, the
    // sectioned-view controls, and the hero's mix control. `count()` sees hidden nodes too,
    // so a display:none form cannot pass this.
    await expect(page.locator('input[name="fullName"]')).toHaveCount(0);
    await expect(page.locator('input[name="ahpraRegistrationNumber"]')).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Send application" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Show the whole form" })).toHaveCount(0);
    await expect(page.getByLabel(/Percentage of your patients/i)).toHaveCount(0);
  });

  test("the pitch keeps its promises small: no five-minute claim, no form language", async ({ page }) => {
    await page.goto("/clinicians/join");
    const body = (await page.content()).toLowerCase();
    // The old lead promised "five minutes" of questions; the page must not promise a process
    // it no longer runs.
    expect(body).not.toContain("five minutes");
    expect(body).not.toContain("send application");
  });
});
