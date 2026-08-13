// One home for the ISO date arithmetic the generator, sim, and dashboard windows all
// share (W26 consolidation) — week-boundary math must be identical everywhere or
// visits silently drop/double-count at week edges.

export function isoDaysFrom(anchor: string, days: number): string {
  const d = new Date(`${anchor}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
