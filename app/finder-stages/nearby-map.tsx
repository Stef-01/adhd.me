"use client";

// O234 (founder-directed): the nearby map on the results screen.
//
// One small instrument, drawn from the gazetteer: the person's own suburb at the centre, distance
// rings at their true radius, and one stop per consulting suburb carrying the list positions of
// the GPs who consult there. No tile host, no road, no coordinate leaving the device — the
// reasoning is in `src/geo/local-map.ts`. What a stop DOES is the thing a map on a list is for:
// tapping it brings the first of its rows into view and marks it, so "the one near Hornsby" and
// "row 3" become the same object.
//
// The positions on the pins are the LIST'S positions, not a rank — the same numbers the rows now
// carry as keys while the map is showing. A key is a way to find a row; it says nothing about
// how good the row is, which is the honesty line the taste law draws.

import { type Clinician, nearestConsultingLocation } from "@/demo/clinicians";
import { layoutLocalMap, stopsFor, type PlacedStop } from "@/geo/local-map";
import { type SuburbPoint } from "@/geo/suburbs";

const POSITIONS_LIST = new Intl.ListFormat("en-AU", { style: "short", type: "conjunction" });
const SIN45 = Math.SQRT1_2;

/** A stop in the person's own suburb sits on the origin; it is drawn AS the origin, not over it. */
const AT_ORIGIN_KM = 0.1;

function rowsPhrase(stop: PlacedStop): string {
  return stop.positions.length === 1 ? `row ${stop.positions[0]}` : `rows ${POSITIONS_LIST.format(stop.positions.map(String))}`;
}

function stopLabel(stop: PlacedStop): string {
  const km = stop.km < AT_ORIGIN_KM ? "in your suburb" : `about ${stop.km < 1 ? stop.km.toFixed(1) : Math.round(stop.km)} km away`;
  return `${stop.suburb}, ${km}: ${rowsPhrase(stop)}`;
}

export function NearbyMap({
  origin,
  shown,
  onPick,
}: {
  origin: SuburbPoint;
  /** The rows on screen, in list order — positions on the map are indices into this. */
  shown: readonly Clinician[];
  /** Called with the first clinician at a stop, in list order. */
  onPick: (clinician: Clinician) => void;
}) {
  const located = shown.map((clinician) =>
    clinician.telehealthFirstAppointment ? null : nearestConsultingLocation(clinician, origin),
  );
  const stops = stopsFor(origin, located);
  const unplaced = located.filter((entry) => entry === null).length;
  const layout = layoutLocalMap(origin, stops);
  const far = layout.rings.at(-1);
  // Ring labels sit on whichever diagonal has the fewest stops near it, so a label never lands
  // on a pin: the four diagonals are scored by how many stops fall within 30 degrees of each.
  const diagonals = [
    { dx: 1, dy: -1 }, { dx: -1, dy: -1 }, { dx: 1, dy: 1 }, { dx: -1, dy: 1 },
  ].map((d) => ({
    ...d,
    crowd: layout.stops.filter((stop) => {
      const ax = stop.x - layout.origin.x;
      const ay = stop.y - layout.origin.y;
      const len = Math.hypot(ax, ay);
      if (len < 1e-6) return false;
      const cos = (ax * d.dx + ay * d.dy) / (len * Math.SQRT2);
      return cos > Math.cos(Math.PI / 6);
    }).length,
  }));
  const labelDiagonal = diagonals.reduce((best, d) => (d.crowd < best.crowd ? d : best));
  const homeStop = layout.stops.find((stop) => stop.km < AT_ORIGIN_KM);

  return (
    <figure className="nearby-map" aria-labelledby="nearby-map-title">
      <svg viewBox={`0 0 ${layout.size} ${layout.size}`} role="img" aria-labelledby="nearby-map-title" focusable="false">
        <title id="nearby-map-title">
          {`A map centred on ${origin.suburb}, marking ${stops.length} ${stops.length === 1 ? "place" : "places"} where the listed GPs consult, with distance rings.`}
        </title>
        {/* Rings, labelled on the north-east diagonal — off the axis a pin due north would sit on. */}
        {layout.rings.map((ring) => (
          <g key={ring.km}>
            <circle className="nearby-ring" cx={layout.origin.x} cy={layout.origin.y} r={ring.r} />
            <text
              className="nearby-ring-label"
              x={layout.origin.x + labelDiagonal.dx * (ring.r * SIN45 + 0.8)}
              y={layout.origin.y + labelDiagonal.dy * (ring.r * SIN45 + 0.8) + (labelDiagonal.dy > 0 ? 2.4 : 0)}
              textAnchor={labelDiagonal.dx > 0 ? "start" : "end"}
            >
              {`${ring.km} km`}
            </text>
          </g>
        ))}
        <g className="nearby-origin">
          <circle className="nearby-origin-halo" cx={layout.origin.x} cy={layout.origin.y} r={homeStop ? 6.4 : 5.2} />
          {!homeStop && (
            <>
              <circle className="nearby-origin-dot" cx={layout.origin.x} cy={layout.origin.y} r={2.4} />
              <text className="nearby-origin-label" x={layout.origin.x} y={layout.origin.y + 9.6} textAnchor="middle">
                You
              </text>
            </>
          )}
        </g>
        {layout.stops.map((stop) => {
          const first = shown[stop.positions[0]! - 1]!;
          const several = stop.positions.length > 1;
          // The label reads OUTWARD from the origin — a pin east of you is labelled to its east —
          // so a long name never runs back across the centre; it flips only when the box edge
          // would cut it (about 1.1 box units per character at the label face's size — the box is
          // 100 units across and the face renders near 5px in a 280px map).
          const width = Math.max(stop.suburb.length, several ? rowsPhrase(stop).length : 0) * 1.1 + 8;
          const outward = stop.x >= layout.origin.x ? "right" : "left";
          const side = outward === "right"
            ? (stop.x + width <= layout.size ? "right" : "left")
            : (stop.x - width >= 0 ? "left" : "right");
          const anchor = side === "right" ? "start" : "end";
          const dx = side === "right" ? 6 : -6;
          const isHome = stop === homeStop;
          return (
            // A real control inside the SVG: focusable, labelled, and 44px of hit area through the
            // transparent ring under the pin (the drawn pin is small; the target is not).
            <g
              key={stop.suburb}
              className="nearby-stop"
              role="button"
              tabIndex={0}
              aria-label={stopLabel(stop)}
              onClick={() => onPick(first)}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  onPick(first);
                }
              }}
            >
              <circle className="nearby-stop-hit" cx={stop.x} cy={stop.y} r={7} />
              <circle className="nearby-stop-pin" cx={stop.x} cy={stop.y} r={4} />
              <text className="nearby-stop-key" x={stop.x} y={stop.y + 1.05} textAnchor="middle">
                {stop.positions[0]}
              </text>
              <text className="nearby-stop-label" x={stop.x + dx} y={stop.y + (several ? -0.6 : 1.05)} textAnchor={anchor}>
                {isHome ? `${stop.suburb} · you` : stop.suburb}
              </text>
              {several && (
                <text className="nearby-stop-rows" x={stop.x + dx} y={stop.y + 3.2} textAnchor={anchor}>
                  {rowsPhrase(stop)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <figcaption>
        <span className="nearby-caption-main">
          {stops.length === 0
            ? `Nobody on this list has rooms we can place near ${origin.suburb}.`
            : `Straight-line distances from ${origin.suburb}${far ? `, out to ${far.km} km` : ""}. Numbers are the rows below.`}
        </span>
        {unplaced > 0 && (
          <span className="nearby-caption-note">
            {unplaced === 1 ? "1 GP sees people by telehealth first and is not placed." : `${unplaced} GPs see people by telehealth first and are not placed.`}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
