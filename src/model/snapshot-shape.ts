// What a snapshot of the map holds, and the check a stored one must pass. Kept apart from the code
// that takes snapshots so the store can validate them without importing the map (the map imports
// the store). The lists here must equal the map's own; `snapshots.test.ts` holds them together.

import type { Aspect, CellStatus } from "./matrix";
import type { Rung } from "@/wellness/map";

export const SNAPSHOT_ASPECTS = ["starting", "focus", "organisation", "emotional-regulation", "relationships", "sleep-energy"] as const;
export const SNAPSHOT_STATUSES = ["unexplored", "still-learning", "working-well", "mostly-supported", "worth-improving", "needs-support"] as const;
export const SNAPSHOT_RUNGS = ["unmapped", "named", "explored", "kept", "working"] as const;

/** The most snapshots kept. Day one is never the one dropped. */
export const SNAPSHOT_CAP = 36;

/** The map on one day, in its own words: each axis's status and how far it reaches. No numbers. */
export interface MapSnapshot {
  /** The day on the device's own calendar, YYYY-MM-DD. */
  readonly on: string;
  readonly statuses: Readonly<Record<Aspect, CellStatus>>;
  readonly rungs: Readonly<Record<Aspect, Rung>>;
  /** Rebuilt from the first answers for a record older than snapshots, so its day is approximate. */
  readonly approx?: true;
}

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === "object" && !Array.isArray(v);

export function isSnapshot(v: unknown): v is MapSnapshot {
  if (!isObject(v) || typeof v.on !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(v.on)) return false;
  if (v.approx !== undefined && v.approx !== true) return false;
  const { statuses, rungs } = v;
  if (!isObject(statuses) || !isObject(rungs)) return false;
  return SNAPSHOT_ASPECTS.every(
    (a) =>
      (SNAPSHOT_STATUSES as readonly unknown[]).includes(statuses[a]) &&
      (SNAPSHOT_RUNGS as readonly unknown[]).includes(rungs[a]),
  );
}

/** A stored list, keeping only well-formed snapshots and never more than the cap. */
export function sanitiseSnapshots(v: unknown): MapSnapshot[] {
  if (!Array.isArray(v)) return [];
  return v.filter(isSnapshot).slice(0, SNAPSHOT_CAP);
}
