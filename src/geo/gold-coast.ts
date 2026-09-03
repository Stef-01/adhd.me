// O251 (founder-directed): the Gold Coast, every suburb, for a room of Gold Coast GPs.
//
// SOURCE AND LICENCE. Centroids are OpenStreetMap's, read once through Nominatim on 2026-09-03
// (one request a second, a named user agent, as its usage policy asks) and committed here so no
// visitor's browser ever reaches the geocoder. Data © OpenStreetMap contributors, ODbL 1.0
// (https://www.openstreetmap.org/copyright) — the same attribution the map tiles already carry.
// Within a postcode the namesake suburb is listed first (Burleigh Heads before Miami for 4220,
// Coolangatta before Bilinga for 4225), because a bare postcode resolves to the first and the
// surface says which. Postcodes are Australia Post's, checked against the geocoder's own address record where it had
// one (one disagreement, Upper Coomera, kept at 4209 — the geocoder returned a neighbour's).
//
// WHAT THIS IS NOT. A real gazetteer (every Australian locality, U45) — this is one region done
// completely, plus Tweed Heads across the border and Brisbane City, because a demo audience from
// "all across the Gold Coast" will type any of these and a postcode as often as a name. The
// `suburbs.test.ts` bounding box for the Gold Coast is widened to the local-government area so a
// typo in a coordinate is still caught. Good to a few hundred metres, which is what is claimed.
import { type SuburbPoint } from "./suburbs";

export const GOLD_COAST: readonly (SuburbPoint & { state: "QLD" | "NSW" })[] = [
  { suburb: "Southport", postcode: "4215", state: "QLD", lat: -27.9688, lon: 153.4067 },
  { suburb: "Surfers Paradise", postcode: "4217", state: "QLD", lat: -27.999, lon: 153.424 },
  { suburb: "Main Beach", postcode: "4217", state: "QLD", lat: -27.9788, lon: 153.4271 },
  { suburb: "Broadbeach", postcode: "4218", state: "QLD", lat: -28.0281, lon: 153.4313 },
  { suburb: "Broadbeach Waters", postcode: "4218", state: "QLD", lat: -28.0272, lon: 153.4168 },
  { suburb: "Mermaid Beach", postcode: "4218", state: "QLD", lat: -28.0484, lon: 153.4365 },
  { suburb: "Mermaid Waters", postcode: "4218", state: "QLD", lat: -28.0525, lon: 153.4219 },
  { suburb: "Burleigh Heads", postcode: "4220", state: "QLD", lat: -28.1021, lon: 153.4396 },
  { suburb: "Miami", postcode: "4220", state: "QLD", lat: -28.0692, lon: 153.4351 },
  { suburb: "Burleigh Waters", postcode: "4220", state: "QLD", lat: -28.0848, lon: 153.4353 },
  { suburb: "Palm Beach", postcode: "4221", state: "QLD", lat: -28.1155, lon: 153.4584 },
  { suburb: "Elanora", postcode: "4221", state: "QLD", lat: -28.127, lon: 153.4591 },
  { suburb: "Currumbin", postcode: "4223", state: "QLD", lat: -28.137, lon: 153.4799 },
  { suburb: "Currumbin Waters", postcode: "4223", state: "QLD", lat: -28.1574, lon: 153.461 },
  { suburb: "Currumbin Valley", postcode: "4223", state: "QLD", lat: -28.204, lon: 153.398 },
  { suburb: "Tugun", postcode: "4224", state: "QLD", lat: -28.1488, lon: 153.4904 },
  { suburb: "Coolangatta", postcode: "4225", state: "QLD", lat: -28.1683, lon: 153.5388 },
  { suburb: "Bilinga", postcode: "4225", state: "QLD", lat: -28.1607, lon: 153.5045 },
  { suburb: "Kirra", postcode: "4225", state: "QLD", lat: -28.1677, lon: 153.5295 },
  { suburb: "Tallebudgera", postcode: "4228", state: "QLD", lat: -28.1509, lon: 153.4205 },
  { suburb: "Tallebudgera Valley", postcode: "4228", state: "QLD", lat: -28.1827, lon: 153.3632 },
  { suburb: "Robina", postcode: "4226", state: "QLD", lat: -28.0706, lon: 153.3916 },
  { suburb: "Merrimac", postcode: "4226", state: "QLD", lat: -28.0515, lon: 153.374 },
  { suburb: "Clear Island Waters", postcode: "4226", state: "QLD", lat: -28.0425, lon: 153.3975 },
  { suburb: "Varsity Lakes", postcode: "4227", state: "QLD", lat: -28.0875, lon: 153.4127 },
  { suburb: "Reedy Creek", postcode: "4227", state: "QLD", lat: -28.1101, lon: 153.3957 },
  { suburb: "Mudgeeraba", postcode: "4213", state: "QLD", lat: -28.0831, lon: 153.3585 },
  { suburb: "Worongary", postcode: "4213", state: "QLD", lat: -28.0361, lon: 153.3391 },
  { suburb: "Bonogin", postcode: "4213", state: "QLD", lat: -28.1448, lon: 153.3554 },
  { suburb: "Tallai", postcode: "4213", state: "QLD", lat: -28.0624, lon: 153.3266 },
  { suburb: "Springbrook", postcode: "4213", state: "QLD", lat: -28.1857, lon: 153.2716 },
  { suburb: "Nerang", postcode: "4211", state: "QLD", lat: -27.9897, lon: 153.3366 },
  { suburb: "Carrara", postcode: "4211", state: "QLD", lat: -28.0208, lon: 153.3684 },
  { suburb: "Highland Park", postcode: "4211", state: "QLD", lat: -28.0115, lon: 153.325 },
  { suburb: "Pacific Pines", postcode: "4211", state: "QLD", lat: -27.9382, lon: 153.3093 },
  { suburb: "Gilston", postcode: "4211", state: "QLD", lat: -28.0288, lon: 153.3129 },
  { suburb: "Advancetown", postcode: "4211", state: "QLD", lat: -28.0255, lon: 153.2829 },
  { suburb: "Gaven", postcode: "4211", state: "QLD", lat: -27.9601, lon: 153.3387 },
  { suburb: "Helensvale", postcode: "4212", state: "QLD", lat: -27.9053, lon: 153.3325 },
  { suburb: "Hope Island", postcode: "4212", state: "QLD", lat: -27.8651, lon: 153.3577 },
  { suburb: "Sanctuary Cove", postcode: "4212", state: "QLD", lat: -27.8576, lon: 153.3687 },
  { suburb: "Oxenford", postcode: "4210", state: "QLD", lat: -27.9015, lon: 153.2998 },
  { suburb: "Maudsland", postcode: "4210", state: "QLD", lat: -27.9281, lon: 153.2823 },
  { suburb: "Guanaba", postcode: "4210", state: "QLD", lat: -27.9377, lon: 153.2403 },
  { suburb: "Wongawallan", postcode: "4210", state: "QLD", lat: -27.8886, lon: 153.2358 },
  { suburb: "Coomera", postcode: "4209", state: "QLD", lat: -27.8565, lon: 153.3204 },
  { suburb: "Upper Coomera", postcode: "4209", state: "QLD", lat: -27.853, lon: 153.2983 },
  { suburb: "Pimpama", postcode: "4209", state: "QLD", lat: -27.8162, lon: 153.2924 },
  { suburb: "Willow Vale", postcode: "4209", state: "QLD", lat: -27.8417, lon: 153.2686 },
  { suburb: "Ormeau", postcode: "4208", state: "QLD", lat: -27.7748, lon: 153.2521 },
  { suburb: "Ormeau Hills", postcode: "4208", state: "QLD", lat: -27.8006, lon: 153.2337 },
  { suburb: "Jacobs Well", postcode: "4208", state: "QLD", lat: -27.782, lon: 153.3549 },
  { suburb: "Yatala", postcode: "4207", state: "QLD", lat: -27.7353, lon: 153.2252 },
  { suburb: "Stapylton", postcode: "4207", state: "QLD", lat: -27.7315, lon: 153.246 },
  { suburb: "Runaway Bay", postcode: "4216", state: "QLD", lat: -27.9122, lon: 153.403 },
  { suburb: "Paradise Point", postcode: "4216", state: "QLD", lat: -27.8863, lon: 153.3957 },
  { suburb: "Biggera Waters", postcode: "4216", state: "QLD", lat: -27.9272, lon: 153.3984 },
  { suburb: "Coombabah", postcode: "4216", state: "QLD", lat: -27.9058, lon: 153.3723 },
  { suburb: "Hollywell", postcode: "4216", state: "QLD", lat: -27.8957, lon: 153.3991 },
  { suburb: "Labrador", postcode: "4215", state: "QLD", lat: -27.9428, lon: 153.3987 },
  { suburb: "Arundel", postcode: "4214", state: "QLD", lat: -27.9361, lon: 153.3654 },
  { suburb: "Parkwood", postcode: "4214", state: "QLD", lat: -27.9512, lon: 153.3611 },
  { suburb: "Ashmore", postcode: "4214", state: "QLD", lat: -27.9909, lon: 153.3771 },
  { suburb: "Molendinar", postcode: "4214", state: "QLD", lat: -27.9746, lon: 153.3754 },
  { suburb: "Benowa", postcode: "4217", state: "QLD", lat: -28.0042, lon: 153.3835 },
  { suburb: "Bundall", postcode: "4217", state: "QLD", lat: -28.0113, lon: 153.4081 },
  { suburb: "Chevron Island", postcode: "4217", state: "QLD", lat: -27.9975, lon: 153.4198 },
  { suburb: "Isle of Capri", postcode: "4217", state: "QLD", lat: -28.0101, lon: 153.4237 },
  { suburb: "Tamborine Mountain", postcode: "4272", state: "QLD", lat: -27.9489, lon: 153.1929 },
  { suburb: "Tweed Heads", postcode: "2485", state: "NSW", lat: -28.1787, lon: 153.537 },
  { suburb: "Brisbane City", postcode: "4000", state: "QLD", lat: -27.4703, lon: 153.0258 },
];
