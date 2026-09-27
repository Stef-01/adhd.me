// The Learn games pane's list (docs/design/ux-evaluation-2026-09/PLAN.md W7): every game with a
// short hook, the three to try first, and the groups behind "All games". The eight lives and the
// twenty runs are one list here, so the pane and its tests read the same thing.

import { CHARACTERS } from "@/lives/characters";
import { GAME_ENTRY } from "@/lives/entry-points";
import { JOURNEYS } from "@/lives/journeys";
import { STRATEGIES } from "@/lives/strategies";
import type { CharacterId, LearningDomain } from "@/lives/types";
import { LEARNING_TARGETS } from "@/model/learning-evidence";
import { INTERACTIVE_MODULES } from "./interactive";
import { MODULES, SHELVES } from "./scenes";

/**
 * A hook for each game, at most four words (D9): what the scene is about, not an instruction.
 * Shown only on the "Try these first" tiles; the full list stays names.
 */
export const GAME_HINTS: Readonly<Record<string, string>> = {
  // The eight lives.
  maya: "Too much at once",
  leo: "A room too loud",
  theo: "Late for the train",
  mia: "Why am I here",
  zoe: "Before you hit send",
  arjun: "Where the meeting went",
  jax: "Just the milk",
  nina: "The first line",
  // The twenty runs.
  context: "Why context matters",
  "more-than-attention": "Four hidden skills",
  starting: "Why starting stalls",
  deadlines: "The night before",
  "working-memory": "Four things become two",
  hyperfocus: "Where the hours went",
  ambiguity: "Vague tasks stay untouched",
  interruption: "The cost of returning",
  perfectionism: "The stalling standard",
  "not-listening": "Two sides, one conversation",
  "forgotten-commitments": "Remembering isn’t caring",
  conflict: "Quick to flare",
  household: "Who holds the list",
  sleep: "Why nights get later",
  exercise: "Movement that steadies",
  eating: "Hunger arrives late",
  gut: "Gut and brain",
  money: "The late-fee tax",
  mornings: "Out the door",
  screens: "The midnight scroll",
};

export type GameItem =
  | { readonly kind: "life"; readonly id: CharacterId; readonly title: string; readonly hint: string; readonly href: string }
  | { readonly kind: "run"; readonly id: string; readonly title: string; readonly hint: string };

const RUNS = MODULES.filter((m) => m.kind === "run");

function lifeItem(id: CharacterId): GameItem {
  const c = CHARACTERS.find((x) => x.id === id)!;
  return { kind: "life", id, title: c.name, hint: GAME_HINTS[id] ?? "", href: GAME_ENTRY[id].href };
}

function runItem(id: string): GameItem {
  const m = RUNS.find((x) => x.id === id)!;
  return { kind: "run", id, title: m.title, hint: GAME_HINTS[id] ?? "" };
}

/** The eight lives, in the cast's order. */
export const LIFE_GAMES: readonly GameItem[] = CHARACTERS.map((c) => lifeItem(c.id));

/** The twenty runs, in their teaching order. */
export const RUN_GAMES: readonly GameItem[] = INTERACTIVE_MODULES.filter((m) => RUNS.some((r) => r.id === m.id)).map((m) => runItem(m.id));

/** "All games": the eight lives, then the runs by the Learn shelves they already sit on. */
export const GAME_GROUPS: ReadonlyArray<{ readonly title: string; readonly games: readonly GameItem[] }> = [
  { title: "The eight lives", games: LIFE_GAMES },
  ...SHELVES.map((s) => ({ title: s.title, games: s.modules.filter((id) => RUNS.some((r) => r.id === id)).map(runItem) })).filter((g) => g.games.length > 0),
];

/** Whether a game touches one of the person's Learn goals. Leo and Theo have no journey and match none. */
export function matchesGoal(game: GameItem, goals: readonly LearningDomain[]): boolean {
  if (goals.length === 0) return false;
  if (game.kind === "run") {
    const targets = INTERACTIVE_MODULES.find((m) => m.id === game.id)?.targets ?? [];
    return goals.some((g) => targets.includes(LEARNING_TARGETS[g].subdomain));
  }
  const journey = JOURNEYS.find((j) => j.who === game.id);
  const domains = STRATEGIES.find((s) => s.id === journey?.strategy)?.domains ?? [];
  return goals.some((g) => domains.includes(g));
}

/** Where a person with no goals starts: Maya, two runs about what ADHD is, Leo, then every run. */
const STARTERS: readonly GameItem[] = [lifeItem("maya"), runItem("context"), runItem("more-than-attention"), lifeItem("leo"), ...RUN_GAMES.filter((g) => g.id !== "context" && g.id !== "more-than-attention")];

const key = (g: GameItem) => `${g.kind}:${g.id}`;

/**
 * The three to try first: games matching the person's goals, then the starters, never one already
 * played. Ties keep list order.
 */
export function tryFirst(goals: readonly LearningDomain[], played: (game: GameItem) => boolean, count = 3): GameItem[] {
  const all = [...LIFE_GAMES, ...RUN_GAMES];
  const ordered = [...all.filter((g) => matchesGoal(g, goals)), ...STARTERS];
  const seen = new Set<string>();
  const out: GameItem[] = [];
  for (const g of ordered) {
    if (seen.has(key(g)) || played(g)) continue;
    seen.add(key(g));
    out.push(g);
    if (out.length === count) break;
  }
  return out;
}

