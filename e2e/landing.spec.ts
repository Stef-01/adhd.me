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
  await legible(page.getByText("Why I founded Meherr"), "the hero eyebrow");
  await legible(page.getByRole("heading", { name: /The same story kept repeating/i }), "chapter 1");
  await legible(page.getByRole("heading", { name: /Meherr helps South Asian women/i }), "chapter 5");

  await context.close();
});

test("no public page ships hidden content in its server-rendered HTML", async ({ request }) => {
  // The mechanism, pinned alongside the outcome. Checking the rendered bytes catches a hidden
  // element the visibility assertions above do not happen to name — and names the page, so a
  // regression on a surface nobody thought about still fails loudly.
  for (const path of ["/", "/finder", "/practices", "/clinicians", "/privacy", "/demo"]) {
    const html = await (await request.get(path)).text();
    const hidden = html.match(/opacity:\s*0[;"']/g) ?? [];
    expect(hidden, `${path} server-renders ${hidden.length} element(s) at opacity 0`).toEqual([]);
  }
});
