"use client";

// Your map (founder, 2026-09-11): the nine wellness dimensions as a shape, in the judge-screen
// shape of a Pokémon IV chart — a frame, rings for the rungs, a filled polygon for where you are,
// and A WORD on every axis rather than a number.
//
// THE WORD IS THE WHOLE POINT, and `src/wellness/map.ts`'s header says why: the source material
// does not show the number either, and this app has never scored a person. Every rung here is an
// act somebody took. The shape therefore reads as "what I have built", the flat edges read as
// "nothing has asked me about this", and playing a run moves it — which is what was asked for.
//
// THE CHART IS AN IMAGE AND THE CHIPS ARE THE CONTROLS. A nine-pointed polygon cannot carry nine
// readable labels on a 390px screen, and vertices are not 44px targets. So the SVG is decorative
// (`aria-hidden`) and the nine chips under it are the real, sized, focusable controls, each
// carrying its dimension and its word — which is also the text equivalent a screen reader gets.
// One dimension is open at a time, and it opens on the one furthest out: the first thing the map
// says to you is what you have built, not what you have not.

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { NWIA_LABELS, NWIA_MEANINGS, NWIA_NAME, NWIA_URL, type NwiaDimension } from "@/wellness/nwia";
import { NOT_TAUGHT, RUNG_BECAUSE, RUNG_LABEL, personalMap, strongest } from "@/wellness/map";
import type { Profession } from "@/support/professions";
import { readFilters, writeFilters } from "@/finder/filters";
import { readProfile } from "@/lives/profile";
import { track } from "@/model/events";
import { LifeHeader } from "./life-shell";
import { useModel } from "./use-model";

/** The geometry. One place, so the ring, the spokes, the polygon and the dots cannot disagree. */
const R = 104;
const CENTRE = 120;
const SIZE = 240;
/** The four rungs above "not yet", as rings — the ladder drawn, the way the judge screen draws it. */
const RINGS = [0.34, 0.56, 0.78, 1];

function point(index: number, count: number, reach: number): [number, number] {
  const angle = (Math.PI * 2 * index) / count - Math.PI / 2;
  return [CENTRE + Math.cos(angle) * R * reach, CENTRE + Math.sin(angle) * R * reach];
}
const ring = (count: number, reach: number) =>
  Array.from({ length: count }, (_, i) => point(i, count, reach).map((n) => n.toFixed(1)).join(",")).join(" ");

export function MyMap() {
  const { record } = useModel();
  const profile = useMemo(() => { try { return readProfile(window.localStorage); } catch { return null; } }, []);
  const points = useMemo(() => personalMap(record, profile), [record, profile]);
  const [open, setOpen] = useState<NwiaDimension | null>(null);
  const shown = points.find((p) => p.dimension === open) ?? strongest(points);
  const count = points.length;

  const seeProviders = (kinds: readonly Profession[]) => {
    try {
      const held = readFilters(window.localStorage);
      // ALL of them, not the first: this dimension's kinds ARE the holistic answer for this part
      // of a life, and the results screen's own band of kinds is what chooses between them.
      writeFilters(window.localStorage, { ...held, professions: [...kinds] });
    } catch {
      // The finder still opens; it simply is not narrowed.
    }
    track("PROVIDER_CARD_VIEWED", { profession: kinds[0] ?? "gp" });
  };

  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs my-map-screen">
      <LifeHeader />
      <header className="life-head">
        <h1>Your map.</h1>
      </header>

      <svg className="map-chart" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
        {RINGS.map((reach) => (
          <polygon key={reach} className="map-ring" points={ring(count, reach)} />
        ))}
        {points.map((p, i) => {
          const [x, y] = point(i, count, 1);
          return <line key={p.dimension} className="map-spoke" x1={CENTRE} y1={CENTRE} x2={x} y2={y} />;
        })}
        <polygon className="map-you" points={points.map((p, i) => point(i, count, p.reach).map((n) => n.toFixed(1)).join(",")).join(" ")} />
        {points.map((p, i) => {
          const [x, y] = point(i, count, p.reach);
          return <circle key={p.dimension} className={`map-dot${p.dimension === shown.dimension ? " is-open" : ""}`} cx={x} cy={y} r={p.dimension === shown.dimension ? 5.5 : 3.5} />;
        })}
      </svg>

      <ul className="map-axes" aria-label="The nine dimensions">
        {points.map((p) => (
          <li key={p.dimension}>
            <button
              type="button"
              className={`map-axis${p.dimension === shown.dimension ? " is-open" : ""}`}
              aria-pressed={p.dimension === shown.dimension}
              onClick={() => setOpen(p.dimension)}
            >
              <strong>{NWIA_LABELS[p.dimension]}</strong>
              <span>{RUNG_LABEL[p.rung]}</span>
            </button>
          </li>
        ))}
      </ul>

      <section className="map-open" aria-live="polite" aria-labelledby="map-open-title">
        <h2 id="map-open-title">{NWIA_LABELS[shown.dimension]}</h2>
        <p>{NWIA_MEANINGS[shown.dimension]}</p>
        <p className="map-because">{RUNG_BECAUSE[shown.rung]}</p>
        {shown.strength && <p className="map-strength"><em>What works here:</em> {shown.strength}.</p>}
        {shown.kinds.length > 0 && (
          <Link className="learn-secondary" href="/" onClick={() => seeProviders(shown.kinds)}>
            Who helps here <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        )}
        {/* An axis nothing teaches says so, in the app's own words rather than as a flat edge
            somebody reads as a verdict about themselves. */}
        {NOT_TAUGHT[shown.dimension] && <p className="map-because">No run is about this one yet.</p>}
      </section>

      {/* The attribution, and nothing else. "Five of nine touched" stood here and was cut: the
          shape says it, and a count of a person is the one thing this page is built not to be. */}
      <p className="map-foot">
        Dimensions from the <a href={NWIA_URL} rel="noreferrer noopener" target="_blank">{NWIA_NAME}</a>
      </p>
    </main>
  );
}
