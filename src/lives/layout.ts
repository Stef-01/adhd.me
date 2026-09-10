// L2 (PRD §46, §58, §87, §90): where everything in a microgame is, decided by the engine, not the
// renderer. Every engine's configuration becomes a `GameScene` in design coordinates from a seed,
// so the DOM player and a Skia renderer place the same wasp in the same corner, and a bug report's
// `seed / game / difficulty` reproduces the exact scene. Nothing here knows about React or pixels.
import { difficultyFor } from "./difficulty";
import { seededRng, type Rng } from "./random";
import type { DifficultyParameters, GameConfig, GameDefinition } from "./types";

/** The scene box, in design coordinates, under the HUD (§87: 390 wide). */
export const SCENE = { width: 390, height: 560 } as const;
/** The touch floor at design scale: a 48px target, whatever the difficulty says (§93). */
export const MIN_RADIUS = 24;
const MARGIN = 28;

export type EntityRole = "target" | "distractor" | "near_miss" | "goal" | "decoy" | "hazard" | "keep" | "intruder" | "item" | "tile";

export interface Entity {
  readonly id: string;
  readonly label: string;
  readonly role: EntityRole;
  readonly x: number;
  readonly y: number;
  readonly r: number;
  /** Design px per second. Zero for a still thing. */
  readonly vx: number;
  readonly vy: number;
  /** Rapid sorting: the bin this item belongs in. */
  readonly bin?: string;
  /** Goal protection: when this intruder enters, as a fraction of the active time. */
  readonly at?: number;
}

export interface Point { readonly x: number; readonly y: number }

/** Trace path: a pre-drawn route, for reduced motion and the keyboard; exactly one is safe. */
export interface Route { readonly id: string; readonly label: string; readonly points: readonly Point[]; readonly safe: boolean }

/** Precision timing: the marker sweeps 0→1 over the active time; the hit window is a fraction of it. */
export interface TimingPlan { readonly marks: readonly string[]; readonly hitIndex: number; readonly window: { readonly start: number; readonly end: number } }

/** Hold/release: the cue arrives at `cueAt` (fraction of active time); release inside the window. */
export interface HoldPlan { readonly verb: string; readonly releaseAt: string; readonly cueAt: number; readonly windowEnd: number }

export interface GameScene {
  readonly gameId: string;
  readonly seed: number;
  readonly level: number;
  readonly difficulty: DifficultyParameters;
  readonly entities: readonly Entity[];
  /** Trace path. */
  readonly start?: Point;
  readonly goal?: Point;
  readonly pathWidth?: number;
  readonly routes?: readonly Route[];
  /** Inhibition: what the temptation does, in order, as the clock runs. */
  readonly taunts?: readonly string[];
  /** Object search (§52): the line shown before the instruction, when the game reminds you. */
  readonly remind?: string;
  /** Rapid sorting. */
  readonly bins?: readonly string[];
  /** Wipe/scrub: the grid. */
  readonly grid?: { readonly columns: number; readonly rows: number; readonly covering: string };
  readonly timing?: TimingPlan;
  readonly hold?: HoldPlan;
}

const dist = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const radius = (base: number, d: DifficultyParameters) => Math.max(MIN_RADIUS, Math.round(base * d.hitRadiusMultiplier));

/** A spot inside the scene not overlapping what is already placed; falls back to a grid cell. */
function place(rng: Rng, r: number, placed: readonly Entity[], avoid: readonly { x: number; y: number; r: number }[] = [], box = { x: MARGIN, y: MARGIN, width: SCENE.width - 2 * MARGIN, height: SCENE.height - 2 * MARGIN }): Point {
  for (let attempt = 0; attempt < 60; attempt++) {
    const p = { x: box.x + r + rng.next() * Math.max(1, box.width - 2 * r), y: box.y + r + rng.next() * Math.max(1, box.height - 2 * r) };
    const clear = [...placed, ...avoid].every((e) => dist(p, e) >= e.r + r + 6);
    if (clear) return { x: Math.round(p.x), y: Math.round(p.y) };
  }
  // Rejection sampling ran out: the grid is a deterministic fallback, never a crash.
  const cell = 2 * r + 8;
  const columns = Math.max(1, Math.floor(box.width / cell));
  const i = placed.length;
  return { x: Math.round(box.x + r + (i % columns) * cell), y: Math.round(box.y + r + Math.floor(i / columns) * cell) };
}

function velocity(rng: Rng, speed: number): { vx: number; vy: number } {
  const angle = rng.next() * Math.PI * 2;
  const v = 60 * speed;
  return { vx: Math.round(Math.cos(angle) * v), vy: Math.round(Math.sin(angle) * v) };
}

/** Repeat a list to `count` by cycling it — three wasps from one word. */
const cycle = <T,>(items: readonly T[], count: number): T[] => Array.from({ length: count }, (_, i) => items[i % items.length]!);

function targetSwat(config: Extract<GameConfig, { kind: "target_swat" }>, d: DifficultyParameters, rng: Rng): Entity[] {
  const count = clamp(config.targets.length + d.targetCount - 1, 1, 6);
  const r = radius(40, d);
  const out: Entity[] = [];
  for (const [i, label] of cycle(config.targets, count).entries()) {
    const p = place(rng, r, out);
    out.push({ id: `t${i}`, label, role: "target", ...p, r, ...velocity(rng, d.targetSpeed) });
  }
  return out;
}

function semanticFilter(config: Extract<GameConfig, { kind: "semantic_filter" }>, d: DifficultyParameters, rng: Rng): Entity[] {
  const relevantCount = clamp(Math.min(config.relevant.length, 1 + d.targetCount), 1, config.relevant.length);
  const irrelevantCount = Math.min(config.irrelevant.length, d.distractorCount);
  const nearCount = config.nearMiss ? Math.min(config.nearMiss.length, Math.round(d.distractorSimilarity * 2)) : 0;
  const r = radius(42, d);
  const out: Entity[] = [];
  const add = (labels: readonly string[], role: EntityRole, prefix: string) => {
    for (const [i, label] of labels.entries()) { const p = place(rng, r, out); out.push({ id: `${prefix}${i}`, label, role, ...p, r, vx: 0, vy: 0 }); }
  };
  add(rng.shuffle(config.relevant).slice(0, relevantCount), "target", "r");
  add(rng.shuffle(config.irrelevant).slice(0, irrelevantCount), "distractor", "d");
  if (nearCount) add(rng.shuffle(config.nearMiss ?? []).slice(0, nearCount), "near_miss", "n");
  return out;
}

function tracePath(config: Extract<GameConfig, { kind: "trace_path" }>, d: DifficultyParameters, rng: Rng): Pick<GameScene, "entities" | "start" | "goal" | "pathWidth" | "routes"> {
  const start = { x: 195, y: SCENE.height - 60 };
  const goal = { x: 195, y: 56 };
  const pathWidth = Math.max(28, Math.round(config.pathWidth * d.pathWidthMultiplier));
  // Three routes: left, middle, right. One is safe; the hazards sit on the other two.
  const lanes = [{ id: "left", label: "Round the left", x: 70 }, { id: "middle", label: "Straight through", x: 195 }, { id: "right", label: "Round the right", x: 320 }];
  const safeIndex = rng.int(3);
  const routes: Route[] = lanes.map((lane, i) => ({ id: lane.id, label: lane.label, safe: i === safeIndex, points: [start, { x: lane.x, y: SCENE.height - 170 }, { x: lane.x, y: 300 }, { x: lane.x, y: 170 }, goal] }));
  const hazardCount = Math.min(config.hazards.length, d.distractorCount);
  const hazardRadius = radius(30, d);
  const entities: Entity[] = [];
  const unsafe = routes.filter((r) => !r.safe);
  const labels = rng.shuffle(config.hazards).slice(0, hazardCount);
  for (const [i, label] of labels.entries()) {
    const route = unsafe[i % unsafe.length]!;
    const waypoint = route.points[1 + (Math.floor(i / unsafe.length) % 3)]!;
    const jitter = { x: clamp(waypoint.x + Math.round((rng.next() - 0.5) * 30), MARGIN + hazardRadius, SCENE.width - MARGIN - hazardRadius), y: waypoint.y };
    entities.push({ id: `h${i}`, label, role: "hazard", ...jitter, r: hazardRadius, vx: 0, vy: 0 });
  }
  return { entities, start, goal, pathWidth, routes };
}

function inhibition(config: Extract<GameConfig, { kind: "inhibition" }>, d: DifficultyParameters): Pick<GameScene, "entities" | "taunts"> {
  const r = Math.round(80 + 30 * (d.targetSpeed - 1));
  return { entities: [{ id: "temptation", label: config.temptation, role: "distractor", x: 195, y: 300, r, vx: 0, vy: 0 }], taunts: config.taunts };
}

function objectSearch(config: Extract<GameConfig, { kind: "object_search" }>, d: DifficultyParameters, rng: Rng): Pick<GameScene, "entities" | "remind"> {
  const decoys = rng.shuffle(config.decoys).slice(0, Math.min(config.decoys.length, d.distractorCount));
  const r = radius(42, d);
  const out: Entity[] = [];
  const all = rng.shuffle([{ label: config.goal, role: "goal" as const }, ...decoys.map((label) => ({ label, role: "decoy" as const }))]);
  for (const [i, item] of all.entries()) { const p = place(rng, r, out); out.push({ id: `o${i}`, label: item.label, role: item.role, ...p, r, vx: 0, vy: 0 }); }
  return { entities: out, remind: config.remindBefore ? `GET THE ${config.goal.toUpperCase()}` : undefined };
}

function goalProtection(config: Extract<GameConfig, { kind: "goal_protection" }>, d: DifficultyParameters, rng: Rng): Entity[] {
  const keep: Entity = { id: "keep", label: config.keep, role: "keep", x: 195, y: SCENE.height - 90, r: radius(44, d), vx: 0, vy: 0 };
  const count = clamp(config.intruders.length + d.targetCount - 1, 1, 7);
  const r = radius(32, d);
  const out: Entity[] = [keep];
  for (const [i, label] of cycle(rng.shuffle(config.intruders), count).entries()) {
    // Enter from the top or a side, aimed at the keep; staggered across the first 70% of the clock.
    const edge = rng.int(3);
    const x = edge === 0 ? MARGIN + r + rng.int(SCENE.width - 2 * (MARGIN + r)) : edge === 1 ? r : SCENE.width - r;
    const y = edge === 0 ? r : 80 + rng.int(220);
    const length = Math.max(1, dist({ x, y }, keep));
    const speed = 55 * d.targetSpeed;
    out.push({ id: `i${i}`, label, role: "intruder", x, y, r, vx: Math.round(((keep.x - x) / length) * speed), vy: Math.round(((keep.y - y) / length) * speed), at: Math.round((i / count) * 0.7 * 100) / 100 });
  }
  return out;
}

function holdRelease(config: Extract<GameConfig, { kind: "hold_release" }>, d: DifficultyParameters, rng: Rng): Pick<GameScene, "entities" | "hold"> {
  const cueAt = Math.round((0.5 + rng.next() * 0.25) * 100) / 100;
  const window = Math.max(0.12, 0.25 * d.hitRadiusMultiplier);
  return { entities: [{ id: "hold", label: config.verb, role: "target", x: 195, y: 330, r: 80, vx: 0, vy: 0 }], hold: { verb: config.verb, releaseAt: config.releaseAt, cueAt, windowEnd: Math.min(0.98, Math.round((cueAt + window) * 100) / 100) } };
}

function rapidSorting(config: Extract<GameConfig, { kind: "rapid_sorting" }>, d: DifficultyParameters, rng: Rng): Pick<GameScene, "entities" | "bins"> {
  const items = rng.shuffle(config.items);
  const r = radius(34, d);
  return { bins: config.bins, entities: items.map((item, i) => ({ id: `s${i}`, label: item.label, role: "item", bin: item.bin, x: 195, y: 120 + i * 10, r, vx: 0, vy: 0 })) };
}

function wipeScrub(config: Extract<GameConfig, { kind: "wipe_scrub" }>, level: number): Pick<GameScene, "entities" | "grid"> {
  const t = (clamp(level, 1, 8) - 1) / 7;
  const columns = 3 + Math.round(t);
  const rows = 4 + Math.round(2 * t);
  const cellW = SCENE.width / columns, cellH = SCENE.height / rows;
  const entities: Entity[] = [];
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) entities.push({ id: `w${row}-${col}`, label: config.covering, role: "tile", x: Math.round(cellW * (col + 0.5)), y: Math.round(cellH * (row + 0.5)), r: Math.round(Math.min(cellW, cellH) / 2), vx: 0, vy: 0 });
  return { entities, grid: { columns, rows, covering: config.covering } };
}

function precisionTiming(config: Extract<GameConfig, { kind: "precision_timing" }>, d: DifficultyParameters): Pick<GameScene, "entities" | "timing"> {
  const n = config.marks.length;
  const span = 1 / n;
  const centre = (config.hitIndex + 0.5) * span;
  const half = Math.max(0.05, 0.5 * span * d.hitRadiusMultiplier);
  return { entities: [{ id: "act", label: "Now", role: "target", x: 195, y: 330, r: 80, vx: 0, vy: 0 }], timing: { marks: config.marks, hitIndex: config.hitIndex, window: { start: Math.round((centre - half) * 1000) / 1000, end: Math.round((centre + half) * 1000) / 1000 } } };
}

/** §93 reduced sensory effects: at most this many things compete on the field at once. */
export const SENSORY_CAP = 4;

export interface LayoutOptions {
  /** §93: fewer competing entities. The things a game needs (a target, a wrong thing, the goal, the keep, a hazard on every unsafe route) always stay. */
  readonly reducedSensory?: boolean;
}

/** The cap, per engine, on a laid-out scene. Drops from the end, so what stays is placed exactly as it was. */
function calmScene(scene: GameScene, kind: GameConfig["kind"]): GameScene {
  const all = scene.entities;
  const of = (role: EntityRole) => all.filter((e) => e.role === role);
  const keep = (chosen: readonly Entity[]) => ({ ...scene, entities: all.filter((e) => chosen.includes(e)) });
  switch (kind) {
    case "target_swat": return keep(all.slice(0, SENSORY_CAP - 1));
    case "semantic_filter": {
      const targets = of("target").slice(0, SENSORY_CAP - 1);
      const wrong = all.filter((e) => e.role !== "target").slice(0, Math.max(1, SENSORY_CAP - targets.length));
      return keep([...targets, ...wrong]);
    }
    // Two hazards: the first two sit on the two unsafe routes, so exactly one route stays safe.
    case "trace_path": return keep(of("hazard").slice(0, 2));
    case "object_search": return keep([...of("goal"), ...of("decoy").slice(0, SENSORY_CAP - 1)]);
    case "goal_protection": return keep([...of("keep"), ...of("intruder").slice(0, SENSORY_CAP - 1)]);
    default: return scene;
  }
}

/** The scene for a game at a difficulty level, from a seed. Pure; the same inputs give the same scene. */
export function layoutGame(game: GameDefinition, level: number, seed: number, options: LayoutOptions = {}): GameScene {
  const difficulty = difficultyFor(level);
  const rng = seededRng(seed);
  const base = { gameId: game.id, seed, level, difficulty };
  const c = game.config;
  const calm = options.reducedSensory === true;
  const scene = ((): GameScene => {
    switch (c.kind) {
      case "target_swat": return { ...base, entities: targetSwat(c, difficulty, rng) };
      case "semantic_filter": return { ...base, entities: semanticFilter(c, difficulty, rng) };
      case "trace_path": return { ...base, ...tracePath(c, difficulty, rng) };
      case "inhibition": return { ...base, ...inhibition(c, difficulty) };
      case "object_search": return { ...base, ...objectSearch(c, difficulty, rng) };
      case "goal_protection": return { ...base, entities: goalProtection(c, difficulty, rng) };
      case "hold_release": return { ...base, ...holdRelease(c, difficulty, rng) };
      case "rapid_sorting": return { ...base, ...rapidSorting(c, difficulty, rng) };
      // The smallest grid under reduced sensory: fewer tiles competing, the same layer to clear.
      case "wipe_scrub": return { ...base, ...wipeScrub(c, calm ? 1 : level) };
      case "precision_timing": return { ...base, ...precisionTiming(c, difficulty) };
    }
  })();
  return calm ? calmScene(scene, c.kind) : scene;
}

// ── Rules the renderer asks, so the facts are testable without a browser ──────────────────────

/** Where a moving entity is after `seconds`, bouncing inside the scene. */
export function positionAt(e: Entity, seconds: number): Point {
  const w = SCENE.width - 2 * e.r, h = SCENE.height - 2 * e.r;
  const bounce = (start: number, v: number, span: number) => {
    if (span <= 0 || v === 0) return start;
    const period = 2 * span;
    let p = ((start + v * seconds) % period + period) % period;
    if (p > span) p = period - p;
    return p;
  };
  return { x: Math.round(e.r + bounce(e.x - e.r, e.vx, w)), y: Math.round(e.r + bounce(e.y - e.r, e.vy, h)) };
}

/** Trace path (§48): starts near the start, ends near the goal, never inside a hazard's reach. */
export function traceIsSafe(points: readonly Point[], scene: GameScene): { safe: boolean; reason: "too short" | "did not start at the start" | "did not reach the goal" | `hit ${string}` | "safe" } {
  if (!scene.start || !scene.goal || points.length < 2) return { safe: false, reason: "too short" };
  const reach = 70;
  if (dist(points[0]!, scene.start) > reach) return { safe: false, reason: "did not start at the start" };
  if (dist(points[points.length - 1]!, scene.goal) > reach) return { safe: false, reason: "did not reach the goal" };
  const half = (scene.pathWidth ?? 40) / 2;
  for (const hazard of scene.entities.filter((e) => e.role === "hazard")) {
    for (let i = 1; i < points.length; i++) {
      if (segmentDistance(points[i - 1]!, points[i]!, hazard) < hazard.r + half) return { safe: false, reason: `hit ${hazard.label}` };
    }
  }
  return { safe: true, reason: "safe" };
}

function segmentDistance(a: Point, b: Point, p: Point): number {
  const dx = b.x - a.x, dy = b.y - a.y;
  const len2 = dx * dx + dy * dy;
  const t = len2 === 0 ? 0 : clamp(((p.x - a.x) * dx + (p.y - a.y) * dy) / len2, 0, 1);
  return dist({ x: a.x + t * dx, y: a.y + t * dy }, p);
}

/** Precision timing: whether a tap at `progress` (0–1 of the sweep) lands in the window. */
export function timingHit(progress: number, plan: TimingPlan): boolean {
  return progress >= plan.window.start && progress <= plan.window.end;
}

/** Which mark the marker is over at `progress`. */
export function markAt(progress: number, plan: TimingPlan): number {
  return clamp(Math.floor(progress * plan.marks.length), 0, plan.marks.length - 1);
}

/** Hold/release: a release at `progress` is early, on time, or late. */
export function releaseVerdict(progress: number, plan: HoldPlan): "early" | "on time" | "late" {
  if (progress < plan.cueAt) return "early";
  if (progress <= plan.windowEnd) return "on time";
  return "late";
}

/** Inhibition (§51): which taunt the temptation is doing at `progress`. */
export function tauntAt(progress: number, taunts: readonly string[]): string | null {
  if (taunts.length === 0) return null;
  const i = Math.min(taunts.length - 1, Math.floor(progress * (taunts.length + 1)) - 1);
  return i < 0 ? null : taunts[i]!;
}

/** Target swat (§49): the mosquito after `misses` — normal, smug, megaphone, tiny helicopter. */
export function escalatedLabel(config: GameConfig, base: string, misses: number): string {
  if (config.kind !== "target_swat" || !config.escalation || misses <= 0) return base;
  return config.escalation[Math.min(config.escalation.length - 1, misses - 1)]!;
}
