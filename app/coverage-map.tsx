// W215 + repositioning: the coverage diagram — a simplified map of Australia with the two focus
// areas marked, Beecroft in northern Sydney (NSW) and the Gold Coast (QLD).
//
// The map is an illustration, not a survey: the coastline is a hand-simplified outline, drawn only
// so the two dots have somewhere recognisable to sit. What is REAL is the dots — each focus area's
// centroid is projected with the same equirectangular transform as the coastline, so a dot lands
// where the place actually is on the east coast, and adding a suburb to the gazetteer moves the
// centroid it sits at. The precise, drift-proof half stays the suburb LIST in the caption, read
// straight from src/geo/suburbs.ts.
//
// Projection: equirectangular with a cos(latitude) correction on longitude, fit to the box with
// the aspect preserved. Coastline and markers share it, so they cannot disagree about where the
// coast is relative to a marker.

import { SUBURBS, type SuburbPoint } from "@/geo/suburbs";

/**
 * A deliberately coarse Australian coastline, as [lon, lat] vertices going clockwise from Cape
 * York. Enough points to read as Australia — the Gulf of Carpentaria, the south-east bulge, the
 * Great Australian Bight — and no more; this is scenery for the two markers, not a basemap.
 */
const AUSTRALIA: ReadonlyArray<readonly [number, number]> = [
  [142.8, -10.7], [145.8, -15.0], [146.3, -18.8], [149.2, -21.0], [150.8, -23.5],
  [153.1, -25.9], [153.6, -28.2], [152.9, -31.0], [151.3, -33.6], [150.2, -37.3],
  [147.0, -38.6], [144.5, -38.4], [141.6, -38.4], [140.0, -37.0], [138.6, -35.6],
  [137.9, -35.3], [136.8, -35.2], [135.2, -34.7], [131.5, -31.5], [126.0, -32.3],
  [123.5, -34.0], [118.0, -35.1], [115.1, -34.4], [114.9, -30.0], [113.8, -26.0],
  [113.4, -22.0], [116.5, -20.6], [121.0, -19.6], [122.2, -18.1], [126.5, -14.0],
  [129.5, -14.7], [130.6, -12.4], [132.5, -11.2], [135.0, -14.6], [136.5, -12.1],
  [137.0, -15.9], [139.6, -17.4], [141.0, -16.0], [141.5, -12.6],
];

/** Tasmania, as its own small closed shape below the south-east. */
const TASMANIA: ReadonlyArray<readonly [number, number]> = [
  [146.6, -41.1], [148.3, -42.0], [147.8, -43.6], [145.6, -43.2], [144.7, -41.2],
];

const PAD = 7;
const LAT_MID = -27; // continental mid-latitude for the longitude correction
const COS_LAT = Math.cos((LAT_MID * Math.PI) / 180);

const project = ([lon, lat]: readonly [number, number]) => [lon * COS_LAT, -lat] as const;

const allXY = AUSTRALIA.map(project);
const bounds = {
  minX: Math.min(...allXY.map((p) => p[0])), maxX: Math.max(...allXY.map((p) => p[0])),
  minY: Math.min(...allXY.map((p) => p[1])), maxY: Math.max(...allXY.map((p) => p[1])),
};
const spanX = bounds.maxX - bounds.minX;
const spanY = bounds.maxY - bounds.minY;
const scale = (100 - PAD * 2) / Math.max(spanX, spanY);
const offsetX = (100 - spanX * scale) / 2;
const offsetY = (100 - spanY * scale) / 2;

const toXY = (pt: readonly [number, number]) => {
  const [px, py] = project(pt);
  return [(px - bounds.minX) * scale + offsetX, (py - bounds.minY) * scale + offsetY] as const;
};

const pathOf = (ring: ReadonlyArray<readonly [number, number]>) =>
  ring.map((pt, i) => `${i === 0 ? "M" : "L"}${toXY(pt).map((n) => n.toFixed(1)).join(" ")}`).join(" ") + " Z";

const AUSTRALIA_PATH = pathOf(AUSTRALIA);
const TASMANIA_PATH = pathOf(TASMANIA);

/** The two focus areas, split by latitude, each reduced to the centroid the marker sits on. */
const QLD = SUBURBS.filter((s) => s.lat > -30);
const NSW = SUBURBS.filter((s) => s.lat <= -30);
const centroid = (list: readonly SuburbPoint[]): readonly [number, number] => [
  list.reduce((sum, s) => sum + s.lon, 0) / list.length,
  list.reduce((sum, s) => sum + s.lat, 0) / list.length,
];

const MARKERS = [
  { key: "qld", label: "Gold Coast, QLD", suburbs: QLD, at: toXY(centroid(QLD)) },
  { key: "nsw", label: "Beecroft, NSW", suburbs: NSW, at: toXY(centroid(NSW)) },
];

/**
 * @param highlight Suburb name to mark as the reader's own, if they have given one.
 */
export function CoverageMap({ highlight }: { highlight?: string | null }) {
  const marked = highlight?.toLowerCase();

  return (
    <figure className="coverage-map">
      <svg viewBox="0 0 100 100" role="img" aria-labelledby="coverage-map-title" focusable="false">
        <title id="coverage-map-title">{`A map of Australia marking ADHD.ME's two focus areas — Beecroft, NSW and the Gold Coast, QLD, across ${SUBURBS.length} suburbs`}</title>
        <path className="coverage-land" d={AUSTRALIA_PATH} />
        <path className="coverage-land" d={TASMANIA_PATH} />
        {MARKERS.map((m) => {
          const isHere = m.suburbs.some((s) => s.suburb.toLowerCase() === marked);
          return (
            <g key={m.key}>
              {isHere && <circle cx={m.at[0]} cy={m.at[1]} r="4.4" className="coverage-halo" />}
              <circle cx={m.at[0]} cy={m.at[1]} r={isHere ? 2.8 : 2.3} className={isHere ? "coverage-dot is-here" : "coverage-dot"} />
              <text className="coverage-pin-label" x={m.at[0] + 4} y={m.at[1] + 1.4}>{m.label}</text>
            </g>
          );
        })}
      </svg>
      {/* The names are the precise half. A reader scanning for their own suburb reads the list; the
          map gives them where, on the coast, the two areas sit. */}
      <figcaption>
        <span className="coverage-count">Beecroft, NSW &amp; the Gold Coast, QLD</span>
        <span className="coverage-names">
          {SUBURBS.map((s) => s.suburb).join(", ")}
        </span>
      </figcaption>
    </figure>
  );
}
