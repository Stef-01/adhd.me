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
// THE TABLE IS SMALL AND HAND-WRITTEN because the demo roster covers two focus areas — Beecroft in
// northern Sydney (NSW) and the Gold Coast (QLD). A real deployment reads this from a gazetteer;
// the shape of the lookup is what matters here, and the test pins that every suburb a clinician
// claims is present, so a new practice in an unlisted suburb fails the suite rather than silently
// ranking last. The two areas are hundreds of kilometres apart on purpose: distances are always
// computed within an area, and a search resolves to whichever point the person names.

export interface SuburbPoint {
  suburb: string;
  postcode: string;
  lat: number;
  lon: number;
}

/** Approximate centroids. Good to a few hundred metres, which is the resolution being claimed. */
export const SUBURBS: readonly SuburbPoint[] = [
  // Focus area 1 — Beecroft and its neighbours, northern Sydney, NSW.
  { suburb: "Beecroft", postcode: "2119", lat: -33.7503, lon: 151.0586 },
  // O85: Dr Anusha Saxena's second consulting location (founder-supplied 2026-08-20).
  { suburb: "Hornsby", postcode: "2077", lat: -33.7045, lon: 151.0993 },
  { suburb: "Cheltenham", postcode: "2119", lat: -33.7447, lon: 151.0778 },
  { suburb: "Pennant Hills", postcode: "2120", lat: -33.7383, lon: 151.0719 },
  { suburb: "Epping", postcode: "2121", lat: -33.7726, lon: 151.0817 },
  // Focus area 3 — Sydney eastern suburbs, NSW (O34: Bay Health Clinic, Double Bay).
  { suburb: "Double Bay", postcode: "2028", lat: -33.8775, lon: 151.2437 },
  { suburb: "Edgecliff", postcode: "2027", lat: -33.8790, lon: 151.2360 },
  { suburb: "Rose Bay", postcode: "2029", lat: -33.8710, lon: 151.2700 },
  { suburb: "Bondi Junction", postcode: "2022", lat: -33.8912, lon: 151.2469 },
  // Focus area 2 — the Gold Coast, QLD.
  { suburb: "Southport", postcode: "4215", lat: -27.9676, lon: 153.4000 },
  { suburb: "Surfers Paradise", postcode: "4217", lat: -28.0027, lon: 153.4309 },
  { suburb: "Broadbeach", postcode: "4218", lat: -28.0333, lon: 153.4300 },
  { suburb: "Robina", postcode: "4226", lat: -28.0700, lon: 153.3900 },
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
