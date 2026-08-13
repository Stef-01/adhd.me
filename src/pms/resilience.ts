// W36: multi-PMS resilience. A PMS is a third-party system that will be slow,
// flaky, or down — and Meherr runs many practices at once, each on its own
// adapter. Two guarantees here:
//
//   1. FAILURE ISOLATION — one practice's adapter throwing, hanging, or returning
//      nonsense must never throw into the caller or affect another practice's read.
//      Failures degrade to the last good snapshot and are reported, never raised.
//
//   2. STALE-DATA GUARD — offering an appointment slot read from stale data risks
//      inviting a patient into a slot the practice has already filled. So staleness
//      fails CLOSED: past the freshness budget a snapshot is returned but marked
//      unusable for sending. Not sending is always the safe direction.
//
// A circuit breaker stops hammering an adapter that is clearly down. Time is
// injected (no Date.now in the logic) so the chaos tests are deterministic.

import type { Appointment } from "@/domain/types";
import type { DateRange, PmsReadAdapter } from "@/pms/adapter";

export type PmsHealth = "ok" | "degraded" | "unavailable";

export interface ResilienceConfig {
  /** A read that takes longer than this is abandoned and counted as a failure. */
  timeoutMs: number;
  /** Consecutive failures before the breaker opens. */
  failureThreshold: number;
  /** How long the breaker stays open before a trial read is allowed. */
  breakerCooldownMs: number;
  /** Data older than this may not be used to offer appointments. */
  freshnessBudgetMs: number;
}

export const DEFAULT_RESILIENCE: ResilienceConfig = {
  timeoutMs: 5_000,
  failureThreshold: 3,
  breakerCooldownMs: 60_000,
  freshnessBudgetMs: 15 * 60_000,
};

export interface SlotRead {
  slots: Appointment[];
  health: PmsHealth;
  /** True only when the data is fresh enough to offer from (stale fails closed). */
  usableForSending: boolean;
  /** Age of the returned data at read time; 0 for a live read. */
  ageMs: number;
  /** Present when the live read failed — why, for ops surfacing. */
  failure?: "threw" | "timeout" | "malformed" | "circuit_open";
}

export type Clock = () => number;

interface Snapshot {
  slots: Appointment[];
  atMs: number;
}

/** Reject anything that isn't a well-formed open-slot array — a PMS can return junk. */
function validateSlots(value: unknown): Appointment[] | null {
  if (!Array.isArray(value)) return null;
  for (const slot of value) {
    if (typeof slot !== "object" || slot === null) return null;
    const s = slot as Partial<Appointment>;
    if (typeof s.id !== "string" || typeof s.startsAt !== "string") return null;
    if (typeof s.clinicianId !== "string" || s.status !== "open") return null;
  }
  return value as Appointment[];
}

async function withTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
): Promise<{ ok: true; value: T } | { ok: false }> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<{ ok: false }>((resolve) => {
    timer = setTimeout(() => resolve({ ok: false }), timeoutMs);
  });
  try {
    return await Promise.race([work.then((value) => ({ ok: true as const, value })), timeout]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

/**
 * One resilient reader per adapter. Holds that adapter's last good snapshot and
 * breaker state; instances are independent, which is what makes practices isolated.
 */
export class ResilientPmsReader {
  private snapshot: Snapshot | null = null;
  private consecutiveFailures = 0;
  private breakerOpenedAtMs: number | null = null;

  constructor(
    private readonly adapter: PmsReadAdapter,
    private readonly config: ResilienceConfig = DEFAULT_RESILIENCE,
    private readonly clock: Clock = () => Date.now(),
  ) {}

  get practiceId(): string {
    return this.adapter.practiceId;
  }

  get name(): string {
    return this.adapter.name;
  }

  /** Open unless the cooldown has elapsed (then one trial read is allowed). */
  private breakerIsOpen(now: number): boolean {
    if (this.breakerOpenedAtMs === null) return false;
    if (now - this.breakerOpenedAtMs >= this.config.breakerCooldownMs) return false;
    return true;
  }

  private degraded(now: number, failure: SlotRead["failure"]): SlotRead {
    if (!this.snapshot) {
      return { slots: [], health: "unavailable", usableForSending: false, ageMs: 0, failure };
    }
    const ageMs = now - this.snapshot.atMs;
    return {
      slots: this.snapshot.slots,
      health: "degraded",
      usableForSending: ageMs <= this.config.freshnessBudgetMs,
      ageMs,
      failure,
    };
  }

  /** Never throws. Returns the best available data plus an honest health verdict. */
  async readOpenSlots(range: DateRange): Promise<SlotRead> {
    const now = this.clock();

    if (this.breakerIsOpen(now)) return this.degraded(now, "circuit_open");

    let raw: unknown;
    try {
      const result = await withTimeout(
        this.adapter.listOpenSlots(range) as Promise<unknown>,
        this.config.timeoutMs,
      );
      if (!result.ok) return this.recordFailure(now, "timeout");
      raw = result.value;
    } catch {
      return this.recordFailure(now, "threw");
    }

    const slots = validateSlots(raw);
    if (slots === null) return this.recordFailure(now, "malformed");

    // Success: reset the breaker and refresh the snapshot.
    this.consecutiveFailures = 0;
    this.breakerOpenedAtMs = null;
    this.snapshot = { slots, atMs: this.clock() };
    return { slots, health: "ok", usableForSending: true, ageMs: 0 };
  }

  private recordFailure(now: number, failure: NonNullable<SlotRead["failure"]>): SlotRead {
    this.consecutiveFailures++;
    if (this.consecutiveFailures >= this.config.failureThreshold) {
      this.breakerOpenedAtMs = now;
    }
    return this.degraded(now, failure);
  }
}

export interface FleetRead {
  practiceId: string;
  read: SlotRead;
}

/**
 * Fan out across every practice's reader. One sick adapter cannot fail, delay past
 * its own timeout, or contaminate the others — each result stands alone.
 */
export async function readFleet(
  readers: readonly ResilientPmsReader[],
  range: DateRange,
): Promise<FleetRead[]> {
  return Promise.all(
    readers.map(async (reader) => ({
      practiceId: reader.practiceId,
      read: await reader.readOpenSlots(range),
    })),
  );
}

/** Practices safe to send for right now — the only list the loop may act on. */
export function sendablePractices(reads: readonly FleetRead[]): string[] {
  return reads.filter((r) => r.read.usableForSending).map((r) => r.practiceId);
}
