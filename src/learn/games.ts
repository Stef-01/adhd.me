// The Learn games pane's list (docs/design/ux-evaluation-2026-09/PLAN.md W7): every game with a
// short hook, the three to try first, and the groups behind "All games". The eight lives and the
// twenty runs are one list here, so the pane and its tests read the same thing.

import { CHARACTERS } from "@/lives/characters";
import { GAME_ENTRY } from "@/lives/entry-points";
import { JOURNEYS } from "@/lives/journeys";
import { STRATEGIES } from "@/lives/strategies";
import type { CharacterId, LearningDomain, StrategyDefinition } from "@/lives/types";
import { SUBDOMAINS, type Subdomain } from "@/model/layers";
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
  "forgotten-commitments": "Forgot, still care",
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
export type LifeGame = Extract<GameItem, { kind: "life" }>;
export type RunGame = Extract<GameItem, { kind: "run" }>;

const RUNS = MODULES.filter((m) => m.kind === "run");

function lifeItem(id: CharacterId): LifeGame {
  const c = CHARACTERS.find((x) => x.id === id)!;
  return { kind: "life", id, title: c.name, hint: GAME_HINTS[id] ?? "", href: GAME_ENTRY[id].href };
}

function runItem(id: string): RunGame {
  const m = RUNS.find((x) => x.id === id)!;
  return { kind: "run", id, title: m.title, hint: GAME_HINTS[id] ?? "" };
}

/** The eight lives, in the cast's order. */
export const LIFE_GAMES: readonly LifeGame[] = CHARACTERS.map((c) => lifeItem(c.id));

/** The twenty runs, in their teaching order. */
export const RUN_GAMES: readonly RunGame[] = INTERACTIVE_MODULES.filter((m) => RUNS.some((r) => r.id === m.id)).map((m) => runItem(m.id));

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
 * The three to try first: games matching the person's goals, then the starters, then every other
 * game, never one already played. Theo, Zoe and Jax match no goal and are not starters, so the
 * last part is what lets them surface. Ties keep list order.
 */
export function tryFirst(goals: readonly LearningDomain[], played: (game: GameItem) => boolean, count = 3): GameItem[] {
  const all = [...LIFE_GAMES, ...RUN_GAMES];
  const ordered = [...all.filter((g) => matchesGoal(g, goals)), ...STARTERS, ...all];
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

/**
 * The games about one part of life (PLAN.md W9): the runs that target it, then the character games
 * whose subject holds it, by the same reading as the partner links (`subjectOf`), so Leo and Theo,
 * who have no journey, are on the map too. Within each, the games whose lead part this is come
 * first, then the narrower, so a game about fewer things is found where it is most at home.
 */
export function gamesFor(subdomain: Subdomain): GameItem[] {
  const rank = (g: GameItem) => [subjectOf(g)[0] === subdomain ? 1 : 0, -subjectOf(g).length];
  const byRank = <T extends GameItem>(games: readonly T[]) =>
    games.filter((g) => subjectOf(g).includes(subdomain)).sort((a, b) => (ahead(rank(a), rank(b)) ? -1 : ahead(rank(b), rank(a)) ? 1 : 0));
  return [...byRank(RUN_GAMES), ...byRank(LIFE_GAMES)];
}

/** The strategy modules that work on one part of life: a strategy's domains map to it through `LEARNING_TARGETS`. */
export function modulesFor(subdomain: Subdomain): StrategyDefinition[] {
  return STRATEGIES.filter((s) => s.active && s.domains.some((d) => LEARNING_TARGETS[d].subdomain === subdomain));
}

/** At most five rows in the care map's panel; the rest are on the Learn page. */
export const PANEL_MAX = 5;

/** A part's games before the whole map is looked at: games first, room for up to two modules, one character game kept. */
function panelGames(subdomain: Subdomain): GameItem[] {
  const allGames = gamesFor(subdomain);
  const room = PANEL_MAX - Math.min(2, modulesFor(subdomain).length);
  const life = allGames.find((g) => g.kind === "life");
  const firstRoom = allGames.slice(0, room);
  return life && !firstRoom.includes(life) ? [...firstRoom.slice(0, room - 1), life] : firstRoom;
}

let mapPanels: Map<Subdomain, GameItem[]> | null = null;

/**
 * Every part's games, looked at across the whole map: a game no part shows takes the place of a
 * game of its own kind that another part shows as well. It looks first for one that is a guest on
 * that part (the part is not its lead), across all of its own parts, and only then for any; within
 * a part, the last such game gives way. So every run and every life is on the map somewhere, no
 * game leaves it to make room, and a game keeps its own lead part where it can.
 */
function panelsOfMap(): Map<Subdomain, GameItem[]> {
  if (mapPanels) return mapPanels;
  const map = new Map(SUBDOMAINS.map((s) => [s.id, panelGames(s.id)] as const));
  const shownOn = (game: GameItem) => [...map.values()].filter((games) => games.includes(game)).length;
  const spareOn = (game: GameItem, part: Subdomain, guestOnly: boolean) =>
    [...(map.get(part) ?? [])].reverse().find((g) => g.kind === game.kind && shownOn(g) > 1 && (!guestOnly || subjectOf(g)[0] !== part));
  for (const game of [...RUN_GAMES, ...LIFE_GAMES]) {
    if (shownOn(game) > 0) continue;
    for (const guestOnly of [true, false]) {
      const part = subjectOf(game).find((p) => spareOn(game, p, guestOnly));
      if (!part) continue;
      const games = map.get(part)!;
      games[games.indexOf(spareOn(game, part, guestOnly)!)] = game;
      break;
    }
  }
  return (mapPanels = map);
}

/**
 * The care map's panel for one part of life (PLAN.md W9): games first, but always room for up to two
 * modules, so the map leads to both; one character game kept when the part has one; and every game
 * on some part of the map (panelsOfMap).
 */
export function panelFor(subdomain: Subdomain): { games: GameItem[]; modules: StrategyDefinition[] } {
  const games = panelsOfMap().get(subdomain) ?? [];
  return { games, modules: modulesFor(subdomain).slice(0, PANEL_MAX - games.length) };
}

/**
 * The parts of life a game is about, its lead part first. A run: its targets. A character game:
 * the domains of the strategy its journey teaches. Leo and Theo have no journey, so their own
 * domains stand in: the evening Leo cannot settle and the morning Theo cannot leave.
 */
export function subjectOf(game: GameItem): readonly Subdomain[] {
  if (game.kind === "run") return INTERACTIVE_MODULES.find((m) => m.id === game.id)?.targets ?? [];
  const journey = JOURNEYS.find((j) => j.who === game.id);
  const domains = journey ? STRATEGIES.find((s) => s.id === journey.strategy)?.domains ?? [] : CHARACTERS.find((c) => c.id === game.id)?.domains ?? [];
  return [...new Set(domains.map((d) => LEARNING_TARGETS[d].subdomain))];
}

/** Whether rank `a` is ahead of rank `b`: the first place they differ decides; equal is not ahead. */
function ahead(a: readonly number[], b: readonly number[]): boolean {
  const i = a.findIndex((x, k) => x !== b[k]);
  return i >= 0 && a[i]! > b[i]!;
}

/**
 * Runs tied between lives, whose partner the ranking below would find by the order of a list (the
 * run's targets, or the cast), named here instead. The life named wins only among the lives tied
 * for the most parts shared, and never over the life whose own run this is, so every pair still
 * leads both ways.
 */
const TIED_RUNS: Readonly<Record<string, CharacterId>> = {
  // Attention is listed first, but the run is the phone at 12:40am: its last card sends it to the sleep run, and Leo's night puts the phone away.
  screens: "leo",
  // Tied with Zoe on regulation alone, by list order; the run's movement is for Leo's restlessness and early nights, not a message sent in heat.
  exercise: "leo",
};

/**
 * The game among `among` nearest a subject, or null when none shares a part of life with it. Nearest
 * is, in order: the most parts shared; the one `back` prefers; the one `named` prefers; the one that
 * holds the subject's lead part; the one whose own lead part the subject holds; the narrower. Then
 * list order, so the same subject always finds the same game.
 */
function nearest<T extends GameItem>(subject: readonly Subdomain[], among: readonly T[], back: (game: T) => boolean = () => false, named: (game: T) => boolean = () => false): T | null {
  let best: { game: T; rank: number[] } | null = null;
  for (const game of among) {
    const parts = subjectOf(game);
    const shared = parts.filter((p) => subject.includes(p)).length;
    if (shared === 0) continue;
    const rank = [shared, back(game) ? 1 : 0, named(game) ? 1 : 0, parts.includes(subject[0]!) ? 1 : 0, subject.includes(parts[0]!) ? 1 : 0, -parts.length];
    if (!best || ahead(rank, best.rank)) best = { game, rank };
  }
  return best?.game ?? null;
}

/** The run on the same subject as a character game, or null when they share no part of life. */
export function relatedRun(id: CharacterId): RunGame | null {
  const life = LIFE_GAMES.find((g) => g.id === id);
  return life ? nearest(subjectOf(life), RUN_GAMES) : null;
}

/**
 * The character game on the same subject as a run, or null when none shares a part of life with it.
 * Among equals, the life whose own run this is comes first, so a pair leads both ways; then the life
 * TIED_RUNS names.
 */
export function relatedLife(runId: string): LifeGame | null {
  const run = RUN_GAMES.find((g) => g.id === runId);
  return run ? nearest(subjectOf(run), LIFE_GAMES, (life) => relatedRun(life.id)?.id === runId, (life) => TIED_RUNS[runId] === life.id) : null;
}
