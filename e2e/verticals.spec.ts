// W164 verify gate (e2e half): "e2e + axe zero violations; the zero state SAYS why it is empty
// rather than rendering a blank grid."
//
// The page has TWO empty states that mean opposite things — nothing assembled yet (work, and
// doable) versus assembled and waiting on people (no amount of building helps) — so the tests
// assert they are DISTINGUISHABLE, not merely non-blank. A single "nothing here" message would
// pass a naive check and still tell a practice the wrong thing about what to do next.

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
  await page.goto("/console/verticals");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("with nothing declared, the page says so and says it is not an error", async ({ page, request }) => {
  await request.post("/api/mock/verticals?mode=empty");
  await page.goto("/console/verticals");
  await expect(page.getByTestId("verticals-none-declared")).toContainText("not a loading error");
  await expect(page.getByTestId("verticals-none-declared")).toContainText(
    "which pathways, material and monitoring intervals belong together",
  );
  // And it says this step needs nobody's sign-off — the actionable half.
  await expect(page.getByTestId("verticals-none-declared")).toContainText("does not need anybody");
  await expect(page.getByTestId("verticals-list")).toHaveCount(0);
});

test("with everything declared and nothing signed off, it says the OPPOSITE thing", async ({ page, request }) => {
  // The distinction the unit turns on. "Nothing assembled" says keep going; "assembled, nothing
  // signed off" says the remaining work belongs to people, not to building.
  await request.post("/api/mock/verticals");
  await page.goto("/console/verticals");
  await expect(page.getByTestId("verticals-nothing-ready")).toContainText("waiting on people");
  await expect(page.getByTestId("verticals-nothing-ready")).toContainText("complete as an assembly");
  await expect(page.getByTestId("verticals-none-declared")).toHaveCount(0);
});

test("the two empty states are never shown together", async ({ page, request }) => {
  for (const mode of ["empty", "declared"]) {
    await request.post(`/api/mock/verticals?mode=${mode}`);
    await page.goto("/console/verticals");
    const declared = await page.getByTestId("verticals-none-declared").count();
    const nothingReady = await page.getByTestId("verticals-nothing-ready").count();
    expect(declared + nothingReady, `mode=${mode}`).toBe(1);
  }
});

test("a vertical names what is outstanding and who has to act", async ({ page, request }) => {
  await request.post("/api/mock/verticals");
  await page.goto("/console/verticals");
  await expect(page.getByTestId("vertical-vert-example")).toContainText("0 of 3 parts ready");
  await expect(page.getByTestId("outstanding-vert-example")).toContainText("specialist review");
  // The interval blocker names the ruling rather than a person, because nobody can act first.
  await expect(page.getByTestId("outstanding-vert-example")).toContainText("nobody can act before it");
});

test("a member that exists is distinguished from one that was never written", async ({ page, request }) => {
  // W158's pool doing its job on screen: "waiting on a reviewer" and "waiting on an author" are
  // different jobs, and a page that showed both as 'missing' would send the reader to the wrong one.
  await request.post("/api/mock/verticals");
  await page.goto("/console/verticals");
  const row = page.getByTestId("vertical-vert-example");
  await expect(row).toContainText("Written, not yet through its gate");
  await expect(row).toContainText("Nothing exists under this reference");
});

test("a contradicting vertical is refused, and the refusal says what to do", async ({ page, request }) => {
  // W159 wired through to the surface. The seeded case is a signed-off pathway that excludes
  // everyone it includes — the one blocking contradiction reachable through the registries today
  // (see the mock route's note: supersession makes two-versions unreachable, and empty
  // SHIPPED_INTERVALS makes two-intervals unreachable until G5).
  await request.post("/api/mock/verticals?mode=contradiction");
  await page.goto("/console/verticals");
  await expect(page.getByTestId("vertical-vert-clash")).toContainText("Not usable");
  // The refusal list carries the general reason; the finding beneath it names the specific one.
  await expect(page.getByTestId("refusals-vert-clash")).toContainText("contradict each other");
  await expect(page.getByTestId("contradictions-vert-clash")).toContainText(
    "both includes and excludes on fact_c",
  );
  await expect(page.getByTestId("contradictions-vert-clash")).toContainText("nobody can ever satisfy it");
  // The member itself IS ready — the vertical fails on coherence, not on a missing part, and the
  // page has to distinguish those or a reader chases the wrong thing.
  await expect(page.getByTestId("vertical-vert-clash")).toContainText("1 of 1 parts ready");
});

test("no pathway criteria are rendered anywhere on the page", async ({ page, request }) => {
  // W127's rule: unreviewed clinical content does not go in front of a clinician with the
  // product's name on it. The seeded criteria use fact codes, so their absence is checkable.
  //
  // The one deliberate exception is a W159 finding, which names the fact code a pathway
  // contradicts itself on — asserted in the test above. That is diagnostic rather than clinical:
  // a defect report a reader cannot act on without knowing WHICH code is not a defect report.
  await request.post("/api/mock/verticals");
  await page.goto("/console/verticals");
  const body = await page.locator("body").innerText();
  expect(body).not.toContain("fact_a");
  expect(body).not.toContain("Placeholder.");
  await expect(page.getByTestId("verticals-note")).toContainText("not about the clinical content");
});

test("the page makes no clinical claim", async ({ page, request }) => {
  await request.post("/api/mock/verticals");
  await page.goto("/console/verticals");
  const body = (await page.locator("body").innerText()).toLowerCase();
  for (const banned of ["specialist in", "expert", "best", "urgent", "rating", "you should"]) {
    expect(body, `page copy contains "${banned}"`).not.toContain(banned);
  }
});
