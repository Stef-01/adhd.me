// The stage layouts (§85–§88): decided from the seed, inside the stage, sized by difficulty.
import { describe, expect, it } from "vitest";
import { eachOf } from "@/quality/non-vacuous";
import { difficultyFor, MAX_DIFFICULTY } from "./difficulty";
import { GAMES } from "./games";
import { filterLayout, holdCue, protectLayout, scatter, searchLayout, sortQueue, swatLayout, sweepPosition, timingCue, traceLayout, wipeGrid } from "./layout";
import { seededRng } from "./random";
import type { GameConfig } from "./types";

const cfg = <K extends GameConfig["kind"]>(kind: K) => GAMES.find((g) => g.config.kind === kind)!.config as Extract<GameConfig, { kind: K }>;
const easy = difficultyFor(1), hard = difficultyFor(MAX_DIFFICULTY);

describe("stage layouts", () => {
  it("scatter keeps everything inside the stage and replays from the seed", () => {
    const a = scatter(seededRng(3), ["a", "b", "c", "d", "e"]);
    const b = scatter(seededRng(3), ["a", "b", "c", "d", "e"]);
    expect(a).toEqual(b);
    for (const p of eachOf(a, "the placed things")) {
      expect(p.x).toBeGreaterThanOrEqual(0.08); expect(p.x).toBeLessThanOrEqual(0.92);
      expect(p.y).toBeGreaterThanOrEqual(0.1); expect(p.y).toBeLessThanOrEqual(0.78);
    }
    expect(scatter(seededRng(4), ["a", "b"])).not.toEqual(a.slice(0, 2));
  });

  it("swat puts more targets on the stage, and makes them hop, as difficulty rises", () => {
    const c = cfg("target_swat");
    expect(swatLayout(seededRng(1), c, easy).hopMs).toBeNull();
    expect(swatLayout(seededRng(1), c, hard).hopMs).not.toBeNull();
    expect(swatLayout(seededRng(1), c, hard).targets.length).toBeGreaterThan(swatLayout(seededRng(1), c, easy).targets.length);
  });

  it("filter mixes the relevant with more distractors, and a near miss only when similarity is high", () => {
    const c = cfg("semantic_filter");
    const e = filterLayout(seededRng(2), c, easy), h = filterLayout(seededRng(2), c, hard);
    expect(e.items.filter((i) => i.relevant).length).toBe(e.need);
    expect(h.items.length).toBeGreaterThan(e.items.length);
    expect(e.items.some((i) => c.nearMiss?.includes(i.text))).toBe(false);
    expect(h.items.some((i) => c.nearMiss?.includes(i.text))).toBe(true);
  });

  it("trace runs from the bean to the goal with hazards beside the corridor, narrower when harder", () => {
    const c = cfg("trace_path");
    const e = traceLayout(seededRng(5), c, easy), h = traceLayout(seededRng(5), c, hard);
    expect(e.points[0]).toEqual({ x: 0.12, y: 0.82 });
    expect(e.points.at(-1)).toEqual({ x: 0.88, y: 0.2 });
    expect(h.width).toBeLessThan(e.width);
    expect(h.hazards.length).toBeGreaterThanOrEqual(e.hazards.length);
    for (const hz of eachOf(h.hazards, "the hazards")) { expect(hz.x).toBeGreaterThan(0); expect(hz.x).toBeLessThan(1); }
  });

  it("search scatters exactly one goal among the decoys", () => {
    const l = searchLayout(seededRng(6), cfg("object_search"), hard);
    expect(l.things.filter((t) => t.item.goal).length).toBe(1);
    expect(l.things.length).toBeGreaterThan(2);
  });

  it("protect staggers the intruders inside the active time, alternating sides", () => {
    const l = protectLayout(seededRng(7), cfg("goal_protection"), easy, 6000);
    expect(l.intruders.length).toBeGreaterThanOrEqual(2);
    expect(l.intruders.every((i) => i.at < 6000)).toBe(true);
    expect(l.intruders.map((i) => i.side).slice(0, 2)).toEqual(["left", "right"]);
  });

  it("the hold cue lands in the middle of the active time and its window shrinks when harder", () => {
    const e = holdCue(seededRng(8), 6000, easy), h = holdCue(seededRng(8), 6000, hard);
    expect(e.at).toBeGreaterThanOrEqual(6000 * 0.35); expect(e.at).toBeLessThanOrEqual(6000 * 0.7);
    expect(h.windowMs).toBeLessThan(e.windowMs);
    expect(h.windowMs).toBeGreaterThanOrEqual(500);
  });

  it("sorting queues more when harder, wiping needs four fifths, timing narrows and speeds up", () => {
    const s = cfg("rapid_sorting");
    expect(sortQueue(seededRng(9), s, hard).queue.length).toBeGreaterThanOrEqual(sortQueue(seededRng(9), s, easy).queue.length);
    const w = wipeGrid(easy);
    expect(w.need).toBe(Math.ceil(w.cols * w.rows * 0.8));
    const t = cfg("precision_timing");
    const te = timingCue(t, easy), th = timingCue(t, hard);
    expect(th.to - th.from).toBeLessThan(te.to - te.from);
    expect(th.sweepMs).toBeLessThan(te.sweepMs);
    expect(te.from).toBeLessThan(te.centre); expect(te.to).toBeGreaterThan(te.centre);
  });

  it("the sweep goes there and back between 0 and 1", () => {
    expect(sweepPosition(0, 1000)).toBe(0);
    expect(sweepPosition(1000, 1000)).toBe(1);
    expect(sweepPosition(1500, 1000)).toBeCloseTo(0.5);
    expect(sweepPosition(2000, 1000)).toBe(0);
  });
});
