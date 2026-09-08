// §59–§61: the score is entertainment. Nothing educational touches it.
import type { GameResult } from "./types";

export const BASE_SCORE = 100;
export const STARTING_LIVES = 3;
/** §59: FASTER after every ~4 successful games. */
export const FASTER_EVERY = 4;
export const FASTER_WORDS = ["FASTER!", "FASTER!!", "OH NO", "GOOD LUCK"] as const;

export function scoreFor(result: GameResult, difficulty: number): number {
  if (result.outcome !== "success") return 0;
  const completion = result.completionMs ?? result.allowedMs;
  const speedBonus = 100 * Math.max(0, 1 - completion / Math.max(1, result.allowedMs));
  const difficultyBonus = difficulty * 20;
  return Math.round(BASE_SCORE + speedBonus + difficultyBonus);
}

/** Whether a FASTER beat follows this many successes. */
export function fasterAfter(successes: number): boolean {
  return successes > 0 && successes % FASTER_EVERY === 0;
}

/** Which word: the first FASTER says FASTER!, later ones vary, sparingly (§59). */
export function fasterWord(successes: number): (typeof FASTER_WORDS)[number] {
  const n = Math.floor(successes / FASTER_EVERY);
  if (n <= 1) return FASTER_WORDS[0];
  if (n === 2) return FASTER_WORDS[1];
  return n % 2 === 1 ? FASTER_WORDS[2] : FASTER_WORDS[3];
}
