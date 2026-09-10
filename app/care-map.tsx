"use client";

// The care map: the eco-bio-psychosocial model (PRD §25) as a screen a person can click into.
//
// Four regions — brain, body, environment, people — drawn as quadrants around a centre, with one
// node per subdomain. Tapping a node says what it means, which modules teach it, and — when the
// device holds signals — how it shows up for this person. The map is both a teaching object
// (the GP interview's point that ADHD care has to see all four layers) and a personal one: nodes
// the person's own record points at are ringed in the accent, so the map answers "where in my
// life does this sit?" without a chart.
//
// The SVG is a list of real buttons: every node is focusable, labelled, and works by keyboard.

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight } from "@phosphor-icons/react";
import { INTERACTIVE_MODULES } from "@/learn/interactive";
import { LAYER_BLURBS, LAYER_LABELS, LAYERS, SUBDOMAINS, subdomainsOf, type Layer, type Subdomain } from "@/model/layers";
import { deriveNeeds } from "@/model/needs";
import { track } from "@/model/events";
import { useModel } from "./use-model";
import { NWIA_LABELS, NWIA_MEANINGS, NWIA_NAME, NWIA_PARADIGM, NWIA_URL, nwiaFor } from "@/wellness/nwia";

const COLOURS: Record<Layer, { fill: string; ink: string }> = {
  brain: { fill: "#dfe5f7", ink: "#334679" },
  body: { fill: "#fbe4d3", ink: "#a14f19" },
  environment: { fill: "#dcefe4", ink: "#0e6b3a" },
  people: { fill: "#ebe0f7", ink: "#5b3a8a" },
};

/** Where each layer's wedge sits, in degrees from the top, clockwise. */
const WEDGE: Record<Layer, [number, number]> = { brain: [-90, 0], body: [0, 90], environment: [90, 180], people: [180, 270] };

const CX = 220;
const CY = 220;
const R_OUT = 200;
const R_IN = 62;

function polar(deg: number, r: number): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [CX + Math.cos(rad) * r, CY + Math.sin(rad) * r];
}

function wedgePath(layer: Layer): string {
  const [a, b] = WEDGE[layer];
  const [x1, y1] = polar(a, R_OUT);
  const [x2, y2] = polar(b, R_OUT);
  const [x3, y3] = polar(b, R_IN);
  const [x4, y4] = polar(a, R_IN);
  return `M${x1} ${y1}A${R_OUT} ${R_OUT} 0 0 1 ${x2} ${y2}L${x3} ${y3}A${R_IN} ${R_IN} 0 0 0 ${x4} ${y4}Z`;
}

/** Node positions: each layer's subdomains spread across its wedge on two rings, so labels never collide. */
function nodePositions(): Map<Subdomain, { x: number; y: number; layer: Layer }> {
  const out = new Map<Subdomain, { x: number; y: number; layer: Layer }>();
  for (const layer of LAYERS) {
    const subs = subdomainsOf(layer);
    const [a, b] = WEDGE[layer];
    subs.forEach((s, i) => {
      // Two rings, and the inner one kept off the wedge edges so neighbours across a boundary never touch.
      const ring = i % 2 === 0 ? 166 : 116;
      const t = (i + 0.5) / subs.length;
      const inset = i % 2 === 0 ? 0 : 6;
      const deg = a + inset + (b - a - 2 * inset) * t;
      const [x, y] = polar(deg, ring);
      out.set(s.id, { x, y, layer });
    });
  }
  return out;
}

export function CareMap() {
  const { record } = useModel();
  const [selected, setSelected] = useState<Subdomain | null>(null);
  const positions = useMemo(nodePositions, []);
  const needs = record ? deriveNeeds(record) : [];
  const signal = new Map<Subdomain, string>();
  for (const n of needs) {
    signal.set(n.subdomain, `${n.label}${n.functionalCost ? ` — you put the cost at ${n.functionalCost}/10` : ""}.`);
    for (const c of n.contributors) if (!signal.has(c.subdomain)) signal.set(c.subdomain, `${c.note}.`);
  }
  const entry = selected ? SUBDOMAINS.find((s) => s.id === selected) : null;
  const teaching = selected ? INTERACTIVE_MODULES.filter((m) => m.targets.includes(selected)) : [];

  return (
    <div className="care-map">
      <svg className="care-map-svg" viewBox="0 0 440 440" role="group" aria-label="The care map: brain, body, environment and people, with a node for each part of life ADHD touches">
        {LAYERS.map((layer) => {
          const [a, b] = WEDGE[layer];
          // The label sits on the wedge's outer arc, following it, so a long word never runs off the disc.
          const [x1, y1] = polar(a + 4, R_OUT - 12);
          const [x2, y2] = polar(b - 4, R_OUT - 12);
          const arcId = `care-map-arc-${layer}`;
          return (
            <g key={layer}>
              <path d={wedgePath(layer)} fill={COLOURS[layer].fill} stroke="#fff" strokeWidth="4" />
              <defs><path id={arcId} d={`M${x1} ${y1}A${R_OUT - 12} ${R_OUT - 12} 0 0 1 ${x2} ${y2}`} /></defs>
              <text fontSize="11" fontWeight="800" letterSpacing="1.5" fill={COLOURS[layer].ink}>
                <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">{LAYER_LABELS[layer].toUpperCase()}</textPath>
              </text>
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r={R_IN - 6} fill="#fff" />
        <text x={CX} y={CY - 4} textAnchor="middle" fontSize="13" fontWeight="700" fill="#221a16">You</text>
        <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10" fill="#7a655d">{needs.length ? `${needs.length} in the picture` : "nothing yet"}</text>
        {SUBDOMAINS.map((s) => {
          const p = positions.get(s.id)!;
          const has = signal.has(s.id);
          return (
            <g
              key={s.id}
              className={`care-map-node${has ? " is-signal" : ""}`}
              role="button"
              tabIndex={0}
              aria-label={`${s.label} (${LAYER_LABELS[s.layer]})${has ? ", in your picture" : ""}`}
              aria-pressed={selected === s.id}
              onClick={() => { setSelected(s.id); track("CARE_MAP_OPENED", { node: s.id }); }}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); setSelected(s.id); } }}
            >
              <circle cx={p.x} cy={p.y} r={has ? 21 : 19} fill="#fff" stroke={COLOURS[p.layer].ink} strokeWidth={has ? 3 : 1.5} />
              <text x={p.x} y={p.y + 3.5} textAnchor="middle" fontSize="9.5" fontWeight="700" fill={COLOURS[p.layer].ink}>{s.label.length > 9 ? s.label.split(" ")[0] : s.label}</text>
            </g>
          );
        })}
      </svg>

      <ul className="care-map-legend" aria-label="Layers">
        {LAYERS.map((layer) => <li key={layer}><span className="layer-pill" data-layer={layer}>{LAYER_LABELS[layer]}</span></li>)}
      </ul>

      <section className="care-map-detail" aria-live="polite" aria-labelledby="care-map-title">
        {entry ? (
          <>
            <span className="life-eyebrow">{LAYER_LABELS[entry.layer]}</span>
            <h2 id="care-map-title">{entry.label}</h2>
            <p>{entry.meaning}</p>
            {signal.get(entry.id) && <p className="care-map-you"><strong>For you:</strong> {signal.get(entry.id)}</p>}
            <p className="care-map-nwia"><span>Wellness dimension</span> {nwiaFor(entry.id).map((d) => NWIA_LABELS[d]).join(" · ")} — {NWIA_MEANINGS[nwiaFor(entry.id)[0]!]}</p>
            {teaching.length > 0 ? (
              <>
                <p>Modules that work on this:</p>
                <ul className="care-map-modules">
                  {teaching.map((m) => <li key={m.id}><Link href={`/approach?module=${m.id}`}>{m.title}<ArrowRight size={16} weight="bold" aria-hidden="true" /></Link></li>)}
                </ul>
              </>
            ) : null}
          </>
        ) : (
          <>
            <h2 id="care-map-title">Four layers, one life.</h2>
            {LAYERS.map((layer) => <p key={layer}><strong>{LAYER_LABELS[layer]}.</strong> {LAYER_BLURBS[layer]}</p>)}
            {/* The one place the NWIA paradigm is said (founder-directed, 2026-09-08): attributed, linked, once. */}
            <p className="care-map-nwia">{NWIA_PARADIGM} <a href={NWIA_URL} rel="noopener noreferrer" target="_blank">{NWIA_NAME}</a>.</p>
          </>
        )}
      </section>
    </div>
  );
}
