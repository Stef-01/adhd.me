// W74 verify gate: a patient sets contact-time and channel preferences on their own
// booking page, and what they set is what gets stored and honoured. The scheduling rule
// itself is unit-tested in src/messaging/preferences.test.ts.

import { expect, test } from "@playwright/test";

interface MockState {
  invitations: Array<{ id: string; status: string; token: string; patientId: string }>;
}

async function bookedPage(page: import("@playwright/test").Page, token: string) {
  await page.goto(`/book/${token}`);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await page.getByRole("heading", { name: /is booked/ }).waitFor();
}

test.beforeEach(async ({ request }) => {
  await request.post("/api/mock/state");
});

test("the preferences form appears only after booking", async ({ page, request }) => {
  const seeded = (await (await request.get("/api/mock/state")).json()) as MockState;
  const token = seeded.invitations[0]!.token;

  // Before booking: the offer, and no preferences form — answering one must never be a
  // gate in front of taking an appointment.
  await page.goto(`/book/${token}`);
  await expect(page.getByTestId("contact-preferences")).toHaveCount(0);

  await bookedPage(page, token);
  await expect(page.getByTestId("contact-preferences")).toBeVisible();
});

test("a patient narrows their contact hours and the choice is stored", async ({ page, request }) => {
  const seeded = (await (await request.get("/api/mock/state")).json()) as MockState;
  const invitation = seeded.invitations[0]!;
  await bookedPage(page, invitation.token);

  await page.getByTestId("pref-earliest").selectOption("17");
  await page.getByTestId("pref-latest").selectOption("20");
  await page.getByRole("button", { name: "Save contact times" }).click();

  await expect(page.getByTestId("pref-saved")).toBeVisible();

  const after = (await (await request.get("/api/mock/preferences")).json()) as {
    preferences: Record<string, { channel: string | null; earliestHour: number; latestHour: number; days: number[] }>;
  };
  const stored = after.preferences[invitation.patientId];
  expect(stored).toBeDefined();
  expect(stored!.earliestHour).toBe(17);
  expect(stored!.latestHour).toBe(20);
  expect(stored!.channel).toBe("sms");

  // Survives a reload: the form shows back what the patient chose, not the default.
  await page.goto(`/book/${invitation.token}`);
  await expect(page.getByTestId("pref-earliest")).toHaveValue("17");
  await expect(page.getByTestId("pref-latest")).toHaveValue("20");
});

test("opting out of texts stores no channel rather than a quieter schedule", async ({ page, request }) => {
  const seeded = (await (await request.get("/api/mock/state")).json()) as MockState;
  const invitation = seeded.invitations[0]!;
  await bookedPage(page, invitation.token);

  await page.getByTestId("pref-contactable").uncheck();
  await page.getByRole("button", { name: "Save contact times" }).click();
  await expect(page.getByTestId("pref-saved")).toBeVisible();

  const after = (await (await request.get("/api/mock/preferences")).json()) as {
    preferences: Record<string, { channel: string | null }>;
    plans: Record<string, { send: boolean; reason?: string }>;
  };
  expect(after.preferences[invitation.patientId]!.channel).toBeNull();
  // Honoured, not merely recorded: no channel means no send, with a stated reason.
  expect(after.plans[invitation.patientId]).toEqual({ send: false, reason: "no_channel_chosen" });
});

test("an impossible window is refused, and the previous choice survives", async ({ page, request }) => {
  const seeded = (await (await request.get("/api/mock/state")).json()) as MockState;
  const invitation = seeded.invitations[0]!;
  await bookedPage(page, invitation.token);

  await page.getByTestId("pref-earliest").selectOption("9");
  await page.getByTestId("pref-latest").selectOption("18");
  await page.getByRole("button", { name: "Save contact times" }).click();
  await expect(page.getByTestId("pref-saved")).toBeVisible();

  // Now an end time before the start time.
  await page.getByTestId("pref-earliest").selectOption("20");
  await page.getByTestId("pref-latest").selectOption("8");
  await page.getByRole("button", { name: "Save contact times" }).click();

  await expect(page.getByTestId("pref-invalid")).toBeVisible();

  const after = (await (await request.get("/api/mock/preferences")).json()) as {
    preferences: Record<string, { earliestHour: number; latestHour: number }>;
  };
  // The rejected window did not overwrite the good one.
  expect(after.preferences[invitation.patientId]).toEqual(
    expect.objectContaining({ earliestHour: 9, latestHour: 18 }),
  );
});

test("the preferences copy makes no clinical claim", async ({ page, request }) => {
  const seeded = (await (await request.get("/api/mock/state")).json()) as MockState;
  await bookedPage(page, seeded.invitations[0]!.token);

  const form = page.getByTestId("contact-preferences");
  await expect(form).toBeVisible();
  const text = ((await form.textContent()) ?? "").toLowerCase();

  expect(text).toContain("when can we contact you");
  for (const banned of ["overdue", "urgent", "you need", "at risk", "check-up", "your health"]) {
    expect(text, `preferences copy must not say "${banned}"`).not.toContain(banned);
  }
});
