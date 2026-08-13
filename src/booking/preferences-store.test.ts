// W78 (Q6 hardening): contact preferences are scoped by practice.
//
// W65 found the unscoped version of this bug twice — W71 recalls and W64 closures both
// keyed on patient id alone, so a colliding id let one practice's data act on another's.
// W74's preference store had the same shape. Here the damage would be quieter and worse:
// one practice's patient imposing quiet hours on a different practice's patient, or
// revealing that they had set any.

import { beforeEach, describe, expect, it } from "vitest";
import { DEFAULT_PREFERENCES, type ContactPreferences } from "@/messaging/preferences";
import { contactPreferencesFor, resetStore, saveContactPreferences } from "./store";

const EVENING: ContactPreferences = { ...DEFAULT_PREFERENCES, earliestHour: 17, latestHour: 20 };

beforeEach(() => {
  resetStore();
});

describe("W78 preference tenancy", () => {
  it("a colliding patient id in another practice reads its own default", () => {
    saveContactPreferences("prac-a", "shared-id", EVENING);

    expect(contactPreferencesFor("prac-a", "shared-id")).toEqual(EVENING);
    expect(contactPreferencesFor("prac-b", "shared-id")).toEqual(DEFAULT_PREFERENCES);
  });

  it("a write for one practice cannot overwrite the other's", () => {
    const morning: ContactPreferences = { ...DEFAULT_PREFERENCES, earliestHour: 7, latestHour: 10 };
    saveContactPreferences("prac-a", "shared-id", EVENING);
    saveContactPreferences("prac-b", "shared-id", morning);

    expect(contactPreferencesFor("prac-a", "shared-id")).toEqual(EVENING);
    expect(contactPreferencesFor("prac-b", "shared-id")).toEqual(morning);
  });

  it("an invalid window is refused and leaves the stored answer untouched", () => {
    saveContactPreferences("prac-a", "p1", EVENING);
    const result = saveContactPreferences("prac-a", "p1", {
      ...DEFAULT_PREFERENCES,
      earliestHour: 20,
      latestHour: 8,
    });

    expect(result.ok).toBe(false);
    expect(result.errors).toContain("window_empty");
    expect(contactPreferencesFor("prac-a", "p1")).toEqual(EVENING);
  });

  it("an unknown patient gets the conservative default, never an open window", () => {
    const prefs = contactPreferencesFor("prac-a", "never-seen");
    expect(prefs).toEqual(DEFAULT_PREFERENCES);
    expect(prefs.days).not.toContain(0);
    expect(prefs.earliestHour).toBeGreaterThanOrEqual(8);
  });
});
