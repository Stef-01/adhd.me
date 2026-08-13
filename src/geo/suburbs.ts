// W211: where the practices are, and how far that is from the person searching.
//
//
// WHY THIS REPLACED A STRING. Every clinician carried a hardcoded `distance` like "4.8 km away",
// which is a distance from nowhere in particular. It rendered beside a match reason as though it
// had been calculated for the reader, and it had not: the same 4.8 km showed to somebody in the
// next street and somebody two suburbs over. On a directory whose whole promise is "a practice you
// can get to", a fabricated distance is the worst kind of wrong, because it is actionable.
//
// SUBURB, NOT ADDRESS, AND NOT THE DEVICE'S LOCATION. Two deliberate limits:
//
//   The person types a suburb or postcode. Nothing asks for geolocation, so there is no permission
//   prompt, no coordinate leaving the device and no location in any log. W183 makes the same call
//   for the clinician side: a suburb answers the question a patient is actually asking, and
//   precision beyond the question is disclosure without purpose.
//
//   Distances are STRAIGHT LINE and the surfaces say "about". A real travel time depends on the
//   train line, and a product that printed "12 min" without knowing the timetable would be making
//   the same fabricated-precision mistake in a new unit.
//
// THE TABLE IS SMALL AND HAND-WRITTEN because the demo roster covers one part of Sydney. A real
// deployment reads this from a gazetteer; the shape of the lookup is what matters here, and the
// test pins that every suburb a clinician claims is present, so a new practice in an unlisted
// suburb fails the suite rather than silently ranking last.

export interface SuburbPoint {
  suburb: string;
  postcode: string;
  lat: number;
  lon: number;
}

/** Approximate centroids. Good to a few hundred metres, which is the resolution being claimed. */
export const SUBURBS: readonly SuburbPoint[] = [
  { suburb: "Blacktown", postcode: "2148", lat: -33.7688, lon: 150.9063 },
  { suburb: "Doonside", postcode: "2767", lat: -33.7669, lon: 150.8636 },
  { suburb: "Glenwood", postcode: "2768", lat: -33.7370, lon: 150.9280 },
  { suburb: "Kings Langley", postcode: "2147", lat: -33.7460, lon: 150.9370 },
  { suburb: "Lalor Park", postcode: "2147", lat: -33.7580, lon: 150.9280 },
  { suburb: "Marayong", postcode: "2148", lat: -33.7480, lon: 150.8930 },
  { suburb: "Mount Druitt", postcode: "2770", lat: -33.7700, lon: 150.8180 },
  { suburb: "Parramatta", postcode: "2150", lat: -33.8150, lon: 151.0000 },
  { suburb: "Prospect", postcode: "2148", lat: -33.8000, lon: 150.9130 },
  { suburb: "Quakers Hill", postcode: "2763", lat: -33.7340, lon: 150.8790 },
  { suburb: "Rooty Hill", postcode: "2766", lat: -33.7710, lon: 150.8420 },
  { suburb: "Seven Hills", postcode: "2147", lat: -33.7745, lon: 150.9370 },
  { suburb: "Toongabbie", postcode: "2146", lat: -33.7880, lon: 150.9520 },
  { suburb: "Woodcroft", postcode: "2767", lat: -33.7580, lon: 150.8830 },
];

const byName = new Map(SUBURBS.map((s) => [s.suburb.toLowerCase(), s]));

/**
 * Resolve what somebody typed to a point, or null.
 *
 * Exact match only, on either the suburb name or the postcode. No fuzzy matching, for W189's
 * reason: a near-miss silently becoming a hit is the product deciding what somebody meant, and
 * here it would send them to the wrong side of Sydney. An unresolved input is reported as
 * unresolved so the surface can say so.
 *
 * A postcode can cover several suburbs. The first is returned and the caller shows which, because
 * silently picking one of four and not saying is the same guess in a quieter voice.
 */
export function resolvePlace(input: string): SuburbPoint | null {
  const cleaned = input.trim().toLowerCase();
  if (!cleaned) return null;
  const exact = byName.get(cleaned);
  if (exact) return exact;
  if (/^\d{4}$/.test(cleaned)) return SUBURBS.find((s) => s.postcode === cleaned) ?? null;
  return null;
}

const EARTH_KM = 6371;
const rad = (deg: number) => (deg * Math.PI) / 180;

/** Great-circle distance in kilometres. Straight line, which is what the copy claims. */
export function distanceKm(a: SuburbPoint, b: SuburbPoint): number {
  const dLat = rad(b.lat - a.lat);
  const dLon = rad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLon / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.min(1, Math.sqrt(h)));
}

/**
 * How a distance is said out loud.
 *
 * "About" on every one, and never a travel time. Under a kilometre rounds to 100m because the
 * difference between 300m and 900m is a decision and the difference between 8.1km and 8.4km is not.
 */
export function describeDistance(km: number): string {
  if (km < 0.1) return "in your suburb";
  if (km < 1) return `about ${Math.round(km * 10) / 10} km away`;
  return `about ${Math.round(km)} km away`;
}

/** Suburb names for a datalist, so somebody can be shown what is actually covered. */
export function coveredSuburbs(): string[] {
  return SUBURBS.map((s) => s.suburb);
}
