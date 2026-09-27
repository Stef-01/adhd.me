import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { appendLedger, BudgetError, BudgetMeter, ledgerSpend, RateGate } from "./meter";

const USAGE = { input: 800, cached: 0, output: 60, reasoning: 0 };

describe("BudgetMeter", () => {
  it("refuses a call whose worst case would cross the cap, counting calls still in flight", () => {
    const seen: number[] = [];
    const meter = new BudgetMeter(0.001, (cost) => seen.push(cost));
    meter.reserve(0.0004);
    meter.reserve(0.0004);
    expect(() => meter.reserve(0.0004)).toThrow(BudgetError);
    meter.charge(0.0001, USAGE, "gpt-5-nano");
    meter.release(0.0004);
    meter.reserve(0.0004);
    expect(meter.spent).toBe(0.0001);
    expect(meter.calls).toBe(1);
    expect(seen).toEqual([0.0001]);
  });
});

describe("RateGate", () => {
  // A clock that only moves when the gate sleeps, so the test reads every wait it asks for.
  function fakeClock() {
    const clock = { t: 0, waits: [] as number[] };
    const now = () => clock.t;
    const sleep = async (ms: number) => {
      clock.waits.push(ms);
      clock.t += ms;
    };
    return { clock, now, sleep };
  }

  it("never runs more than `concurrency` tasks at once", async () => {
    const { now, sleep } = fakeClock();
    const gate = new RateGate(2, 1000, now, sleep);
    let running = 0;
    let most = 0;
    const task = async () => {
      running += 1;
      most = Math.max(most, running);
      await new Promise((resolve) => setTimeout(resolve, 1));
      running -= 1;
    };
    await Promise.all(Array.from({ length: 7 }, () => gate.run(task)));
    expect(most).toBe(2);
  });

  it("never starts more than `rpm` tasks in any sliding minute", async () => {
    const { clock, now, sleep } = fakeClock();
    const gate = new RateGate(1, 3, now, sleep);
    const starts: number[] = [];
    for (let i = 0; i < 7; i += 1) await gate.run(async () => void starts.push(now()));
    expect(starts).toEqual([0, 0, 0, 60_000, 60_000, 60_000, 120_000]);
    for (const start of starts) expect(starts.filter((s) => s >= start && s < start + 60_000).length).toBeLessThanOrEqual(3);
    expect(clock.waits).toEqual([60_000, 60_000]);
  });
});

describe("the ledger", () => {
  it("appends one row per paid call and sums them", () => {
    const path = join(mkdtempSync(join(tmpdir(), "ledger-")), "qa", "ledger.jsonl");
    expect(ledgerSpend(path)).toBe(0);
    appendLedger(path, { level: "L1", phase: "P1", model: "gpt-5-nano", usage: USAGE, costUsd: 0.25 }, new Date("2026-09-27T00:00:00Z"));
    appendLedger(path, { level: "L1", phase: "P2", model: "gpt-5-nano", usage: USAGE, costUsd: 0.5 });
    expect(ledgerSpend(path)).toBe(0.75);
  });
});
