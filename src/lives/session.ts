// §44, §85–§86: a run as a reducer. The renderer drives the frames; the engine decides the facts.
import { difficultyFor, MAX_DIFFICULTY } from "./difficulty";
import { nextGame } from "./director";
import { gameSeed, seededRng } from "./random";
import { fasterAfter, scoreFor, STARTING_LIVES } from "./score";
import type { GameDefinition, GameResult, SessionState } from "./types";

export function startSession(sessionId: string, now = Date.now()): SessionState {
  return { sessionId, score: 0, lives: STARTING_LIVES, difficulty: 1, currentGameId: null, gameIndex: 0, completedGames: 0, successes: 0, recentGameIds: [], recentMechanics: [], recentCharacters: [], encounteredGameIds: [], encounteredCharacterIds: [], encounteredLearningLinks: [], startedAt: now, over: false };
}

/** Pick and begin the next game. Deterministic for (sessionId, gameIndex). */
export function beginGame(state: SessionState, pool: readonly GameDefinition[]): { state: SessionState; game: GameDefinition; seed: number } {
  if (state.over) throw new Error("lives: session is over");
  const seed = gameSeed(state.sessionId, state.gameIndex);
  const game = nextGame(state, pool, seededRng(seed));
  const characters = game.character === "random" ? state.encounteredCharacterIds : state.encounteredCharacterIds.includes(game.character) ? state.encounteredCharacterIds : [...state.encounteredCharacterIds, game.character];
  return {
    seed,
    game,
    state: {
      ...state,
      currentGameId: game.id,
      recentGameIds: [...state.recentGameIds, game.id].slice(-8),
      recentMechanics: [...state.recentMechanics, game.mechanic].slice(-8),
      recentCharacters: [...state.recentCharacters, game.character].slice(-8),
      encounteredGameIds: state.encounteredGameIds.includes(game.id) ? state.encounteredGameIds : [...state.encounteredGameIds, game.id],
      encounteredCharacterIds: characters,
      encounteredLearningLinks: [...new Set([...state.encounteredLearningLinks, ...game.learningLinks])],
    },
  };
}

/** The allowed ACTIVE time for a game at the session's difficulty (§44, §58). */
export function allowedMs(game: GameDefinition, difficulty: number): number {
  return Math.round(game.activeMs * difficultyFor(difficulty).timeMultiplier);
}

export interface Resolution { readonly state: SessionState; readonly scoreDelta: number; readonly lostLife: boolean; readonly faster: boolean; readonly over: boolean }

/** §61: failure is a life and the next game, never a modal. §59: FASTER after every fourth success. */
export function resolveGame(state: SessionState, result: GameResult): Resolution {
  const success = result.outcome === "success";
  const scoreDelta = scoreFor(result, state.difficulty);
  const successes = state.successes + (success ? 1 : 0);
  const faster = success && fasterAfter(successes);
  const lives = success ? state.lives : state.lives - 1;
  const over = lives <= 0;
  return {
    scoreDelta,
    lostLife: !success,
    faster,
    over,
    state: {
      ...state,
      score: state.score + scoreDelta,
      lives,
      successes,
      completedGames: state.completedGames + 1,
      gameIndex: state.gameIndex + 1,
      difficulty: faster ? Math.min(MAX_DIFFICULTY, state.difficulty + 1) : state.difficulty,
      currentGameId: null,
      over,
    },
  };
}
