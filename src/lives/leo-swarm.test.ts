import { describe, expect, it } from "vitest";
import { createLeoSwarm, readLeoSwarm } from "./leo-swarm";

describe("Leo's swarm", () => {
  it("starts with several mosquitoes, keeps arriving, and requires the entire finite swarm", () => {
    const plan = createLeoSwarm(17, 1, 22000);
    expect(plan.targets).toHaveLength(9);
    expect(readLeoSwarm(plan, 0, {}, false).alive).toHaveLength(3);
    const first = Object.fromEntries(plan.targets.slice(0, 3).map(t => [t.id, 100]));
    expect(readLeoSwarm(plan, 200, first, false).complete).toBe(false);
    expect(readLeoSwarm(plan, 8000, first, false).alive).toHaveLength(6);
    const all = Object.fromEntries(plan.targets.map(t => [t.id, t.arrivesAt + 100]));
    expect(readLeoSwarm(plan, 10000, all, false).complete).toBe(true);
  });
  it("drains regulation for every uncaught mosquito and stops its noise cost at the catch", () => {
    const plan = createLeoSwarm(17, 1, 22000);
    expect(readLeoSwarm(plan, 2000, {}, false).regulation).toBeCloseTo(89.2);
    expect(readLeoSwarm(plan, 2000, { e0: 1000 }, false).regulation).toBeCloseTo(91);
    expect(readLeoSwarm(plan, 22000, {}, false).regulation).toBe(0);
    const all = Object.fromEntries(plan.targets.map(t => [t.id, t.arrivesAt + 100]));
    expect(readLeoSwarm(plan, 12000, all, false).regulation).toBe(readLeoSwarm(plan, 13000, all, false).regulation);
  });
  it("uses the same targets in untimed play, advancing only when the previous wave is clear", () => {
    const plan = createLeoSwarm(9, 8, 22000);
    expect(plan.targets).toHaveLength(20);
    expect(readLeoSwarm(plan, 50000, {}, true).alive).toHaveLength(5);
    const first = Object.fromEntries(plan.targets.slice(0, 5).map(t => [t.id, 0]));
    const next = readLeoSwarm(plan, 0, first, true);
    expect(next.wave).toBe(2); expect(next.alive).toHaveLength(5); expect(next.regulation).toBe(100);
    expect(createLeoSwarm(9, 8, 22000)).toEqual(plan);
  });
});
