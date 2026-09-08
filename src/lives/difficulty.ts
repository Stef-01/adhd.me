// §58: difficulty has dimensions. Level 1 is the first game of a run; it rises at every FASTER (§59).
import type { DifficultyParameters } from "./types";

export const MAX_DIFFICULTY = 8;

export function difficultyFor(level: number): DifficultyParameters {
  const l = Math.max(1, Math.min(MAX_DIFFICULTY, level));
  const t = (l - 1) / (MAX_DIFFICULTY - 1);
  return {
    timeMultiplier: 1 - 0.45 * t,
    targetSpeed: 1 + 1.2 * t,
    targetCount: 1 + Math.round(2 * t),
    distractorCount: 2 + Math.round(4 * t),
    distractorSimilarity: 0.2 + 0.7 * t,
    hitRadiusMultiplier: 1 - 0.35 * t,
    memoryLength: 3 + Math.round(3 * t),
    pathWidthMultiplier: 1 - 0.4 * t,
  };
}
