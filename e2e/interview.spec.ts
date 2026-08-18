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

test("screenshots for the design record", async ({ page }) => {
  await signIn(page);
  await page.getByLabel("Interview transcript").fill(
    "i: How does a first appointment usually go?\nI book a longer first appointment, you cannot take a proper history in fifteen minutes.\nTitration is mine, I do not hand that back.\nI run a walking group on Thursdays for my older patients.",
  );
  await page.locator(".iv-proposal").first().waitFor();
  await page.screenshot({ path: "qa/interview-o30/interview-desktop.png", fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.waitForTimeout(300);
  await page.screenshot({ path: "qa/interview-o30/interview-mobile.png", fullPage: true });
});
