// W19 verify gate: admin ops console — invitation queue visibility, kill-switch,
// per-practice pause, and the auth guard.

import { expect, test } from "@playwright/test";

async function signInAndOnboard(page: import("@playwright/test").Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("owner@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(/\/console(\/onboarding)?$/);
  // Onboard so the signed-in user becomes owner (pause_sending grant).
  await page.goto("/console/onboarding");
  await page.getByLabel("Practice name").fill("Demo Family Practice");
  await page.getByLabel("Holdout share (%)").fill("10");
  await page.getByRole("button", { name: "Create practice" }).click();
  await page.waitForURL(/\/console$/);
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/ops"); // resets ops + booking rail
  await request.post("/api/mock/console"); // resets console (practice/memberships)
});

test("signed-out access to ops redirects to sign-in", async ({ page }) => {
  await page.goto("/console/ops");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("ops shows the invitation queue and toggles the kill-switch and pause", async ({ page, request }) => {
  await signInAndOnboard(page);
  await page.goto("/console/ops");

  // Queue visible from the booking-rail seed (three sent offers).
  await expect(page.getByRole("heading", { name: "Invitation queue" })).toBeVisible();
  await expect(page.getByText("Outstanding offers (3)")).toBeVisible();
  await expect(page.getByTestId("sending-status")).toHaveText(/Sending is active/);

  // Engage the kill switch.
  await page.getByRole("button", { name: "Engage kill switch" }).click();
  await expect(page.getByTestId("sending-status")).toHaveText(/kill switch engaged/);
  let state = await (await request.get("/api/mock/ops")).json();
  expect(state.switches.killSwitch).toBe(true);

  // Release it.
  await page.getByRole("button", { name: "Release kill switch" }).click();
  await expect(page.getByTestId("sending-status")).toHaveText(/Sending is active/);

  // Pause this practice.
  await page.getByRole("button", { name: "Pause this practice" }).click();
  await expect(page.getByTestId("sending-status")).toHaveText(/paused for this practice/);
  state = await (await request.get("/api/mock/ops")).json();
  expect(state.switches.pausedPracticeIds.length).toBe(1);

  // Resume.
  await page.getByRole("button", { name: "Resume this practice" }).click();
  await expect(page.getByTestId("sending-status")).toHaveText(/Sending is active/);
});

// W179 verify gate: "a dead feed and a quiet week render as DIFFERENT states, because they lead
// an operator to opposite actions". The count is zero in both, so the count is not the test —
// what the page TELLS AN OPERATOR TO DO is.

async function opsWith(
  page: import("@playwright/test").Page,
  request: import("@playwright/test").APIRequestContext,
  query: string,
) {
  await request.post(`/api/mock/ops?emptyQueue=1${query}`);
  await request.post("/api/mock/console");
  await signInAndOnboard(page);
  await page.goto("/console/ops");
  await expect(page.getByText("Outstanding offers (0)")).toBeVisible();
}

test("a quiet week and a dead feed are different states, not the same zero", async ({ page, request }) => {
  await opsWith(page, request, "&feed=well");
  await expect(page.getByTestId("silence-nothing_eligible")).toBeVisible();
  const quiet = (await page.getByTestId("silence").innerText()).trim();
  expect(quiet).toContain("No action needed");

  await opsWith(page, request, "&feed=down");
  await expect(page.getByTestId("silence-feed_down")).toBeVisible();
  const dead = (await page.getByTestId("silence").innerText()).trim();
  expect(dead).toContain("Check the connection");

  // The gate, asserted on the rendered page rather than on the module: same count, and an
  // operator reading one is not reading the other.
  expect(dead).not.toBe(quiet);
  await expect(page.getByTestId("silence-nothing_eligible")).toHaveCount(0);
});

test("an unknown feed says it does not know, rather than reading as quiet", async ({ page, request }) => {
  // The default state of the store: nothing recorded about the feed. The dangerous rendering is
  // the reassuring one, so this asserts the reassurance is ABSENT, not merely that copy appeared.
  await opsWith(page, request, "");
  await expect(page.getByTestId("silence-cannot_determine")).toBeVisible();
  await expect(page.getByTestId("silence-nothing_eligible")).toHaveCount(0);
  await expect(page.getByTestId("silence-nothing_arrived")).toHaveCount(0);
});

test("a halt and a dead feed are both named, so fixing one does not look like fixing it", async ({ page, request }) => {
  await opsWith(page, request, "&feed=down");
  await page.getByRole("button", { name: "Engage kill switch" }).click();
  await expect(page.getByTestId("sending-status")).toHaveText(/kill switch engaged/);
  await expect(page.getByTestId("silence-held_by_switch")).toBeVisible();
  await expect(page.getByTestId("silence-feed_down")).toBeVisible();

  // Releasing the switch removes ONE cause and leaves the other standing — the operator is not
  // told the problem is solved.
  await page.getByRole("button", { name: "Release kill switch" }).click();
  await expect(page.getByTestId("silence-held_by_switch")).toHaveCount(0);
  await expect(page.getByTestId("silence-feed_down")).toBeVisible();
});

test("a never-connected practice is not shown as an outage", async ({ page, request }) => {
  await opsWith(page, request, "&feed=never");
  await expect(page.getByTestId("silence-never_connected")).toBeVisible();
  await expect(page.getByTestId("silence")).toContainText("Finish connecting");
});
