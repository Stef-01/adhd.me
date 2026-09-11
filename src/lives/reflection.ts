// §37: one optional question after a run, and only one. It asks which moment felt most like
// the person's life, never how bad anything is; the answer is a resonance signal on the game,
// the same signal a "This is me" on a character gives, so the ranking hears it the same way.

import { game } from "./games";
import type { SessionState } from "./types";

export const REFLECTION_QUESTION = "Which moment felt most like your life?";
export const REFLECTION_NONE = "None of them";
/** At most this many moments are offered; a run is eight to twelve games and a list is not a question. */
export const REFLECTION_LIMIT = 6;

/** Words the question and its options must never carry (§37: never "rate your ADHD severity"). */
export const REFLECTION_BANNED = ["rate", "rating", "severity", "score", "how bad", "symptom"] as const;

export interface ReflectionOption {
  gameId: string;
  label: string;
}

/** The moments met on this run, most recent first, capped. Empty when nothing was met. */
export function reflectionOptions(session: Pick<SessionState, "encounteredGameIds">): ReflectionOption[] {
  const seen = new Set<string>();
  const options: ReflectionOption[] = [];
  for (const id of [...session.encounteredGameIds].reverse()) {
    if (seen.has(id)) continue;
    seen.add(id);
    options.push({ gameId: id, label: game(id).title });
    if (options.length === REFLECTION_LIMIT) break;
  }
  return options;
}
