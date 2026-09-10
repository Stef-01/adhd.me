// M5 verify gate: a profile is managed by the practice that claimed it, claimable while nobody
// has, unreachable from another practice, and always open to staff.

import { describe, expect, it } from "vitest";
import { claimGP, gpAccessFor, releaseGP, type Viewer } from "./access";
import { resetMatching, saveGP } from "./store";
import { gp } from "./test-fixtures";

const exists = (id: string) => id !== "gone";
const viewer = (practiceId: string | null, staff = false): Viewer => ({ practiceId, staff, practiceExists: exists });

describe("M5 practice scoping", () => {
  it("unclaimed: claimable by any practice, nothing for a session without one, managed by staff", () => {
    const g = gp({ practiceId: null });
    expect(gpAccessFor(g, viewer("p1"))).toBe("claim");
    expect(gpAccessFor(g, viewer(null))).toBe("none");
    expect(gpAccessFor(g, viewer(null, true))).toBe("manage");
  });

  it("claimed: managed by the claiming practice and staff, closed to every other practice", () => {
    const g = gp({ practiceId: "p1" });
    expect(gpAccessFor(g, viewer("p1"))).toBe("manage");
    expect(gpAccessFor(g, viewer("p2"))).toBe("none");
    expect(gpAccessFor(g, viewer(null))).toBe("none");
    expect(gpAccessFor(g, viewer("p2", true))).toBe("manage");
  });

  it("a claim by a practice that no longer exists is no claim", () => {
    expect(gpAccessFor(gp({ practiceId: "gone" }), viewer("p2"))).toBe("claim");
  });

  it("claimGP writes the practice, refuses a second practice, and is idempotent for the owner", () => {
    const state = resetMatching();
    saveGP(gp({ id: "g1", practiceId: null }), state);
    const first = claimGP("g1", { ...viewer("p1"), practiceId: "p1" }, state);
    expect(first.ok && first.gp.practiceId).toBe("p1");
    saveGP(first.ok ? first.gp : gp(), state);
    expect(claimGP("g1", { ...viewer("p2"), practiceId: "p2" }, state)).toEqual({ ok: false, reason: "claimed" });
    const again = claimGP("g1", { ...viewer("p1"), practiceId: "p1" }, state);
    expect(again.ok && again.gp.practiceId).toBe("p1");
    expect(claimGP("nope", { ...viewer("p1"), practiceId: "p1" }, state)).toEqual({ ok: false, reason: "not_found" });
  });

  it("releaseGP is the owner's or staff's act only", () => {
    const state = resetMatching();
    saveGP(gp({ id: "g1", practiceId: "p1" }), state);
    expect(releaseGP("g1", viewer("p2"), state)).toEqual({ ok: false, reason: "claimed" });
    const released = releaseGP("g1", viewer("p1"), state);
    expect(released.ok && released.gp.practiceId).toBeNull();
    const byStaff = releaseGP("g1", viewer(null, true), state);
    expect(byStaff.ok && byStaff.gp.practiceId).toBeNull();
  });
});
