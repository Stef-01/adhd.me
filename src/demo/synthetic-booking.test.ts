// The booking screen for an example profile is a designed terminal state (O231): no invented phone
// number, no fabricated listing, no "request sent". The 2026-09-05 walk found what it said instead —
// "Appointments with this practice are arranged by phone." — promises a route the screen cannot
// give, and a first-time reader looks for a number that never comes. The note has to say what is
// true: this is an example, there is nobody to ring, and here is the way onward.
import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "../compliance/landing";
import { lintMessageText } from "../messaging/templates";
import { SYNTHETIC_BOOKING_NOTE } from "./synthetic-roster";

describe("the example profile's booking note", () => {
  it("says it is an example, and promises no phone route", () => {
    expect(SYNTHETIC_BOOKING_NOTE.toLowerCase()).toContain("example");
    expect(SYNTHETIC_BOOKING_NOTE.toLowerCase()).not.toContain("by phone");
  });
  it("tells the reader the way onward", () => {
    expect(SYNTHETIC_BOOKING_NOTE.toLowerCase()).toMatch(/go back|back to the list|listed/);
  });
  it("passes the patient copy rules", () => {
    expect(lintLandingCopy(SYNTHETIC_BOOKING_NOTE)).toEqual([]);
    expect(lintMessageText(SYNTHETIC_BOOKING_NOTE)).toEqual([]);
  });
});
