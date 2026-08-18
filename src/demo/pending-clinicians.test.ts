import { describe, expect, it } from "vitest";
import { clinicians } from "./clinicians";
import { PENDING_CLINICIANS } from "./pending-clinicians";

describe("W228 a pending clinician is visible to the build and invisible to matching", () => {
  it("holds Dr Anusha Saxena with the founder-supplied booking facts", () => {
    const anusha = PENDING_CLINICIANS.find((p) => p.id === "anusha-saxena")!;
    expect(anusha.gender).toBe("woman");
    expect(anusha.booking.practitionerId).toBe("160121");
    expect(anusha.booking.url).toContain("healthengine.com.au");
  });

  it("leaks nobody pending into the live roster", () => {
    // The go-live path is deliberate: fill the checklist in pending-clinicians.ts, move the
    // entry into `clinicians`, and DELETE it here — at which point this test demands the
    // pending list shrink rather than hold a duplicate identity.
    for (const pending of PENDING_CLINICIANS) {
      expect(clinicians.some((c) => c.id === pending.id), `${pending.id} is live AND pending`).toBe(false);
    }
  });
});
