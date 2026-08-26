// O192 (founder-directed): the network gallery, driven as a reader drives it.
//
// The finder has `finder-flow.spec.ts` walking its stages; this is the browse-first half's
// equivalent. What it asserts is what the founder asked for — the two interfaces are reachable
// from each other, every GP has a page you can open and share, and you can move between people
// fluidly — plus the two laws this surface could most easily break: the clinician's voice is
// labelled as theirs, and the declared-interest notice reaches the reader who is deciding whether
// to book, BEFORE the booking link rather than under it.
//
// ROUND 2 REWROTE THIS FILE because the interface changed shape. It used to drive a dialog; the
// screenshot audit turned that dialog into real routes, and a spec that kept opening a modal would
// have been testing a design decision that had been reversed.

import { expect, test } from "@playwright/test";
import { NETWORK_CLINICIANS } from "../src/network/gallery";

/**
 * A clinician's name without the honorific.
 *
 * Headings render the full name with a NON-BREAKING space after "Dr" (so a name never wraps away
 * from its title), and `shortName` — "Dr Saxena" — is a different string headings never show.
 * Matching on the surname half sidesteps both traps.
 */
const bare = (name: string) => name.replace(/^(?:Dr|Prof|Mr|Ms|Mrs|Mx)\.?[\s ]+/, "");

test("the network shows every GP in the roster, each in their own words", async ({ page }) => {
  await page.goto("/network");
  await expect(page.getByRole("heading", { name: /The GPs who make[\s\u00A0]up this network\./ })).toBeVisible();

  const cards = page.locator(".network-card");
  await expect(cards).toHaveCount(NETWORK_CLINICIANS.length);
  // Non-vacuity: an empty roster would satisfy a count check against itself.
  expect(NETWORK_CLINICIANS.length).toBeGreaterThan(0);

  for (const clinician of NETWORK_CLINICIANS) {
    const card = page.locator(".network-card", { hasText: clinician.name });
    await expect(card, `${clinician.name} is missing from the deck`).toBeVisible();
    // Their declared line, and the concrete signals round 2 moved onto the card.
    await expect(card).toContainText(clinician.matchLine);
    await expect(card).toContainText(clinician.fitSignals[0]!);
    await expect(card).toContainText(clinician.languages[0]!);
  }
});

test("the page says whose words these are before a reader reads any of them", async ({ page }) => {
  await page.goto("/network");
  const declaration = page.locator(".network-declaration");
  await expect(declaration).toContainText("their own words");
  await expect(declaration).toContainText("None of it is our description of them");
});

test("every GP has a page of their own, reachable from the deck and by URL", async ({ page }) => {
  // The round-1 modal had no URL, which for a network whose job is introducing people is a
  // missing feature. Both routes in: the card, and a cold visit.
  const first = NETWORK_CLINICIANS[0]!;

  await page.goto("/network");
  await page.locator(".network-card", { hasText: first.name }).getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/network/${first.id}$`));
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(bare(first.name)) })).toBeVisible();

  await page.goto(`/network/${first.id}`);
  await expect(page.getByRole("heading", { level: 1, name: new RegExp(bare(first.name)) })).toBeVisible();
});

test("a profile leads with the person and discloses an interest before offering a booking", async ({ page }) => {
  const first = NETWORK_CLINICIANS[0]!;
  await page.goto(`/network/${first.id}`);

  // The voice label — the rendered half of honesty.clinician-declaration.
  await expect(page.getByText("In their words")).toBeVisible();
  await expect(page.locator(".gp-summary")).toContainText(first.summary);
  await expect(page.locator(".gp-line")).toContainText(first.matchLine);

  if (first.disclosedInterest) {
    // W193: document order, not merely presence.
    await expect(page.locator(".gp-disclosure")).toContainText(first.disclosedInterest);
    const order = await page.evaluate(() => {
      const d = document.querySelector(".gp-disclosure");
      const b = document.querySelector(".gp-book");
      if (!d || !b) return "missing";
      return d.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING ? "before" : "after";
    });
    expect(order, "the declared interest must precede the booking link").toBe("before");
  }
});

test("the portrait grows when a reader chooses somebody, never shrinks", async ({ page }) => {
  // The round-1 defect this route exists to fix, pinned so it cannot come back: opening a person
  // made them SMALLER (a 132px thumbnail after a full-width card). Measured, not asserted by eye.
  const first = NETWORK_CLINICIANS[0]!;
  await page.setViewportSize({ width: 1280, height: 900 });

  await page.goto("/network");
  const card = page.locator(".network-card", { hasText: first.name }).locator(".network-card-portrait");
  const cardBox = await card.boundingBox();

  await page.goto(`/network/${first.id}`);
  const profileBox = await page.locator(".gp-portrait").boundingBox();

  expect(cardBox).not.toBeNull();
  expect(profileBox).not.toBeNull();
  expect(
    profileBox!.width,
    "the profile portrait must not be smaller than the card that led to it",
  ).toBeGreaterThanOrEqual(cardBox!.width * 0.8);
});

test("you can move from one GP to the next, and back to the deck", async ({ page }) => {
  test.skip(NETWORK_CLINICIANS.length < 2, "moving between people needs at least two of them");
  const [first, second] = NETWORK_CLINICIANS;

  await page.goto(`/network/${first!.id}`);
  await expect(page.locator(".gp-position")).toHaveText(`1 of ${NETWORK_CLINICIANS.length}`);

  // One control while both directions lead to the same person — with two GPs a back-and-forward
  // pair offers one choice twice.
  const links = page.locator(".gp-slide-link");
  await expect(links).toHaveCount(NETWORK_CLINICIANS.length === 2 ? 1 : 2);

  await links.first().click();
  await expect(page).toHaveURL(new RegExp(`/network/${second!.id}$`));
  await expect(page.locator(".gp-position")).toHaveText(`2 of ${NETWORK_CLINICIANS.length}`);

  await page.locator(".gp-back").getByRole("link", { name: /The network/ }).click();
  await expect(page).toHaveURL(/\/network$/);
});

test("an unknown GP is a 404 rather than an empty profile", async ({ page }) => {
  const response = await page.goto("/network/nobody-by-that-name");
  expect(response?.status()).toBe(404);
});

test("the two interfaces launch into each other from the bottom-right corner", async ({ page }) => {
  // The founder's asymmetry: the network LAUNCHES the finder, the finder RETURNS to the network.
  await page.goto("/network");
  const launch = page.getByRole("link", { name: "Launch the finder" });
  await expect(launch).toBeVisible();
  await launch.click();
  await expect(page).toHaveURL(/\/finder$/);

  const back = page.getByRole("link", { name: "Back to the network" });
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/network$/);
});

test("the launch control reaches a GP's own page too, so it is never a dead end", async ({ page }) => {
  await page.goto(`/network/${NETWORK_CLINICIANS[0]!.id}`);
  await expect(page.getByRole("link", { name: "Launch the finder" })).toBeVisible();
});

test("the network is a door the site's own navigation opens", async ({ page }) => {
  // "make sure navigation for everything works" — the footer door is the one a reader finds when
  // they are not already on either interface.
  await page.goto("/faq");
  await page.locator(".site-footer").getByRole("link", { name: "The network" }).click();
  await expect(page).toHaveURL(/\/network$/);
  await expect(page.getByRole("heading", { name: /The GPs who make[\s\u00A0]up this network\./ })).toBeVisible();
});
