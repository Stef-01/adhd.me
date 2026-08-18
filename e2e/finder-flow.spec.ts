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
