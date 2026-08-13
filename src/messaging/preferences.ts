// W74: patient contact preferences — when, and by what channel.
//
// Distinct from W17's scheduling window, which governs which appointment SLOTS a practice
// will offer. This governs when a PATIENT has said they are willing to hear from the
// practice, and by what means.
//
// Three rules, each chosen because the alternative is the harm:
//
//   1. NEVER substitute a channel. If a patient's chosen channel is unavailable, they are
//      not contacted by another one. Reaching someone a way they did not agree to is the
//      failure, not a fallback.
//   2. NEVER send outside the stated hours. A send due at 6am is DEFERRED to the next
//      in-window moment, not delivered early and not silently dropped.
//   3. A deferral that outlives the offer becomes silence. If the session fills before the
//      patient's window reopens, the message is not sent at all — a text about an
//      appointment that is already gone is worse than no text.
//
// Absent preferences fall back to a conservative practice default rather than to "any time":
// no stated preference is not consent to be messaged at 5am.

export type ContactChannel = "sms";

/** Channels the product can actually deliver on today. G3 still gates live sending. */
export const SUPPORTED_CHANNELS: readonly ContactChannel[] = ["sms"];

/** 0 = Sunday, matching Date#getUTCDay. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface ContactPreferences {
  /** null means the patient wants no contact on any channel we support. */
  channel: ContactChannel | null;
  /** Inclusive earliest local hour (0–23). */
  earliestHour: number;
  /** Exclusive latest local hour (1–24). */
  latestHour: number;
  /** Days the patient is willing to be contacted. Empty means none. */
  days: readonly Weekday[];
}

/** Conservative default: weekdays, business hours. Not "any time". */
export const DEFAULT_PREFERENCES: ContactPreferences = {
  channel: "sms",
  earliestHour: 9,
  latestHour: 18,
  days: [1, 2, 3, 4, 5],
};

export type ContactRefusal =
  | "no_channel_chosen"
  | "channel_unsupported"
  | "offer_expires_before_window";

export type ContactPlan =
  | { send: true; at: string; deferred: boolean }
  | { send: false; reason: ContactRefusal };

export interface PreferenceValidation {
  ok: boolean;
  errors: string[];
}

/** Reject nonsense before it can silence a patient forever or open a 24-hour window. */
export function validatePreferences(prefs: ContactPreferences): PreferenceValidation {
  const errors: string[] = [];
  if (!Number.isInteger(prefs.earliestHour) || prefs.earliestHour < 0 || prefs.earliestHour > 23) {
    errors.push("earliest_hour_out_of_range");
  }
  if (!Number.isInteger(prefs.latestHour) || prefs.latestHour < 1 || prefs.latestHour > 24) {
    errors.push("latest_hour_out_of_range");
  }
  if (prefs.earliestHour >= prefs.latestHour) errors.push("window_empty");
  if (prefs.channel !== null && !SUPPORTED_CHANNELS.includes(prefs.channel)) {
    errors.push("channel_unsupported");
  }
  for (const day of prefs.days) {
    if (!Number.isInteger(day) || day < 0 || day > 6) errors.push("day_out_of_range");
  }
  return { ok: errors.length === 0, errors };
}

function withinWindow(at: Date, prefs: ContactPreferences): boolean {
  const day = at.getUTCDay() as Weekday;
  if (!prefs.days.includes(day)) return false;
  const hour = at.getUTCHours();
  return hour >= prefs.earliestHour && hour < prefs.latestHour;
}

/**
 * The next moment this patient is willing to be contacted, at or after `from`.
 * Returns null if no such moment exists inside the search horizon — which happens when
 * the patient has chosen no days at all.
 */
export function nextContactableMoment(
  prefs: ContactPreferences,
  from: Date,
  horizonDays = 8,
): Date | null {
  if (prefs.days.length === 0) return null;
  if (withinWindow(from, prefs)) return from;

  // Step hour by hour: the window is defined in whole hours, so this cannot miss one.
  const cursor = new Date(from.getTime());
  cursor.setUTCMinutes(0, 0, 0);
  for (let i = 0; i < horizonDays * 24; i += 1) {
    cursor.setUTCHours(cursor.getUTCHours() + 1);
    if (withinWindow(cursor, prefs)) return cursor;
  }
  return null;
}

/**
 * Decide whether and when to contact a patient about an offer that expires at
 * `offerExpiresAt`. Every refusal names a reason, because "we did not message them" must
 * be explainable to the practice.
 */
export function planContact(
  prefs: ContactPreferences,
  now: Date,
  offerExpiresAt: Date,
): ContactPlan {
  if (prefs.channel === null) return { send: false, reason: "no_channel_chosen" };
  if (!SUPPORTED_CHANNELS.includes(prefs.channel)) {
    // Never fall back to a channel the patient did not choose.
    return { send: false, reason: "channel_unsupported" };
  }

  const moment = nextContactableMoment(prefs, now);
  if (moment === null || moment >= offerExpiresAt) {
    return { send: false, reason: "offer_expires_before_window" };
  }

  return { send: true, at: moment.toISOString(), deferred: moment.getTime() !== now.getTime() };
}
