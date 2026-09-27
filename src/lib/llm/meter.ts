// A run's spend and pace. The meter refuses a call before its fetch when the call's worst case could
// cross the cap; the gate holds concurrency and requests per minute; the eval runner writes the ledger.

import { appendFileSync, existsSync, mkdirSync, readFileSync } from "node:fs";
import { dirname } from "node:path";
import type { Usage } from "./client";

export class BudgetError extends Error { name = "BudgetError"; }

export class BudgetMeter {
  spent = 0;
  calls = 0;
  /** Failed attempts (network, 429, 5xx, timeout), retries included. */
  errors = 0;
  private held = 0;

  constructor(readonly capUsd: number, private readonly onCharge?: (costUsd: number, usage: Usage, model: string) => void) {}

  reserve(worstUsd: number): void {
    if (this.spent + this.held + worstUsd > this.capUsd) throw new BudgetError(`$${this.spent.toFixed(5)} spent; one more call could pass the $${this.capUsd} cap`);
    this.held += worstUsd;
  }

  release(worstUsd: number): void {
    this.held -= worstUsd;
  }

  charge(costUsd: number, usage: Usage, model: string): void {
    this.spent += costUsd;
    this.calls += 1;
    this.onCharge?.(costUsd, usage, model);
  }
}

/** At most `concurrency` tasks at once, and at most `rpm` starts in any sliding minute. */
export class RateGate {
  private active = 0;
  private waiting: (() => void)[] = [];
  private starts: number[] = [];

  constructor(
    private readonly concurrency: number,
    private readonly rpm: number,
    private readonly now: () => number = Date.now,
    private readonly sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms)),
  ) {}

  async run<T>(task: () => Promise<T>): Promise<T> {
    while (this.active >= this.concurrency) await new Promise<void>((resolve) => this.waiting.push(resolve));
    this.active += 1;
    try {
      while ((this.starts = this.starts.filter((at) => at > this.now() - 60_000)).length >= this.rpm) {
        await this.sleep(this.starts[0]! + 60_000 - this.now());
      }
      this.starts.push(this.now());
      return await task();
    } finally {
      this.active -= 1;
      this.waiting.shift()?.();
    }
  }
}

export type LedgerRow = { level: string; phase: string; model: string; usage: Usage; costUsd: number };

export function appendLedger(path: string, row: LedgerRow, now = new Date()): void {
  mkdirSync(dirname(path), { recursive: true });
  appendFileSync(path, `${JSON.stringify({ time: now.toISOString(), ...row })}\n`);
}

export function ledgerSpend(path: string): number {
  let total = 0;
  if (existsSync(path)) for (const line of readFileSync(path, "utf8").split("\n")) if (line.trim()) total += (JSON.parse(line) as LedgerRow).costUsd;
  return total;
}
