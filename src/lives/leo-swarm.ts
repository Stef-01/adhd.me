import { seededRng } from "./random";
import type { Entity } from "./layout";

export interface SwarmTarget extends Entity { readonly arrivesAt: number; readonly wave: number }
export interface SwarmPlan { readonly targets: readonly SwarmTarget[]; readonly waves: number; readonly perWave: number; readonly duration: number }
export type SwarmCatches = Readonly<Record<string, number>>;
export const NOISE_DRAIN_PER_SECOND = 1.8;

/** A finite, seeded swarm. Noise cost integrates mosquito-seconds, independent of frame rate. */
export function createLeoSwarm(seed: number, level: number, duration: number): SwarmPlan {
  const waves = level >= 7 ? 4 : 3;
  const perWave = level >= 7 ? 5 : level >= 4 ? 4 : 3;
  const rng = seededRng(seed);
  const targets = Array.from({ length: waves * perWave }, (_, i): SwarmTarget => ({
    id: `e${i}`, label: "mosquito", role: "target", r: 37,
    x: 65 + ((i % perWave) % 3) * 130, y: i % perWave < 3 ? 170 : 335,
    vx: (rng.next() < .5 ? -1 : 1) * (60 + rng.next() * 45 + level * 4),
    vy: (rng.next() < .5 ? -1 : 1) * (35 + rng.next() * 35),
    arrivesAt: Math.floor(i / perWave) * duration * .18,
    wave: Math.floor(i / perWave) + 1,
  }));
  return { targets, waves, perWave, duration };
}

export function readLeoSwarm(plan: SwarmPlan, elapsed: number, catches: SwarmCatches, untimed: boolean) {
  const caught = plan.targets.filter(t => catches[t.id] !== undefined).length;
  const wave = untimed ? Math.min(plan.waves, Math.floor(caught / plan.perWave) + 1)
    : Math.min(plan.waves, Math.floor(elapsed / (plan.duration * .18)) + 1);
  const arrived = plan.targets.filter(t => untimed ? t.wave <= wave : t.arrivesAt <= elapsed);
  const alive = arrived.filter(t => catches[t.id] === undefined);
  const exposure = plan.targets.reduce((sum, t) => sum + Math.max(0, Math.min(elapsed, catches[t.id] ?? elapsed) - t.arrivesAt), 0);
  const regulation = untimed ? 100 : Math.max(0, 100 - exposure / 1000 * NOISE_DRAIN_PER_SECOND);
  const mood = regulation > 70 ? "settled" : regulation > 40 ? "unsettled" : regulation > 0 ? "overwhelmed" : "exhausted";
  return { caught, wave, arrived, alive, regulation, mood, complete: caught === plan.targets.length } as const;
}
