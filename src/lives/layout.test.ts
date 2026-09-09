// L2: the scene layer held to its rules across every game, every difficulty and many seeds —
// inside the box, at the touch floor, deterministic, and the trace and timing rules exact.
import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { MAX_DIFFICULTY } from "./difficulty";
import { GAMES } from "./games";
import { escalatedLabel, layoutGame, markAt, MIN_RADIUS, positionAt, releaseVerdict, SCENE, tauntAt, timingHit, traceIsSafe, type GameScene } from "./layout";
import { hashSeed } from "./random";

const SEEDS = [1, 2, 3, 7, 11, 19, 23, 42, 71834921, hashSeed("qa")];
const scenes = (): { game: (typeof GAMES)[number]; level: number; seed: number; scene: GameScene }[] =>
  GAMES.flatMap((game) => Array.from({ length: MAX_DIFFICULTY }, (_, i) => i + 1).flatMap((level) => SEEDS.map((seed) => ({ game, level, seed, scene: layoutGame(game, level, seed) }))));

describe("layout (§87, §90, §93)", () => {
  it("is deterministic: the same game, level and seed give the same scene", () => {
    for (const { game, level, seed, scene } of eachOf(scenes().filter((_, i) => i % 7 === 0), "scenes")) expect(layoutGame(game, level, seed)).toEqual(scene);
    expect(layoutGame(GAMES[0]!, 1, 1)).not.toEqual(layoutGame(GAMES[0]!, 1, 2));
  });

  it("keeps every entity inside the scene box, at or above the touch floor", () => {
    for (const { scene, game, level } of eachOf(scenes(), "scenes")) {
      expect(scene.entities.length, `${game.id}@${level}`).toBeGreaterThan(0);
      for (const e of scene.entities) {
        expect(e.r, `${game.id}@${level} ${e.id}`).toBeGreaterThanOrEqual(MIN_RADIUS);
        expect(e.x - e.r, `${game.id}@${level} ${e.id} left`).toBeGreaterThanOrEqual(0);
        expect(e.x + e.r, `${game.id}@${level} ${e.id} right`).toBeLessThanOrEqual(SCENE.width);
        expect(e.y - e.r, `${game.id}@${level} ${e.id} top`).toBeGreaterThanOrEqual(0);
        expect(e.y + e.r, `${game.id}@${level} ${e.id} bottom`).toBeLessThanOrEqual(SCENE.height);
      }
    }
  });

  it("does not stack the things you must tell apart on top of each other", () => {
    const tappable = new Set(["target", "distractor", "near_miss", "goal", "decoy", "hazard"]);
    for (const { scene, game, level, seed } of eachOf(scenes(), "scenes")) {
      const items = scene.entities.filter((e) => tappable.has(e.role));
      for (let i = 0; i < items.length; i++) for (let j = i + 1; j < items.length; j++) {
        const a = items[i]!, b = items[j]!;
        const gap = Math.hypot(a.x - b.x, a.y - b.y) - a.r - b.r;
        expect(gap, `${game.id}@${level}#${seed} ${a.id}/${b.id}`).toBeGreaterThanOrEqual(-8);
      }
    }
  });

  it("difficulty adds things to do and things to avoid, never only speed (§58)", () => {
    const wasps = GAMES.find((g) => g.id === "wasps")!;
    expect(layoutGame(wasps, 8, 5).entities.length).toBeGreaterThan(layoutGame(wasps, 1, 5).entities.length);
    expect(Math.abs(layoutGame(wasps, 8, 5).entities[0]!.vx) + Math.abs(layoutGame(wasps, 8, 5).entities[0]!.vy)).toBeGreaterThan(0);
    const arjun = GAMES.find((g) => g.id === "arjun_lock_in")!;
    const easy = layoutGame(arjun, 1, 5), hard = layoutGame(arjun, 8, 5);
    expect(hard.entities.filter((e) => e.role !== "target").length).toBeGreaterThan(easy.entities.filter((e) => e.role !== "target").length);
    expect(hard.entities.some((e) => e.role === "near_miss")).toBe(true);
    expect(easy.entities.some((e) => e.role === "near_miss")).toBe(false);
    expect(easy.entities.some((e) => e.role === "target")).toBe(true);
  });

  it("object search has exactly one goal and reminds before the instruction when the game says so (§52)", () => {
    const mia = GAMES.find((g) => g.id === "mia_why_here")!;
    for (const level of [1, 4, 8]) {
      const scene = layoutGame(mia, level, 9);
      expect(scene.entities.filter((e) => e.role === "goal")).toHaveLength(1);
      expect(scene.remind).toBe("GET THE CHARGER");
    }
  });

  it("a moving thing stays inside the box for the whole active time", () => {
    const wasps = GAMES.find((g) => g.id === "wasps")!;
    for (const seed of eachOf(SEEDS, "seeds")) for (const e of layoutGame(wasps, 8, seed).entities) for (let s = 0; s <= 8; s += 0.05) {
      const p = positionAt(e, s);
      expect(p.x - e.r).toBeGreaterThanOrEqual(-1); expect(p.x + e.r).toBeLessThanOrEqual(SCENE.width + 1);
      expect(p.y - e.r).toBeGreaterThanOrEqual(-1); expect(p.y + e.r).toBeLessThanOrEqual(SCENE.height + 1);
    }
    expect(positionAt({ id: "s", label: "", role: "target", x: 100, y: 100, r: 20, vx: 0, vy: 0 }, 3)).toEqual({ x: 100, y: 100 });
  });
});

describe("trace path (§48)", () => {
  const maya = GAMES.find((g) => g.id === "maya_crossing")!;
  it("offers three routes, exactly one safe, and the safe one passes its own validator", () => {
    for (const level of [1, 3, 5, 8]) for (const seed of eachOf(SEEDS, "seeds")) {
      const scene = layoutGame(maya, level, seed);
      expect(scene.routes).toHaveLength(3);
      expect(scene.routes!.filter((r) => r.safe)).toHaveLength(1);
      for (const route of scene.routes!) expect(traceIsSafe(route.points, scene).safe, `${level}#${seed} ${route.id}`).toBe(route.safe);
    }
  });
  it("refuses a trace that does not start at the start, does not reach the goal, or is too short", () => {
    const scene = layoutGame(maya, 1, 3);
    const safe = scene.routes!.find((r) => r.safe)!;
    expect(traceIsSafe([scene.start!], scene).reason).toBe("too short");
    expect(traceIsSafe([{ x: 10, y: 10 }, scene.goal!], scene).reason).toBe("did not start at the start");
    expect(traceIsSafe([scene.start!, { x: 195, y: 300 }], scene).reason).toBe("did not reach the goal");
    expect(traceIsSafe(safe.points, scene).reason).toBe("safe");
    const hazard = scene.entities.find((e) => e.role === "hazard")!;
    expect(traceIsSafe([scene.start!, hazard, scene.goal!], scene).reason).toBe(`hit ${hazard.label}`);
  });
  it("the path narrows as difficulty rises (§58 pathWidthMultiplier)", () => {
    expect(layoutGame(maya, 8, 1).pathWidth!).toBeLessThan(layoutGame(maya, 1, 1).pathWidth!);
  });
});

describe("timing, hold and taunts", () => {
  it("precision timing: the window sits on the hit mark and shrinks with difficulty", () => {
    const toast = GAMES.find((g) => g.id === "toast")!;
    const easy = layoutGame(toast, 1, 1).timing!, hard = layoutGame(toast, 8, 1).timing!;
    const centre = (easy.hitIndex + 0.5) / easy.marks.length;
    expect(timingHit(centre, easy)).toBe(true);
    expect(timingHit(centre, hard)).toBe(true);
    expect(timingHit(0.02, easy)).toBe(false);
    expect(hard.window.end - hard.window.start).toBeLessThan(easy.window.end - easy.window.start);
    expect(markAt(centre, easy)).toBe(easy.hitIndex);
    expect(markAt(0.99, easy)).toBe(easy.marks.length - 1);
  });
  it("hold/release: early before the cue, on time inside the window, late after", () => {
    const plan = layoutGame(GAMES.find((g) => g.id === "zoe_keyword")!, 2, 4).hold!;
    expect(releaseVerdict(plan.cueAt - 0.01, plan)).toBe("early");
    expect(releaseVerdict(plan.cueAt, plan)).toBe("on time");
    expect(releaseVerdict(plan.windowEnd + 0.01, plan)).toBe("late");
    expect(plan.windowEnd).toBeLessThanOrEqual(0.98);
  });
  it("inhibition: the taunts arrive in order and the last one is the loudest", () => {
    const taunts = layoutGame(GAMES.find((g) => g.id === "zoe_dont_send")!, 1, 1).taunts!;
    expect(tauntAt(0, taunts)).toBeNull();
    expect(tauntAt(0.99, taunts)).toBe("says PRESS IT");
    const seen = [0.1, 0.3, 0.5, 0.7, 0.9].map((p) => tauntAt(p, taunts));
    expect(seen.filter(Boolean).map((t) => taunts.indexOf(t!))).toEqual([...seen.filter(Boolean).map((t) => taunts.indexOf(t!))].sort((a, b) => a - b));
    expect(tauntAt(0.5, [])).toBeNull();
  });
  it("target swat: the mosquito escalates with misses and stops at the orchestra (§49)", () => {
    const config = GAMES.find((g) => g.id === "leo_mosquito")!.config;
    expect(escalatedLabel(config, "mosquito", 0)).toBe("mosquito");
    expect(escalatedLabel(config, "mosquito", 1)).toBe("smug mosquito");
    expect(escalatedLabel(config, "mosquito", 9)).toBe("mosquito orchestra");
    expect(escalatedLabel(GAMES.find((g) => g.id === "wasps")!.config, "wasp", 3)).toBe("wasp");
  });
});
