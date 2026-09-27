// The map then and now (docs/design/ux-evaluation-2026-09/PLAN.md W3). A device-only record cannot
// know what the map looked like on a day it was not opened, so a snapshot is taken when the hub is
// opened and the shape has changed since the last one. Day one is the first, and is never replaced.

import { localDay } from "@/lib/dates";
import { RUNG_REACH } from "@/wellness/map";
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

/** Whole calendar months between two local days. */
function monthsBetween(from: Date, to: Date): number {
  let months = (to.getFullYear() - from.getFullYear()) * 12 + (to.getMonth() - from.getMonth());
  if (to.getDate() < from.getDate()) months -= 1;
  return months;
}

/** A past day named the way the pill says it: "August", "August last year", "Two years ago". Never a digit. */
export function monthName(on: string, today: Date): string {
  const then = parseDay(on);
  const months = monthsBetween(then, today);
  if (months >= 24) return "Two years ago";
  const name = then.toLocaleString("en-AU", { month: "long" });
  return months > 11 ? `${name} last year` : name;
}

export interface Compare {
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

const when = (name: string) => (name === "Day one" ? "on day one" : name === "Two years ago" ? "two years ago" : `in ${name}`);

/** The text a screen reader gets for the drawing: each axis that differs, in the screen's own words. */
export function compareSentence(then: MapSnapshot, thenName: string, now: MapSnapshot, label: (a: Aspect) => string): string[] {
  const word = (s: MapSnapshot["statuses"][Aspect]) => STATUS_LABEL[s] || "Unasked";
  return ASPECTS.filter((a) => then.statuses[a] !== now.statuses[a] || then.rungs[a] !== now.rungs[a]).map(
    (a) => `${label(a)}: ${word(then.statuses[a])} ${when(thenName)}, ${word(now.statuses[a])} now.`,
  );
}
