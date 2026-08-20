import { describe, expect, it } from "vitest";
import { clinicians } from "./clinicians";
import { PENDING_CLINICIANS } from "./pending-clinicians";

describe("W228 the staging area stays honest in both directions", () => {
  it("leaks nobody pending into the live roster", () => {
    for (const pending of PENDING_CLINICIANS) {
      expect(clinicians.some((c) => c.id === pending.id), `${pending.id} is live AND pending`).toBe(false);
    }
  });

  it("Dr Anusha Saxena graduated from pending to live (O34), with the ungathered parts marked", () => {
    // The first record to pass through this module, pinned so the go-live cannot silently
    // revert: she is live, she is the roster's woman GP, and what her interview has not yet
    // supplied is visibly pending rather than authored for her.
    expect(PENDING_CLINICIANS.some((p) => p.id === "anusha-saxena")).toBe(false);
    const anusha = clinicians.find((c) => c.id === "anusha-saxena")!;
    expect(anusha.gender).toBe("woman");
    expect(anusha.booking.via === "healthengine" && anusha.booking.practitionerId).toBe("160121");
    // O82: the portrait arrived from the founder on her behalf (2026-08-20) — the monogram era
    // ended the way the O34 note said it would: with the real thing supplied, never generated.
    expect(anusha.image).toBe("/clinicians/anusha-saxena.png");
    // O88: her supplied bio made her first declarations — languages ranked on (O1), and the
    // values statement she wrote became her first manner claims. mannerPending ended with
    // them: it marks an EMPTY manner as pending, and hers no longer is. The day-to-day grain
    // stays her interview's to add.
    expect(anusha.languages).toEqual(["English", "Hindi", "Urdu"]);
    expect(anusha.manner).toEqual(["culturally_attuned", "attuned"]);
    expect(anusha.mannerPending).toBeUndefined();
  });
});
