// W38 gate (part 1): both vendor fixtures are contract-tested against the shape
// their mapping depends on, and seeded drift of every kind is caught.

import { describe, expect, it } from "vitest";
import { BEST_PRACTICE_FIXTURE, HALO_FIXTURE } from "@/pms/fixtures";
import { BEST_PRACTICE_SPEC, detectDrift, HALO_SPEC } from "@/pms/drift";

const VENDORS = [
  { name: "best-practice", fixture: BEST_PRACTICE_FIXTURE, spec: BEST_PRACTICE_SPEC },
  { name: "halo", fixture: HALO_FIXTURE, spec: HALO_SPEC },
] as const;

/**
 * Deep clone and widen, so a case can mutate the payload the way a drifting vendor
 * would — and so a mutation in one case can't leak into another.
 */
const clone = (value: unknown): Record<string, unknown> =>
  structuredClone(value) as Record<string, unknown>;

describe("W38 fixture drift — shipped fixtures conform", () => {
  for (const vendor of VENDORS) {
    it(`${vendor.name} fixture matches its declared shape`, () => {
      const report = detectDrift(vendor.name, vendor.fixture, vendor.spec);
      expect(report.issues).toEqual([]);
      expect(report.ok).toBe(true);
    });
  }
});

describe("W38 fixture drift — seeded drift is detected", () => {
  it("catches a removed field (vendor dropped a column)", () => {
    const drifted = clone(BEST_PRACTICE_FIXTURE);
    delete (drifted.patients as Record<string, unknown>[])[0]!.MobileConsent;
    const report = detectDrift("best-practice", drifted, BEST_PRACTICE_SPEC);
    expect(report.ok).toBe(false);
    expect(report.issues[0]).toMatchObject({
      kind: "missing_field",
      collection: "patients",
      field: "MobileConsent",
      index: 0,
    });
  });

  it("catches a renamed field (old name gone)", () => {
    const drifted = clone(HALO_FIXTURE);
    const member = (drifted.members as Record<string, unknown>[])[0]!;
    member.sms_consent = member.sms_ok; // renamed upstream
    delete member.sms_ok;
    const report = detectDrift("halo", drifted, HALO_SPEC);
    expect(report.ok).toBe(false);
    expect(report.issues.some((i) => i.kind === "missing_field" && i.field === "sms_ok")).toBe(true);
  });

  it("catches a type change (boolean widened to string)", () => {
    const drifted = clone(BEST_PRACTICE_FIXTURE);
    (drifted.patients as Record<string, unknown>[])[1]!.OptedOut = "false";
    const report = detectDrift("best-practice", drifted, BEST_PRACTICE_SPEC);
    expect(report.issues[0]).toMatchObject({ kind: "type_mismatch", field: "OptedOut", index: 1 });
  });

  it("catches an unexpected null in a non-nullable field", () => {
    const drifted = clone(HALO_FIXTURE);
    (drifted.openings as Record<string, unknown>[])[0]!.gp = null;
    const report = detectDrift("halo", drifted, HALO_SPEC);
    expect(report.issues[0]).toMatchObject({ kind: "type_mismatch", field: "gp" });
  });

  it("catches a new enum value the mapping does not handle", () => {
    const drifted = clone(HALO_FIXTURE);
    (drifted.openings as Record<string, unknown>[])[0]!.mode = "phone"; // new vendor mode
    const report = detectDrift("halo", drifted, HALO_SPEC);
    expect(report.issues[0]).toMatchObject({ kind: "unknown_enum_value", field: "mode" });
  });

  it("catches a whole collection disappearing", () => {
    const drifted = clone(BEST_PRACTICE_FIXTURE);
    delete drifted.cancellations;
    const report = detectDrift("best-practice", drifted, BEST_PRACTICE_SPEC);
    expect(report.issues[0]).toMatchObject({
      kind: "missing_collection",
      collection: "cancellations",
    });
  });

  it("does NOT flag additive change — a new field we don't read is fine", () => {
    const drifted = clone(HALO_FIXTURE);
    (drifted.members as Record<string, unknown>[])[0]!.preferred_language = "en";
    expect(detectDrift("halo", drifted, HALO_SPEC).ok).toBe(true);
  });

  it("reports every offending row, not just the first", () => {
    const drifted = clone(BEST_PRACTICE_FIXTURE);
    for (const row of drifted.patients as Record<string, unknown>[]) delete row.ActiveRecall;
    const report = detectDrift("best-practice", drifted, BEST_PRACTICE_SPEC);
    expect(report.issues).toHaveLength(BEST_PRACTICE_FIXTURE.patients.length);
  });
});
