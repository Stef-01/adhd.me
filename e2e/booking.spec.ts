// W7 verify gate: tokenised deep link → booking page → booking recorded →
// remaining offers expire when the session fills. Runs against the mock rail's
// deterministic synthetic seed (2 open slots, 3 sent invitations).

import { expect, test } from "@playwright/test";

interface MockState {
  invitations: Array<{ id: string; status: string; token: string }>;
  appointments: Array<{ id: string; status: string; generatedByInvitation: boolean }>;
  auditEvents: Array<{ kind: string; subjectId: string }>;
}

test("booking link books a slot; offers expire on session fill", async ({ page, request }) => {
  const seeded = (await (await request.post("/api/mock/state")).json()) as MockState;
  expect(seeded.invitations.map((i) => i.status)).toEqual(["sent", "sent", "sent"]);
  const [first, second, third] = seeded.invitations;

  // First patient follows their deep link and confirms.
  await page.goto(`/book/${first!.token}`);
  await expect(page.getByRole("heading", { name: "An appointment is available" })).toBeVisible();
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "Your appointment is booked" })).toBeVisible();

  // Second patient takes the last open slot.
  await page.goto(`/book/${second!.token}`);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "Your appointment is booked" })).toBeVisible();

  // Third offer expired the moment the session filled.
  await page.goto(`/book/${third!.token}`);
  await expect(
    page.getByRole("heading", { name: "This appointment offer is no longer available" }),
  ).toBeVisible();

  // The rail recorded both bookings as invitation-generated and audited the expiry.
  const after = (await (await request.get("/api/mock/state")).json()) as MockState;
  expect(after.invitations.map((i) => i.status)).toEqual(["booked", "booked", "expired"]);
  expect(after.appointments.every((a) => a.status === "booked" && a.generatedByInvitation)).toBe(true);
  expect(after.auditEvents.map((e) => e.kind)).toEqual([
    "invitation_booked",
    "invitation_booked",
    "invitation_expired",
  ]);
});

test("tampered and malformed tokens are refused", async ({ page, request }) => {
  const seeded = (await (await request.post("/api/mock/state")).json()) as MockState;
  const token = seeded.invitations[0]!.token;

  await page.goto(`/book/${token.slice(0, -3)}xyz`);
  await expect(page.getByRole("heading", { name: "This booking link isn't valid" })).toBeVisible();

  await page.goto("/book/not-a-token");
  await expect(page.getByRole("heading", { name: "This booking link isn't valid" })).toBeVisible();

  // Nothing was booked by the refused visits.
  const after = (await (await request.get("/api/mock/state")).json()) as MockState;
  expect(after.appointments.every((a) => a.status === "open")).toBe(true);
});

test("a booked link stays on its confirmation view", async ({ page, request }) => {
  const seeded = (await (await request.post("/api/mock/state")).json()) as MockState;
  const token = seeded.invitations[0]!.token;

  await page.goto(`/book/${token}`);
  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "Your appointment is booked" })).toBeVisible();

  await page.goto(`/book/${token}`);
  await expect(page.getByRole("heading", { name: "Your appointment is booked" })).toBeVisible();
});
