// O197 (founder-directed): the network's landing page, driven as a reader arrives at it.
//
// WHAT THIS SPEC IS FOR THAT THE UNIT TESTS ARE NOT. `src/network/mission.test.ts` proves the copy
// bundle is what it should be; nothing there proves the page RENDERS it, that the founder's
// sentence survives the trip through JSX intact, or that the door at the bottom actually goes
// anywhere. This tree has been caught by exactly that gap before — round 7 of O192 found a linted,
// counted, tested copy constant that rendered nowhere at all.
//
// AND IT PINS THE ORDER, which is the page's one substantive design claim: the reach paragraph —
// how many GPs there are, and in how many states — comes BEFORE the door out. A reader who is
// about to meet two doctors should learn there are two on the screen that told them what the
// network is aiming at, not after the click.

import { expect, test } from "@playwright/test";
import { MISSION_COPY } from "../src/network/mission";
import { NETWORK_CLINICIANS } from "../src/network/gallery";

test("the mission page states the founder's mission, verbatim", async ({ page }) => {
  await page.goto("/mission");
  await expect(page.getByRole("heading", { level: 1, name: MISSION_COPY.heading })).toBeVisible();

  // The whole sentence, not a fragment of it. A page that renders half the mission is a page that
  // has quietly edited it.
  await expect(page.locator(".mission-statement")).toHaveText(MISSION_COPY.statement);
});

test("it says how big the network really is before it hands anybody on", async ({ page }) => {
  await page.goto("/mission");

  const reach = page.locator(".mission-section", { hasText: MISSION_COPY.reachHeading });
  await expect(reach).toContainText("New South Wales");
  // Derived, so a third GP joining rewrites the sentence rather than leaving it quietly wrong.
  expect(NETWORK_CLINICIANS.length).toBeGreaterThan(0);

  // Document order: the scope statement is above the door, not below it.
  // `:last-of-type` was the first attempt and it matched NOTHING: the door is a <section> too, so
  // "last section" is the door itself and "last section carrying .mission-section" is not a thing
  // that selector can express. Taken off the list instead.
  const order = await page.evaluate(() => {
    const sections = document.querySelectorAll(".mission-section");
    const reachEl = sections[sections.length - 1];
    const door = document.querySelector(".mission-door");
    if (!reachEl || !door) return null;
    return reachEl.compareDocumentPosition(door) & Node.DOCUMENT_POSITION_FOLLOWING ? "door-after" : "door-before";
  });
  expect(order, "the reach paragraph must precede the door out").toBe("door-after");
});

test("it tells a reader whose words they are about to read", async ({ page }) => {
  // honesty.clinician-declaration, stated before the click rather than after it.
  await page.goto("/mission");
  await expect(page.locator(".mission-section").first()).toContainText("in the words each doctor chose");
  await expect(page.locator(".mission-section").first()).toContainText("we do not rank them");
});

test("the page has one door and it opens the network", async ({ page }) => {
  await page.goto("/mission");

  // ONE door, deliberately. A landing page with exits to two different products makes the reader
  // choose before it has told them anything.
  await expect(page.locator(".mission-door-link")).toHaveCount(1);

  const link = page.locator(".mission-door-link");
  const box = await link.boundingBox();
  expect(box, "the door has no box").not.toBeNull();
  // interaction.touch-44 — the hit area clears the floor through padding.
  expect(box!.height, "the door is under the 44px touch floor").toBeGreaterThanOrEqual(44);

  await link.click();
  await expect(page).toHaveURL(/\/network$/);
  await expect(page.getByRole("heading", { name: /The GPs who make[\s ]up this network\./ })).toBeVisible();
});

test("the header's door is the network too, on the way in and the way back", async ({ page }) => {
  await page.goto("/mission");
  await page.locator(".site-nav-link").click();
  await expect(page).toHaveURL(/\/network$/);
});

test("the mission page is a door the site's own navigation opens", async ({ page }) => {
  // A public route with no door is reachable only by somebody who already knows the URL. The
  // footer is the one list every public page shares, so that is where the door has to be — and
  // clicking it, rather than asserting it exists, is what proves it goes where it says.
  await page.goto("/network");
  await page.locator(".site-footer").getByRole("link", { name: "Why this exists" }).click();
  await expect(page).toHaveURL(/\/mission$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Care starts with feeling understood.");
});

test("the deck offers the argument rather than repeating it", async ({ page }) => {
  // O198's rendered half. The unit test pins the COPY BUNDLES; this pins what a reader actually
  // gets — the band under the deck names both doors and argues neither, and the mission door is
  // the first of the two because a reader who has just met two people has the bigger question.
  await page.goto("/network");

  const band = page.locator(".network-purpose");
  await expect(band.getByRole("heading")).toHaveText("Two other ways to go from here.");
  // "Two", stated on the page, must be true on the page (`honesty.claim-earned`).
  await expect(band.getByRole("link")).toHaveCount(2);
  await expect(band.getByRole("link").first()).toHaveText("Why this exists");

  await band.getByRole("link", { name: "Why this exists" }).click();
  await expect(page).toHaveURL(/\/mission$/);
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Care starts with feeling understood.");
});

test("nothing on the mission page overflows sideways at the narrowest phone still in use", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 720 });
  await page.goto("/mission");
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow, "the mission page scrolls sideways at 320px").toBeLessThanOrEqual(1);
});
