// W25 verify gate: the telehealth invitation variant end-to-end. A telehealth
// session's booking link shows video-appointment copy and confirms as such;
// the default (in-person) scenario is unchanged (covered by booking.spec.ts).

import { expect, test } from "@playwright/test";

interface MockState {
  invitations: Array<{ id: string; status: string; token: string }>;
  appointments: Array<{ appointmentType?: string }>;
}

test("a telehealth booking link shows and books a video appointment", async ({ page, request }) => {
  const seeded = (await (await request.post("/api/mock/state?scenario=telehealth")).json()) as MockState;
  expect(seeded.appointments.every((a) => a.appointmentType === "telehealth")).toBe(true);
  const token = seeded.invitations[0]!.token;

  await page.goto(`/book/${token}`);
  await expect(page.getByRole("heading", { name: "A video appointment is available" })).toBeVisible();
  await expect(page.getByText(/telehealth \(phone\/video\) appointment times/i)).toBeVisible();

  await page.getByRole("button", { name: "Confirm booking" }).click();
  await expect(page.getByRole("heading", { name: "Your video appointment is booked" })).toBeVisible();
  await expect(page.getByText(/the practice will call you/i)).toBeVisible();
});

test("the default scenario is still an in-person appointment", async ({ page, request }) => {
  const seeded = (await (await request.post("/api/mock/state")).json()) as MockState;
  expect(seeded.appointments.every((a) => a.appointmentType === "standard")).toBe(true);
  const token = seeded.invitations[0]!.token;

  await page.goto(`/book/${token}`);
  await expect(page.getByRole("heading", { name: "An appointment is available" })).toBeVisible();
});
