// The lived-in seed record, held to the same standard as the app that reads it.
//
// `LIVED_RECORD` in `scripts/text-budget-lib.mjs` is the ONE record that both the text-budget
// instrument and `e2e/my-adhd.spec.ts` run on, which is the point of it: the screen the gate
// measures is the screen the spec drives. That only holds while everything the seed names is real.
// It named a strategy that was not — `{ strategyId: "wind-down", moduleId: "sleep" }`, where the
// sleep module's one strategy is `fixed-wake` — so `/my-adhd/history` fell through to printing the
// raw id under "Helped a lot", and every measurement of that screen was of a screen no user could
// reach. Nothing caught it, because the seed is data and the fallback was a silent `return id`.

import { describe, expect, it } from "vitest";
import { INTERACTIVE_MODULES } from "@/learn/interactive";
import { hasPlan, remaining, type CarePlan } from "./care-plan";
// The library is plain ESM the CLI and the e2e suite both share; the types are loose on purpose.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore
import { LIVED_RECORD } from "../../scripts/text-budget-lib.mjs";

type Seed = {
  experiments: { strategyId: string; moduleId: string }[];
  insights: Record<string, string>;
  carePlan: { allows: number; used: number; year: number; confirmedOn: string };
};

const seed = LIVED_RECORD as Seed;

/** Every strategy id the app can hold, and the module it belongs to. */
const strategies = new Map<string, string>();
for (const m of INTERACTIVE_MODULES) {
  for (const step of m.steps) {
    if (step.kind !== "strategy") continue;
    for (const s of step.strategies) strategies.set(s.id, m.id);
  }
}

/** Every insight id, which is what the map's "Does this fit?" verdicts are keyed by. */
const insights = new Set<string>();
for (const m of INTERACTIVE_MODULES) {
  for (const step of m.steps) if (step.kind === "insight") insights.add((step as { id: string }).id);
}

describe("the lived-in seed names only things that exist", () => {
  it("has experiments to check, so this cannot pass by being empty", () => {
    expect(seed.experiments.length).toBeGreaterThan(2);
    expect(strategies.size).toBeGreaterThan(20);
    expect(insights.size).toBeGreaterThan(0);
  });

  it("names a real strategy in every experiment", () => {
    const unknown = seed.experiments.filter((e) => !strategies.has(e.strategyId)).map((e) => e.strategyId);
    expect(unknown, "a seeded strategy no module defines renders as a raw id, or now not at all").toEqual([]);
  });

  it("puts each seeded strategy under the module that actually owns it", () => {
    // A right id under the wrong module still seeds a record no user could produce.
    const misfiled = seed.experiments
      .filter((e) => strategies.get(e.strategyId) !== e.moduleId)
      .map((e) => `${e.strategyId} seeded under ${e.moduleId}, owned by ${strategies.get(e.strategyId)}`);
    expect(misfiled).toEqual([]);
  });

  it("names a real insight in every verdict", () => {
    const unknown = Object.keys(seed.insights).filter((id) => !insights.has(id));
    expect(unknown, "a verdict on an insight no module defines cannot appear on the history screen").toEqual([]);
  });

  // The hub's care-plan card has two shapes and the instrument had only ever seen the one with no
  // plan. A seed whose plan has nothing left measures the wrong one of them silently.
  it("carries a care plan with services still to spend", () => {
    expect(hasPlan(seed.carePlan as CarePlan)).toBe(true);
    expect(remaining(seed.carePlan as CarePlan, new Date(`${seed.carePlan.year}-06-01`))).toBeGreaterThan(0);
    expect(seed.carePlan.used).toBeGreaterThan(0);
  });
});
