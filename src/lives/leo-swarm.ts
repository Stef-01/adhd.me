import { seededRng } from "./random";
import type { Entity } from "./layout";

export interface SwarmTarget extends Entity { readonly arrivesAt: number; readonly wave: number }
export interface SwarmPlan { readonly targets: readonly SwarmTarget[]; readonly waves: number; readonly sizes: readonly number[]; readonly duration: number }
export type SwarmCatches = Readonly<Record<string, number>>;
export const NOISE_DRAIN_PER_SECOND = 1.8;

/** Three waves, each bigger than the last: three, four, five at the start. There is no difficulty to
 *  choose; the room starts calm and the third wave is the hardest of it. The Chaos Run's later
 *  levels add a mosquito to every wave, which is how the arcade grows without a setting. */
export const WAVE_SIZES = [3, 4, 5] as const;
export function waveSizes(level: number): number[] {
  const extra = level >= 7 ? 2 : level >= 4 ? 1 : 0;
  return WAVE_SIZES.map((n) => n + extra);
}
/** Each wave flies a little faster than the one before. */
const WAVE_SPEEDUP = 0.18;

/** A finite, seeded swarm. Noise cost integrates mosquito-seconds, independent of frame rate. */
export function createLeoSwarm(seed: number, level: number, duration: number): SwarmPlan {
  const sizes = waveSizes(level);
  const rng = seededRng(seed);
  const targets: SwarmTarget[] = [];
  sizes.forEach((size, w) => {
    const pace = 1 + w * WAVE_SPEEDUP;
    for (let k = 0; k < size; k += 1) {
      const i = targets.length;
      targets.push({
        id: `e${i}`, label: "mosquito", role: "target", r: 37,
        x: 65 + (k % 3) * 130, y: k < 3 ? 170 : k < 6 ? 335 : 252,
        vx: (rng.next() < .5 ? -1 : 1) * (60 + rng.next() * 45 + level * 4) * pace,
        vy: (rng.next() < .5 ? -1 : 1) * (35 + rng.next() * 35) * pace,
        arrivesAt: w * duration * .18,
        wave: w + 1,
      });
    }
  });
  return { targets, waves: sizes.length, sizes, duration };
}

export function readLeoSwarm(plan: SwarmPlan, elapsed: number, catches: SwarmCatches, untimed: boolean) {
  const caught = plan.targets.filter(t => catches[t.id] !== undefined).length;
  // Untimed, a wave arrives only when every mosquito of the waves before it is caught.
  const wave = untimed ? untimedWave(plan, catches)
    : Math.min(plan.waves, Math.floor(elapsed / (plan.duration * .18)) + 1);
  const arrived = plan.targets.filter(t => untimed ? t.wave <= wave : t.arrivesAt <= elapsed);
  const alive = arrived.filter(t => catches[t.id] === undefined);
  const exposure = plan.targets.reduce((sum, t) => sum + Math.max(0, Math.min(elapsed, catches[t.id] ?? elapsed) - t.arrivesAt), 0);
  const regulation = untimed ? 100 : Math.max(0, 100 - exposure / 1000 * NOISE_DRAIN_PER_SECOND);
  const mood = regulation > 70 ? "settled" : regulation > 40 ? "unsettled" : regulation > 0 ? "overwhelmed" : "exhausted";
  return { caught, wave, arrived, alive, regulation, mood, complete: caught === plan.targets.length } as const;
}

function untimedWave(plan: SwarmPlan, catches: SwarmCatches): number {
  let wave = 1;
  while (wave < plan.waves && plan.targets.every((t) => t.wave > wave || catches[t.id] !== undefined)) wave += 1;
  return wave;
}
