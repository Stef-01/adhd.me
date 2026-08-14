// W215 + repositioning: the coverage diagram, drawn to show the GEOGRAPHICAL SCALE of the network.
//
// The two focus areas — Beecroft in northern Sydney (NSW) and the Gold Coast (QLD) — are about
// 680 km apart. At true scale each area collapses to a single speck, so a literal projection of all
// the points reads as two dots and says nothing. This diagram states the thing it is actually
// about: two labelled area-nodes at their real relative latitude (QLD north, NSW south), a
// dimension line carrying the REAL great-circle distance between their centroids, and each area's
// suburbs shown as a stylised ring around its node so "several places here" is legible.
//
// The precise, drift-proof half stays the suburb LIST in the caption — read straight from the
// gazetteer, so adding a suburb still moves a centroid, lengthens the list, and adds a dot to a
// ring. What is stylised is only the WITHIN-area arrangement, which at 680 km has no visible scale
// of its own; the BETWEEN-area distance is the real figure and is computed, not drawn by eye.

import { SUBURBS, distanceKm, type SuburbPoint } from "@/geo/suburbs";

/** The two focus areas, split by latitude: the Gold Coast (QLD) is north, Beecroft (NSW) south. */
const QLD = SUBURBS.filter((s) => s.lat > -30);
const NSW = SUBURBS.filter((s) => s.lat <= -30);

const centroid = (list: readonly SuburbPoint[]): SuburbPoint => ({
  suburb: "",
  postcode: "0000",
  lat: list.reduce((sum, s) => sum + s.lat, 0) / list.length,
  lon: list.reduce((sum, s) => sum + s.lon, 0) / list.length,
});

/** The real distance between the two areas, to the nearest 10 km — the scale this diagram shows. */
const SPAN_KM = Math.round(distanceKm(centroid(NSW), centroid(QLD)) / 10) * 10;

const RING = 6;
/** Lay an area's suburbs out as a ring around its node — stylised, since true scale is a point. */
const ringDots = (list: readonly SuburbPoint[], cx: number, cy: number) =>
  list.map((s, i) => {
    const angle = -Math.PI / 2 + (i / list.length) * Math.PI * 2;
    return { suburb: s.suburb, x: cx + RING * Math.cos(angle), y: cy + RING * Math.sin(angle) };
  });

const AREAS = [
  { key: "qld", label: "The Gold Coast · QLD", cx: 50, cy: 22, labelY: 8, dots: ringDots(QLD, 50, 22) },
  { key: "nsw", label: "Beecroft · NSW", cx: 50, cy: 78, labelY: 97, dots: ringDots(NSW, 50, 78) },
];

/**
 * @param highlight Suburb name to mark as the reader's own, if they have given one.
 */
export function CoverageMap({ highlight }: { highlight?: string | null }) {
  const marked = highlight?.toLowerCase();

  return (
    <figure className="coverage-map">
      <svg viewBox="0 0 100 100" role="img" aria-labelledby="coverage-map-title" focusable="false">
        <title id="coverage-map-title">{`ADHD.ME covers two focus areas about ${SPAN_KM} km apart — Beecroft, NSW and the Gold Coast, QLD, across ${SUBURBS.length} suburbs`}</title>

        {/* The scale between the two areas, broken for its label and arrowed toward each one. */}
        <line className="coverage-scale-line" x1="50" y1="34" x2="50" y2="45.5" />
        <line className="coverage-scale-line" x1="50" y1="54.5" x2="50" y2="66" />
        <polyline className="coverage-scale-tick" points="47.5,36.5 50,33.5 52.5,36.5" />
        <polyline className="coverage-scale-tick" points="47.5,63.5 50,66.5 52.5,63.5" />
        <text className="coverage-scale-label" x="50" y="51.5" textAnchor="middle">{`≈ ${SPAN_KM} km`}</text>

        {AREAS.map((area) => (
          <g key={area.key}>
            <text className="coverage-node-label" x={area.cx} y={area.labelY} textAnchor="middle">{area.label}</text>
            {area.dots.map((d) => {
              const isHere = marked === d.suburb.toLowerCase();
              return (
                <g key={d.suburb}>
                  {isHere && <circle cx={d.x} cy={d.y} r="3.4" className="coverage-halo" />}
                  <circle cx={d.x} cy={d.y} r={isHere ? 2.4 : 1.9} className={isHere ? "coverage-dot is-here" : "coverage-dot"} />
                </g>
              );
            })}
          </g>
        ))}
      </svg>
      {/* The names are the precise half. A reader scanning for their own suburb reads the list; the
          diagram gives them the shape and the scale. */}
      <figcaption>
        <span className="coverage-count">Beecroft, NSW &amp; the Gold Coast, QLD · ≈{SPAN_KM} km apart</span>
        <span className="coverage-names">
          {SUBURBS.map((s) => s.suburb).join(", ")}
        </span>
      </figcaption>
    </figure>
  );
}
