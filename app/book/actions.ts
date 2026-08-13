"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { bookInStore, getStore, saveContactPreferences } from "@/booking/store";
import { verifyBookingToken } from "@/booking/token";
import { rateLimit } from "@/lib/rate-limit";
import type { ContactPreferences } from "@/messaging/preferences";

/**
 * W74: the patient records when and how the practice may contact them.
 *
 * Unauthenticated like confirmBooking, so it is rate-limited the same way and can only
 * ever write against the invitation its own signed token names — a caller cannot set
 * another patient's preferences by supplying an id.
 */
export async function saveContactPreference(formData: FormData): Promise<void> {
  const token = formData.get("token");
  if (typeof token !== "string") return;
  const invitationId = verifyBookingToken(token);
  if (!invitationId) return;
  if (!rateLimit("contact-prefs", invitationId, { limit: 10, windowMs: 60_000 })) return;

  const store = getStore();
  const invitation = store.state.invitations.find((i) => i.id === invitationId);
  if (!invitation) return;

  const contactable = formData.get("contactable") === "1";
  const earliestHour = Number(formData.get("earliestHour"));
  const latestHour = Number(formData.get("latestHour"));
  const weekdaysOnly = formData.get("weekdaysOnly") === "1";

  const prefs: ContactPreferences = {
    channel: contactable ? "sms" : null,
    earliestHour,
    latestHour,
    days: weekdaysOnly ? [1, 2, 3, 4, 5] : [0, 1, 2, 3, 4, 5, 6],
  };

  // Scoped by the invitation's own practice, so a colliding patient id in another
  // practice can never be written through this token.
  const result = saveContactPreferences(invitation.practiceId, invitation.patientId, prefs);
  // Only ever an error KEY in the URL, never a message built from input (W41).
  redirect(`/book/${token}${result.ok ? "?prefs=saved" : "?prefs=invalid"}`);
}

export async function confirmBooking(formData: FormData): Promise<void> {
  const token = formData.get("token");
  if (typeof token !== "string") return;
  const invitationId = verifyBookingToken(token);
  if (!invitationId) return;
  // W37: unauthenticated endpoint — throttle per invitation; a patient never needs
  // more than a handful of attempts, replay floods do.
  if (!rateLimit("booking-confirm", invitationId, { limit: 10, windowMs: 60_000 })) return;
  bookInStore(invitationId, new Date().toISOString());
  revalidatePath(`/book/${token}`);
}
