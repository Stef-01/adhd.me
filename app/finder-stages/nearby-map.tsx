"use client";

// O235 (founder-directed): the nearby map, on a real basemap.
//
// O234 drew this as an SVG of rings and dots from the gazetteer, and the founder's verdict was
// that it looked terrible. It did: a map with no streets on it is a diagram, and a person deciding
// whether they can get somewhere reads streets. This is Leaflet (github.com/Leaflet/Leaflet,
// 1.9.4 — the open-source map library behind most of the web's non-Google maps) over the
// OpenStreetMap standard tiles, which is the pairing every open-source "find a clinic" map uses.
//
// WHAT THIS COSTS, SAID PLAINLY. Tiles are images fetched from tile.openstreetmap.org, so once a
// person types a suburb the tile server learns which few square kilometres are being looked at —
// the suburb they typed, at the zoom the map fits. Nothing else leaves: no sentence, no name, no
// device location (the map is centred on the typed suburb's gazetteer point, never on a GPS fix).
// `src/security/headers.ts` admits the host for images alone and says why; the privacy page says
// this in plain words. The map does not render until a place resolves, so a person who types
// nothing sends nothing.
//
// WHAT STAYS FROM O234. One marker per consulting suburb carrying the list positions of the GPs
// who consult there (`stopsFor`), the same numbers the rows wear as keys, and a marker's tap
// finding its row. Positions are keys, never ranks. Telehealth-first GPs are not placed, and the
// caption says so. Leaflet's own zoom control is replaced with two 44px buttons of the app's own,
// because its 30px ones are under the touch floor this tree holds every control to.
//
// LOADED ONLY WHEN NEEDED. Leaflet touches `window` on import, so the results screen imports this
// component with `next/dynamic` and `ssr: false`; the chunk downloads the first time a place
// resolves and never on the front door.

import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { useEffect, useMemo, useRef, useState } from "react";
import { Minus, Plus } from "@phosphor-icons/react";
import { useReducedMotion } from "motion/react";
import { type Clinician, nearestConsultingLocation } from "@/demo/clinicians";
import { stopsFor, type MapStop } from "@/geo/local-map";
import { type SuburbPoint } from "@/geo/suburbs";

/** The one tile host the CSP admits for images. The URL template is Leaflet's standard one. */
export const TILE_URL = "https://tile.openstreetmap.org/{z}/{x}/{y}.png";
export const TILE_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright" rel="noopener">OpenStreetMap</a> contributors';

const POSITIONS_LIST = new Intl.ListFormat("en-AU", { style: "short", type: "conjunction" });

function rowsPhrase(stop: MapStop): string {
  return stop.positions.length === 1 ? `row ${stop.positions[0]}` : `rows ${POSITIONS_LIST.format(stop.positions.map(String))}`;
}

function stopLabel(stop: MapStop): string {
  const km = stop.km < 0.1 ? "in your suburb" : `about ${stop.km < 1 ? stop.km.toFixed(1) : Math.round(stop.km)} km away`;
  return `${stop.suburb}, ${km}: ${rowsPhrase(stop)}`;
}

/**
 * A 44px target with the visible key inside it — the touch floor is the box, not the drawing.
 *
 * O251 (founder-directed, "make the GP faces live too"): the marker is the first GP's portrait
 * when there is one, with the row key as a badge, so the map reads as people rather than pins.
 * Only portraits the roster already carries — a credited stock portrait on an example profile, or
 * one a real clinician supplied — are ever drawn; nothing here generates a face. The `alt` is
 * empty because the marker's own accessible name (`stopLabel`) already says who and where.
 */
function stopIcon(stop: MapStop, image: string | null): L.DivIcon {
  const key = stop.positions.length === 1 ? String(stop.positions[0]) : `${stop.positions[0]}+`;
  const pin = image
    ? `<span class="nearby-marker-pin has-face"><img src="${image}" alt="" width="36" height="36" loading="lazy" decoding="async"><b class="nearby-marker-key">${key}</b></span>`
    : `<span class="nearby-marker-pin">${key}</span>`;
  return L.divIcon({
    className: "nearby-marker",
    html: `${pin}<span class="nearby-marker-label">${stop.suburb}</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
}

function youIcon(suburb: string): L.DivIcon {
  return L.divIcon({
    className: "nearby-marker is-you",
    html: `<span class="nearby-marker-you"></span><span class="nearby-marker-label">${suburb} · you</span>`,
    iconSize: [44, 44],
    iconAnchor: [22, 22],
  });
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
  const reducedMotion = useReducedMotion();
  const host = useRef<HTMLDivElement | null>(null);
  const map = useRef<L.Map | null>(null);
  const [zoom, setZoom] = useState<number | null>(null);

  const located = useMemo(
    () => shown.map((clinician) => (clinician.telehealthFirstAppointment ? null : nearestConsultingLocation(clinician, origin))),
    [shown, origin],
  );
  const stops = useMemo(() => stopsFor(origin, located), [origin, located]);
  const unplaced = located.filter((entry) => entry === null).length;

  // The map itself, once per mount. Zoom control off (ours below), attribution kept (OSM's licence
  // requires it), animations off under reduced motion.
  useEffect(() => {
    if (!host.current || map.current) return;
    const instance = L.map(host.current, {
      zoomControl: false,
      // The attribution is added below without Leaflet's own "Leaflet" prefix: the licence needs
      // OpenStreetMap credited, and one credit reads cleaner than two.
      attributionControl: false,
      scrollWheelZoom: false,
      zoomAnimation: !reducedMotion,
      fadeAnimation: !reducedMotion,
      markerZoomAnimation: !reducedMotion,
    });
    L.control.attribution({ prefix: false }).addTo(instance);
    L.tileLayer(TILE_URL, { attribution: TILE_ATTRIBUTION, maxZoom: 18 }).addTo(instance);
    instance.on("zoomend", () => setZoom(instance.getZoom()));
    map.current = instance;
    return () => {
      instance.remove();
      map.current = null;
    };
  }, [reducedMotion]);

  // The markers and the fit, whenever the origin or the rows change.
  useEffect(() => {
    const instance = map.current;
    if (!instance) return;
    const layer = L.layerGroup().addTo(instance);
    const you = L.latLng(origin.lat, origin.lon);
    const homeStop = stops.find((stop) => stop.km < 0.1);
    if (!homeStop) {
      const youMarker = L.marker(you, { icon: youIcon(origin.suburb), keyboard: false, interactive: false, alt: `${origin.suburb}, where you said you are` });
      youMarker.on("add", () => youMarker.getElement()?.setAttribute("aria-label", `${origin.suburb}, where you said you are`));
      youMarker.addTo(layer);
    }
    const points: L.LatLng[] = [you];
    for (const stop of stops) {
      const at = L.latLng(stop.point.lat, stop.point.lon);
      points.push(at);
      const first = shown[stop.positions[0]! - 1]!;
      const marker = L.marker(at, { icon: stopIcon(stop, first.image), alt: stopLabel(stop), title: stopLabel(stop), riseOnHover: true });
      // Leaflet writes `alt` on image icons only; a div icon is a button with no name until we
      // give it one, and the name is what a screen reader (and the e2e) reads. Set on `add`, the
      // moment the element exists, so a re-add after a zoom animation keeps it too.
      marker.on("add", () => marker.getElement()?.setAttribute("aria-label", stopLabel(stop)));
      marker.addTo(layer);
      marker.on("click", () => onPick(first));
      marker.on("keypress", (event) => {
        const key = (event.originalEvent as KeyboardEvent).key;
        if (key === "Enter" || key === " ") onPick(first);
      });
    }
    const bounds = L.latLngBounds(points).pad(0.25);
    instance.fitBounds(bounds, { animate: false, maxZoom: 14, padding: [24, 24] });
    setZoom(instance.getZoom());
    return () => {
      layer.remove();
    };
  }, [origin, stops, shown, onPick]);

  const zoomBy = (delta: number) => map.current?.setZoom((map.current.getZoom() ?? 13) + delta, { animate: !reducedMotion });

  return (
    <figure className="nearby-map" aria-labelledby="nearby-map-title">
      <p id="nearby-map-title" className="sr-only">
        {`A map centred on ${origin.suburb}, marking ${stops.length} ${stops.length === 1 ? "place" : "places"} where the listed GPs consult.`}
      </p>
      <div className="nearby-map-frame">
        <div ref={host} className="nearby-map-canvas" role="application" aria-label={`Map around ${origin.suburb}`} />
        {/* O247: the caption sits on the map as one small chip, and only when it has something to
            say (a GP not placed); the licence credit is Leaflet's own control, made tiny. */}
        <figcaption>
          <span className="nearby-caption-main">
            {stops.length === 0
              ? `Nobody on this list has rooms we can place near ${origin.suburb}.`
              : `Numbers are the rows below.`}
          </span>
          {unplaced > 0 && (
            <span className="nearby-caption-note">
              {unplaced === 1 ? "1 GP by telehealth first, not placed" : `${unplaced} GPs by telehealth first, not placed`}
            </span>
          )}
        </figcaption>
        <div className="nearby-zoom" role="group" aria-label="Zoom">
          <button type="button" className="nearby-zoom-button" onClick={() => zoomBy(1)} aria-label="Zoom in" disabled={zoom !== null && zoom >= 18}>
            <Plus size={18} weight="bold" aria-hidden="true" />
          </button>
          <button type="button" className="nearby-zoom-button" onClick={() => zoomBy(-1)} aria-label="Zoom out" disabled={zoom !== null && zoom <= 3}>
            <Minus size={18} weight="bold" aria-hidden="true" />
          </button>
        </div>
      </div>
    </figure>
  );
}
