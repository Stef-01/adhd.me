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
import { NETWORK_CLINICIANS, consultingSuburbs, possessiveFor } from "../src/network/gallery";

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
    // O202: a gallery card carries what tells one doctor from another — the name, where they
    // consult, and the areas as chips. The declared sentence and the languages moved to the
    // profile, which the next assertion proves is one tap away rather than gone.
    await expect(card).toContainText(clinician.fitSignals[0]!);
    await expect(card).toContainText(consultingSuburbs(clinician)[0]!);
  }
});

test("what the gallery leaves off is one tap away, not gone", async ({ page }) => {
  // O202 removed the declared sentence and the languages line from the card because the founder
  // called the deck too wordy. That is only defensible if the reader can still reach them — a
  // gallery that drops a doctor's own words rather than relocating them would be a different and
  // worse change, so the relocation is pinned rather than assumed.
  const first = NETWORK_CLINICIANS[0]!;

  await page.goto("/network");
  const card = page.locator(".network-card", { hasText: first.name });
  await expect(card, "the deck should no longer carry the declared sentence").not.toContainText(first.matchLine);

  await card.getByRole("link").click();
  await expect(page).toHaveURL(new RegExp(`/network/${first.id}$`));
  await expect(page.locator("main")).toContainText(first.matchLine);
  await expect(page.locator("main")).toContainText(first.languages[0]!);
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

  // The voice label — the rendered half of honesty.clinician-declaration. Round 7 made it agree
  // with the person it is about ("In HIS words" for a he/him doctor), so the assertion is derived
  // from their declared pronoun rather than pinned to the plural the deck correctly uses.
  await expect(page.getByText(`In ${possessiveFor(first)} words`)).toBeVisible();
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

test("an unknown GP is a 404 that still knows which list you were reading", async ({ page }) => {
  // ROUND 8 WIDENED THIS TEST, and the reason is what the old version did NOT check. It asserted
  // the status code and stopped, so nobody had looked at the page a reader actually met: the SITE
  // 404, offering "Find a GP" and "Start from the beginning" and unable to offer the one thing
  // they were reaching for. Somebody following a stale link to a doctor was told the link was dead
  // and then pointed away from the network entirely. `app/network/not-found.tsx` catches it now.
  const response = await page.goto("/network/nobody-by-that-name");
  expect(response?.status()).toBe(404);

  await expect(page.getByRole("heading", { name: /not in the network/i })).toBeVisible();
  // The door back to the list they were reading — the whole point of a scoped 404.
  await page.getByRole("link", { name: "The network" }).first().click();
  await expect(page).toHaveURL(/\/network$/);
  await expect(page.locator(".network-card")).toHaveCount(NETWORK_CLINICIANS.length);
});

test("the two interfaces launch into each other from the bottom-right corner", async ({ page }) => {
  // The founder's asymmetry: the network LAUNCHES the finder, the finder RETURNS to the network.
  await page.goto("/network");
  // Scoped to the CORNER CONTROL, which is what this test is about. Unscoped, it matched any link
  // with that name — and round 7's in-prose bridge to the finder made that two, which is the test
  // failing for a reason that had nothing to do with the corner. (The bridge reads "Open the
  // finder" now, deliberately near-identical rather than identical; the scope is the real fix.)
  const launch = page.locator(".interface-launch").getByRole("link", { name: "Launch the finder" });
  await expect(launch).toBeVisible();
  await launch.click();
  await expect(page).toHaveURL(/\/finder$/);

  const back = page.locator(".interface-launch").getByRole("link", { name: "Back to the network" });
  await expect(back).toBeVisible();
  await back.click();
  await expect(page).toHaveURL(/\/network$/);
});

test("the launch control reaches a GP's own page too, so it is never a dead end", async ({ page }) => {
  await page.goto(`/network/${NETWORK_CLINICIANS[0]!.id}`);
  await expect(
    page.locator(".interface-launch").getByRole("link", { name: "Launch the finder" }),
  ).toBeVisible();
});

test("no section on a profile describes a field it does not render", async ({ page }) => {
  // O201. The profile carried "What Dr Anusha Saxena says she sees often" over
  // `clinician.experience` — career history and qualifications. A patient deciding whether this GP
  // handles their situation was told a CV was her caseload. The heading is OURS (the page says so),
  // so relabelling it changed our sentence and not one word of hers.
  //
  // PINNED AS A CONTENT AGREEMENT rather than as a string, because the string is not the property.
  // The property is that a heading claiming caseload must not sit over qualifications, and the
  // roster gives us the vocabulary to check it: `experience` entries name degrees, colleges and
  // posts; `fitSignals` name areas.
  const { NETWORK_CLINICIANS } = await import("../src/network/gallery");
  expect(NETWORK_CLINICIANS.length).toBeGreaterThan(0);

  for (const clinician of NETWORK_CLINICIANS) {
    await page.goto(`/network/${clinician.id}`);
    const headings = await page.locator(".gp-label").allInnerTexts();
    expect(headings.length, `${clinician.id} renders no section headings`).toBeGreaterThan(2);

    // The concept heading may only appear if the list under it is the areas list, and the tree's
    // framing for that concept lives behind G6 in src/directory — so on this surface it may not
    // appear at all.
    for (const heading of headings) {
      expect(
        heading.toLowerCase(),
        `"${heading}" claims a caseload on a page whose list is credentials. The tree's framed ` +
          `heading for that concept ("Areas this clinician sees often") ships with an attribution ` +
          `and a denial that the areas are qualifications, and that constant is G6-gated.`,
      ).not.toMatch(/sees? often/);
    }

    // And the credentials list is still labelled, still rendered, and still theirs.
    const credentials = page.locator(".gp-section", { hasText: "Credentials and experience" });
    await expect(credentials).toBeVisible();
    await expect(credentials.locator(".gp-signals li")).toHaveCount(clinician.experience.length);
    await expect(credentials).toContainText(clinician.experience[0]!);
  }
});

test("the card's way-in is a glyph on the name row, not a sentence", async ({ page }) => {
  // O198 pinned this element when it was a six-word link whose hover underline ran 110px past its
  // own text. O202 replaced the sentence with an arrow at the founder's word ("too wordy to
  // navigate"), so the measurement that made sense for a text link no longer describes anything —
  // and a pin that outlives its subject reads as coverage. What is worth keeping is the property
  // underneath it: the way-in must sit ON the name row rather than adding a line of its own,
  // because a line of chrome per card is exactly what was removed.
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/network");

    const arrows = page.locator(".network-card-go");
    expect(await arrows.count(), "no way-in on the deck").toBeGreaterThan(0);

    // Same row as the name: their vertical centres agree to within a couple of pixels.
    const rows = await page.evaluate(() =>
      [...document.querySelectorAll(".network-card-head")].map((head) => {
        const name = head.querySelector(".network-card-name")!.getBoundingClientRect();
        const go = head.querySelector(".network-card-go")!.getBoundingClientRect();
        return Math.abs((name.top + name.bottom) / 2 - (go.top + go.bottom) / 2);
      }),
    );
    expect(rows.length).toBeGreaterThan(0);
    for (const offset of rows) {
      expect(offset, `at ${width}px the way-in is off the name's row by ${offset}px`).toBeLessThan(4);
    }

    // And the sentence it replaced is really gone, not merely restyled.
    await expect(page.locator(".network-card-more")).toHaveCount(0);
    await expect(page.locator(".network-deck")).not.toContainText("Read what");
  }
});

test("neither network page overflows sideways at the narrowest phone still in use", async ({ page }) => {
  // ROUND 9. Rounds 1-8 measured 390, 768 and 1280; 320 is the width where a fixed minimum finally
  // exceeds the room available, and the deck's `minmax(280px, 1fr)` plus 20px of padding either
  // side lands exactly on it. Nothing was wrong when this was written — which is the reason to pin
  // it rather than to note it, because a card gaining one padding step is all it would take, and a
  // page that scrolls sideways on a small phone is discovered by the reader, not by a screenshot
  // taken at a comfortable width.
  await page.setViewportSize({ width: 320, height: 568 });
  const overflow = () =>
    page.evaluate(() => ({ doc: document.documentElement.scrollWidth, win: window.innerWidth }));

  for (const route of ["/network", `/network/${NETWORK_CLINICIANS[0]!.id}`]) {
    await page.goto(route);
    await page.waitForLoadState("networkidle");
    const { doc, win } = await overflow();
    expect(win, "the viewport did not apply — this check would pass vacuously").toBe(320);
    expect(doc, `${route} scrolls sideways at 320px`).toBeLessThanOrEqual(win);
  }
});

test("the network is a door the site's own navigation opens", async ({ page }) => {
  // "make sure navigation for everything works" — the footer door is the one a reader finds when
  // they are not already on either interface.
  await page.goto("/faq");
  await page.locator(".site-footer").getByRole("link", { name: "The network" }).click();
  await expect(page).toHaveURL(/\/network$/);
  await expect(page.getByRole("heading", { name: /The GPs who make[\s\u00A0]up this network\./ })).toBeVisible();
});
