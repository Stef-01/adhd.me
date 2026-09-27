import { afterEach, describe, expect, it, vi } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { lintLandingCopy } from "@/compliance/landing";
import { CHARACTER_IDS } from "@/lives/types";
import { SUBDOMAINS } from "@/model/layers";
import { GAME_GROUPS, GAME_HINTS, LIFE_GAMES, RUN_GAMES, gamesFor, matchesGoal, modulesFor, relatedLife, relatedRun, subjectOf, tryFirst, type GameItem } from "./games";
import { markPlayed, parsePlayed, readPlayed } from "./played";
import { markDone, readProgress } from "./progress";

function memory() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => { m.set(k, v); }, removeItem: (k: string) => { m.delete(k); } };
}
const none = () => false;
const tz = process.env.TZ;
afterEach(() => {
  vi.useRealTimers();
  if (tz === undefined) delete process.env.TZ;
  else process.env.TZ = tz;
});

describe("the games list", () => {
  it("holds the eight lives and the twenty runs, each once, and every group is one of them", () => {
    expect(LIFE_GAMES.map((g) => g.id).sort()).toEqual([...CHARACTER_IDS].sort());
    expect(RUN_GAMES).toHaveLength(20);
    const grouped = GAME_GROUPS.flatMap((g) => g.games.map((x) => `${x.kind}:${x.id}`));
    expect(new Set(grouped).size).toBe(grouped.length);
    expect(grouped).toHaveLength(28);
    expect(GAME_GROUPS[0]!.title).toBe("The eight lives");
  });

  it("every game has a hook of four words or fewer that the patient rules allow", () => {
    for (const g of eachOf([...LIFE_GAMES, ...RUN_GAMES], "the games")) {
      const hint = GAME_HINTS[g.id];
      expect(hint, g.id).toBeTruthy();
      expect(hint!.split(/\s+/).length, g.id).toBeLessThanOrEqual(4);
      expect(`${g.title} ${hint}`.split(/\s+/).length, g.id).toBeLessThanOrEqual(8);
      expect(lintLandingCopy(`${g.title}. ${hint}.`), g.id).toEqual([]);
    }
  });
});

describe("try these first", () => {
  it("with no goals, starts with Maya, two runs about ADHD, then Leo", () => {
    expect(tryFirst([], none).map((g) => g.id)).toEqual(["maya", "context", "more-than-attention"]);
    expect(tryFirst([], none, 4).map((g) => g.id)).toEqual(["maya", "context", "more-than-attention", "leo"]);
  });

  it("puts games that match a goal first, keeping list order among them", () => {
    const sleep = tryFirst(["sleep"], none);
    expect(sleep.every((g) => matchesGoal(g, ["sleep"]))).toBe(true);
    // Maya's journey ends on lowering the sensory floor, a sleep strategy too.
    expect(sleep.map((g) => g.id)).toEqual(["maya", "sleep", "gut"]);
  });

  it("leaves out anything already played", () => {
    const played = (g: GameItem) => g.id === "maya" || g.id === "context";
    expect(tryFirst([], played).map((g) => g.id)).toEqual(["more-than-attention", "leo", "starting"]);
  });

  it("Leo and Theo have no journey, so no goal matches them", () => {
    const leo = LIFE_GAMES.find((g) => g.id === "leo")!;
    expect(matchesGoal(leo, ["sleep", "sensory_management"])).toBe(false);
  });

  it("offers any game not yet played, and nothing once every game is played", () => {
    const allButZoe = (g: GameItem) => !(g.kind === "life" && g.id === "zoe");
    expect(tryFirst([], allButZoe).map((g) => g.id)).toEqual(["zoe"]);
    expect(tryFirst(["sleep"], allButZoe).map((g) => g.id)).toEqual(["zoe"]);
    expect(tryFirst([], () => true)).toEqual([]);
  });
});

describe("played", () => {
  it("a finished run keeps the local day it was finished", () => {
    process.env.TZ = "Australia/Sydney";
    vi.useFakeTimers();
    // 8am on the 27th in Sydney is still the 26th in UTC, so a UTC day would fail here.
    vi.setSystemTime(new Date("2026-09-26T22:00:00Z"));
    const s = memory();
    markDone(s, "context");
    expect(readProgress(s).at?.context).toBe("2026-09-27");
  });

  it("a character game is marked once, keeps its first day, and stores no score", () => {
    const s = memory();
    markPlayed(s, "leo", "2026-09-01");
    markPlayed(s, "leo", "2026-09-20");
    expect(readPlayed(s)).toEqual({ v: 1, at: { leo: "2026-09-01" } });
    expect(parsePlayed({ v: 1, at: { leo: "2026-09-01", score: 9 } })).toBeNull();
    expect(parsePlayed({ v: 1, at: { nobody: "2026-09-01" } })).toBeNull();
  });
});

describe("the care map's panel", () => {
  it("lists the runs that target a part of life, then the character games whose journey works on it", () => {
    expect(gamesFor("activation").map((g) => g.id)).toContain("starting");
    const sleep = gamesFor("sleep");
    expect(sleep.some((g) => g.kind === "run" && g.id === "sleep")).toBe(true);
    expect(sleep.findIndex((g) => g.kind === "life")).not.toBe(0);
  });

  it("lists strategy modules by their domains, and every game and module reaches at least one part of life", () => {
    expect(modulesFor("sleep").length).toBeGreaterThan(0);
    const reached = new Set(SUBDOMAINS.flatMap((s) => gamesFor(s.id).map((g) => `${g.kind}:${g.id}`)));
    for (const g of eachOf(RUN_GAMES, "the runs")) expect(reached.has(`run:${g.id}`), g.id).toBe(true);
  });
});

describe("a game and a run on the same subject", () => {
  const shares = (a: GameItem, b: GameItem) => subjectOf(a).some((p) => subjectOf(b).includes(p));

  it("every life leads to the run it shares most with, and that run leads back to it", () => {
    const pairs = Object.fromEntries(LIFE_GAMES.map((g) => [g.id, relatedRun(g.id)?.id]));
    expect(pairs).toEqual({
      maya: "interruption", leo: "sleep", arjun: "more-than-attention", zoe: "conflict",
      theo: "mornings", mia: "working-memory", jax: "money", nina: "starting",
    });
    for (const life of eachOf(LIFE_GAMES, "the lives")) {
      const run = relatedRun(life.id)!;
      expect(shares(life, run), life.id).toBe(true);
      expect(relatedLife(run.id)?.id, life.id).toBe(life.id);
    }
  });

  it("every run that shares a part of life with a life gets one that does, and null only when none does", () => {
    for (const run of eachOf(RUN_GAMES, "the runs")) {
      const life = relatedLife(run.id);
      expect(life !== null, run.id).toBe(LIFE_GAMES.some((l) => shares(l, run)));
      if (life) expect(shares(life, run), run.id).toBe(true);
      // Nearest means nothing shares more.
      const most = Math.max(...LIFE_GAMES.map((l) => subjectOf(l).filter((p) => subjectOf(run).includes(p)).length));
      if (life) expect(subjectOf(life).filter((p) => subjectOf(run).includes(p)).length, run.id).toBe(most);
    }
    expect(RUN_GAMES.filter((r) => relatedLife(r.id))).toHaveLength(20);
    expect(relatedLife("no-such-run")).toBeNull();
  });

  it("is deterministic: the same game always finds the same partner", () => {
    const once = RUN_GAMES.map((r) => relatedLife(r.id)?.id);
    expect(RUN_GAMES.map((r) => relatedLife(r.id)?.id)).toEqual(once);
    expect(LIFE_GAMES.map((l) => relatedRun(l.id)?.id)).toEqual(LIFE_GAMES.map((l) => relatedRun(l.id)?.id));
    // A pair carries what the screens link to: a run's short title, a life's name and entry.
    expect(relatedRun("nina")).toMatchObject({ kind: "run", id: "starting", title: "The blank page" });
    expect(relatedLife("mornings")).toMatchObject({ kind: "life", id: "theo", title: "Theo", href: "/lives/play/theo-out-the-door" });
  });

  it("Leo and Theo, with no journey, are about their own evening and morning", () => {
    expect(subjectOf(LIFE_GAMES.find((g) => g.id === "leo")!)[0]).toBe("sleep");
    expect(subjectOf(LIFE_GAMES.find((g) => g.id === "theo")!)[0]).toBe("time");
  });
});
