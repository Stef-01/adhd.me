// O30: the onboarding interview screen — the transcript is editable, the proposals are live,
// and only a recorded answer becomes part of the draft.
import { expect, test } from "@playwright/test";

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/console");
});

async function signIn(page: import("@playwright/test").Page) {
  await page.goto("/console/signin");
  await page.getByLabel("Work email").fill("interviewer@demo.practice.example");
  await page.getByRole("button", { name: "Sign in" }).click();
  // Let the sign-in redirect land (the session cookie arrives with it) before navigating on.
  await page.waitForURL((url) => !url.pathname.endsWith("/signin"));
  await page.goto("/console/interview");
  await expect(page.getByRole("heading", { name: "Onboarding interview" })).toBeVisible();
}

test("signed-out access is sent to sign-in, like every console page", async ({ page }) => {
  await page.goto("/console/interview");
  await expect(page).toHaveURL(/\/console\/signin$/);
});

test("the doctor talks, the machine proposes, the interviewer records the answer", async ({ page }) => {
  await signIn(page);

  // Empty state says what will happen, not that something is wrong.
  await expect(page.getByText("Proposals appear here as the doctor talks.")).toBeVisible();

  // The interviewer's own line is never read: prefixed with i:, it proposes nothing.
  const transcript = page.getByLabel("Interview transcript");
  await transcript.fill("i: Do you carry titration and dose review yourself?");
  await expect(page.getByText("Proposals appear here as the doctor talks.")).toBeVisible();

  // The doctor's answer is read, and the proposal carries the scripted question back.
  await transcript.fill(
    "i: Do you carry titration and dose review yourself?\nTitration is mine, I do not hand that back to the psychiatrist.",
  );
  const proposal = page.locator(".iv-proposal", { hasText: "Titration is mine" });
  await expect(proposal).toBeVisible();
  await expect(proposal.getByText("Do you carry titration and dose review yourself?")).toBeVisible();

  // Recording the answer marks it, and the count says where the interview is up to.
  await proposal.getByRole("button", { name: "Often" }).click();
  await expect(proposal.getByRole("button", { name: "Often" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: /1 of \d+ confirmed/ })).toBeVisible();

  // Recording the same answer again un-records it — one tap undoes a mis-click.
  await proposal.getByRole("button", { name: "Often" }).click();
  await expect(proposal.getByRole("button", { name: "Often" })).toHaveAttribute("aria-pressed", "false");
  await proposal.getByRole("button", { name: "Sometimes" }).click();

  // Saving needs the people named; then it writes the same draft the review editor writes.
  const save = page.getByRole("button", { name: "Save this interview" });
  await expect(save).toBeDisabled();
  await page.getByLabel("Doctor’s name, as patients will see it").fill("Dr Interview Test");
  await page.getByLabel("Interviewer — recorded beside every answer").fill("Console interviewer");
  await save.click();
  await expect(page.getByText(/Saved as a draft\. 1 accepted/)).toBeVisible();
});

test("the checklist shrinks as the doctor talks, and a gap answer reaches the save (O36)", async ({ page }) => {
  await signIn(page);

  // Before a word is typed, the sweep IS the whole structured interview.
  const sweepHeading = page.getByRole("heading", { name: /Still to ask/ });
  await expect(sweepHeading).toBeVisible();
  const fullCount = await page.locator(".iv-sweep-row").count();
  expect(fullCount).toBeGreaterThanOrEqual(20);

  // The doctor covers titration in conversation: the question leaves the checklist because it
  // moved up into the proposals — asked from the transcript, not asked twice.
  await page.getByLabel("Interview transcript").fill("Titration is mine, I do not hand that back to the psychiatrist.");
  await expect(page.locator(".iv-proposal", { hasText: "Titration is mine" })).toBeVisible();
  await expect(page.locator(".iv-sweep-row")).toHaveCount(fullCount - 1);
  await expect(page.locator(".iv-sweep-row", { hasText: "Do you carry titration and dose review yourself?" })).toHaveCount(0);

  // Answering a question from the sweep records the same three-state answer...
  const sharedCare = page.locator(".iv-sweep-row", { hasText: "Shared care with a treating psychiatrist" });
  await sharedCare.getByRole("button", { name: "Sometimes" }).click();
  await expect(sharedCare.getByRole("button", { name: "Sometimes" })).toHaveAttribute("aria-pressed", "true");
  await expect(page.getByRole("heading", { name: new RegExp(`${fullCount - 2} of ${fullCount - 1}`) })).toBeVisible();

  // ...and lands in the same saved draft as a transcript answer.
  await page.locator(".iv-proposal", { hasText: "Titration is mine" }).getByRole("button", { name: "Often" }).click();
  await page.getByLabel("Doctor’s name, as patients will see it").fill("Dr Sweep Test");
  await page.getByLabel("Interviewer — recorded beside every answer").fill("Console interviewer");
  await page.getByRole("button", { name: "Save this interview" }).click();
  await expect(page.getByText(/Saved as a draft\. 2 accepted/)).toBeVisible();
});

test("a saved interview's unheard sentences land in the reach-gap feed (O38)", async ({ page }) => {
  await signIn(page);

  // A sentence both readers are silent on, riding beside one they hear.
  await page.getByLabel("Interview transcript").fill(
    "Titration is mine, I do not hand that back.\nI run a walking group on Thursdays for my older patients.",
  );
  await page.locator(".iv-proposal", { hasText: "Titration is mine" }).getByRole("button", { name: "Often" }).click();
  await page.getByLabel("Doctor’s name, as patients will see it").fill("Dr Reach Feed");
  await page.getByLabel("Interviewer — recorded beside every answer").fill("Console interviewer");
  await page.getByRole("button", { name: "Save this interview" }).click();
  await expect(page.getByText(/Saved as a draft/)).toBeVisible();

  // The feed on the matching console carries it, as a record rather than a live panel.
  await page.goto("/console/matching");
  const feed = page.locator(".mc-section", { has: page.getByRole("heading", { name: "The reach-gap feed" }) });
  const entry = feed.locator(".mc-clinician", { hasText: "Dr Reach Feed" });
  await expect(entry).toBeVisible();
  // Unheard by BOTH readers, so the sentence sits in both lists — patient-side and proposer-side.
  await expect(entry.getByText(/walking group on Thursdays/)).toHaveCount(2);
  await expect(entry.getByText(/saved \d{4}-\d{2}-\d{2} by Console interviewer/)).toBeVisible();

  // The design record: the feed as shipped, desktop and phone widths.
  await feed.screenshot({ path: "qa/reach-o38/reach-feed-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await feed.screenshot({ path: "qa/reach-o38/reach-feed-mobile.png" });
});

test("the matching console prices capacity age: a freshness row and a reconfirm date per declaration (O56)", async ({ page }) => {
  await signIn(page);
  await page.goto("/console/matching");

  const panel = page.locator(".mc-section", { has: page.getByRole("heading", { name: "Capacity freshness" }) });
  await expect(panel).toBeVisible();

  // Every roster declaration is dated and carries its nudge. The live roster is fresh today,
  // so the nudge is the reconfirm-by date; the stale wording is pinned by the unit tests with
  // an injected clock, because a real stale entry on this page would mean the date had actually
  // lapsed for a real practice.
  for (const clinician of ["Dr Anubhav Saxena", "Dr Tushar Yadav", "Dr Anusha Saxena"]) {
    const row = panel.locator(".mc-clinician", { hasText: clinician });
    await expect(row.getByText(/declared \d{4}-\d{2}-\d{2}/)).toBeVisible();
    await expect(row.getByText(/Reconfirm (by \d{4}-\d{2}-\d{2}|needed)/)).toBeVisible();
  }

  // The design record for the panel.
  await panel.screenshot({ path: "qa/capacity-o56/freshness-panel-desktop.png" });
  await page.setViewportSize({ width: 390, height: 844 });
  await panel.screenshot({ path: "qa/capacity-o56/freshness-panel-mobile.png" });
});

test("screenshots for the design record", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Interview transcript").fill(
    "i: How does a first appointment usually go?\nI book a longer first appointment, you cannot take a proper history in fifteen minutes.\nTitration is mine, I do not hand that back.\nI run a walking group on Thursdays for my older patients.",
  );
  await page.locator(".iv-proposal").first().waitFor();
  await page.screenshot({ path: "qa/interview-o36/interview-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "qa/interview-o36/interview-mobile.png", fullPage: true });
});
