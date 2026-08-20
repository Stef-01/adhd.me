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

import { expect, test, type Page } from "@playwright/test";

async function intoResults(page: Page) {
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
}

test("a scenario reaches results without a loading screen in between", async ({ page }) => {
  await page.goto("/finder");
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
  // people it does not contain.
  expect(count).toBeGreaterThan(0);

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
  await expect(page.getByText(/nearest to Hornsby first/i)).toBeVisible();
  await expect(anushaRow.getByText(/in your suburb \(their Hornsby rooms\)/)).toBeVisible();
  await anushaRow.screenshot({ path: "qa/location-o85/row-hornsby-origin.png" });

  // O86: Dr Anubhav's pair renders the same way — and being telehealth-first, his line
  // says telehealth rather than a kilometre figure, second location or not.
  const anubhavRow = page.locator(".clinician-row", { hasText: "Dr Anubhav Saxena" });
  await expect(anubhavRow.getByText(/Beecroft & Double Bay, by telehealth/)).toBeVisible();
  await anubhavRow.screenshot({ path: "qa/location-o86/row-telehealth-pair.png" });

  // The profile carries the same pair on its meta line — and, since O89, her co-founder
  // disclosure beside it: a material interest stated exactly where the listing is read.
  await anushaRow.click();
  await expect(page.getByText(/Double Bay & Hornsby/).first()).toBeVisible();
  await expect(page.getByText("Co-founder of ADHD.ME")).toBeVisible();
  await page.locator(".profile-content").screenshot({ path: "qa/founder-o89/profile-disclosure.png" });
  await page.locator(".profile-content").screenshot({ path: "qa/location-o85/profile-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.locator(".profile-content").screenshot({ path: "qa/location-o85/profile-mobile.png" });
});

test("changing the suburb re-ranks in place instead of losing the search", async ({ page }) => {
  await intoResults(page);
  const before = await page.locator(".clinician-row strong").allInnerTexts();

  await page.getByLabel(/Where are you/i).fill("Beecroft");
  await expect(page.getByText(/nearest to Beecroft first/i)).toBeVisible();

  const after = await page.locator(".clinician-row strong").allInnerTexts();
  // Re-ranked in place, still on the same screen — editing this field does not send anybody back a
  // step. With two focus areas, naming a suburb legitimately surfaces nearer clinicians, so the
  // shown five can change membership; what must hold is that it is still a full, populated results
  // view that overlaps the previous one rather than a fresh search from nothing.
  expect(after.length).toBe(before.length);
  expect(after.some((name) => before.includes(name)), "the search was lost, not re-ranked").toBe(true);
  expect(page.url()).toContain("/finder");
  await expect(page.locator(".clinician-list")).toBeVisible();
});

test("an uncovered suburb says so rather than silently ranking on nothing", async ({ page }) => {
  await intoResults(page);
  await page.getByLabel(/Where are you/i).fill("Bondi");
  await expect(page.getByText(/do not cover that one yet/i)).toBeVisible();
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

test("no screen the collapse removed is still reachable", async ({ page }) => {
  // A button left pointing at a deleted stage renders NOTHING, because every screen is gated on a
  // stage equality check. An empty main is the signature of that bug, so it is asserted directly.
  await intoResults(page);
  for (const click of [
    () => page.locator(".clinician-row").first().click(),
    () => page.getByRole("button", { name: /All results/i }).click(),
  ]) {
    await click();
    const text = await page.locator("main").innerText();
    expect(text.trim().length, "a stage rendered nothing").toBeGreaterThan(40);
  }
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
  await page.screenshot({ path: "qa/motion-o67/portrait-mid-flight.png", fullPage: false });

  // THE WIRING CONTRACT the tween hangs off: the profile's portrait frame declares itself
  // the same object (same id) the tapped row declared. If either side loses its layoutId
  // pairing attribute, this fails before anybody has to notice the motion is gone.
  const profilePortrait = page.locator(".profile-portrait");
  await expect(profilePortrait).toBeVisible();
  await expect(profilePortrait).toHaveAttribute("data-portrait-of", chosenId!);
  await page.waitForTimeout(500);
  await page.screenshot({ path: "qa/motion-o67/portrait-settled.png", fullPage: false });
});

test("a profile names what you asked for that this GP has not declared (O51)", async ({ page }) => {
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /Change what you said/i }).click();
  const box = page.getByRole("textbox");
  await box.fill("I need titration and I don't want to feel rushed, somewhere I can be honest about drinking");
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
    const missed = page.locator(".fit-missed li");
    if ((await missed.count()) > 0) {
      found = true;
      // Declaration-framed, never a deficiency claim; and never contradicting the evidence list.
      await expect(missed.first()).toContainText("not something they declare");
      const missedLabel = (await missed.first().locator(".fit-missed-label").innerText()).toLowerCase();
      const evidence = (await page.locator(".fit-evidence-label").allInnerTexts()).map((t) => t.toLowerCase());
      expect(evidence).not.toContain(missedLabel);
      // The design record: both halves of the account in one frame, desktop and phone widths.
      await missed.first().scrollIntoViewIfNeeded();
      await page.screenshot({ path: "qa/profile-o51/profile-missed-desktop.png", fullPage: false });
      await page.setViewportSize({ width: 390, height: 844 });
      await missed.first().scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
      await page.screenshot({ path: "qa/profile-o51/profile-missed-mobile.png", fullPage: false });
      break;
    }
    await page.getByRole("button", { name: /Back to results/i }).click();
  }
  expect(found, "no profile showed a missed ask for a three-ask query").toBe(true);
});

test("the profile says what would change this order, and tapping it returns to a re-read list (O66)", async ({ page }) => {
  await intoResults(page);
  await page.locator(".clinician-row").first().click();
  await expect(page.locator(".profile-content")).toBeVisible();

  // One quiet line, one question — the top clarifier only, never a chip row on a profile.
  const line = page.locator(".profile-clarify");
  await expect(line).toBeVisible();
  await expect(line).toContainText("What would change this order");
  const question = line.locator(".profile-clarify-question");
  await expect(question).toHaveCount(1);

  // The design record before the tap: the whole profile column, question in context —
  // an element shot, because the profile scrolls inside its own shell.
  await page.waitForTimeout(450);
  await page.locator(".profile-content").screenshot({ path: "qa/profile-o66/clarify-on-profile-desktop.png" });

  // Tapping does what the results chips do — answer appended, whole sentence re-read — and
  // LANDS ON RESULTS, where the O52 layout animation is what shows the order changing.
  const askedPrompt = ((await question.textContent()) ?? "").trim();
  await question.click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 5000 });
  // The re-read is real: the answered facet is no longer an open question, so the profile's
  // question can never be a dead tap that changes nothing and says nothing.
  await page.locator(".clinician-row").first().click();
  await expect(page.locator(".profile-content")).toBeVisible();
  const after = page.locator(".profile-clarify .profile-clarify-question");
  if (await after.count()) {
    expect(((await after.textContent()) ?? "").trim()).not.toBe(askedPrompt);
  }
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(450);
  await page.locator(".profile-content").screenshot({ path: "qa/profile-o66/clarify-on-profile-mobile.png" });
});

test("a clarifier answer visibly re-sorts the same rows, not a new list (O52)", async ({ page }) => {
  await page.goto("/finder");
  await page.getByRole("button", { name: "Try a demo scenario" }).click();
  await page.getByRole("button", { name: "Try this scenario" }).click();
  await expect(page.locator(".clinician-list")).toBeVisible({ timeout: 20000 });
  await page.getByRole("button", { name: /Change what you said/i }).click();
  // Every listing declares assessment, so this ties the roster and the clarifier renders.
  await page.getByRole("textbox").fill("I need an ADHD assessment");
  await page.getByRole("button", { name: "Find a GP" }).click();
  await expect(page.locator(".clarify-chip").first()).toBeVisible({ timeout: 20000 });

  const before = await page.locator(".clinician-row strong").allInnerTexts();
  await page.screenshot({ path: "qa/motion-o52/results-before-clarifier.png", fullPage: false });

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
      await page.screenshot({ path: "qa/motion-o52/results-after-clarifier.png", fullPage: false });
    }
  }
  expect(reordered, "no clarifier answer reordered a tied roster").toBe(true);
});
