// ADHD Lives (docs/adhd-lives/PRD-v2.md, ADR 0006): the engine, the registries and the
// recommendation engine held to the PRD's numbered rules, and every player-facing string held to
// the patient rules. §110: this suite is `validate:content`.
import { describe, expect, it } from "vitest";
import { lintLandingCopy } from "@/compliance/landing";
import { eachOf } from "@/quality/non-vacuous";
import { CHARACTERS, character } from "./characters";
import { difficultyFor, MAX_DIFFICULTY } from "./difficulty";
import { eligible, FUN_SHARE, nextGame } from "./director";
import { GAMES, VERTICAL_SLICE_GAME_IDS } from "./games";
import { MODULES } from "./modules";
import { completeModule, dismissStrategy, emptyProfile, PROFILE_KEY, readProfile, recentlyCompleted, recordHighScore, recordResonance, removeFromToolkit, saveStrategy, selectGoals, startModule } from "./profile";
import { gameSeed, hashSeed, seededRng } from "./random";
import { MAX_RECOMMENDATIONS, recommendStrategies, WEIGHTS } from "./recommend";
import { fasterAfter, fasterWord, scoreFor, STARTING_LIVES } from "./score";
import { allowedMs, beginGame, resolveGame, startSession } from "./session";
import { STRATEGIES, strategy, VERTICAL_SLICE_STRATEGY_IDS } from "./strategies";
import { CHARACTER_IDS, LEARNING_DOMAINS, type GameResult, type RecommendationContext, type SessionState } from "./types";
import { validateContent } from "./validate";

const memory = () => {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) };
};

const success = (allowedMs: number, completionMs = allowedMs / 2): GameResult => ({ outcome: "success", allowedMs, completionMs, mistakes: 0 });
const failure = (allowedMs: number): GameResult => ({ outcome: "failure", allowedMs, mistakes: 1 });

/** Play a whole run to game over with every game succeeded or failed by `plan`. */
function play(sessionId: string, plan: (index: number) => boolean, limit = 60): { states: SessionState[]; games: string[] } {
  let state = startSession(sessionId, 0);
  const states: SessionState[] = [state];
  const games: string[] = [];
  for (let i = 0; i < limit && !state.over; i++) {
    const begun = beginGame(state, GAMES);
    games.push(begun.game.id);
    const allowed = allowedMs(begun.game, begun.state.difficulty);
    state = resolveGame(begun.state, plan(i) ? success(allowed) : failure(allowed)).state;
    states.push(state);
  }
  return { states, games };
}

describe("content (§110 validate:content)", () => {
  it("the registries reference only each other, and every module is reachable", () => {
    expect(validateContent(GAMES, STRATEGIES, MODULES)).toEqual([]);
  });

  it("reports a broken reference rather than letting a person meet it", () => {
    const broken = [{ ...GAMES[0]!, id: "broken", learningLinks: ["no_such_strategy"], character: "random" as const }];
    const problems = validateContent(broken, STRATEGIES, MODULES);
    expect(problems.some((p) => p.where === "game/broken" && p.problem.includes("no_such_strategy"))).toBe(true);
    expect(problems.some((p) => p.where === "game/broken" && p.problem === "a fun game carries no learning")).toBe(true);
    expect(validateContent(GAMES, STRATEGIES, MODULES.filter((m) => m.id !== "meeting_anchor_v1")).map((p) => p.where)).toContain("strategy/meeting_anchor");
  });

  it("the vertical slice (§97) exists: six games, four strategies, their modules full", () => {
    for (const id of eachOf(VERTICAL_SLICE_GAME_IDS, "the slice games")) expect(GAMES.map((g) => g.id)).toContain(id);
    for (const id of eachOf(VERTICAL_SLICE_STRATEGY_IDS, "the slice strategies")) {
      const module = MODULES.find((m) => m.id === strategy(id).moduleId)!;
      expect(module.blocks.length, id).toBeGreaterThanOrEqual(4);
    }
    expect(GAMES.length).toBe(32);
    expect(STRATEGIES.length).toBe(16);
    expect(MODULES.length).toBe(16);
    // L5 (§104): every module is full — recognise, understand, try, personalise, one action — never a stub
    // of an illustration, a paragraph and a plan.
    const doing = new Set(["choice", "scenario", "checklist", "timer", "reflection", "interactive_practice"]);
    for (const m of eachOf(MODULES, "the modules")) {
      expect(m.blocks.length, m.id).toBeGreaterThanOrEqual(4);
      expect(m.blocks.some((b) => doing.has(b.type)), `${m.id} asks the person to do something`).toBe(true);
      expect(m.blocks.at(-1)!.type, `${m.id} ends on the action plan`).toBe("action_plan");
    }
    // §56: fun games are a fifth to a third of the roster, so the director can hold its share.
    const fun = GAMES.filter((g) => g.character === "random").length / GAMES.length;
    expect(fun).toBeGreaterThanOrEqual(0.2); expect(fun).toBeLessThanOrEqual(0.34);
  });

  it("eight lives, each with a pattern, mechanics, domains, and strategies they are trying that exist", () => {
    expect(CHARACTERS.map((c) => c.id)).toEqual([...CHARACTER_IDS]);
    for (const c of eachOf(CHARACTERS, "the characters")) {
      expect(c.mechanics.length, c.id).toBeGreaterThan(0);
      expect(c.domains.every((d) => LEARNING_DOMAINS.includes(d)), c.id).toBe(true);
      for (const id of c.trying) expect(() => strategy(id), `${c.id} trying ${id}`).not.toThrow();
      expect(GAMES.some((g) => g.character === c.id), `${c.id} has a game`).toBe(true);
    }
    expect(character("maya").name).toBe("Maya");
  });

  it("every player-facing string passes the patient rules (§79)", () => {
    const copy: [string, string][] = [];
    for (const g of GAMES) copy.push([`game/${g.id}`, `${g.title}. ${g.instruction}`]);
    for (const c of CHARACTERS) copy.push([`character/${c.id}`, `${c.hook} ${c.pattern}. ${c.moment}`]);
    for (const s of STRATEGIES) copy.push([`strategy/${s.id}`, `${s.title}. ${s.shortDescription} ${s.claim}`]);
    for (const m of MODULES) {
      const text = m.blocks.map((b) => {
        switch (b.type) {
          case "text": return b.body;
          case "illustration": return b.caption;
          case "choice": case "action_plan": return `${b.prompt} ${b.options.join(". ")}`;
          case "reflection": return b.prompt;
          case "interactive_practice": return b.instruction;
          case "timer": return b.label;
          case "checklist": return b.items.map((i) => i.label).join(". ");
          case "scenario": return `${b.prompt} ${b.choices.map((c) => `${c.text} ${c.feedback}`).join(" ")}`;
          case "audio": return "";
        }
      }).join(" ");
      copy.push([`module/${m.id}`, `${m.title}. ${m.description} ${text}`]);
    }
    for (const [where, text] of eachOf(copy, "the copy")) expect(lintLandingCopy(text), where).toEqual([]);
  });

  it("strategies make one claim each in §79's tone, and none is reviewed until a clinician has read it", () => {
    for (const s of eachOf(STRATEGIES, "the strategies")) {
      expect(s.claim, s.id).toMatch(/may|can|some people|many people/i);
      expect(s.reviewStatus, s.id).toBe("pending");
      expect(s.estimatedMinutes, s.id).toBeLessThanOrEqual(5);
    }
  });
});

describe("seeded randomness (§90)", () => {
  it("the same seed replays the same run; a different seed does not", () => {
    const a = seededRng(hashSeed("run-1")), b = seededRng(hashSeed("run-1")), c = seededRng(hashSeed("run-2"));
    const draw = (r: ReturnType<typeof seededRng>) => [r.next(), r.int(10), r.pick(["x", "y", "z"]), ...r.shuffle([1, 2, 3, 4, 5])];
    expect(draw(a)).toEqual(draw(b));
    expect(draw(a)).not.toEqual(draw(c));
    expect(gameSeed("s", 3)).toBe(gameSeed("s", 3));
    expect(gameSeed("s", 3)).not.toBe(gameSeed("s", 4));
  });

  it("draws stay in range and shuffles keep every item", () => {
    const r = seededRng(7);
    for (let i = 0; i < 500; i++) {
      const n = r.next();
      expect(n).toBeGreaterThanOrEqual(0);
      expect(n).toBeLessThan(1);
      expect(r.int(6)).toBeLessThan(6);
    }
    expect([...r.shuffle([1, 2, 3, 4, 5, 6])].sort()).toEqual([1, 2, 3, 4, 5, 6]);
  });
});

describe("difficulty (§58) and score (§59–§61)", () => {
  it("difficulty rises on every dimension, never only speed, and clamps to the range", () => {
    const one = difficultyFor(1), top = difficultyFor(MAX_DIFFICULTY);
    expect(difficultyFor(0)).toEqual(one);
    expect(difficultyFor(99)).toEqual(top);
    expect(top.timeMultiplier).toBeLessThan(one.timeMultiplier);
    expect(top.targetSpeed).toBeGreaterThan(one.targetSpeed);
    expect(top.distractorCount).toBeGreaterThan(one.distractorCount);
    expect(top.distractorSimilarity).toBeGreaterThan(one.distractorSimilarity);
    expect(top.hitRadiusMultiplier).toBeLessThan(one.hitRadiusMultiplier);
    expect(top.memoryLength).toBeGreaterThan(one.memoryLength);
    expect(top.pathWidthMultiplier).toBeLessThan(one.pathWidthMultiplier);
    expect(one.timeMultiplier).toBe(1);
  });

  it("score is entertainment: base plus speed plus difficulty, nothing for a failure", () => {
    expect(scoreFor(success(4000, 4000), 1)).toBe(120);
    expect(scoreFor(success(4000, 0), 1)).toBe(220);
    expect(scoreFor(success(4000, 2000), 3)).toBe(210);
    expect(scoreFor(failure(4000), 5)).toBe(0);
    expect(scoreFor({ outcome: "timeout", allowedMs: 4000, mistakes: 0 }, 5)).toBe(0);
  });

  it("FASTER lands after every fourth success, and the word varies sparingly", () => {
    expect([1, 2, 3, 4, 5, 8, 12].map(fasterAfter)).toEqual([false, false, false, true, false, true, true]);
    expect(fasterAfter(0)).toBe(false);
    expect(fasterWord(4)).toBe("FASTER!");
    expect(fasterWord(8)).toBe("FASTER!!");
    expect(new Set([fasterWord(12), fasterWord(16), fasterWord(20)]).size).toBe(2);
  });
});

describe("session reducer (§85–§86)", () => {
  it("starts with three lives, score zero, difficulty one", () => {
    const s = startSession("s1", 0);
    expect(s.lives).toBe(STARTING_LIVES);
    expect(s.score).toBe(0);
    expect(s.difficulty).toBe(1);
    expect(s.over).toBe(false);
  });

  it("beginGame is deterministic for (sessionId, gameIndex) and refuses a finished run", () => {
    const s = startSession("s1", 0);
    expect(beginGame(s, GAMES).game.id).toBe(beginGame(s, GAMES).game.id);
    expect(beginGame(s, GAMES).seed).toBe(gameSeed("s1", 0));
    expect(() => beginGame({ ...s, over: true }, GAMES)).toThrow(/over/);
  });

  it("a failure costs a life and goes straight to the next game (§61); the third ends the run", () => {
    const { states } = play("fail-all", () => false);
    expect(states.map((s) => s.lives)).toEqual([3, 2, 1, 0]);
    expect(states.at(-1)!.over).toBe(true);
    expect(states.at(-1)!.score).toBe(0);
    expect(states.at(-1)!.completedGames).toBe(3);
  });

  it("every fourth success raises difficulty, shortens the allowed time, and never exceeds the maximum", () => {
    const { states } = play("win-all", () => true, 40);
    const after = (n: number) => states[n]!;
    expect(after(3).difficulty).toBe(1);
    expect(after(4).difficulty).toBe(2);
    expect(after(8).difficulty).toBe(3);
    expect(Math.max(...states.map((s) => s.difficulty))).toBeLessThanOrEqual(MAX_DIFFICULTY);
    expect(after(40).score).toBeGreaterThan(40 * 100);
    const game = GAMES[0]!;
    expect(allowedMs(game, 8)).toBeLessThan(allowedMs(game, 1));
    expect(allowedMs(game, 1)).toBe(game.activeMs);
    // §93 relaxed timing: half as long again at every difficulty, and the difficulty still bites.
    expect(allowedMs(game, 1, true)).toBe(Math.round(game.activeMs * 1.5));
    expect(allowedMs(game, 8, true)).toBeLessThan(allowedMs(game, 1, true));
    expect(allowedMs(game, 8, true)).toBeGreaterThan(allowedMs(game, 8));
  });

  it("resolveGame reports the FASTER beat and the score delta", () => {
    let s = startSession("s2", 0);
    let faster = 0;
    for (let i = 0; i < 8; i++) {
      const b = beginGame(s, GAMES);
      const r = resolveGame(b.state, success(1000));
      if (r.faster) faster++;
      expect(r.scoreDelta).toBeGreaterThan(0);
      expect(r.lostLife).toBe(false);
      s = r.state;
    }
    expect(faster).toBe(2);
    expect(s.encounteredGameIds.length).toBeGreaterThan(0);
    expect(s.encounteredCharacterIds.every((c) => CHARACTER_IDS.includes(c))).toBe(true);
    expect(s.encounteredLearningLinks.every((l) => STRATEGIES.some((x) => x.id === l))).toBe(true);
  });
});

describe("session director (§57)", () => {
  const seeds = Array.from({ length: 40 }, (_, i) => `seed-${i}`);

  it("across forty long runs never repeats a game, a mechanic, or two no-input games back to back", () => {
    for (const seed of eachOf(seeds, "the seeds")) {
      const { games } = play(seed, (i) => i % 7 !== 6, 40);
      expect(games.length).toBeGreaterThan(20);
      for (let i = 1; i < games.length; i++) {
        const prev = GAMES.find((g) => g.id === games[i - 1])!, cur = GAMES.find((g) => g.id === games[i])!;
        expect(cur.id, `${seed}@${i}`).not.toBe(prev.id);
        expect(cur.mechanic, `${seed}@${i}`).not.toBe(prev.mechanic);
      }
    }
  });

  it("opens every run with mechanically obvious games and keeps a character to twice in five", () => {
    for (const seed of eachOf(seeds, "the seeds")) {
      const { games } = play(seed, () => true, 30);
      for (const id of games.slice(0, 3)) expect(GAMES.find((g) => g.id === id)!.obvious, seed).toBe(true);
      for (let i = 5; i <= games.length; i++) {
        const window = games.slice(i - 5, i).map((id) => GAMES.find((g) => g.id === id)!.character).filter((c) => c !== "random");
        for (const c of new Set(window)) expect(window.filter((x) => x === c).length, `${seed}@${i} ${c}`).toBeLessThanOrEqual(2);
      }
    }
  });

  it("steers fun games toward a fifth to a third of a long run without forbidding them", () => {
    const shares = seeds.map((seed) => {
      const { games } = play(seed, () => true, 40);
      return games.filter((id) => GAMES.find((g) => g.id === id)!.character === "random").length / games.length;
    });
    const mean = shares.reduce((a, b) => a + b, 0) / shares.length;
    expect(mean).toBeGreaterThanOrEqual(FUN_SHARE.min - 0.05);
    expect(mean).toBeLessThanOrEqual(FUN_SHARE.max + 0.05);
  });

  it("explains every refusal for the lab, and relaxes only when nothing would be left", () => {
    const s = startSession("lab", 0);
    const { picks, rejected } = eligible(s, GAMES);
    expect(picks.every((g) => g.obvious)).toBe(true);
    expect(rejected.some((r) => r.rule.startsWith("5"))).toBe(true);
    const later = eligible({ ...s, gameIndex: 3 }, GAMES);
    expect(later.rejected.some((r) => r.rule.startsWith("8") && r.gameId === "zoe_keyword")).toBe(true);
    expect(eligible({ ...s, gameIndex: 3, difficulty: 2 }, GAMES).picks.map((g) => g.id)).toContain("zoe_keyword");
    const tapOnly = GAMES.filter((g) => g.mechanic === "tap").slice(0, 2);
    const after: SessionState = { ...s, gameIndex: 1, recentGameIds: [tapOnly[0]!.id], recentMechanics: ["tap"], recentCharacters: [tapOnly[0]!.character] };
    expect(eligible(after, tapOnly).picks.map((g) => g.id)).toEqual([tapOnly[1]!.id]);
    expect(nextGame(after, tapOnly, seededRng(1)).id).toBe(tapOnly[1]!.id);
  });
});

describe("recommendation engine (§31–§35, §108)", () => {
  const base: RecommendationContext = { encounteredGameIds: [], encounteredCharacterIds: [], resonanceSignals: [], savedStrategyIds: [], completedModuleIds: [], recentlyCompletedModuleIds: [], dismissedStrategyIds: [], selectedGoals: [] };

  it("never returns more than three, and each row says why", () => {
    const ctx: RecommendationContext = { ...base, encounteredGameIds: GAMES.map((g) => g.id), encounteredCharacterIds: [...CHARACTER_IDS], selectedGoals: ["attention", "sleep", "impulsivity"] };
    const rows = recommendStrategies(ctx, STRATEGIES);
    expect(rows.length).toBe(MAX_RECOMMENDATIONS);
    for (const r of eachOf(rows, "the rows")) expect(r.reasons.length).toBeGreaterThan(0);
    expect(rows.map((r) => r.score)).toEqual([...rows.map((r) => r.score)].sort((a, b) => b - a));
  });

  it("'this is me' outweighs everything else; 'not me' pushes a strategy down (§35)", () => {
    const me = recommendStrategies({ ...base, resonanceSignals: [{ sourceType: "game", sourceId: "zoe_dont_send", response: "this_is_me", createdAt: 0 }] }, STRATEGIES);
    expect(me[0]!.strategy.id).toBe("pause_before_send");
    expect(me[0]!.score).toBe(WEIGHTS.thisIsMe);
    expect(me[0]!.reasons).toContain("this is me: zoe_dont_send");
    const not = recommendStrategies({ ...base, encounteredGameIds: ["zoe_dont_send"], resonanceSignals: [{ sourceType: "game", sourceId: "zoe_dont_send", response: "not_me", createdAt: 0 }] }, STRATEGIES);
    expect(not.map((r) => r.strategy.id)).not.toContain("pause_before_send");
  });

  it("a goal beats an encounter; an encounter beats nothing; 'sometimes' is half of 'this is me'", () => {
    expect(WEIGHTS.goalMatch).toBeGreaterThan(WEIGHTS.encounteredGame);
    expect(WEIGHTS.encounteredGame).toBeGreaterThan(WEIGHTS.encounteredCharacter);
    const goal = recommendStrategies({ ...base, selectedGoals: ["task_initiation"] }, STRATEGIES);
    expect(goal[0]!.strategy.domains).toContain("task_initiation");
    expect(goal[0]!.reasons).toContain("matches a chosen goal");
    const sometimes = recommendStrategies({ ...base, resonanceSignals: [{ sourceType: "character", sourceId: "nina", response: "sometimes", createdAt: 0 }] }, STRATEGIES);
    expect(sometimes[0]!.score).toBe(WEIGHTS.sometimes);
  });

  it("dismissed strategies never return; saved and recently completed sink", () => {
    const signal = { sourceType: "game" as const, sourceId: "arjun_lock_in", response: "this_is_me" as const, createdAt: 0 };
    const plain = recommendStrategies({ ...base, resonanceSignals: [signal] }, STRATEGIES);
    expect(plain[0]!.strategy.id).toBe("meeting_anchor");
    const dismissed = recommendStrategies({ ...base, resonanceSignals: [signal], dismissedStrategyIds: ["meeting_anchor"] }, STRATEGIES);
    expect(dismissed.map((r) => r.strategy.id)).not.toContain("meeting_anchor");
    const saved = recommendStrategies({ ...base, resonanceSignals: [signal], savedStrategyIds: ["meeting_anchor"] }, STRATEGIES);
    const sunk = saved.find((r) => r.strategy.id === "meeting_anchor")!;
    expect(sunk.reasons).toContain("already saved");
    expect(sunk.score).toBeLessThanOrEqual(WEIGHTS.thisIsMe + WEIGHTS.savedPreviously);
    expect(saved[0]!.strategy.id).toBe("parking_lot_note");
    const done = recommendStrategies({ ...base, resonanceSignals: [signal], recentlyCompletedModuleIds: ["meeting_anchor_v1"] }, STRATEGIES);
    expect(done.find((r) => r.strategy.id === "meeting_anchor")!.reasons).toContain("completed recently");
  });

  it("prefers domain variety across the three, and with no signal at all shows one row, not three", () => {
    const rows = recommendStrategies({ ...base, selectedGoals: ["working_memory"] }, STRATEGIES);
    expect(rows.length).toBeLessThanOrEqual(3);
    expect(rows.some((r) => r.reasons.includes("same domain already shown")) || rows.length < 3).toBe(true);
    expect(recommendStrategies(base, STRATEGIES).length).toBe(1);
  });

  it("is deterministic: the same context yields the same rows", () => {
    const ctx: RecommendationContext = { ...base, encounteredGameIds: ["maya_crossing", "leo_mosquito"], encounteredCharacterIds: ["maya", "leo"] };
    expect(recommendStrategies(ctx, STRATEGIES)).toEqual(recommendStrategies(ctx, STRATEGIES));
  });
});

describe("learning profile (§63–§65)", () => {
  it("reads an empty or corrupt store as the empty profile", () => {
    const s = memory();
    expect(readProfile(s)).toEqual(emptyProfile());
    s.setItem(PROFILE_KEY, "{not json");
    expect(readProfile(s)).toEqual(emptyProfile());
    s.setItem(PROFILE_KEY, JSON.stringify({ v: 2 }));
    expect(readProfile(s)).toEqual(emptyProfile());
    s.setItem(PROFILE_KEY, JSON.stringify({ v: 1, savedStrategyIds: ["a", 3, null], highScore: "x" }));
    expect(readProfile(s).savedStrategyIds).toEqual(["a"]);
    expect(readProfile(s).highScore).toBe(0);
  });

  it("keeps the high score, the latest resonance per source, and at most three goals", () => {
    const s = memory();
    recordHighScore(s, 300);
    expect(recordHighScore(s, 200).highScore).toBe(300);
    recordResonance(s, { sourceType: "game", sourceId: "wasps", response: "sometimes" }, 1);
    const p = recordResonance(s, { sourceType: "game", sourceId: "wasps", response: "this_is_me" }, 2);
    expect(p.resonanceSignals).toEqual([{ sourceType: "game", sourceId: "wasps", response: "this_is_me", createdAt: 2 }]);
    expect(selectGoals(s, ["sleep", "attention", "planning", "environment"]).selectedGoals).toEqual(["sleep", "attention", "planning"]);
  });

  it("SAVE queues and adds to the Toolkit; NOT FOR ME excludes; a save after a dismissal restores", () => {
    const s = memory();
    saveStrategy(s, { strategyId: "launch_pad", source: "score_screen", relatedCharacterId: "theo" }, 5);
    let p = readProfile(s);
    expect(p.savedStrategyIds).toEqual(["launch_pad"]);
    expect(p.saved[0]).toMatchObject({ strategyId: "launch_pad", status: "saved", savedAt: 5 });
    expect(p.personalStrategies[0]).toMatchObject({ strategyId: "launch_pad", status: "saved" });
    p = dismissStrategy(s, "launch_pad");
    expect(p.dismissedStrategyIds).toEqual(["launch_pad"]);
    expect(p.saved[0]!.status).toBe("dismissed");
    p = saveStrategy(s, { strategyId: "launch_pad", source: "learn" }, 6);
    expect(p.dismissedStrategyIds).toEqual([]);
    expect(p.saved).toHaveLength(1);
    expect(p.personalStrategies).toHaveLength(1);
    p = removeFromToolkit(s, "launch_pad");
    expect(p.personalStrategies).toEqual([]);
    expect(p.savedStrategyIds).toEqual([]);
    // Remove takes the Learn Later record too, or the queue would show it again after a reload.
    expect(p.saved).toEqual([]);
  });

  it("completing a module puts the strategy in the Toolkit as 'trying' with its personal configuration, and counts as recent for a week", () => {
    const s = memory();
    saveStrategy(s, { strategyId: "meeting_anchor", source: "score_screen" }, 1);
    expect(startModule(s, "meeting_anchor_v1", "meeting_anchor").saved[0]!.status).toBe("started");
    const p = completeModule(s, "meeting_anchor_v1", "meeting_anchor", { anchor: "Notebook" }, 1000);
    expect(p.completedModuleIds).toEqual(["meeting_anchor_v1"]);
    expect(p.saved[0]!.status).toBe("completed");
    expect(p.personalStrategies).toEqual([{ strategyId: "meeting_anchor", addedAt: 1, status: "trying", customNote: undefined, personalConfig: { anchor: "Notebook" } }]);
    expect(recentlyCompleted(p, 1000 + 6 * 24 * 3600 * 1000)).toEqual(["meeting_anchor_v1"]);
    expect(recentlyCompleted(p, 1000 + 8 * 24 * 3600 * 1000)).toEqual([]);
  });

  it("survives a store that throws", () => {
    const broken = { getItem: () => { throw new Error("quota"); }, setItem: () => { throw new Error("quota"); }, removeItem: () => undefined };
    expect(readProfile(broken)).toEqual(emptyProfile());
    expect(recordHighScore(broken, 10).highScore).toBe(10);
  });
});

describe("analytics (§67–§68)", () => {
  it("every gameplay and learning event the PRD names exists, and none reads like an inferred pathology", async () => {
    const { EVENTS } = await import("@/model/events");
    for (const name of eachOf(["SESSION_STARTED", "SESSION_COMPLETED", "MINIGAME_STARTED", "MINIGAME_SUCCESS", "MINIGAME_FAILURE", "DIFFICULTY_INCREASED", "RESONANCE_SELECTED", "STRATEGY_IMPRESSION", "STRATEGY_SAVED", "STRATEGY_DISMISSED", "MODULE_STARTED", "MODULE_COMPLETED", "MODULE_ABANDONED", "STRATEGY_ADDED_TO_TOOLKIT", "STRATEGY_MARKED_USEFUL", "STRATEGY_MARKED_NOT_USEFUL"], "the PRD's events")) expect(EVENTS).toContain(name);
    for (const name of eachOf(EVENTS, "the events")) expect(name, name).not.toMatch(/INATTEN|DEFICIT|IMPAIR|SEVERE|DISORDER|SYMPTOM/);
  });
});

