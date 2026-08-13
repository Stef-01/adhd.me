import { describe, expect, it } from "vitest";
import type { Appointment, AppointmentId, ClinicianId, PracticeId } from "@/domain/types";
import {
  buildBackfillPool,
  DEFAULT_BACKFILL_CONFIG,
  isLateCancellation,
} from "@/engine/backfill";
import { DEFAULT_CONFIG } from "@/engine/eligibility";
import { DEFAULT_POOL_CONFIG } from "@/engine/pool";
import { DEFAULT_SESSION_CONFIG } from "@/session/config";
import { generatePractice } from "@/synthetic/generate";
import { checkInvariants, DEFAULT_SIM_CONFIG, runSim } from "./harness";

const TODAY = "2026-08-08";

describe("W30 late-cancellation classification", () => {
  it("late means within the window before the slot start, never after it", () => {
    const slot = "2026-08-10T10:00:00+10:00";
    expect(isLateCancellation(slot, "2026-08-09T10:00:00+10:00", DEFAULT_BACKFILL_CONFIG)).toBe(true); // 24h
    expect(isLateCancellation(slot, "2026-08-08T10:00:00+10:00", DEFAULT_BACKFILL_CONFIG)).toBe(true); // 48h boundary
    expect(isLateCancellation(slot, "2026-08-07T09:59:00+10:00", DEFAULT_BACKFILL_CONFIG)).toBe(false); // too early
    expect(isLateCancellation(slot, "2026-08-10T10:01:00+10:00", DEFAULT_BACKFILL_CONFIG)).toBe(false); // after start
    expect(isLateCancellation("garbage", "2026-08-09T10:00:00+10:00", DEFAULT_BACKFILL_CONFIG)).toBe(false);
  });
});

describe("W30 backfill pool", () => {
  const data = generatePractice({
    seed: 11,
    patientCount: 2_000,
    clinicianCount: 10,
    scheduleWeeks: 1,
    todayIso: TODAY,
  });
  const clinician = data.clinicians.find((c) => c.participating)!;
  const freed: Appointment = {
    id: "apt-freed" as AppointmentId,
    practiceId: data.practice.id,
    clinicianId: clinician.id,
    startsAt: "2026-08-11T10:00:00+10:00",
    status: "open",
    patientId: null,
    generatedByInvitation: false,
  };

  it("builds a minimal single-slot pool through the same eligibility and ranking stack", () => {
    const result = buildBackfillPool(
      freed,
      clinician,
      data.patients,
      { ...DEFAULT_CONFIG, usualClinicianOnly: false },
      DEFAULT_SESSION_CONFIG,
      DEFAULT_POOL_CONFIG,
      TODAY,
      new Map(),
      `${TODAY}T12:00:00Z`,
    );
    expect(result.skipped).toBeNull();
    // Smallest batch expected to fill ONE slot: ceil(1 / 0.25).
    expect(result.invitations).toHaveLength(4);
    expect(result.invitations.every((i) => i.sessionDate === "2026-08-11")).toBe(true);
    expect(new Set(result.invitations.map((i) => i.patientId)).size).toBe(4);
  });

  it("a freed slot the session config excludes stays protected — no offers", () => {
    const result = buildBackfillPool(
      freed,
      clinician,
      data.patients,
      { ...DEFAULT_CONFIG, usualClinicianOnly: false },
      { ...DEFAULT_SESSION_CONFIG, schedulingWindow: { startHour: 14, endHour: 17 } },
      DEFAULT_POOL_CONFIG,
      TODAY,
      new Map(),
      `${TODAY}T12:00:00Z`,
    );
    expect(result.invitations).toEqual([]);
    expect(result.skipped).toBe("slot_not_offerable");
  });

  it("no eligible candidates means no offers, stated as such", () => {
    const strangers = data.patients.map((p) => ({ ...p, practiceId: "prac-x" as PracticeId, optedOut: true }));
    const result = buildBackfillPool(
      freed,
      clinician,
      strangers,
      DEFAULT_CONFIG,
      DEFAULT_SESSION_CONFIG,
      DEFAULT_POOL_CONFIG,
      TODAY,
      new Map(),
      `${TODAY}T12:00:00Z`,
    );
    expect(result.invitations).toEqual([]);
    expect(result.skipped).toBe("no_eligible_patients");
  });
});

describe("W30 fast path in sim — latency budget", () => {
  const result = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6, lateCancellationRate: 0.03 });

  it("the fast path runs and fills freed capacity", () => {
    expect(result.totals.backfillEvents).toBeGreaterThan(0);
    expect(result.totals.backfillSent).toBeGreaterThan(0);
    expect(result.totals.backfillBooked).toBeGreaterThan(0);
    expect(result.backfillLatenciesMs).toHaveLength(result.totals.backfillEvents);
  });

  it("latency budget met: every cancellation-to-offers-sent under 100ms, p50 under 25ms", () => {
    const sorted = [...result.backfillLatenciesMs].sort((a, b) => a - b);
    expect(sorted[sorted.length - 1]!).toBeLessThan(100);
    expect(sorted[Math.floor(sorted.length / 2)]!).toBeLessThan(25);
  });

  it("all safety invariants hold with the fast path active", () => {
    expect(checkInvariants(result)).toEqual([]);
  });

  it("backfill counts are deterministic; wall-clock latency is the only nondeterminism", () => {
    const again = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 6, lateCancellationRate: 0.03 });
    expect(again.totals).toEqual(result.totals);
    expect(again.attribution).toEqual(result.attribution);
  });

  it("a zero rate disables the path completely (goldens stay stable)", () => {
    const off = runSim({ ...DEFAULT_SIM_CONFIG, weeks: 4 });
    expect(off.totals.backfillEvents).toBe(0);
    expect(off.backfillLatenciesMs).toEqual([]);
  });
});
