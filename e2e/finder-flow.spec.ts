// W214: the finder's seven screens, walked end to end.
//
// Written during the first minimalism round, which collapsed `review`, `matching`, `match` and
// `all` into one `results` screen. Four screens disappearing at once is exactly the change that
// leaves a dangling route or a button pointing at a stage that no longer exists, and none of the
// existing specs walked the patient flow past the first match.
//
// It asserts the SHAPE of the flow rather than its copy: which screen follows which, that every
// back route lands somewhere real, and that a booking can still be completed. Copy is asserted by
// the compliance sweeps, and duplicating it here would mean every wording change broke two files.
// taste-rule: honesty.claim-earned

import { expect, test, type Page } from "@playwright/test";
import { measured } from "./support/measured";
import { rankClinicians } from "../src/demo/clinicians";
import { demoResultsRealRosterOnly, gotoFinderRealRosterOnly } from "./support/real-roster";

// O226: this file's walks assert REAL-roster facts — named rows above the fold, `rankClinicians`
// over the real `clinicians` export, "1 of 2 listed GPs" — so the flow enters through the
// real-roster door. The shipped default (examples ON) keeps its own coverage in the first test
// below, which walks the scenario without touching the switch.
async function intoResults(page: Page) {
  await demoResultsRealRosterOnly(page);
}

test("a scenario reaches results without a loading screen in between", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();

  // The 4.25s `matching` screen is gone, so results are there immediately. A generous timeout
  // would let it creep back without failing, which is why this one is deliberately tight.
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 2500 });
  await expect(page.locator(".clinician-row")).not.toHaveCount(0);
});

test("every result is reachable and opens a profile", async ({ page }) => {
  await intoResults(page);
  const rows = page.locator(".clinician-row");
  const count = await rows.count();
  // Was `> 3`, which was a statement about roster SIZE dressed up as a statement about
  // reachability. The roster is now two real GPs rather than fifteen invented ones, and the
  // property this test is actually for — every row that renders can be opened — holds at any
  // size. Asserting a floor of three again would be asserting that the directory must contain
  // people it does not contain. AR6: the "not zero" half is `measured()` now, not a bespoke
  // `toBeGreaterThan(0)` — this was the exact shape it was built to replace.
  measured("finder-flow.reachable-results", count);

  // The first and the last, because an index bug usually shows at an end.
  for (const index of [0, count - 1]) {
    const name = (await rows.nth(index).locator("strong").innerText()).trim();
    await rows.nth(index).click();
    await expect(page.getByRole("heading", { name, level: 1 })).toBeVisible();
    await page.getByRole("button", { name: /Back to results/i }).click();
    await expect(page.locator(".clinician-list")).toBeVisible();
  }
});

test("a second consulting location is a fact the reader sees, with the distance honest about which rooms (O85)", async ({ page }) => {
  await intoResults(page);

  // The row shows every place she consults, not only the primary suburb.
  const anushaRow = page.locator(".clinician-row", { hasText: "Dr Anusha Saxena" });
  await expect(anushaRow.getByText(/Double Bay & Hornsby/)).toBeVisible();

  // From Hornsby, the distance is measured to her Hornsby rooms and SAYS so — a kilometre
  // figure to one location never renders as though it were the other.
  await page.getByLabel(/Where are you/i).fill("Hornsby");
  await expect(page.getByText(/otherwise equal matches, nearer to Hornsby comes first/i)).toBeVisible();
  await expect(anushaRow.getByText(/in your suburb \(their Hornsby rooms\)/)).toBeVisible();
  await anushaRow.screenshot({ path: "qa/_runs/location-o85/row-hornsby-origin.png" });

  // O86: Dr Anubhav's pair renders the same way — and being telehealth-first, his line
  // says telehealth rather than a kilometre figure, second location or not.
  const anubhavRow = page.locator(".clinician-row", { hasText: "Dr Anubhav Saxena" });
  await expect(anubhavRow.getByText(/Beecroft & Double Bay, by telehealth/)).toBeVisible();
  await anubhavRow.screenshot({ path: "qa/_runs/location-o86/row-telehealth-pair.png" });

  // The profile carries the same pair on its compact identity block.
  await anushaRow.click();
  await expect(page.getByText(/Double Bay & Hornsby/).first()).toBeVisible();
  await expect(page.locator(".disclosure-line")).toHaveCount(0);
  await page.locator(".profile-content").screenshot({ path: "qa/_runs/location-o85/profile-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.locator(".profile-content").screenshot({ path: "qa/_runs/location-o85/profile-mobile.png" });
});

test("changing the suburb re-ranks in place instead of losing the search", async ({ page }) => {
  await intoResults(page);
  const before = await page.locator(".clinician-row strong").allInnerTexts();

  await page.getByLabel(/Where are you/i).fill("Beecroft");
  await expect(page.getByText(/otherwise equal matches, nearer to Beecroft comes first/i)).toBeVisible();

  const after = await page.locator(".clinician-row strong").allInnerTexts();
  // Re-ranked in place, still on the same screen — editing this field does not send anybody back a
  // step. With two focus areas, naming a suburb legitimately surfaces nearer clinicians, so the
  // shown five can change membership; what must hold is that it is still a full, populated results
  // view that overlaps the previous one rather than a fresh search from nothing.
  expect(after.length).toBe(before.length);
  expect(after.some((name) => before.includes(name)), "the search was lost, not re-ranked").toBe(true);
  expect(new URL(page.url()).pathname).toBe("/");
  await expect(page.locator(".clinician-list")).toBeVisible();
});

test("an uncovered suburb says so rather than silently ranking on nothing", async ({ page }) => {
  await intoResults(page);
  await page.getByLabel(/Where are you/i).fill("Bondi");
  await expect(page.getByText(/do not cover that location yet/i)).toBeVisible();
  await expect(page.locator(".clinician-row")).not.toHaveCount(0);
});

/**
 * PHASE 1 ENDS AT A HANDOFF, SO THIS TEST NOW ENDS AT ONE TOO.
 *
 * It used to walk a radiogroup of times to a "Request ready" screen. Those times were written
 * into the component and the request was never sent — survivable as a mock over invented
 * personas, and a fabricated appointment under a named doctor once the roster became real. The
 * booking screen hands off to Healthengine instead, so what has to be pinned is that the handoff
 * REACHES the right place: an external link, to Healthengine, opening in a new tab. A regression
 * that quietly restored an in-app slot picker would fail here for the right reason.
 */
test("booking hands off to Healthengine rather than inventing a time", async ({ page }) => {
  await intoResults(page);
  await page.locator(".clinician-row").first().click();

  await page.getByRole("button", { name: /available times|how to book/i }).first().click();

  const handoff = page.getByRole("link", { name: /Healthengine|practice page/i }).first();
  await expect(handoff).toBeVisible({ timeout: 10000 });
  // Since O28 the link goes through this domain's own /go/<id> redirect, which is what makes
  // outbound booking intent countable; the redirect target is asserted below at request level.
  await expect(handoff).toHaveAttribute("href", /^\/go\/[a-z-]+\?src=finder$/);
  await expect(handoff).toHaveAttribute("target", "_blank");

  // The redirect itself: a 302 to Healthengine carrying the utm tail, with nothing stored.
  const goHref = await handoff.getAttribute("href");
  const redirect = await page.request.get(goHref!, { maxRedirects: 0 });
  expect(redirect.status()).toBe(302);
  const location = redirect.headers()["location"] ?? "";
  expect(location).toMatch(/^https:\/\/healthengine\.com\.au\//);
  expect(location).toContain("utm_source=adhd-me");
  // no-store: a cached 302 would skip the server and silently undercount (O32 scanner find).
  expect(redirect.headers()["cache-control"]).toContain("no-store");

  // No in-app time picker survives anywhere on the booking screen.
  await expect(page.getByRole("radiogroup")).toHaveCount(0);
});

test("refine returns to typing with the words already there", async ({ page }) => {
  await intoResults(page);
  await page.getByRole("button", { name: /Change what you said/i }).click();
  const box = page.getByRole("textbox");
  await expect(box).toBeVisible();
  expect((await box.inputValue()).length).toBeGreaterThan(10);

  await box.fill("I would like an ADHD assessment and I speak Vietnamese");
  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 2500 });
});

test("profile back returns to the populated results screen", async ({ page }) => {
  // A button left pointing at a deleted stage renders NOTHING, because every screen is gated on a
  // stage equality check. An empty main is the signature of that bug, so it is asserted directly.
  await intoResults(page);
  await page.locator(".clinician-row").first().click();
  await expect(page.locator(".profile-screen")).toBeVisible();
  await page.getByRole("button", { name: /Back to results/i }).click();
  await expect(page.locator(".clinician-list")).toBeVisible();
  const text = await page.locator("main").innerText();
  expect(text.trim().length, "a stage rendered nothing").toBeGreaterThan(40);
});

test("the chosen GP's portrait is one object from row to profile (O67)", async ({ page }) => {
  await intoResults(page);
  const firstRow = page.locator(".clinician-row").first();
  const rowAnchor = firstRow.locator(".row-portrait-anchor");
  await expect(rowAnchor).toBeVisible();
  const chosenId = await rowAnchor.getAttribute("data-portrait-of");
  expect(chosenId).toBeTruthy();

  await firstRow.click();
  // Mid-flight frame for the design record: the results screen's exit runs ~260ms under
  // mode="wait", so the shared element's travel starts after it — aim ~150ms into the 420ms
  // tween. Best-effort timing; the settled shot below is the hard record.
  await page.waitForTimeout(410);
  await page.screenshot({ path: "qa/_runs/motion-o67/portrait-mid-flight.png", fullPage: false });

  // THE WIRING CONTRACT the tween hangs off: the profile's portrait frame declares itself
  // the same object (same id) the tapped row declared. If either side loses its layoutId
  // pairing attribute, this fails before anybody has to notice the motion is gone.
  const profilePortrait = page.locator(".profile-portrait");
  await expect(profilePortrait).toBeVisible();
  await expect(profilePortrait).toHaveAttribute("data-portrait-of", chosenId!);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "qa/_runs/motion-o67/portrait-settled.png", fullPage: false });
});

test("a profile names what you asked for that this GP has not declared (O51)", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /Change what you said/i }).click();
  const box = page.getByRole("textbox");
  /**
   * O183: THE QUERY CHANGED BECAUSE THE ROSTER STOPPED PRODUCING A PARTIAL FIT FOR THE OLD ONE.
   *
   * This asked for titration + unhurried + substance history. Dr Yadav used to be the roster's
   * `unhurried` declarer, so somebody always answered some of it and missed the rest. Two things
   * then happened: he left (O179), and M3 carried Dr Anubhav's own appointment-length answer into
   * the `unhurried` facet it also answers (F6). Against today's roster that query splits into
   * all-four and none-of-four — Dr Anubhav answers everything, Dr Anusha answers nothing — and a
   * profile with NO evidence correctly renders "nothing in what you said pointed here
   * specifically" instead of a missed list, because a missed list beside no evidence would be an
   * account of a match that was never claimed.
   *
   * So the rendering under test was never broken; the query stopped exercising it. The property
   * needs a PARTIAL fit and this query produces one: Dr Anusha answers the assessment and the
   * Hindi, and does not declare titration.
   */
  await box.fill("I want an ADHD assessment with a GP who speaks Hindi and can review my titration");
  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });

  // Walk the rows until a profile shows the missed list — the partition property behind it is
  // unit-pinned; this pins the RENDERING and its honesty framing.
  const rows = page.locator(".clinician-row");
  const count = await rows.count();
  let found = false;
  for (let index = 0; index < count; index++) {
    await rows.nth(index).click();
    await expect(page.locator(".profile-content")).toBeVisible();
    await page.locator(".profile-disclosure").filter({ hasText: "Why matched" }).locator("summary").click();
    const missed = page.locator(".fit-missed li");
    if ((await missed.count()) > 0) {
      found = true;
      // Declaration-framed, never a deficiency claim; and never contradicting the evidence list.
      await expect(missed.first()).toContainText("not something they declare");
      const missedLabel = (await missed.first().locator("strong").innerText()).toLowerCase();
      const evidence = (await page.locator(".fit-evidence strong").allInnerTexts()).map((t) => t.toLowerCase());
      expect(evidence).not.toContain(missedLabel);
      // The design record: both halves of the account in one frame, desktop and phone widths.
      await missed.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: "qa/_runs/profile-o51/profile-missed-desktop.png", fullPage: false });
      await page.setViewportSize({ width: 390, height: 844 });
      await missed.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: "qa/_runs/profile-o51/profile-missed-mobile.png", fullPage: false });
      break;
    }
    await page.getByRole("button", { name: /Back to results/i }).click();
  }
  expect(found, "no profile showed a missed ask for a three-ask query").toBe(true);
  // O183 non-vacuity: the walk must have had rows to walk. `found` alone would also be false on a
  // finder that rendered nothing at all, which is a different failure wearing the same message —
  // and it is how this assertion would go quietly wrong the next time the roster changes shape.
  expect(count, "the finder returned no rows, so nothing was exercised").toBeGreaterThan(1);
});

test("refinement stays with results while the profile leads with the bio", async ({ page }) => {
  await intoResults(page);
  await page.locator(".clinician-row").first().click();
  await expect(page.locator(".profile-content")).toBeVisible();
  await expect(page.getByRole("heading", { name: "About" })).toBeVisible();
  await expect(page.locator(".profile-clarify")).toHaveCount(0);
  await expect(page.locator(".clarify-chip")).toHaveCount(0);
});

test("a clarifier answer visibly re-sorts the same rows, not a new list (O52)", async ({ page }) => {
  await demoResultsRealRosterOnly(page);
  await page.getByRole("button", { name: /Change what you said/i }).click();
  // Every listing declares assessment, so this ties the roster and the clarifier renders.
  await page.getByRole("textbox").fill("I need an ADHD assessment");
  await page.getByRole("button", { name: "Find a GP" }).click();
  await page.getByText("Improve my matches", { exact: true }).click();
  await expect(page.locator(".clarify-chip").first()).toBeVisible({ timeout: 20000 });

  const before = await page.locator(".clinician-row strong").allInnerTexts();
  await page.screenshot({ path: "qa/_runs/motion-o52/results-before-clarifier.png", fullPage: false });

  // A single answer may legitimately CONFIRM the current order; clarify.ts's contract is that
  // the offered questions can reorder, so walk the chips until one does. The rows glide rather
  // than teleport (layout animation) — an e2e cannot pin the tween, but it CAN pin what the
  // tween animates between: the same keyed rows, in a different order, nobody vanishing.
  const chipCount = await page.locator(".clarify-chip").count();
  let reordered = false;
  for (let chip = 0; chip < chipCount && !reordered; chip++) {
    if (chip > 0) {
      await page.getByRole("button", { name: /Change what you said/i }).click();
      await page.getByRole("textbox").fill("I need an ADHD assessment");
      await page.getByRole("button", { name: "Find a GP" }).click();
      await page.getByText("Improve my matches", { exact: true }).click();
      await expect(page.locator(".clarify-chip").first()).toBeVisible({ timeout: 20000 });
    }
    await page.locator(".clarify-chip").nth(chip).click();
    await page.waitForTimeout(600);
    const after = await page.locator(".clinician-row strong").allInnerTexts();
    expect(after.length).toBeGreaterThan(0);
    // Everyone still shown was already known — a clarifier narrows an order, never mints rows.
    for (const name of after) expect(before).toContain(name);
    if (after.join("|") !== before.join("|")) {
      reordered = true;
      await page.screenshot({ path: "qa/_runs/motion-o52/results-after-clarifier.png", fullPage: false });
    }
  }
  expect(reordered, "no clarifier answer reordered a tied roster").toBe(true);
});

/**
 * O121: the completeness claim and the listing-gap line cannot both be on screen.
 *
 * Found by walking the whole flow rather than one screen: "These 3 GPs do what you asked for."
 * rendered directly above "Bulk billing is not something any GP listed today declares" — two
 * adjacent sentences contradicting each other, and the louder one false. Each screen had been
 * captured against its own query, which is the condition under which a flow accumulates a
 * defect no single-surface review can see.
 */
test("the finder never claims a full fit beside a gap it just admitted (O121)", async ({ page }) => {
  await page.goto("/");
  await page.locator("#welcome-request").fill(
    "a woman GP who does adult ADHD assessment, bulk billing, and I need a longer first appointment",
  );
  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });

  const head = await page.locator(".results-head").innerText();
  // The gap is admitted...
  expect(head).toContain("not something any GP listed today declares");
  // ...so the completeness claim must not be beside it.
  expect(head).not.toContain("do what you asked for");
  expect(head).not.toContain("does what you asked for");
});

test("collective roster coverage is never presented as one doctor's complete fit (O178)", async ({ page }) => {
  await page.goto("/");
  await page.locator("#welcome-request").fill(
    "I need a woman GP who speaks Urdu and offers telehealth",
  );
  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });

  await expect(page.getByText(
    "No listed GP matches every part of your request we understood. Showing the strongest declared matches.",
  )).toBeVisible();

  await page.locator(".clinician-row").filter({ hasText: "Dr Anusha Saxena" }).click();
  const why = page.locator(".profile-disclosure").filter({ hasText: "Why matched" });
  await why.locator("summary").click();
  await expect(why).toContainText("this listing does not show a telehealth first appointment");
});

test("and still says it when the fit really is complete (O121 non-vacuity)", async ({ page }) => {
  await gotoFinderRealRosterOnly(page);
  // Deliberately a query the roster SEPARATES on and serves completely: "adult ADHD
  // assessment" alone is a tie (all three declare it), and a tie renders no claim either — so
  // it would have passed this test for the wrong reason.
  await page.locator("#welcome-request").fill("ADHD assessment and titration");
  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });

  const head = await page.locator(".results-head").innerText();
  // Nothing unserved here, so the claim is earned and must still render — otherwise the fix
  // above would have been a deletion rather than a condition.
  expect(head).not.toContain("not something any GP listed today declares");
  expect(head).toMatch(/1 of 2 listed GPs matches every part of your request we understood/);
});

test("the typed journey ends in the engine's own ranking, both ways round (AR38)", async ({ page }) => {
  // AR38: the outcome, not the shape. Every walk above enters via the demo scenario or asserts
  // structure — a results screen that rendered the roster in a FIXED order would pass all of
  // them. This drives the typed path from the welcome stage twice, with two queries the engine
  // itself ranks in opposite orders, and asserts the rendered order IS `rankClinicians`' answer
  // for the exact string typed — the same function `app/care-finder.tsx` calls. Two opposite
  // orders kill the fixed-order failure class outright: the UI must FOLLOW the engine.
  //
  // Suburb-free queries on purpose: naming a place would route through `rankCliniciansNear`,
  // which is the suburb test's subject above, not this one's.
  const QUERIES = ["I need an ADHD assessment", "a woman GP for ADHD assessment"];
  const expected = QUERIES.map((q) => rankClinicians(q).map((c) => c.name));

  // The guard that keeps this non-vacuous: the pair must genuinely separate. If a roster change
  // ever makes both queries agree, this fails HERE, demanding a new pair rather than silently
  // asserting half as much.
  expect(expected[0], "the two queries no longer rank oppositely — pick a separating pair").not.toEqual(
    expected[1],
  );

  for (const [i, query] of QUERIES.entries()) {
    await gotoFinderRealRosterOnly(page);
    await page.locator("#welcome-request").fill(query);
    await page.getByRole("button", { name: "Find a GP" }).click();
    await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });

    const rendered = await page.locator(".clinician-row strong").allInnerTexts();
    expect(rendered.map((n) => n.trim()), `"${query}" rendered an order the engine did not produce`).toEqual(
      expected[i],
    );

    // And the journey's end: the top row opens the profile of the engine's #1, by name.
    await page.locator(".clinician-row").first().click();
    await expect(page.getByRole("heading", { name: expected[i]![0]!, level: 1 })).toBeVisible();
  }
});
