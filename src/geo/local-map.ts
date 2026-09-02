// O234 (founder-directed): the nearby map's geometry — where the person is, where the GPs' rooms
// are, and how far, laid out for one small SVG.
//
// WHY NOT A TILE MAP. A Leaflet or Google basemap means a tile host, which means every pan sends
// a third party the exact area a person is looking at — the coordinate the tree promises never
// leaves the browser (W211, `suburbs.ts`), leaving it — and it means an `img-src` the CSP refuses
// (`src/security/headers.ts` pins `'self'`). The question a patient is asking is not "what is
// the road layout" but "how far is this from me, and which ones are near each other", and that
// question the gazetteer already answers. So this is the coverage diagram's method
// (`app/coverage-map.tsx`) at neighbourhood scale: a local projection around the person's own
// suburb, with distance rings, and one stop per consulting suburb carrying the list positions
// of the GPs who consult there. Everything drawn is a real distance; nothing is a road.
//
// PROJECTION. Local equirectangular about the origin: at neighbourhood scale (tens of km) the
// error against the great-circle distance the ranking uses is well under the few-hundred-metre
// resolution the gazetteer claims. x grows east, y grows SOUTH (SVG's y is down), in kilometres,
// then scaled to fit the box with the origin at its centre. Rings are drawn from the same scale,
// so a ring labelled 5 km is exactly where a 5 km stop would sit.

import { distanceKm, type SuburbPoint } from "./suburbs";

const KM_PER_DEG = 111.32;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** A consulting location on the map, with the list positions (1-based) of the GPs who consult there. */
export interface MapStop {
  readonly suburb: string;
  readonly point: SuburbPoint;
  /** Straight-line km from the origin. */
  readonly km: number;
  /** The rows on the results list that consult here, by their 1-based position, ascending. */
  readonly positions: readonly number[];
}

export interface PlacedStop extends MapStop {
  /** Box coordinates, 0..size. */
  readonly x: number;
  readonly y: number;
  /** Which side of the pin the label sits so it stays inside the box. */
  readonly labelSide: "left" | "right";
}

export interface LocalMapLayout {
  readonly size: number;
  readonly origin: { readonly x: number; readonly y: number };
  readonly stops: readonly PlacedStop[];
  /** Distance rings, radius in box units, drawn around the origin. */
  readonly rings: ReadonlyArray<{ readonly km: number; readonly r: number }>;
  /** Box units per km, for anything else that wants to draw at scale. */
  readonly unitsPerKm: number;
  /** The furthest stop, in km — what the box was fitted to. */
  readonly reachKm: number;
}

/** Rings a reader can read at a glance. The layout picks the two or three that fit the reach. */
const RING_CHOICES = [1, 2, 5, 10, 20, 50, 100] as const;

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

/**
 * Fit the origin and its stops into a square box.
 *
 * @param size Box side, in SVG units.
 * @param pad Clear margin inside the box, so the furthest pin and its label stay inside.
 */
export function layoutLocalMap(origin: SuburbPoint, stops: readonly MapStop[], size = 100, pad = 13): LocalMapLayout {
  const half = size / 2;
  // Never fit tighter than 2 km: a person and one GP in the same suburb still get a map with a
  // readable ring rather than two dots on top of each other.
  const reachKm = Math.max(2, ...stops.map((s) => s.km));
  const unitsPerKm = (half - pad) / reachKm;
  const cosLat = Math.cos(rad(origin.lat));

  const place = (point: SuburbPoint) => ({
    x: half + (point.lon - origin.lon) * cosLat * KM_PER_DEG * unitsPerKm,
    y: half - (point.lat - origin.lat) * KM_PER_DEG * unitsPerKm,
  });

  const placed: PlacedStop[] = stops.map((stop) => {
    const { x, y } = place(stop.point);
    return { ...stop, x, y, labelSide: x > half ? "left" : "right" };
  });

  // Rings: every choice inside the reach, but never more than three — the largest three that
  // fit, so a 20 km reach shows 5/10/20 rather than 1/2/5.
  const fitting = RING_CHOICES.filter((km) => km <= reachKm * 1.02);
  const rings = fitting.slice(-3).map((km) => ({ km, r: km * unitsPerKm }));

  return { size, origin: { x: half, y: half }, stops: placed, rings, unitsPerKm, reachKm };
}
