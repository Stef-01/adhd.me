// W74 verify gate (unit half): contact-time and channel preferences are honoured.
// The capture-and-honour path through the UI is asserted in e2e/preferences.spec.ts.

import { describe, expect, it } from "vitest";
import {
  DEFAULT_PREFERENCES,
  type ContactPreferences,
  nextContactableMoment,
  planContact,
  validatePreferences,
} from "./preferences";

// 2026-08-10 is a Monday. All times UTC; the window is expressed in the same clock.
const MON_10AM = new Date("2026-08-10T10:00:00Z");
const MON_6AM = new Date("2026-08-10T06:00:00Z");
const SAT_10AM = new Date("2026-08-15T10:00:00Z");
const FAR_FUTURE = new Date("2026-09-01T00:00:00Z");

function prefs(over: Partial<ContactPreferences> = {}): ContactPreferences {
  return { ...DEFAULT_PREFERENCES, ...over };
}

describe("W74 contact window", () => {
  it("sends immediately when the moment is already inside the window", () => {
    const plan = planContact(prefs(), MON_10AM, FAR_FUTURE);
    expect(plan).toEqual({ send: true, at: MON_10AM.toISOString(), deferred: false });
  });

  it("defers an early-morning send to the start of the window, never sends early", () => {
    const plan = planContact(prefs(), MON_6AM, FAR_FUTURE);

    expect(plan.send).toBe(true);
    if (!plan.send) return;
    expect(plan.deferred).toBe(true);
    expect(plan.at).toBe("2026-08-10T09:00:00.000Z");
    // The decisive property: nothing is delivered before the patient's earliest hour.
    expect(new Date(plan.at).getUTCHours()).toBeGreaterThanOrEqual(prefs().earliestHour);
  });

  it("defers past a day the patient excluded", () => {
    // Saturday, with weekdays-only preferences → next Monday 09:00.
    const plan = planContact(prefs(), SAT_10AM, FAR_FUTURE);

    expect(plan.send).toBe(true);
    if (!plan.send) return;
    expect(plan.at).toBe("2026-08-17T09:00:00.000Z");
    expect(new Date(plan.at).getUTCDay()).toBe(1);
  });

  it("honours a window the patient narrowed", () => {
    const evening = prefs({ earliestHour: 17, latestHour: 20 });
    const plan = planContact(evening, MON_10AM, FAR_FUTURE);

    expect(plan.send).toBe(true);
    if (!plan.send) return;
    expect(plan.at).toBe("2026-08-10T17:00:00.000Z");
  });

  it("treats the latest hour as exclusive", () => {
    const plan = planContact(prefs({ earliestHour: 9, latestHour: 18 }), new Date("2026-08-10T18:00:00Z"), FAR_FUTURE);

    expect(plan.send).toBe(true);
    if (!plan.send) return;
    // 18:00 is outside a window ending at 18 — deferred to tomorrow morning.
    expect(plan.at).toBe("2026-08-11T09:00:00.000Z");
  });

  it("finds no moment when the patient has excluded every day", () => {
    expect(nextContactableMoment(prefs({ days: [] }), MON_10AM)).toBeNull();
  });
});

describe("W74 channel", () => {
  it("refuses to contact a patient who chose no channel", () => {
    expect(planContact(prefs({ channel: null }), MON_10AM, FAR_FUTURE)).toEqual({
      send: false,
      reason: "no_channel_chosen",
    });
  });

  it("never substitutes a channel the patient did not choose", () => {
    // An unsupported channel is a refusal, not a fallback to SMS.
    const unsupported = prefs({ channel: "carrier-pigeon" as never });
    expect(planContact(unsupported, MON_10AM, FAR_FUTURE)).toEqual({
      send: false,
      reason: "channel_unsupported",
    });
  });
});

describe("W74 deferral versus offer expiry", () => {
  it("stays silent when the offer expires before the window reopens", () => {
    // Saturday morning, weekdays-only, and the session fills on Sunday: a text on Monday
    // about an appointment that is already gone is worse than no text.
    const expiresSunday = new Date("2026-08-16T12:00:00Z");
    expect(planContact(prefs(), SAT_10AM, expiresSunday)).toEqual({
      send: false,
      reason: "offer_expires_before_window",
    });
  });

  it("sends when the window reopens with the offer still live", () => {
    const expiresTuesday = new Date("2026-08-18T12:00:00Z");
    const plan = planContact(prefs(), SAT_10AM, expiresTuesday);

    expect(plan.send).toBe(true);
    if (!plan.send) return;
    expect(new Date(plan.at) < expiresTuesday).toBe(true);
  });

  it("every refusal names a reason the practice can be told", () => {
    const refusals = [
      planContact(prefs({ channel: null }), MON_10AM, FAR_FUTURE),
      planContact(prefs({ days: [] }), MON_10AM, FAR_FUTURE),
      planContact(prefs(), SAT_10AM, new Date("2026-08-16T12:00:00Z")),
    ];
    for (const plan of refusals) {
      expect(plan.send).toBe(false);
      if (plan.send) continue;
      expect(plan.reason).toBeTruthy();
    }
  });
});

describe("W74 preference validation", () => {
  it("accepts the conservative default", () => {
    expect(validatePreferences(DEFAULT_PREFERENCES).ok).toBe(true);
    // The default is business hours on weekdays, not around the clock.
    expect(DEFAULT_PREFERENCES.earliestHour).toBeGreaterThanOrEqual(8);
    expect(DEFAULT_PREFERENCES.latestHour).toBeLessThanOrEqual(20);
    expect(DEFAULT_PREFERENCES.days).not.toContain(0);
  });

  it.each([
    ["window_empty", prefs({ earliestHour: 18, latestHour: 9 })],
    ["window_empty", prefs({ earliestHour: 9, latestHour: 9 })],
    ["earliest_hour_out_of_range", prefs({ earliestHour: -1 })],
    ["latest_hour_out_of_range", prefs({ latestHour: 25 })],
    ["day_out_of_range", prefs({ days: [9 as never] })],
  ])("rejects %s", (error, invalid) => {
    const result = validatePreferences(invalid);
    expect(result.ok).toBe(false);
    expect(result.errors).toContain(error);
  });

  it("allows a patient to choose no channel — that is a valid answer, not an error", () => {
    expect(validatePreferences(prefs({ channel: null })).ok).toBe(true);
  });
});
