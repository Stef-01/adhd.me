import { describe, expect, it } from "vitest";
import { describePmsContract } from "@/pms/contract";
import { BEST_PRACTICE_FIXTURE, FIXTURE_RANGE, HALO_FIXTURE } from "@/pms/fixtures";
import {
  bestPracticeMapping,
  haloMapping,
  RecordedFixtureClient,
  VendorPmsAdapter,
} from "@/pms/vendors";

const SANDBOX = "https://sandbox.pms.local";

const makeBp = () =>
  new VendorPmsAdapter(
    { practiceId: "prac-bp", baseUrl: SANDBOX },
    bestPracticeMapping,
    new RecordedFixtureClient(BEST_PRACTICE_FIXTURE),
  );

const makeHalo = () =>
  new VendorPmsAdapter(
    { practiceId: "prac-halo", baseUrl: SANDBOX },
    haloMapping,
    new RecordedFixtureClient(HALO_FIXTURE),
  );

// W28 verify gate: both vendor adapters pass the W27 contract on recorded fixtures.
describePmsContract("best-practice (fixtures)", {
  makeAdapter: makeBp,
  populatedRange: FIXTURE_RANGE.populated,
  emptyRange: FIXTURE_RANGE.empty,
});

describePmsContract("halo (fixtures)", {
  makeAdapter: makeHalo,
  populatedRange: FIXTURE_RANGE.populated,
  emptyRange: FIXTURE_RANGE.empty,
});

describe("W28 vendor adapter — gate + mapping", () => {
  it("refuses live vendor endpoints (founder gate G1)", () => {
    for (const host of ["https://api.bpsoftware.net", "https://portal.halohealth.com"]) {
      expect(
        () =>
          new VendorPmsAdapter(
            { practiceId: "p", baseUrl: host },
            bestPracticeMapping,
            new RecordedFixtureClient(BEST_PRACTICE_FIXTURE),
          ),
      ).toThrow(/founder gate G1/);
    }
  });

  it("stamps the configured practice id on every mapped row", async () => {
    const bp = makeBp();
    const patients = await bp.listPatients();
    expect(patients.every((p) => p.practiceId === "prac-bp")).toBe(true);
    const slots = await bp.listOpenSlots(FIXTURE_RANGE.populated);
    expect(slots.every((s) => s.practiceId === "prac-bp")).toBe(true);
  });

  it("normalises each vendor's raw shape to the same domain fields", async () => {
    const bp = await makeBp().listPatients();
    const halo = await makeHalo().listPatients();
    // Best Practice: chronic-disease register → chronicCare.
    expect(bp.find((p) => p.id === "bp-1")).toMatchObject({ chronicCare: true, smsConsent: true, usualClinicianId: "bp-gp-1" });
    // Halo: care_plan → chronicCare; unsubscribed → optedOut; null regular_gp → null.
    expect(halo.find((p) => p.id === "h-1")).toMatchObject({ chronicCare: true, usualClinicianId: "h-gp-1" });
    expect(halo.find((p) => p.id === "h-3")).toMatchObject({ usualClinicianId: null, lastAttendedAt: null });
  });

  it("maps vendor appointment types (BP Telehealth / Halo video → telehealth)", async () => {
    const bpSlots = await makeBp().listOpenSlots(FIXTURE_RANGE.populated);
    expect(bpSlots.find((s) => s.id === "bp-a3")?.appointmentType).toBe("telehealth");
    const haloSlots = await makeHalo().listOpenSlots(FIXTURE_RANGE.populated);
    expect(haloSlots.find((s) => s.id === "h-o2")?.appointmentType).toBe("telehealth");
  });

  it("excludes non-available slots (Booked/filled) from open slots", async () => {
    const bpSlots = await makeBp().listOpenSlots(FIXTURE_RANGE.populated);
    expect(bpSlots.map((s) => s.id)).not.toContain("bp-a4"); // Booked
    const haloSlots = await makeHalo().listOpenSlots(FIXTURE_RANGE.populated);
    expect(haloSlots.map((s) => s.id)).not.toContain("h-o3"); // filled
  });
});
