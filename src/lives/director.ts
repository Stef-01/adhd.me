// §57: the session director. Not uniform randomness — eight hard constraints, applied in order,
// relaxed only when they would leave nothing to play, and never the first two.
import type { GameDefinition, InputMechanic, SessionState } from "./types";
import type { Rng } from "./random";

export const FUN_SHARE = { min: 0.2, max: 0.3 } as const;

export interface DirectorRejection { readonly gameId: string; readonly rule: string }

/** Which games the director may pick next, and why the others were refused (for the lab). */
export function eligible(state: SessionState, pool: readonly GameDefinition[]): { picks: GameDefinition[]; rejected: DirectorRejection[] } {
  const last = state.recentGameIds.at(-1);
  const lastMechanic = state.recentMechanics.at(-1);
  const lastFive = state.recentCharacters.slice(-5);
  const playedFun = state.recentGameIds.filter((id) => pool.find((g) => g.id === id)?.character === "random").length;
  const played = state.recentGameIds.length;
  const funShare = played ? playedFun / played : 0;
  const rejected: DirectorRejection[] = [];
  const hard = pool.filter((g) => {
    const refuse = (rule: string) => { rejected.push({ gameId: g.id, rule }); return false; };
    if (g.id === last) return refuse("1 no immediate identical game");
    if (lastMechanic && g.mechanic === lastMechanic) return refuse("2 no same mechanic twice");
    if (g.mechanic === "no_input" && lastMechanic === "no_input") return refuse("3 never two no-input games consecutively");
    if (g.character !== "random" && lastFive.filter((c) => c === g.character).length >= 2) return refuse("4 character not more than twice in last five");
    if (state.gameIndex < 3 && !g.obvious) return refuse("5 first three games mechanically obvious");
    if (g.mechanic === "trace" && state.recentMechanics.slice(-2).includes("trace")) return refuse("6 trace games separated");
    if (state.difficulty < g.difficulty.min || state.difficulty > g.difficulty.max) return refuse("8 difficulty compatibility");
    return true;
  });
  // 7: fun games at 20–30% — steer, never forbid: below the floor prefer fun, above the ceiling prefer lives.
  const fun = hard.filter((g) => g.character === "random");
  const lives = hard.filter((g) => g.character !== "random");
  let picks: GameDefinition[] = hard;
  if (played >= 3 && funShare < FUN_SHARE.min && fun.length) picks = fun;
  else if (funShare > FUN_SHARE.max && lives.length) picks = lives;
  if (picks.length === 0) picks = pool.filter((g) => g.id !== last && !(lastMechanic && g.mechanic === lastMechanic));
  if (picks.length === 0) picks = pool.filter((g) => g.id !== last);
  // A pool of one (the lab's one-game run) repeats its game rather than leave nothing to pick.
  if (picks.length === 0) picks = [...pool];
  return { picks, rejected };
}

export function nextGame(state: SessionState, pool: readonly GameDefinition[], rng: Rng): GameDefinition {
  const { picks } = eligible(state, pool);
  return rng.pick(picks);
}

export function mechanicOf(g: GameDefinition): InputMechanic { return g.mechanic; }
