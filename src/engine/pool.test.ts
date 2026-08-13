import { describe, expect, it } from "vitest";
import { generatePractice } from "@/synthetic/generate";
import { DEFAULT_CONFIG, eligibleForClinician } from "./eligibility";
import {
  batchSize,
  buildInvitationPool,
  DEFAULT_POOL_CONFIG,
  expireOnFill,
  rankCandidates,
} from "./pool";

const TODAY = "2026-08-08";

describe("W5 invitation pool builder", () => {
  it("batch size is minimal and capped", () => {
    expect(batchSize(0, DEFAULT_POOL_CONFIG)).toBe(0);
    expect(batchSize(-2, DEFAULT_POOL_CONFIG)).toBe(0);
    expect(batchSize(2, DEFAULT_POOL_CONFIG)).toBe(8); // 2 / 0.25
    expect(batchSize(5, DEFAULT_POOL_CONFIG)).toBe(20);
    expect(batchSize(50, DEFAULT_POOL_CONFIG)).toBe(40); // ceiling wins
  });

  it("ranking is deterministic: chronic first, then longest overdue", () => {
    const data = generatePractice({
      seed: 42,
      patientCount: 2_000,
      clinicianCount: 10,
      scheduleWeeks: 1,
      todayIso: TODAY,
    });
    const ranked = rankCandidates(data.patients);
    const firstNonChronic = ranked.findIndex((p) => !p.chronicCare);
    // No chronic patient appears after the first non-chronic one.
    expect(ranked.slice(firstNonChronic).every((p) => !p.chronicCare)).toBe(true);
    expect(rankCandidates(data.patients)).toEqual(ranked);
  });

  it("builds a pool end-to-end from the synthetic practice", () => {
    const data = generatePractice({
      seed: 42,
      patientCount: 12_000,
      clinicianCount: 10,
      scheduleWeeks: 1,
      todayIso: TODAY,
    });
    const clinician = data.clinicians[0];
    if (!clinician) throw new Error("no clinician");
    const { eligible } = eligibleForClinician(
      data.patients,
      clinician,
      DEFAULT_CONFIG,
      TODAY,
      new Map(),
    );
    const sessionDate = "2026-08-11";
    const pool = buildInvitationPool(
      sessionDate,
      clinician,
      data.appointments,
      eligible,
      DEFAULT_POOL_CONFIG,
    );
    const openThatDay = data.appointments.filter(
      (a) =>
        a.clinicianId === clinician.id && a.status === "open" && a.startsAt.startsWith(sessionDate),
    ).length;
    expect(pool.length).toBe(batchSize(openThatDay, DEFAULT_POOL_CONFIG));
    expect(pool.length).toBeLessThanOrEqual(DEFAULT_POOL_CONFIG.maxInvitesPerSession);
    // Invariants: every invited patient came from the eligible set, once only.
    const eligibleIds = new Set(eligible.map((p) => p.id));
    const invitedIds = pool.map((i) => i.patientId);
    expect(new Set(invitedIds).size).toBe(invitedIds.length);
    for (const id of invitedIds) expect(eligibleIds.has(id)).toBe(true);
    expect(pool.every((i) => i.status === "queued")).toBe(true);
  });

  it("expires outstanding offers when the session fills", () => {
    const data = generatePractice({
      seed: 42,
      patientCount: 1_000,
      clinicianCount: 10,
      scheduleWeeks: 1,
      todayIso: TODAY,
    });
    const clinician = data.clinicians[0];
    if (!clinician) throw new Error("no clinician");
    const { eligible } = eligibleForClinician(
      data.patients,
      clinician,
      { ...DEFAULT_CONFIG, usualClinicianOnly: false, minDaysSinceLastVisit: 30 },
      TODAY,
      new Map(),
    );
    // Crafted open capacity: the expiry semantics under test must not depend on the
    // generator happening to leave this session unfilled.
    const openSlots = [0, 1, 2].map((i) => ({
      ...data.appointments[0]!,
      id: `apt-crafted-${i}` as (typeof data.appointments)[0]["id"],
      clinicianId: clinician.id,
      startsAt: `2026-08-11T17:${String(i * 15).padStart(2, "0")}:00+10:00`,
      status: "open" as const,
      patientId: null,
    }));
    const pool = buildInvitationPool(
      "2026-08-11",
      clinician,
      openSlots,
      eligible,
      DEFAULT_POOL_CONFIG,
    );
    const one = pool[0];
    if (!one) throw new Error("empty pool");
    const withOneBooked = [{ ...one, status: "booked" as const }, ...pool.slice(1)];
    const expired = expireOnFill(withOneBooked, 0);
    expect(expired[0]?.status).toBe("booked"); // booked stays booked
    expect(expired.slice(1).every((i) => i.status === "expired")).toBe(true);
    // Still capacity → nothing expires.
    expect(expireOnFill(withOneBooked, 3)).toEqual(withOneBooked);
  });
});

describe("W51 audit fix: batchSize refuses a rate it cannot size a batch from", () => {
  // A non-positive rate made `needed` negative and Math.min then handed slice() a value
  // that invited nearly the whole eligible panel — the safety ceiling inverted into a mass
  // send. Sending nothing is the safe answer to a misconfiguration.
  it.each([0, -0.25, Number.NaN, Number.POSITIVE_INFINITY])("returns 0 for a rate of %s", (rate) => {
    expect(batchSize(10, { expectedResponseRate: rate as number, maxInvitesPerSession: 40 })).toBe(0);
  });

  it("never exceeds the ceiling, and a negative ceiling sends nothing", () => {
    expect(batchSize(1000, { expectedResponseRate: 0.25, maxInvitesPerSession: 40 })).toBe(40);
    expect(batchSize(10, { expectedResponseRate: 0.25, maxInvitesPerSession: -5 })).toBe(0);
  });

  it("still sizes a normal batch", () => {
    expect(batchSize(4, { expectedResponseRate: 0.25, maxInvitesPerSession: 40 })).toBe(16);
  });
});
