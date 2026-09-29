// The map then and now (docs/design/ux-evaluation-2026-09/PLAN.md W3). A device-only record cannot
// know what the map looked like on a day it was not opened, so a snapshot is taken when the hub is
// opened and the shape has changed since the last one. Day one is the first, and is never replaced.
// Any source can start the history, not only the ten Start questions.

import { localDay } from "@/lib/dates";
import { RUNG_LABEL, RUNG_REACH } from "@/wellness/map";
import { ASPECTS, STATUS_LABEL, axes, type Aspect, type AxisPoint } from "./matrix";
import { emptyModel, type ModelRecord } from "./store";
import { SNAPSHOT_CAP, type MapSnapshot } from "./snapshot-shape";
import type { LearningProfile } from "@/lives/types";

export type { MapSnapshot } from "./snapshot-shape";

/** The map as it reads right now, in words. */
export function snapshotOf(record: ModelRecord, on: string, profile: LearningProfile | null = null): MapSnapshot {
  const points = axes(record, profile);
  const statuses = {} as Record<Aspect, MapSnapshot["statuses"][Aspect]>;
  const rungs = {} as Record<Aspect, MapSnapshot["rungs"][Aspect]>;
  for (const p of points) {
    statuses[p.aspect] = p.status;
    rungs[p.aspect] = p.rung;
  }
  return { on, statuses, rungs };
}

/** Whether two snapshots draw the same map. The day does not count. */
export function sameMap(a: MapSnapshot, b: MapSnapshot): boolean {
  return ASPECTS.every((x) => a.statuses[x] === b.statuses[x] && a.rungs[x] === b.rungs[x]);
}

/**
 * The next list, given the map now. Returns `prev` itself when nothing should be written, so a
 * caller can compare by identity and never loop.
 *   1. Nothing yet: this is day one.
 *   2. The map has not changed since the latest: nothing to write.
 *   3. The latest is from today and is not day one: replace it. Otherwise add.
 *   4. Over the cap: drop the oldest after day one.
 */
export function nextSnapshots(prev: readonly MapSnapshot[], now: MapSnapshot): readonly MapSnapshot[] {
  if (prev.length === 0) return [now];
  const latest = prev[prev.length - 1]!;
  if (sameMap(latest, now)) return prev;
  const next = latest.on === now.on && prev.length > 1 ? [...prev.slice(0, -1), now] : [...prev, now];
  while (next.length > SNAPSHOT_CAP) next.splice(1, 1);
  return next;
}

/**
 * Day one for a record from before snapshots existed: the map the first answers alone draw, dated
 * the day they were finished, and marked approximate. Null when the start was never finished.
 */
export function migratedDayOne(record: ModelRecord): MapSnapshot | null {
  const done = record.onboarding?.completedAt;
  if (!done || Number.isNaN(Date.parse(done))) return null;
  const first: ModelRecord = { ...emptyModel(), onboarding: record.onboarding, resonance: record.resonance };
  return { ...snapshotOf(first, localDay(new Date(done))), approx: true };
}

/** The snapshots a hub visit should hold: the stored ones, or day one rebuilt for an older record. */
export function storedOrMigrated(record: ModelRecord): readonly MapSnapshot[] {
  if (record.snapshots && record.snapshots.length > 0) return record.snapshots;
  const dayOne = migratedDayOne(record);
  return dayOne ? [dayOne] : [];
}

/** Whether a snapshot draws nothing: the map of a record with nothing in it. */
export function isBlank(snapshot: MapSnapshot): boolean {
  return sameMap(snapshot, snapshotOf(emptyModel(), snapshot.on));
}

/**
 * What a hub visit writes, or null when it writes nothing. The history starts the first time the
 * map draws anything, from any source: the ten Start questions, a rated game, a character, a goal.
 * A blank map is never day one, so a new record writes nothing. A record from before snapshots
 * gets its rebuilt day one written once. An unchanged map returns null, so the write, the re-read
 * it causes and the next visit cannot loop.
 */
export function snapshotsToWrite(record: ModelRecord, now: MapSnapshot): readonly MapSnapshot[] | null {
  const held = storedOrMigrated(record);
  if (held.length === 0 && isBlank(now)) return null;
  // `held` is the stored list itself when one is on file, so the same list back means no change.
  const next = nextSnapshots(held, now);
  return next === record.snapshots ? null : next;
}

/** A snapshot as the radar draws it: the same points it draws for now. */
export function pointsOf(snapshot: MapSnapshot): AxisPoint[] {
  return ASPECTS.map((aspect) => {
    const rung = snapshot.rungs[aspect];
    const status = snapshot.statuses[aspect];
    return { aspect, rung, reach: RUNG_REACH[rung], stillLearning: rung === "unmapped" || status === "still-learning", status, strength: null };
  });
}

const DAY_MS = 86_400_000;
const MONTH_FLOOR_DAYS = 28;

function parseDay(on: string): Date {
  const [y, m, d] = on.split("-").map(Number) as [number, number, number];
  return new Date(y, m - 1, d);
}

/**
 * A past day named the way the pill says it: "August", "August last year", "Two years ago". Never a
 * digit. Named by calendar year, not by months gone by: last September, eleven months and a day
 * ago, would otherwise read as this September. Anything from two calendar years back, which
 * includes everything twenty four months or more ago, is "Two years ago", or "The September
 * before last" when it is under two years, because "last year" would name the wrong year.
 */
export function monthName(on: string, today: Date): string {
  const then = parseDay(on);
  const years = today.getFullYear() - then.getFullYear();
  const name = then.toLocaleString("en-AU", { month: "long" });
  if (years >= 2) {
    // Two calendar years back but under two years ago, as a December seen in the January after
    // next: "last year" would name the wrong December and "Two years ago" would overstate it.
    const months = years * 12 + today.getMonth() - then.getMonth() - (today.getDate() < then.getDate() ? 1 : 0);
    return months >= 24 ? "Two years ago" : `The ${name} before last`;
  }
  return years === 1 ? `${name} last year` : name;
}

interface Compare {
  /** Day one, when it draws a different map from now. */
  readonly dayOne: MapSnapshot | null;
  /** The latest snapshot at least four weeks old after day one, when it differs from now. */
  readonly month: { readonly snapshot: MapSnapshot; readonly name: string } | null;
}

/** What the hub can compare against. Both null means there is nothing to show. */
export function compareFor(snapshots: readonly MapSnapshot[], now: MapSnapshot, today: Date): Compare {
  const first = snapshots[0];
  const dayOne = first && !sameMap(first, now) ? first : null;
  const cutoff = today.getTime() - MONTH_FLOOR_DAYS * DAY_MS;
  const older = snapshots.slice(1).filter((s) => parseDay(s.on).getTime() <= cutoff);
  const pick = older[older.length - 1];
  const month = pick && !sameMap(pick, now) ? { snapshot: pick, name: monthName(pick.on, today) } : null;
  return { dayOne, month };
}

const when = (name: string) =>
  name === "Day one" ? "on day one" : name === "Two years ago" ? "two years ago" : name.startsWith("The ") ? `in the ${name.slice(4)}` : `in ${name}`;

/**
 * The text a screen reader gets for the drawing: each axis that differs, in the screen's own words.
 * The dashed outline is drawn from the rung, so a rung that moved is named with its rung word, and
 * a status that moved with its status word. When both moved, both are said.
 */
export function compareSentence(then: MapSnapshot, thenName: string, now: MapSnapshot, label: (a: Aspect) => string): string[] {
  return ASPECTS.flatMap((a) => {
    const moved: Array<(s: MapSnapshot) => string> = [];
    if (then.statuses[a] !== now.statuses[a]) moved.push((s) => STATUS_LABEL[s.statuses[a]] || "Unasked");
    if (then.rungs[a] !== now.rungs[a]) moved.push((s) => RUNG_LABEL[s.rungs[a]]);
    if (moved.length === 0) return [];
    // One "Unasked" for an axis with neither a status nor a rung, not two.
    const say = (s: MapSnapshot) => [...new Set(moved.map((w) => w(s)))].join(" and ");
    return [`${label(a)}: ${say(then)} ${when(thenName)}, ${say(now)} now.`];
  });
}
