// Ratings to weights: which asks, when the clinician declared them, went with better visits. Bounded
// and sayable, as src/lib/matching/feedback.ts is for /match: per ask and never per clinician (C2),
// silent until MIN_SAMPLES visits sit on each side (the ask declared, the ask not), and a weight
// moves by at most MAX_SHIFT of itself. The finder multiplies an ask's weight by its number before
// ranking (app/care-finder.tsx); with nothing learned, the finder ranks exactly as it always did.

import type { RatingRecord } from "./finder";

export const MIN_SAMPLES = 8;
export const MAX_SHIFT = 0.5;

export interface AskSignal {
  key: string;
  metN: number;
  metStars: number;
  unmetN: number;
  unmetStars: number;
}

const mean = (values: readonly number[]) => (values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0);

/** For each ask, the visits where the clinician declared it and those where they did not. */
export function askSignals(ratings: readonly Pick<RatingRecord, "stars" | "asked" | "met">[]): AskSignal[] {
  const by = new Map<string, { met: number[]; unmet: number[] }>();
  for (const rating of ratings) {
    for (const key of rating.asked) {
      const side = by.get(key) ?? { met: [], unmet: [] };
      (rating.met.includes(key) ? side.met : side.unmet).push(rating.stars);
      by.set(key, side);
    }
  }
  return [...by.entries()]
    .map(([key, side]) => ({ key, metN: side.met.length, metStars: mean(side.met), unmetN: side.unmet.length, unmetStars: mean(side.unmet) }))
    .sort((a, b) => a.key.localeCompare(b.key));
}

/**
 * A multiplier per ask: a star's difference between met and unmet visits moves the weight by an
 * eighth of itself, so the full four-star gap reaches MAX_SHIFT. Asks without enough visits on both
 * sides are absent, which the finder reads as 1.
 */
export function learnAskWeights(signals: readonly AskSignal[]): Record<string, number> {
  const weights: Record<string, number> = {};
  for (const s of signals) {
    if (s.metN < MIN_SAMPLES || s.unmetN < MIN_SAMPLES) continue;
    const shift = Math.max(-MAX_SHIFT, Math.min(MAX_SHIFT, ((s.metStars - s.unmetStars) / 4) * MAX_SHIFT));
    if (shift !== 0) weights[s.key] = Math.round((1 + shift) * 1000) / 1000;
  }
  return weights;
}
