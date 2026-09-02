// O234 (founder-directed), trimmed by O235: the nearby map's grouping — one stop per consulting
// suburb, carrying the list positions of the GPs who consult there and the straight-line distance
// from the person's suburb. O234 also laid these out for a hand-drawn SVG; O235 put them on a real
// basemap (Leaflet over OpenStreetMap, `app/finder-stages/nearby-map.tsx`), and the projection and
// fit went with it — the map library does those. What remains is pure and node-tested: the map
// draws exactly the stops this computes, and a stop's positions are the rows' positions.

import { distanceKm, type SuburbPoint } from "./suburbs";

/** A consulting location on the map, with the list positions (1-based) of the GPs who consult there. */
export interface MapStop {
  readonly suburb: string;
  readonly point: SuburbPoint;
  /** Straight-line km from the origin. */
  readonly km: number;
  /** The rows on the results list that consult here, by their 1-based position, ascending. */
  readonly positions: readonly number[];
}

/**
 * Group per-GP locations into stops by suburb, keeping each GP's list position.
 *
 * @param located One entry per GP in LIST ORDER, each naming its nearest consulting suburb, or
 *   null when the GP cannot be placed (telehealth-first, or a suburb outside the gazetteer).
 */
export function stopsFor(
  origin: SuburbPoint,
  located: ReadonlyArray<{ suburb: string; point: SuburbPoint } | null>,
): MapStop[] {
  const bySuburb = new Map<string, { point: SuburbPoint; positions: number[] }>();
  located.forEach((entry, index) => {
    if (!entry) return;
    const stop = bySuburb.get(entry.suburb) ?? { point: entry.point, positions: [] };
    stop.positions.push(index + 1);
    bySuburb.set(entry.suburb, stop);
  });
  return [...bySuburb.entries()]
    .map(([suburb, { point, positions }]) => ({ suburb, point, km: distanceKm(origin, point), positions }))
    .sort((a, b) => a.km - b.km || a.suburb.localeCompare(b.suburb));
}
