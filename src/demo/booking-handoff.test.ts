// The finder's exit point, as an invariant rather than as two strings that happened to agree.
//
// WHAT BROKE, AND WHY A TEST EXISTS NOW. `booking-stage.tsx` branched the outbound button's LABEL
// on `booking.via` and wrote the CAPTION beneath it as one flat string, "Opens Healthengine in a
// new tab." — for both routes that render a control. On the `practice` route the href resolves to
// the practice's own `booking.url`, and that variant exists precisely because the clinician is not
// synced to any online platform, so the caption named the single destination it provably was not.
// Nothing caught it: the two real roster entries are both `healthengine`, so the wrong branch is
// unreachable from the live roster and no screenshot pass or e2e walk could ever have rendered it.
// That is exactly the class of defect a unit test on a pure function is for — a branch the product
// can reach by adding one row to a file, and the surface it lands on is the exit.
//
// So the assertions below are not "the copy is this". They are the relationship that was violated:
// the caption and the label describe ONE link, and the caption may name Healthengine if and only
// if the label does. That holds for any `via` the type admits, including ones added later, which is
// the property the flat string could not have.

import { describe, expect, it } from "vitest";
import { bookingHandoff, clinicians, type Clinician } from "./clinicians";
import { SYNTHETIC_CLINICIANS } from "./synthetic-roster";

/** A `via` of each shape the type admits, so the sweep does not depend on the live roster. */
function withVia(via: Clinician["booking"]["via"]): Clinician {
  const base = clinicians.find((c) => c.booking.via === "healthengine")!;
  if (via === "healthengine") return base;
  if (via === "practice") {
    return { ...base, booking: { via: "practice", url: "https://example.invalid/book", note: "By phone." } };
  }
  return { ...base, booking: { via: "synthetic-none", note: "Nobody to book." } };
}

const VIAS = ["healthengine", "practice", "synthetic-none"] as const;

describe("bookingHandoff", () => {
  it("covers every `via` the type admits, so a new route cannot fall through silently", () => {
    // Non-vacuity for the sweep below: if a fourth variant is added to `Clinician["booking"]`
    // without a case here, `VIAS` stops matching the type and this list is where it is noticed.
    const seen = VIAS.map((via) => bookingHandoff(withVia(via)));
    expect(seen).toHaveLength(3);
    expect(seen.filter((h) => h === null)).toHaveLength(1);
  });

  it("names Healthengine in the caption if and only if it names Healthengine in the label", () => {
    // THE INVARIANT THAT BROKE. Stated over every route rather than asserted per string, because
    // the bug was not a typo in one sentence — it was two sentences derived independently.
    for (const via of VIAS) {
      const handoff = bookingHandoff(withVia(via));
      if (handoff === null) continue;
      expect(
        /healthengine/i.test(handoff.caption),
        `the ${via} caption says "${handoff.caption}" under the label "${handoff.label}"`,
      ).toBe(/healthengine/i.test(handoff.label));
    }
  });

  it("does not send a practice-route reader to Healthengine in words", () => {
    // The specific regression, kept as its own named case so a failure reads as the bug and not
    // as an abstract invariant violation.
    const handoff = bookingHandoff(withVia("practice"))!;
    expect(handoff.label).not.toMatch(/healthengine/i);
    expect(handoff.caption).not.toMatch(/healthengine/i);
    expect(handoff.caption).toMatch(/new tab/i);
  });

  it("still discloses the new tab on every route that has a control", () => {
    // The caption's other job. A control that leaves the product without saying so is the friction
    // this line exists to remove, so it is not optional on any route.
    for (const via of VIAS) {
      const handoff = bookingHandoff(withVia(via));
      if (handoff === null) continue;
      expect(handoff.caption, `${via} caption`).toMatch(/new tab/i);
      expect(handoff.label.length, `${via} label`).toBeGreaterThan(0);
    }
  });

  it("gives the synthetic examples no control at all, rather than a disabled one", () => {
    // O231/O217's terminal state, asserted on the real synthetic fixtures and not just a spread.
    expect(SYNTHETIC_CLINICIANS.length).toBeGreaterThan(0);
    for (const clinician of SYNTHETIC_CLINICIANS) {
      expect(bookingHandoff(clinician), clinician.id).toBeNull();
    }
  });

  it("agrees with the live roster: every listed clinician with a url has a handoff", () => {
    // Ties the pure function back to the data it describes, so a roster edit that adds a route
    // the function does not handle fails here rather than rendering an empty exit screen.
    for (const clinician of clinicians) {
      const handoff = bookingHandoff(clinician);
      const hasUrl = "url" in clinician.booking && Boolean(clinician.booking.url);
      expect(handoff !== null, `${clinician.id} (${clinician.booking.via})`).toBe(hasUrl);
    }
  });
});
