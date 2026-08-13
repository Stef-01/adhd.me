// W151 verify gate (e2e half): the education console in a browser.
//
// The assertions worth making here are the ones that are about ADJACENCY and about what is
// absent — properties of the rendered page rather than of a function, which is why they are e2e
// rather than unit. Three in particular:
//
//   Every in-scope item is on screen, and the count says so (W144 step 4).
//   No pathway verdict appears anywhere near the material (W144 step 6).
//   A colleague's reading record is not on this clinician's page (W149).
//
// The page's fixed copy is linted in src/education/advice-lint.test.ts; the sweep below is the
// second net, over the text as assembled, because a page can put two compliant sentences
// together and produce a third meaning.

import { expect, test } from "@playwright/test";

const EMAIL = "manager@demo.practice.example";

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/mock/console");
  await page.goto("/console");
  await page.getByLabel("Work email").fill(EMAIL);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
});

test("signed-out access redirects to sign-in", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/console/education");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("every in-scope item is shown, and the page says nothing was held back", async ({ page, request }) => {
  // W144 step 4 on screen. Two items are in scope and both are listed — there is no collapsed
  // view to expand and no "top pick", because a default view of one item IS a product that shows
  // one item.
  await request.post(`/api/mock/education?linkEmail=${EMAIL}`);
  await page.goto("/console/education");
  await expect(page.getByTestId("item-item-a1")).toBeVisible();
  await expect(page.getByTestId("item-item-a2")).toBeVisible();
  await expect(page.getByTestId("library-basis")).toContainText("2 item(s)");
  await expect(page.getByTestId("library-basis")).toContainText("all shown");
  await expect(page.getByTestId("library-all-shown")).toContainText("does not shorten this list");
  // The rank reads as a rank rather than as an answer.
  await expect(page.getByTestId("item-item-a1")).toContainText("1 of 2");
});

test("material for a register the practice does not run is NAMED, not hidden", async ({ page, request }) => {
  // Scoping on a practice-level fact is not withholding — but only if the practice can see that
  // it happened. Silence would leave a practice unable to notice it should run the register.
  await request.post(`/api/mock/education?linkEmail=${EMAIL}`);
  await page.goto("/console/education");
  await expect(page.getByTestId("library-basis")).toContainText(
    "registers this practice does not run",
  );
  await expect(page.getByTestId("library-basis")).toContainText("placeholder_register_b");
  await expect(page.getByTestId("item-item-b1")).toHaveCount(0);
});

test("the ordering basis describes the order actually used", async ({ page, request }) => {
  // No patient is in view on a library page, so the sort key is the item id. Saying the list
  // reflects a patient's record here would be an account a reader could not check.
  await request.post(`/api/mock/education?linkEmail=${EMAIL}`);
  await page.goto("/console/education");
  await expect(page.getByTestId("library-basis")).toContainText("Ordered by item id");
  await expect(page.getByTestId("library-basis")).not.toContainText("recorded facts each item");
});

test("no pathway verdict is rendered alongside the material", async ({ page, request }) => {
  // W144 step 6. W120's verdict is honest where it lives; next to material about the same
  // pathway it becomes advice by adjacency, which is how a product recommends something without
  // writing a recommendation.
  await request.post(`/api/mock/education?linkEmail=${EMAIL}`);
  await page.goto("/console/education");
  const body = (await page.locator("body").innerText()).toLowerCase();
  for (const verdict of ["criteria_met", "criteria not met", "cannot_determine", "meets the criteria", "eligible"]) {
    expect(body, `education page renders a pathway verdict: "${verdict}"`).not.toContain(verdict);
  }
  await expect(page.getByTestId("education-evaluation-note")).toContainText("is not repeated here");
});

test("the reading record is this clinician's, and a colleague's is absent", async ({ page, request }) => {
  await request.post(`/api/mock/education?linkEmail=${EMAIL}`);
  await page.goto("/console/education");
  await expect(page.getByTestId("cpd-cpd-1")).toBeVisible();
  await expect(page.getByTestId("cpd-cpd-colleague")).toHaveCount(0);
  await expect(page.locator("body")).not.toContainText("clin-2");
  await expect(page.getByTestId("cpd-list")).not.toContainText("Dr Demo Two");
});

test("a correction is marked alongside the original rather than removing it", async ({ page, request }) => {
  // The reading really did get logged. A record that can be silently rewritten is not evidence.
  await request.post(`/api/mock/education?linkEmail=${EMAIL}`);
  await page.goto("/console/education");
  await expect(page.getByTestId("cpd-cpd-2")).toBeVisible();
  await expect(page.getByTestId("cpd-corrected-cpd-2")).toContainText("said this entry was wrong");
  await expect(page.getByTestId("cpd-cpd-3")).toContainText("Opened by accident");
});

test("there is no practice view of who has read what", async ({ page, request }) => {
  // The page a practice would go to looking for that report is this one, so the refusal is
  // stated here. Checked over the LIST rows as well as the note — the note necessarily contains
  // the words it disclaims (W124's trap, W137's fix).
  await request.post(`/api/mock/education?linkEmail=${EMAIL}`);
  await page.goto("/console/education");
  const rows = (await page.getByTestId("cpd-list").innerText()).toLowerCase();
  for (const banned of ["practice", "team", "colleague", "everyone", "unread", "compliance"]) {
    expect(rows, `the reading record shows "${banned}"`).not.toContain(banned);
  }
  await expect(page.getByRole("heading", { name: "Your reading record" })).toBeVisible();
  await expect(page.getByText("no practice view of who has read what")).toBeVisible();
});

test("an unlinked sign-in is refused rather than guessed at", async ({ page, request }) => {
  await request.post("/api/mock/education");
  await page.goto("/console/education");
  await expect(page.getByTestId("cpd-unlinked")).toContainText("It will not guess.");
  await expect(page.getByTestId("cpd-list")).toHaveCount(0);
});

test("the empty library says why it is empty", async ({ page, request }) => {
  // W127's rule about zero states: a blank list reads as a loading failure or an unused feature,
  // and those lead a practice to opposite next actions.
  await request.post(`/api/mock/education?empty=1&linkEmail=${EMAIL}`);
  await page.goto("/console/education");
  await expect(page.getByTestId("library-empty")).toContainText("cleared sign-off");
  await expect(page.getByTestId("library-empty")).toContainText("failed to load");
  await expect(page.getByTestId("triggers-none")).toContainText("No teaching triggers ship");
});

test("the page makes no clinical claim and gives no instruction", async ({ page, request }) => {
  await request.post(`/api/mock/education?linkEmail=${EMAIL}`);
  await page.goto("/console/education");
  const body = (await page.locator("body").innerText()).toLowerCase();
  for (const banned of ["specialist", "expert", "best", "urgent", "rating", "you should", "we recommend", "next steps"]) {
    expect(body, `page copy contains "${banned}"`).not.toContain(banned);
  }
});

test("W154: material citing content that is not signed off is withheld, and named", async ({
  page,
  request,
}) => {
  // W151 rendered the curated list directly, so W152's provenance gate — the guarantee that
  // everything on this page traces to signed-off content — was never applied to the only
  // surface that renders material. The seed's refs pointed at nothing and were displayed as
  // though they were provenance, which is precisely the "looks sourced" failure.
  await request.post(`/api/mock/education?linkEmail=${EMAIL}&unbacked=1`);
  await page.goto("/console/education");

  // The backed items still show...
  await expect(page.getByTestId("item-item-a1")).toBeVisible();
  await expect(page.getByTestId("item-item-a2")).toBeVisible();
  // ...and the unbacked one does not.
  await expect(page.getByTestId("item-item-a3")).toHaveCount(0);

  // Withheld, not vanished: named, with why.
  const withheld = page.getByTestId("library-withheld");
  await expect(withheld).toBeVisible();
  await expect(page.getByTestId("withheld-item-a3")).toContainText("not currently signed off");

  // And the page no longer claims everything is shown, which would contradict the panel above.
  await expect(page.getByTestId("library-all-shown")).toHaveCount(0);
});

test("W154: with nothing withheld the page still says nothing was held back", async ({
  page,
  request,
}) => {
  // Guard against the fix over-firing: the honest claim must survive when it is true.
  await request.post(`/api/mock/education?linkEmail=${EMAIL}`);
  await page.goto("/console/education");
  await expect(page.getByTestId("library-withheld")).toHaveCount(0);
  await expect(page.getByTestId("library-all-shown")).toContainText("does not shorten this list");
});
