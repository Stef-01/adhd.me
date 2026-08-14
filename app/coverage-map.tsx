// W215: the covered suburbs, drawn from the same coordinates the matcher uses.
//
// WHY THIS AND NOT A PHOTOGRAPH. The page needed a visual and the obvious reaches were all wrong
// for it: stock photography of a consulting room implies a practice this product does not run,
// generated faces are people who do not exist on a page about real clinicians, and an abstract
// gradient is decoration pretending to be information. This draws the ACTUAL gazetteer in
// src/geo/suburbs.ts, so it answers the question a visitor has at that moment - is my suburb in
// this? - and it cannot drift from the matcher, because adding a suburb there adds a dot here.
//
// IT IS A DIAGRAM, NOT A MAP. There is no basemap, no roads, no coastline: just the fourteen
// points, projected. Drawing a real map would raise the question of whose map, at what licence,
// and would imply a precision the centroids do not have. The shape that emerges is the actual
// spatial arrangement of the network, which is the only geographic claim being made.
//
// The projection is plate carree with a cos(latitude) correction on x. At this scale - about
// 20km across - the difference from a proper projection is smaller than a dot.

import { SUBURBS } from "@/geo/suburbs";

const PAD = 8;
const LAT_MID = SUBURBS.reduce((sum, s) => sum + s.lat, 0) / SUBURBS.length;
const COS_LAT = Math.cos((LAT_MID * Math.PI) / 180);

const xs = SUBURBS.map((s) => s.lon * COS_LAT);
const ys = SUBURBS.map((s) => -s.lat);
const bounds = {
  minX: Math.min(...xs), maxX: Math.max(...xs),
  minY: Math.min(...ys), maxY: Math.max(...ys),
};
const spanX = bounds.maxX - bounds.minX;
const spanY = bounds.maxY - bounds.minY;

/** Fit to a 100x100 box, preserving aspect so the arrangement is not stretched. */
const scale = (100 - PAD * 2) / Math.max(spanX, spanY);
const offsetX = (100 - spanX * scale) / 2;
const offsetY = (100 - spanY * scale) / 2;

const points = SUBURBS.map((s) => ({
  suburb: s.suburb,
  postcode: s.postcode,
  x: (s.lon * COS_LAT - bounds.minX) * scale + offsetX,
  y: (-s.lat - bounds.minY) * scale + offsetY,
}));

/**
 * @param highlight Suburb name to mark as the reader's own, if they have given one.
 */
export function CoverageMap({ highlight }: { highlight?: string | null }) {
  const marked = highlight?.toLowerCase();

  return (
    <figure className="coverage-map">
      <svg viewBox="0 0 100 100" role="img" aria-labelledby="coverage-map-title" focusable="false">
        <title id="coverage-map-title">{`The ${SUBURBS.length} Western Sydney suburbs ADHD.ME currently covers`}</title>
        {points.map((p) => {
          const isHere = marked === p.suburb.toLowerCase();
          return (
            <g key={p.suburb}>
              {isHere && <circle cx={p.x} cy={p.y} r="4.6" className="coverage-halo" />}
              <circle cx={p.x} cy={p.y} r={isHere ? 2.6 : 1.9} className={isHere ? "coverage-dot is-here" : "coverage-dot"} />
            </g>
          );
        })}
      </svg>
      {/* The names are the useful half. A reader scanning for their own suburb reads the list, not
          the dots; the dots are what make the network legible as a shape. */}
      <figcaption>
        <span className="coverage-count">{SUBURBS.length} suburbs</span>
        <span className="coverage-names">
          {SUBURBS.map((s) => s.suburb).join(", ")}
        </span>
      </figcaption>
    </figure>
  );
}
