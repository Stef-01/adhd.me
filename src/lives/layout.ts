// §85–§88: what a game puts on the stage, decided by the engine from the seed so a run replays
// exactly. The renderer draws these; it invents nothing. Positions are fractions of the stage
// (0–1) so a 390-wide phone and a 640-wide column draw the same game.

import type { Rng } from "./random";
import type { DifficultyParameters, GameConfig } from "./types";

export interface Placed<T> { readonly id: string; readonly item: T; readonly x: number; readonly y: number }

/** The three beats of a game, on one clock (§44). FASTER sits between games (§59). */
export type Beat = "pre" | "active" | "result";
export const PRE_MS = 900;
export const RESULT_MS = 900;
export const FASTER_MS = 800;

const SAFE = { x: [0.08, 0.92], y: [0.1, 0.78] } as const;

/** Spread `n` things over the stage, none closer than `gap` to another, deterministic. */
export function scatter<T>(rng: Rng, items: readonly T[], gap = 0.16): Placed<T>[] {
  const out: Placed<T>[] = [];
  items.forEach((item, i) => {
    let best = { x: 0.5, y: 0.5 }, bestScore = -1;
    for (let attempt = 0; attempt < 12; attempt++) {
      const x = SAFE.x[0] + rng.next() * (SAFE.x[1] - SAFE.x[0]);
      const y = SAFE.y[0] + rng.next() * (SAFE.y[1] - SAFE.y[0]);
      const nearest = Math.min(1, ...out.map((p) => Math.hypot(p.x - x, p.y - y)));
      if (nearest > bestScore) { bestScore = nearest; best = { x, y }; }
      if (nearest >= gap) break;
    }
    out.push({ id: `${i}`, item, x: best.x, y: best.y });
  });
  return out;
}

export function pickN<T>(rng: Rng, items: readonly T[], n: number): T[] {
  return rng.shuffle(items).slice(0, Math.max(0, Math.min(n, items.length)));
}

/** target_swat: how many targets, where; at higher difficulty they hop every `hopMs`. */
export function swatLayout(rng: Rng, config: Extract<GameConfig, { kind: "target_swat" }>, d: DifficultyParameters) {
  const count = Math.min(config.targets.length + d.targetCount - 1, Math.max(1, d.targetCount + 1));
  const labels = Array.from({ length: count }, (_, i) => config.targets[i % config.targets.length]!);
  return { targets: scatter(rng, labels, 0.22), hopMs: d.targetSpeed > 1.4 ? Math.round(1600 / d.targetSpeed) : null };
}

/** semantic_filter: the relevant things and a difficulty-sized handful of the rest, shuffled together. */
export function filterLayout(rng: Rng, config: Extract<GameConfig, { kind: "semantic_filter" }>, d: DifficultyParameters) {
  const relevant = pickN(rng, config.relevant, Math.min(config.relevant.length, 2 + Math.floor(d.targetCount / 2)));
  const nearMiss = d.distractorSimilarity > 0.55 && config.nearMiss ? pickN(rng, config.nearMiss, 1) : [];
  const irrelevant = pickN(rng, config.irrelevant, Math.max(1, d.distractorCount - nearMiss.length));
  const items = rng.shuffle([...relevant.map((t) => ({ text: t, relevant: true })), ...irrelevant.map((t) => ({ text: t, relevant: false })), ...nearMiss.map((t) => ({ text: t, relevant: false }))]);
  return { items: items.map((it, i) => ({ id: `${i}`, ...it })), need: relevant.length };
}

/** trace_path: a corridor from the bean to the goal, hazards beside it. */
export function traceLayout(rng: Rng, config: Extract<GameConfig, { kind: "trace_path" }>, d: DifficultyParameters) {
  const hazards = pickN(rng, config.hazards, Math.min(config.hazards.length, 1 + Math.round(d.distractorCount / 2)));
  const points = [{ x: 0.12, y: 0.82 }, { x: 0.3 + rng.next() * 0.15, y: 0.3 + rng.next() * 0.3 }, { x: 0.55 + rng.next() * 0.15, y: 0.25 + rng.next() * 0.45 }, { x: 0.88, y: 0.2 }];
  const placedHazards = hazards.map((h, i) => {
    const t = (i + 1) / (hazards.length + 1);
    const seg = Math.min(points.length - 2, Math.floor(t * (points.length - 1)));
    const a = points[seg]!, b = points[seg + 1]!;
    const along = { x: a.x + (b.x - a.x) * 0.5, y: a.y + (b.y - a.y) * 0.5 };
    const side = rng.next() < 0.5 ? -1 : 1;
    return { id: `${i}`, item: h, x: Math.min(0.95, Math.max(0.05, along.x + side * 0.02)), y: Math.min(0.95, Math.max(0.05, along.y + side * 0.22)) };
  });
  return { points, hazards: placedHazards, width: config.pathWidth * d.pathWidthMultiplier };
}

/** object_search: the goal among decoys, scattered. */
export function searchLayout(rng: Rng, config: Extract<GameConfig, { kind: "object_search" }>, d: DifficultyParameters) {
  const decoys = pickN(rng, config.decoys, Math.min(config.decoys.length, d.distractorCount));
  const things = rng.shuffle([{ text: config.goal, goal: true }, ...decoys.map((t) => ({ text: t, goal: false }))]);
  return { things: scatter(rng, things, 0.2) };
}

/** goal_protection: intruders arrive one after another; the interval shortens with difficulty. */
export function protectLayout(rng: Rng, config: Extract<GameConfig, { kind: "goal_protection" }>, d: DifficultyParameters, activeMs: number) {
  const intruders = pickN(rng, config.intruders, Math.min(config.intruders.length, Math.max(2, d.distractorCount - 1)));
  const gap = Math.max(450, Math.round((activeMs * 0.7) / intruders.length));
  return { intruders: intruders.map((text, i) => ({ id: `${i}`, text, at: 250 + i * gap, side: i % 2 === 0 ? "left" : "right" })), gap };
}

/** hold_release: when the cue arrives, as a fraction of the active time, and how long the release window stays open. */
export function holdCue(rng: Rng, activeMs: number, d: DifficultyParameters) {
  const at = Math.round(activeMs * (0.35 + rng.next() * 0.35));
  const windowMs = Math.round(Math.max(500, 1100 * d.hitRadiusMultiplier));
  return { at, windowMs };
}

/** rapid_sorting: the queue, longer with difficulty, each item with its bin. */
export function sortQueue(rng: Rng, config: Extract<GameConfig, { kind: "rapid_sorting" }>, d: DifficultyParameters) {
  const n = Math.min(config.items.length, Math.max(2, Math.round(d.memoryLength / 1.5)));
  return { queue: pickN(rng, config.items, n).map((it, i) => ({ id: `${i}`, ...it })), bins: [...config.bins] };
}

/** wipe_scrub: a grid of tiles over the covering; enough of them cleared is the hit. */
export function wipeGrid(d: DifficultyParameters) {
  const cols = 4 + Math.round(d.targetCount / 2);
  const rows = 3 + Math.round(d.targetCount / 3);
  return { cols, rows, need: Math.ceil(cols * rows * 0.8) };
}

/** precision_timing: the marker sweeps the marks and back; the hit zone narrows with difficulty. */
export function timingCue(config: Extract<GameConfig, { kind: "precision_timing" }>, d: DifficultyParameters) {
  const n = config.marks.length;
  const centre = (config.hitIndex + 0.5) / n;
  const half = (0.5 / n) * Math.max(0.55, d.hitRadiusMultiplier);
  return { centre, from: centre - half, to: centre + half, sweepMs: Math.round(2200 / d.targetSpeed) };
}

/** Where the marker is at `t` ms into a sweep that goes 0→1→0. */
export function sweepPosition(t: number, sweepMs: number): number {
  const phase = (t % (sweepMs * 2)) / sweepMs;
  return phase <= 1 ? phase : 2 - phase;
}
