// W36 verify gate: chaos tests. Each scenario injects a different PMS failure and
// asserts the two guarantees — failure isolation (never throws, never leaks across
// practices) and the stale-data guard (past the freshness budget, sending is refused).

import { describe, expect, it } from "vitest";
import type { Appointment, AppointmentId, ClinicianId, PracticeId } from "@/domain/types";
import type { Cancellation, ConsentRecord, DateRange, PmsReadAdapter } from "@/pms/adapter";
import {
  DEFAULT_RESILIENCE,
  readFleet,
  ResilientPmsReader,
  sendablePractices,
  type ResilienceConfig,
} from "@/pms/resilience";

const RANGE: DateRange = { fromIso: "2026-09-01", toIso: "2026-09-07" };

const CONFIG: ResilienceConfig = {
  ...DEFAULT_RESILIENCE,
  timeoutMs: 20,
  failureThreshold: 2,
  breakerCooldownMs: 60_000,
  freshnessBudgetMs: 15 * 60_000,
};

function slot(id: string, practiceId: string): Appointment {
  return {
    id: id as AppointmentId,
    practiceId: practiceId as PracticeId,
    clinicianId: "clin-1" as ClinicianId,
    startsAt: "2026-09-01T09:00:00+10:00",
    status: "open",
    patientId: null,
    generatedByInvitation: false,
  };
}

/** A programmable adapter: each read consults `behaviour` so chaos can vary per call. */
type Behaviour = "ok" | "throw" | "hang" | "malformed";

class ChaosAdapter implements PmsReadAdapter {
  readonly name = "chaos";
  calls = 0;
  constructor(
    readonly practiceId: string,
    public behaviour: Behaviour = "ok",
  ) {}

  async listOpenSlots(_range: DateRange): Promise<Appointment[]> {
    this.calls++;
    switch (this.behaviour) {
      case "throw":
        throw new Error("PMS exploded");
      case "hang":
        return new Promise(() => {}); // never settles
      case "malformed":
        return [{ nope: true }, "garbage"] as unknown as Appointment[];
      default:
        return [slot(`${this.practiceId}-a1`, this.practiceId)];
    }
  }
  async listPatients() {
    return [];
  }
  async listCancellations(): Promise<Cancellation[]> {
    return [];
  }
  async listConsents(): Promise<ConsentRecord[]> {
    return [];
  }
}

/** Test clock: advance explicitly, no wall-clock dependence. */
function makeClock(startMs = 1_000_000) {
  let now = startMs;
  return { now: () => now, advance: (ms: number) => (now += ms) };
}

describe("W36 chaos: failure isolation", () => {
  it("a throwing adapter degrades instead of throwing", async () => {
    const clock = makeClock();
    const reader = new ResilientPmsReader(new ChaosAdapter("p1", "throw"), CONFIG, clock.now);
    const read = await reader.readOpenSlots(RANGE);
    expect(read.health).toBe("unavailable"); // no snapshot yet
    expect(read.failure).toBe("threw");
    expect(read.usableForSending).toBe(false);
    expect(read.slots).toEqual([]);
  });

  it("a hanging adapter times out rather than blocking forever", async () => {
    const clock = makeClock();
    const reader = new ResilientPmsReader(new ChaosAdapter("p1", "hang"), CONFIG, clock.now);
    const read = await reader.readOpenSlots(RANGE);
    expect(read.failure).toBe("timeout");
    expect(read.usableForSending).toBe(false);
  });

  it("malformed payloads are rejected, never passed through", async () => {
    const clock = makeClock();
    const reader = new ResilientPmsReader(new ChaosAdapter("p1", "malformed"), CONFIG, clock.now);
    const read = await reader.readOpenSlots(RANGE);
    expect(read.failure).toBe("malformed");
    expect(read.slots).toEqual([]);
  });

  it("after a good read, a later failure serves the last good snapshot", async () => {
    const clock = makeClock();
    const adapter = new ChaosAdapter("p1", "ok");
    const reader = new ResilientPmsReader(adapter, CONFIG, clock.now);
    const good = await reader.readOpenSlots(RANGE);
    expect(good).toMatchObject({ health: "ok", usableForSending: true, ageMs: 0 });

    adapter.behaviour = "throw";
    clock.advance(60_000); // 1 min — still inside the freshness budget
    const degraded = await reader.readOpenSlots(RANGE);
    expect(degraded.health).toBe("degraded");
    expect(degraded.usableForSending).toBe(true);
    expect(degraded.slots.map((s) => s.id)).toEqual(["p1-a1"]);
    expect(degraded.ageMs).toBe(60_000);
  });

  it("one sick practice never affects another in a fleet read", async () => {
    const clock = makeClock();
    const healthy = new ResilientPmsReader(new ChaosAdapter("p-ok", "ok"), CONFIG, clock.now);
    const broken = new ResilientPmsReader(new ChaosAdapter("p-bad", "throw"), CONFIG, clock.now);
    const hanging = new ResilientPmsReader(new ChaosAdapter("p-slow", "hang"), CONFIG, clock.now);

    const reads = await readFleet([healthy, broken, hanging], RANGE);
    expect(reads).toHaveLength(3);
    expect(reads.find((r) => r.practiceId === "p-ok")!.read.health).toBe("ok");
    expect(reads.find((r) => r.practiceId === "p-bad")!.read.health).toBe("unavailable");
    expect(reads.find((r) => r.practiceId === "p-slow")!.read.failure).toBe("timeout");
    // Only the healthy practice may be sent for.
    expect(sendablePractices(reads)).toEqual(["p-ok"]);
  });
});

describe("W36 chaos: stale-data guard (fails closed)", () => {
  it("refuses to send from a snapshot past the freshness budget", async () => {
    const clock = makeClock();
    const adapter = new ChaosAdapter("p1", "ok");
    const reader = new ResilientPmsReader(adapter, CONFIG, clock.now);
    await reader.readOpenSlots(RANGE);

    adapter.behaviour = "throw";
    clock.advance(CONFIG.freshnessBudgetMs + 1);
    const stale = await reader.readOpenSlots(RANGE);
    expect(stale.health).toBe("degraded");
    expect(stale.usableForSending).toBe(false); // fails CLOSED
    expect(stale.slots).toHaveLength(1); // data still returned for display/ops
  });

  it("the budget boundary is inclusive — exactly at budget is still usable", async () => {
    const clock = makeClock();
    const adapter = new ChaosAdapter("p1", "ok");
    const reader = new ResilientPmsReader(adapter, CONFIG, clock.now);
    await reader.readOpenSlots(RANGE);
    adapter.behaviour = "throw";
    clock.advance(CONFIG.freshnessBudgetMs);
    expect((await reader.readOpenSlots(RANGE)).usableForSending).toBe(true);
  });

  it("recovery refreshes the snapshot and clears staleness", async () => {
    const clock = makeClock();
    const adapter = new ChaosAdapter("p1", "ok");
    const reader = new ResilientPmsReader(adapter, CONFIG, clock.now);
    await reader.readOpenSlots(RANGE);
    adapter.behaviour = "throw";
    clock.advance(CONFIG.freshnessBudgetMs + 1);
    expect((await reader.readOpenSlots(RANGE)).usableForSending).toBe(false);

    adapter.behaviour = "ok";
    clock.advance(CONFIG.breakerCooldownMs); // let the breaker allow a trial read
    const recovered = await reader.readOpenSlots(RANGE);
    expect(recovered).toMatchObject({ health: "ok", usableForSending: true, ageMs: 0 });
  });
});

describe("W36 chaos: circuit breaker", () => {
  it("opens after the failure threshold and stops calling the adapter", async () => {
    const clock = makeClock();
    const adapter = new ChaosAdapter("p1", "throw");
    const reader = new ResilientPmsReader(adapter, CONFIG, clock.now);

    await reader.readOpenSlots(RANGE);
    await reader.readOpenSlots(RANGE); // threshold (2) reached — breaker opens
    const callsAtOpen = adapter.calls;

    const blocked = await reader.readOpenSlots(RANGE);
    expect(blocked.failure).toBe("circuit_open");
    expect(adapter.calls).toBe(callsAtOpen); // adapter was not hammered
  });

  it("allows a trial read once the cooldown elapses", async () => {
    const clock = makeClock();
    const adapter = new ChaosAdapter("p1", "throw");
    const reader = new ResilientPmsReader(adapter, CONFIG, clock.now);
    await reader.readOpenSlots(RANGE);
    await reader.readOpenSlots(RANGE);
    const callsAtOpen = adapter.calls;

    clock.advance(CONFIG.breakerCooldownMs);
    adapter.behaviour = "ok";
    const trial = await reader.readOpenSlots(RANGE);
    expect(adapter.calls).toBe(callsAtOpen + 1);
    expect(trial.health).toBe("ok");
  });

  it("a successful read resets the failure count", async () => {
    const clock = makeClock();
    const adapter = new ChaosAdapter("p1", "throw");
    const reader = new ResilientPmsReader(adapter, CONFIG, clock.now);
    await reader.readOpenSlots(RANGE); // 1 failure (threshold is 2)
    adapter.behaviour = "ok";
    await reader.readOpenSlots(RANGE); // success resets
    adapter.behaviour = "throw";
    await reader.readOpenSlots(RANGE); // 1 failure again — must NOT open
    expect((await reader.readOpenSlots(RANGE)).failure).not.toBe("circuit_open");
  });
});
