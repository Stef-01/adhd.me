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
// THE TABLE IS SMALL AND HAND-WRITTEN because the roster covers a handful of focus areas — Beecroft
// in northern Sydney, the eastern suburbs, the Gold Coast, and inner Brisbane (O252). A real deployment reads this from a gazetteer;
// the shape of the lookup is what matters here, and the test pins that every suburb a clinician
// claims is present, so a new practice in an unlisted suburb fails the suite rather than silently
// ranking last. The two areas are hundreds of kilometres apart on purpose: distances are always
// computed within an area, and a search resolves to whichever point the person names.

import { GOLD_COAST } from "./gold-coast";

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
  // O85: Dr Anu Saxena's second consulting location (founder-supplied 2026-08-20).
  { suburb: "Hornsby", postcode: "2077", lat: -33.7045, lon: 151.0993 },
  { suburb: "Cheltenham", postcode: "2119", lat: -33.7447, lon: 151.0778 },
  { suburb: "Pennant Hills", postcode: "2120", lat: -33.7383, lon: 151.0719 },
  { suburb: "Epping", postcode: "2121", lat: -33.7726, lon: 151.0817 },
  // Focus area 3 — Sydney eastern suburbs, NSW (O34: Bay Health Clinic, Double Bay).
  { suburb: "Double Bay", postcode: "2028", lat: -33.8775, lon: 151.2437 },
  { suburb: "Edgecliff", postcode: "2027", lat: -33.8790, lon: 151.2360 },
  { suburb: "Rose Bay", postcode: "2029", lat: -33.8710, lon: 151.2700 },
  { suburb: "Bondi Junction", postcode: "2022", lat: -33.8912, lon: 151.2469 },
  // O252: Wellness Psychology Clinic is registered in Sydney and sees everybody by video, so the
  // point is the practice's own locality rather than rooms anybody travels to. It earns its place
  // twice over: "Sydney" is the single most likely thing a person in NSW types into the place
  // field, and until now it resolved to nothing at all.
  { suburb: "Sydney", postcode: "2000", lat: -33.8688, lon: 151.2093 },
  // Focus area 2 — the Gold Coast, QLD: every suburb, from `./gold-coast` (O251).
  ...GOLD_COAST,
  // O267 (2026-09-30): "I'm in Gold Coast" and "Brisbane" are what people SAY to the voice finder (a
  // caller of 05:34 AEST said the first and the list ranked as if nowhere), and each is a place the
  // roster consults in: Benowa is on the Gold Coast, Fortitude Valley and Ashgrove are Brisbane. The
  // region resolves to its centre (Southport; Brisbane's GPO), the same rule as "Sydney" above. After
  // the suburb tables, so a bare postcode still resolves to the suburb that holds it.
  { suburb: "Gold Coast", postcode: "4215", lat: -27.9688, lon: 153.4067 },
  { suburb: "Brisbane", postcode: "4000", lat: -27.4703, lon: 153.0258 },
  // Focus area 4 — inner Brisbane, QLD (O252): GOALS Psychology, Fortitude Valley. Brisbane City
  // already sat in the Gold Coast table as a place people type; this is a room somebody visits.
  { suburb: "Fortitude Valley", postcode: "4006", lat: -27.4570, lon: 153.0340 },
  // R15 (2026-09-29): the rooms of the clinicians brought over from revamped-adhd.me. Centroids are
  // OpenStreetMap's, read once through Nominatim and committed here, as gold-coast.ts's are.
  { suburb: "Ashgrove", postcode: "4060", lat: -27.4449, lon: 152.9853 },
  // 2026-10-01: Nurtured Thoughts Psychology, 4 Rakeevan Road (sixteen clinicians from revamped-adhd.me).
  { suburb: "Graceville", postcode: "4075", lat: -27.5226, lon: 152.9822 },
  { suburb: "Bateau Bay", postcode: "2261", lat: -33.3852, lon: 151.4780 },
  { suburb: "Glenbrook", postcode: "2773", lat: -33.7669, lon: 150.6204 },
  { suburb: "Sutherland", postcode: "2232", lat: -34.0310, lon: 151.0580 },
  { suburb: "Jindabyne", postcode: "2627", lat: -36.4150, lon: 148.6230 },
  { suburb: "Perth", postcode: "6000", lat: -31.9523, lon: 115.8613 },
  // 2026-10-01 (edge sweep of the production record): the places people named to the finder and
  // to the voice personas resolved to nothing, so the list ranked as if from nowhere. Each is the
  // locality's centre, to about a kilometre, as the regions above are; distances are said as "about".
  // Greater Sydney.
  { suburb: "Parramatta", postcode: "2150", lat: -33.8150, lon: 151.0011 },
  { suburb: "Penrith", postcode: "2750", lat: -33.7511, lon: 150.6942 },
  { suburb: "Blacktown", postcode: "2148", lat: -33.7710, lon: 150.9063 },
  { suburb: "Liverpool", postcode: "2170", lat: -33.9200, lon: 150.9230 },
  { suburb: "Campbelltown", postcode: "2560", lat: -34.0650, lon: 150.8140 },
  { suburb: "Bankstown", postcode: "2200", lat: -33.9170, lon: 151.0350 },
  { suburb: "Cabramatta", postcode: "2166", lat: -33.8950, lon: 150.9360 },
  { suburb: "Auburn", postcode: "2144", lat: -33.8490, lon: 151.0330 },
  { suburb: "Hurstville", postcode: "2220", lat: -33.9670, lon: 151.1020 },
  { suburb: "Ryde", postcode: "2112", lat: -33.8150, lon: 151.1040 },
  { suburb: "Chatswood", postcode: "2067", lat: -33.7970, lon: 151.1830 },
  { suburb: "Marrickville", postcode: "2204", lat: -33.9110, lon: 151.1550 },
  { suburb: "Newtown", postcode: "2042", lat: -33.8970, lon: 151.1790 },
  { suburb: "Manly", postcode: "2095", lat: -33.7970, lon: 151.2880 },
  { suburb: "Cronulla", postcode: "2230", lat: -34.0550, lon: 151.1530 },
  // NSW and the ACT beyond Sydney.
  { suburb: "Wollongong", postcode: "2500", lat: -34.4250, lon: 150.8930 },
  { suburb: "Newcastle", postcode: "2300", lat: -32.9270, lon: 151.7760 },
  { suburb: "Gosford", postcode: "2250", lat: -33.4250, lon: 151.3420 },
  { suburb: "Katoomba", postcode: "2780", lat: -33.7120, lon: 150.3110 },
  { suburb: "Dubbo", postcode: "2830", lat: -32.2490, lon: 148.6010 },
  { suburb: "Wagga Wagga", postcode: "2650", lat: -35.1080, lon: 147.3600 },
  { suburb: "Canberra", postcode: "2601", lat: -35.2810, lon: 149.1300 },
  // Queensland.
  { suburb: "Toowoomba", postcode: "4350", lat: -27.5600, lon: 151.9510 },
  { suburb: "Ipswich", postcode: "4305", lat: -27.6140, lon: 152.7590 },
  { suburb: "Logan", postcode: "4114", lat: -27.6390, lon: 153.1090 },
  { suburb: "Sunshine Coast", postcode: "4558", lat: -26.6500, lon: 153.0660 },
  { suburb: "Townsville", postcode: "4810", lat: -19.2590, lon: 146.8170 },
  { suburb: "Cairns", postcode: "4870", lat: -16.9200, lon: 145.7710 },
  // The other capitals and Victoria's regional centres.
  { suburb: "Melbourne", postcode: "3000", lat: -37.8140, lon: 144.9630 },
  { suburb: "Geelong", postcode: "3220", lat: -38.1490, lon: 144.3610 },
  { suburb: "Ballarat", postcode: "3350", lat: -37.5620, lon: 143.8500 },
  { suburb: "Adelaide", postcode: "5000", lat: -34.9290, lon: 138.6010 },
  { suburb: "Hobart", postcode: "7000", lat: -42.8820, lon: 147.3270 },
  { suburb: "Darwin", postcode: "0800", lat: -12.4630, lon: 130.8450 },
  { suburb: "Alice Springs", postcode: "0870", lat: -23.6980, lon: 133.8810 },
];

const byName = new Map(SUBURBS.map((s) => [s.suburb.toLowerCase(), s]));
// What people call a city in a hurry ("a GP in bris", 2026-10-02, read no place at all).
const SHORT_NAMES: Record<string, string> = { bris: "Brisbane", brissie: "Brisbane", brisvegas: "Brisbane", syd: "Sydney", "gold coast": "Gold Coast", "the goldie": "Gold Coast", goldie: "Gold Coast" };
for (const [short, suburb] of Object.entries(SHORT_NAMES)) {
  const point = byName.get(suburb.toLowerCase());
  if (point && !byName.has(short)) byName.set(short, point);
}

/** Trailing state names and country, commas and doubled spaces — the noise around a place name. */
const STATE_WORDS = /\b(nsw|qld|vic|wa|sa|tas|nt|act|new south wales|queensland|australia)\b/g;
const normalise = (input: string): string =>
  input.toLowerCase().replace(/,/g, " ").replace(STATE_WORDS, " ").replace(/\s+/g, " ").trim().replace(/^the /, "");

/**
 * Resolve what somebody typed to a point, or null.
 *
 * Exact on the suburb name, or a four-digit postcode anywhere in what was typed — "4220",
 * "Burleigh Heads 4220", "Southport QLD", "Coolangatta, 4225" all resolve; a state name and a
 * comma are noise, not meaning. No fuzzy matching, for W189's reason: a near-miss silently
 * becoming a hit is the product deciding what somebody meant, and here it would send them to the
 * wrong side of the country. What a person half-typed is `suggestPlaces`'s job — a list they
 * choose from, never a guess made for them. An unresolved input is reported as unresolved so the
 * surface can say so.
 *
 * A postcode can cover several suburbs. When the typed text also names one of them, that one;
 * otherwise the first, and the caller shows which (the surface prints "Suburb (postcode)"),
 * because silently picking one of four and not saying is the same guess in a quieter voice.
 */
export function resolvePlace(input: string): SuburbPoint | null {
  const cleaned = normalise(input);
  if (!cleaned) return null;
  const exact = byName.get(cleaned);
  if (exact) return exact;
  const postcode = /(?:^|\s)(\d{4})(?:\s|$)/.exec(cleaned)?.[1];
  if (postcode) {
    const named = SUBURBS.find((s) => s.postcode === postcode && cleaned.includes(s.suburb.toLowerCase()));
    return named ?? SUBURBS.find((s) => s.postcode === postcode) ?? null;
  }
  return null;
}

/**
 * O251: the places a half-typed input could mean, for the profile's suggestion list.
 *
 * Name prefixes first (what somebody is most likely still typing), then names containing the
 * text, then postcode prefixes — at most `limit`, in gazetteer order within each band. Two
 * characters or more; a single letter would list half the coast. The person picks; nothing here
 * resolves anything on its own.
 */
export function suggestPlaces(input: string, limit = 6): SuburbPoint[] {
  const cleaned = normalise(input);
  if (cleaned.length < 2) return [];
  const bands: SuburbPoint[][] = [[], [], []];
  for (const s of SUBURBS) {
    const name = s.suburb.toLowerCase();
    if (name === cleaned) continue;
    if (name.startsWith(cleaned)) bands[0]!.push(s);
    else if (name.includes(cleaned)) bands[1]!.push(s);
    else if (/^\d{2,4}$/.test(cleaned) && s.postcode.startsWith(cleaned)) bands[2]!.push(s);
  }
  return bands.flat().slice(0, limit);
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

/**
 * The place a sentence names after "in", "near", "around", "at", "from", "based in" or "close to":
 * "a GP near Hornsby for an assessment" is Hornsby. Exact names only, longest first ("Bondi
 * Junction" before a shorter one), or a four-digit postcode after such a word; the preposition keeps
 * "my son Logan" and "auburn hair" from being places. "" when the sentence names none.
 */
/** Names that are also people or other things, read as a place only after "in", "near" and the like. */
const BARE_AMBIGUOUS = new Set(["logan", "auburn", "darwin", "liverpool", "newcastle", "cheltenham", "goldie", "syd", "bris"]);

export function placeIn(text: string): string {
  const lower = ` ${text.toLowerCase().replace(/[,.;!?]/g, " ").replace(/\s+/g, " ")} `;
  const lead = "(?:in|on|near|around|at|from|based in|close to|live in|living in)\\s+(?:the\\s+)?";
  // The place said last is where they are now ("I used to live in Parramatta, now in Penrith"); at one
  // position, the longest name ("Bondi Junction" over a shorter one).
  let best: { at: number; length: number; suburb: string } | null = null;
  for (const name of byName.keys()) {
    const pattern = new RegExp(` ${lead}${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} `, "g");
    for (const match of lower.matchAll(pattern)) {
      const at = match.index ?? 0;
      // "I don't live in Sydney" names where they are not.
      if (/\b(not|no longer|don'?t|do not|never|used to)\b(\W+\w+){0,2}\W*$/.test(lower.slice(0, at + 1))) continue;
      if (!best || at > best.at || (at === best.at && name.length > best.length)) best = { at, length: name.length, suburb: byName.get(name)!.suburb };
    }
  }
  if (best) return best.suburb;
  // A place said bare ("gp brisbane", "sydney cbd", 2026-10-02 sweep: read nowhere), unless the name is
  // also a person's or another thing's ("my son Logan", "Liverpool fan").
  // Short requests only: in a story a name is as often somewhere else ("two hours out of Dubbo").
  for (const name of lower.trim().split(" ").length <= 8 ? byName.keys() : []) {
    if (BARE_AMBIGUOUS.has(name)) continue;
    for (const match of lower.matchAll(new RegExp(` ${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?='?s?\\b)`, "g"))) {
      const at = match.index ?? 0;
      const before = lower.slice(0, at + 1);
      if (/\b(not|no longer|don'?t|do not|never|used to|my|named|called|son|daughter|child|kid|partner)\W*$/.test(before) || /\b(not|no longer|don'?t|never|used to)\b(\W+\w+){0,2}\W*$/.test(before)) continue;
      if (!best || at > best.at || (at === best.at && name.length > best.length)) best = { at, length: name.length, suburb: byName.get(name)!.suburb };
    }
  }
  if (best) return best.suburb;
  const postcode = new RegExp(` ${lead}(\\d{4}) `).exec(lower)?.[1];
  return postcode && resolvePlace(postcode) ? postcode : "";
}
