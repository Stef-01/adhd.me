// W51 audit fix. The danger is specific: 0 is a LEGAL value for every eligibility field, so a
// field that silently becomes 0 passes validation and widens who gets contacted. These tests
// pin that absent and blank are rejected rather than coerced.

import { describe, expect, it } from "vitest";
import { DEFAULT_CONFIG, evaluateEligibility } from "@/engine/eligibility";
import { validateRules } from "@/console/store";
import { numberField } from "./form-numbers";

const form = (entries: Record<string, string>): FormData => {
  const f = new FormData();
  for (const [k, v] of Object.entries(entries)) f.append(k, v);
  return f;
};

describe("numberField refuses to invent a zero", () => {
  it("returns NaN for an absent field", () => {
    expect(numberField(form({}), "minDaysSinceLastVisit")).toBeNaN();
  });

  it.each(["", "   "])("returns NaN for a blank field (%p)", (blank) => {
    expect(numberField(form({ x: blank }), "x")).toBeNaN();
  });

  it("parses a real value, including a legitimate zero", () => {
    expect(numberField(form({ x: "90" }), "x")).toBe(90);
    expect(numberField(form({ x: "0" }), "x")).toBe(0);
    expect(numberField(form({ x: " 42 " }), "x")).toBe(42);
  });

  it("returns NaN for something unparseable rather than 0", () => {
    expect(numberField(form({ x: "ninety" }), "x")).toBeNaN();
  });
});

describe("the defect this prevents", () => {
  it("a missing field now fails validation instead of storing a permissive rule", () => {
    const missing = {
      ...DEFAULT_CONFIG,
      minDaysSinceLastVisit: numberField(form({}), "minDaysSinceLastVisit"),
    };
    expect(validateRules(missing)).toHaveProperty("minDaysSinceLastVisit");
  });

  it("shows why 0 could not be caught by validation: it is a legal value", () => {
    // This is the whole reason the guard has to be at parse time.
    expect(validateRules({ ...DEFAULT_CONFIG, minDaysSinceLastVisit: 0 })).toEqual({});
  });

  it("and what a silently-zero recency floor would have meant for a patient", () => {
    // Seen yesterday, and with a 0 floor they are eligible for an invitation.
    const seenYesterday = {
      id: "pat-1" as never, practiceId: "prac-1" as never, usualClinicianId: null,
      smsConsent: true, optedOut: false, lastAttendedAt: "2026-08-09",
      futureBookingAt: null, activeRecall: false, chronicCare: true, holdout: false,
    };
    const clinician = { id: "clin-1" as never, practiceId: "prac-1" as never, displayName: "Dr Lee", participating: true };
    const withFloor = evaluateEligibility(seenYesterday, clinician, DEFAULT_CONFIG, "2026-08-10", 0);
    const withoutFloor = evaluateEligibility(seenYesterday, clinician, { ...DEFAULT_CONFIG, minDaysSinceLastVisit: 0 }, "2026-08-10", 0);
    expect(withFloor).toEqual({ eligible: false, reason: "seen_too_recently" });
    expect(withoutFloor).not.toEqual({ eligible: false, reason: "seen_too_recently" });
    // Whatever else excludes them, the RECENCY protection is gone — which is the point.
  });
});
