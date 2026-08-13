// W137 verify gate (e2e half): both sides, and cross-practice isolation.
//
// The isolation assertion a browser CAN make is that a third practice's referral appears on
// neither list — one session, one practice, and a row that must not be there. The two-practice
// case is unit-tested in src/referrals/store.test.ts, because a second practice is not
// reachable from one browser session and driving it here would be theatre (W83's rule).

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
  await page.goto("/console/referrals");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("shows both sides, and they are separate lists", async ({ page, request }) => {
  await request.post("/api/mock/referrals");
  await page.goto("/console/referrals");
  await expect(page.getByRole("heading", { name: "Sent to this practice" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sent by this practice" })).toBeVisible();
  await expect(page.getByTestId("received-list")).toContainText("ref-received");
  await expect(page.getByTestId("sent-list")).toContainText("ref-sent-open");
  // Neither list carries the other's rows.
  await expect(page.getByTestId("received-list")).not.toContainText("ref-sent-open");
  await expect(page.getByTestId("sent-list")).not.toContainText("ref-received");
});

test("a third practice's referral appears on neither list", async ({ page, request }) => {
  await request.post("/api/mock/referrals");
  await page.goto("/console/referrals");
  await expect(page.locator("body")).not.toContainText("ref-elsewhere");
  await expect(page.locator("body")).not.toContainText("pat-9");
});

test("only the receiving side can answer", async ({ page, request }) => {
  // The sender can act on almost nothing; the receiver holds the one decision that moves a
  // referral. Controls live where the decision is.
  await request.post("/api/mock/referrals");
  await page.goto("/console/referrals");
  await expect(page.getByTestId("received-ref-received").getByRole("button", { name: "Accept" })).toBeVisible();
  await expect(page.getByTestId("sent-ref-sent-open").getByRole("button")).toHaveCount(0);
});

test("accepting is recorded and the state changes", async ({ page, request }) => {
  await request.post("/api/mock/referrals");
  await page.goto("/console/referrals");
  await page.getByTestId("received-ref-received").getByRole("button", { name: "Accept" }).click();
  await expect(page.getByTestId("referrals-saved")).toBeVisible();
  await expect(page.getByTestId("received-ref-received")).toContainText("Accepted");
  // Answered once, so the controls are gone rather than merely disabled.
  await expect(page.getByTestId("received-ref-received").getByRole("button", { name: "Accept" })).toHaveCount(0);
});

test("declining requires a reason", async ({ page, request }) => {
  await request.post("/api/mock/referrals");
  await page.goto("/console/referrals");
  await page.getByTestId("received-ref-received").getByRole("button", { name: "Decline" }).click();
  await expect(page.getByTestId("referrals-error")).toContainText("Say why you are declining it.");
  // And the referral is still unanswered — a refused decline must not half-record.
  await expect(page.getByTestId("received-ref-received")).toContainText("Awaiting acceptance");
});

test("an unanswered referral says the sending practice is still watching", async ({ page, request }) => {
  // W134's line, on screen: sending is not transferring.
  await request.post("/api/mock/referrals");
  await page.goto("/console/referrals");
  await expect(page.getByTestId("received-ref-received")).toContainText("not looking after this patient yet");
  await expect(page.getByTestId("referrals-note")).toContainText("still looking after the patient");
});

test("a returned referral shows the outcome and nothing is outstanding", async ({ page, request }) => {
  await request.post("/api/mock/referrals");
  await page.goto("/console/referrals");
  await expect(page.getByTestId("returned-ref-sent-back")).toContainText("ongoing care comes back");
  await expect(page.getByTestId("outstanding-ref-sent-back")).toHaveCount(0);
});

test("an open referral names who it is waiting on", async ({ page, request }) => {
  await request.post("/api/mock/referrals");
  await page.goto("/console/referrals");
  await expect(page.getByTestId("outstanding-ref-sent-open")).toContainText("Waiting on");
});

test("shows no credential or capability detail about anyone", async ({ page, request }) => {
  // The founder's A-or-B ruling is outstanding, so this page is built to the safe intersection
  // the same way W131's document was. Adding it before the ruling would make the ruling.
  await request.post("/api/mock/referrals");
  await page.goto("/console/referrals");
  // Checked over the LIST ROWS, which is where a leak would actually appear — a credential
  // would arrive as data about a referral, not as prose in a standing note. Scoping is needed
  // because the note necessarily contains the word it disclaims ("qualifications ... are not
  // shown"), the same trap W124 hit: a word list is a proxy for "shows no credential detail",
  // and the proxy flags the sentence that promises the opposite. The note's exact wording is
  // pinned by the assertion below, so both parts of the page are covered.
  const rows = (
    (await page.getByTestId("received-list").innerText()) +
    (await page.getByTestId("sent-list").innerText())
  ).toLowerCase();
  for (const banned of ["credential", "qualification", "verified by", "competence", "accredited"]) {
    expect(rows, `referral rows show "${banned}"`).not.toContain(banned);
  }
  await expect(page.getByTestId("referrals-note")).toContainText("qualifications held at the other practice are not shown");
});

test("the page makes no clinical claim", async ({ page, request }) => {
  await request.post("/api/mock/referrals");
  await page.goto("/console/referrals");
  const body = (await page.locator("body").innerText()).toLowerCase();
  for (const banned of ["specialist", "expert", "best", "urgent", "rating"]) {
    expect(body, `page copy contains "${banned}"`).not.toContain(banned);
  }
});

test("the empty state says so on both sides", async ({ page, request }) => {
  await request.post("/api/mock/referrals?empty=1");
  await page.goto("/console/referrals");
  await expect(page.getByTestId("received-empty")).toBeVisible();
  await expect(page.getByTestId("sent-empty")).toBeVisible();
});
