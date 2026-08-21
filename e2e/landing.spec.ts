// W23 verify gate (page side): the public B2B landing page renders and routes to
// the demo and practice sign-in. Copy compliance is unit-tested in
// src/compliance/landing.test.ts.
//
// The B2B landing moved from "/" to "/practices" when the patient-facing care finder
// took the root route. Same LANDING_COPY, same gate — only the URL changed, so these
// assertions follow it rather than being relaxed.

import { expect, test } from "@playwright/test";

const B2B = "/practices";

test("landing page renders the B2B positioning and CTAs", async ({ page }) => {
  await page.goto(B2B);
  await expect(
    page.getByRole("heading", { name: /unused appointment capacity into measured continuity/i }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "How it works" })).toBeVisible();
  await expect(page.getByText(/incremental attended appointments per 1,000/i)).toBeVisible();

  // No public content should require auth; it's a marketing page.
  await expect(page).toHaveURL(/\/practices$/);
});

test("the team page is gated shut, with no door and no crawl (O155)", async ({ page }) => {
  // Founder-directed 2026-08-21: "make team hidden at the moment… we are still building and we
  // dont know who will be on it finally". This test used to assert the opposite — that the About
  // us door opened /about — and it is INVERTED rather than deleted, so the gate cannot be removed
  // by accident and the day it reopens somebody has to change this file on purpose.
  //
  // Hiding a page is four things, and missing any one leaves it half-hidden.
  await page.goto("/");

  // 1. No door, in either footer.
  await expect(page.locator(".story-footer").getByRole("link", { name: "About us" })).toHaveCount(0);
  await expect(page.getByRole("link", { name: "About us" })).toHaveCount(0);

  // 2. The route does not serve. Unlinking alone would hide the door and leave the room open —
  //    /about publishes named individuals' faces, roles and affiliations to anybody with the URL.
  const response = await page.goto("/about");
  expect(response?.status(), "/about still serves while the team is gated").toBe(404);
  await expect(page.locator(".story-team")).toHaveCount(0);

  // 3. Not advertised to crawlers. A gated route still listed in the sitemap is hidden from
  //    readers and announced to robots.
  const sitemap = await (await page.request.get("/sitemap.xml")).text();
  expect(sitemap).not.toContain("/about");

  // 4. The landing never got the chapter back when the page went away.
  await page.goto("/");
  await expect(page.locator("#about")).toHaveCount(0);
});

test("primary CTA goes to the demo; sign-in goes to the console", async ({ page }) => {
  await page.goto(B2B);
  await page.getByRole("link", { name: "Practice sign-in" }).first().click();
  await expect(page).toHaveURL(/\/console\/signin$/);

  await page.goto(B2B);
  await page.getByRole("link", { name: "See a demo" }).first().click();
  await expect(page).toHaveURL(/\/demo$/);
});

// A11Y-2 verify gate: the founder storybook's copy is readable when the JavaScript is not.
//
// The defect this pins was invisible to every other test in the suite, because every other test
// runs JavaScript — the page looked perfect the moment it hydrated. It shipped 24 elements at
// inline `opacity: 0` (motion/react renders `initial` on the server), so the headline existed in
// the DOM, was announced by a screen reader, and could not be read by anyone until the bundle
// arrived — or at all, if it never did.

const STORY = "/";

test("the storybook's copy is legible with JavaScript disabled", async ({ browser }) => {
  // OPACITY IS ASSERTED EXPLICITLY, and the reason is a trap worth leaving marked: Playwright's
  // `toBeVisible()` means "has a box and is not `visibility: hidden`" — an element at
  // `opacity: 0` passes it. A first draft of this test used `toBeVisible` alone and went on
  // passing with the defect restored, which is the whole bug: invisible content that every
  // ordinary check calls present.
  const context = await browser.newContext({ javaScriptEnabled: false });
  const page = await context.newPage();
  await page.goto(STORY);

  const legible = async (locator: import("@playwright/test").Locator, what: string) => {
    await expect(locator, `${what} is missing`).toHaveCount(1);
    const opacity = await locator.evaluate((el) => getComputedStyle(el).opacity);
    expect(Number(opacity), `${what} renders at opacity ${opacity} without JavaScript`).toBe(1);
  };

  await legible(page.getByRole("heading", { level: 1 }), "the hero headline");
  await legible(page.getByText("Why we founded ADHD.ME"), "the hero eyebrow");
  await legible(page.getByRole("heading", { name: /NSW and QLD/i }), "the NSW section");
  await legible(page.getByRole("heading", { name: /How it works/i }).first(), "the steps section");

  await context.close();
});

test("no public page ships hidden content in its server-rendered HTML", async ({ request }) => {
  // The mechanism, pinned alongside the outcome. Checking the rendered bytes catches a hidden
  // element the visibility assertions above do not happen to name — and names the page, so a
  // regression on a surface nobody thought about still fails loudly.
  for (const path of ["/", "/approach", "/finder", "/practices", "/clinicians", "/privacy", "/demo"]) {
    const html = await (await request.get(path)).text();
    const hidden = html.match(/opacity:\s*0[;"']/g) ?? [];
    expect(hidden, `${path} server-renders ${hidden.length} element(s) at opacity 0`).toEqual([]);
  }
});
