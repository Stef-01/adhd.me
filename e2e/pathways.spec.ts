// W127 verify gate (e2e): "zero signed at ship, and the dashboard says so rather than
// rendering empty."
//
// The first test is the gate's second half and it is the one that matters. An empty table
// reads as a loading failure or as a feature nobody has used; neither is true. Nothing is
// signed off because signing clinical content off is a founder act that has not happened, and
// those two readings lead a practice to opposite next actions.

import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page, request }) => {
  await request.post("/api/mock/console");
  await page.goto("/console");
  await page.getByLabel("Work email").fill("manager@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
});

test("signed-out access redirects to sign-in", async ({ page, context }) => {
  await context.clearCookies();
  await page.goto("/console/pathways");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("with nothing signed off it SAYS so, rather than rendering an empty table", async ({
  page,
  request,
}) => {
  await request.post("/api/mock/pathways?empty=1");
  await page.goto("/console/pathways");

  const none = page.getByTestId("pathways-none");
  await expect(none).toBeVisible();
  await expect(none).toContainText("No pathway has been signed off yet.");
  // The two misreadings the copy exists to prevent, both named explicitly.
  await expect(none).toContainText("not a loading error");
  await expect(none).toContainText("not a page waiting for you to fill it in");
  // And it explains what would have to happen, not just that nothing has.
  await expect(none).toContainText("two people and two separate steps");

  await expect(page.getByTestId("pathways-list")).toHaveCount(0);
  await expect(page.getByTestId("signed-count")).toContainText("0");
});

test("the shipped catalogue really is empty — zero signed at ship", async ({ page, request }) => {
  // Not the seeded-empty case: this is the registry in its shipped state, which is what a
  // practice would see on a fresh install.
  const state = await (await request.get("/api/mock/pathways")).json();
  await page.goto("/console/pathways");
  await expect(page.getByTestId("pathways-none")).toBeVisible();
  expect(state.versions).toEqual([]);
  expect(state.attestations).toEqual([]);
});

test("a signed-off pathway shows who reviewed it and who signed it", async ({ page, request }) => {
  await request.post("/api/mock/pathways");
  await page.goto("/console/pathways");

  const list = page.getByTestId("pathways-list");
  await expect(list).toContainText("placeholder-pathway-1");
  await expect(list).toContainText("Signed off and in use");
  await expect(list).toContainText("reviewer@demo.example on 2026-01-03");
  await expect(list).toContainText("founder@demo.example on 2026-01-04");
  await expect(page.getByTestId("signed-count")).toContainText("1");
});

test("reviewed-but-unsigned is its own state, not a generic refusal", async ({ page, request }) => {
  // W119 writes a specific sentence for each way a version fails the gate, and 'waiting on
  // founder sign-off' is a different situation from 'nobody has looked'.
  await request.post("/api/mock/pathways");
  await page.goto("/console/pathways");
  const body = await page.locator("body").innerText();
  expect(body).toContain("waiting on founder sign-off");
  expect(body).toContain("Not in use");
});

test("the rules themselves are never rendered", async ({ page, request }) => {
  // Unreviewed clinical material must not appear in a console with the product's name on it.
  // Counts, yes; the criteria, no.
  await request.post("/api/mock/pathways");
  await page.goto("/console/pathways");
  const body = await page.locator("body").innerText();
  for (const factCode of ["placeholder_fact_a", "placeholder_fact_b", "placeholder_fact_c", "placeholder_fact_d"]) {
    expect(body, `criteria leaked: ${factCode}`).not.toContain(factCode);
  }
  expect(body).toContain("2 inclusion, 1 exclusion, 0 escalation");
  await expect(page.getByTestId("pathways-note")).toContainText("not shown here");
});

test("the page makes no clinical claim", async ({ page, request }) => {
  await request.post("/api/mock/pathways");
  await page.goto("/console/pathways");
  const body = (await page.locator("body").innerText()).toLowerCase();
  for (const banned of ["specialist in", "expert", "best", "recommended", "rating", "guarantee"]) {
    expect(body, `page copy contains "${banned}"`).not.toContain(banned);
  }
});
