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
//
// On a phone (under 768px, where the wheel is too narrow for a node's name to reach 12px) the wheel
// is four quarters instead (N8, founder's pick, 2026-09-27): a tap on a quarter lists its parts
// under the wheel, and a tap on a part opens the same panel.

import Link from "next/link";
import { useMemo, useRef, useState, type CSSProperties } from "react";
import { ArrowRight, BookOpen, Play } from "@phosphor-icons/react";
import { panelFor } from "@/learn/games";
import { LAYER_LABELS, LAYERS, SUBDOMAINS, subdomainsOf, type Layer, type Subdomain } from "@/model/layers";
import { deriveNeeds } from "@/model/needs";
import { track } from "@/model/events";
import { useModel } from "./use-model";
import { NWIA_LABELS, NWIA_NAME, NWIA_PARADIGM, NWIA_URL, nwiaFor } from "@/wellness/nwia";

/** Each layer's wedge and ink, from the palette (`--layer-*` in globals.css). */
const COLOURS: Record<Layer, { fill: string; ink: string }> = {
  brain: { fill: "var(--layer-brain-bg)", ink: "var(--layer-brain-ink)" },
  body: { fill: "var(--layer-body-bg)", ink: "var(--layer-body-ink)" },
  environment: { fill: "var(--layer-environment-bg)", ink: "var(--layer-environment-ink)" },
  people: { fill: "var(--layer-people-bg)", ink: "var(--layer-people-ink)" },
};

/** Where each layer's wedge sits, in degrees from the top, clockwise. */
const WEDGE: Record<Layer, [number, number]> = { brain: [-90, 0], body: [0, 90], environment: [90, 180], people: [180, 270] };

const CX = 250;
const CY = 250;
const R_OUT = 244;
const R_IN = 64;
/* A node is a disc that holds its longest label ("Medication", "Clinicians") at the label size, so
   no word spills past its ring into the next. Three rings, with the discs sized so two neighbours on
   adjacent rings clear each other at the closest angle a seven-node wedge produces. */
const R_NODE = 26;
/* The gap between two stacked label lines, in viewBox units at the 8.75 label size. */
const LABEL_LEADING = 9.5;

/* A label wider than its disc used to be cut to its first word, which was a general rule serving
   exactly one of the twenty-five: "Working memory" read "Working", a different thing. Only the
   longest single word has to fit the disc, so a two-word label stacks instead of losing half its
   meaning. Measured at the 8.75 size: the widest word in the set ("Medication") renders 46 units
   inside a 50.5-unit disc, and "Working"/"memory" are 34 and 29. */
function labelLines(label: string): string[] {
  const words = label.split(" ");
  return words.length > 1 && label.length > 10 ? words : [label];
}
/* Outer, inner, middle: consecutive nodes step across all three, so the two nearest in angle are
   never the closest pair of rings. The insets keep each ring off the wedge edges, where the next
   wedge's nodes sit. Searched, not guessed: this set holds every pair of discs at least 6px apart. */
const RINGS = [200, 100, 154] as const;
const INSETS = [3, 4, 3] as const;

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

/** Node positions: each layer's subdomains spread across its wedge, consecutive nodes stepping
    outer, inner, middle ring, so the two nearest in angle are never on neighbouring rings' closest pair. */
function nodePositions(): Map<Subdomain, { x: number; y: number; layer: Layer }> {
  const out = new Map<Subdomain, { x: number; y: number; layer: Layer }>();
  for (const layer of LAYERS) {
    const subs = subdomainsOf(layer);
    const [a, b] = WEDGE[layer];
    subs.forEach((s, i) => {
      const ring = RINGS[i % 3] ?? RINGS[0];
      const inset = INSETS[i % 3] ?? INSETS[0];
      const t = (i + 0.5) / subs.length;
      const deg = a + inset + (b - a - 2 * inset) * t;
      const [x, y] = polar(deg, ring);
      out.set(s.id, { x, y, layer });
    });
  }
  return out;
}

/** The cost a person gave, said back in words. The map never prints a number about somebody. */
function costWords(cost: number): string {
  return cost >= 7 ? "a lot" : cost >= 4 ? "some" : "a little";
}

/** Body and environment sit on the bottom half, where a clockwise arc would draw letters upside down. */
const BOTTOM: ReadonlySet<Layer> = new Set(["body", "environment"]);

/** The phone wheel's quarter labels sit at the middle of each quarter, in viewBox units. */
const QUARTER_LABEL_R = 156;

export function CareMap() {
  const { record } = useModel();
  const [selected, setSelected] = useState<Subdomain | null>(null);
  const [quarter, setQuarter] = useState<Layer | null>(null);
  const positions = useMemo(nodePositions, []);
  const panel = useRef<HTMLElement>(null);
  // Under 1200px the panel sits below the wheel: after a tap, bring it into view if it is off the
  // bottom of the screen (PLAN.md W9). Focus stays on the node; the panel's live region announces.
  const open = (id: Subdomain) => {
    setSelected(id);
    track("CARE_MAP_OPENED", { node: id });
    requestAnimationFrame(() => {
      const box = panel.current?.getBoundingClientRect();
      if (!box || box.top < window.innerHeight - 48) return;
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      panel.current?.scrollIntoView({ block: "nearest", behavior: reduce ? "auto" : "smooth" });
    });
  };
  const needs = record ? deriveNeeds(record) : [];
  const signal = new Map<Subdomain, string>();
  for (const n of needs) {
    signal.set(n.subdomain, `${n.label}${n.costMeasured ? `, you said it costs ${costWords(n.functionalCost)}` : ""}.`);
    for (const c of n.contributors) if (!signal.has(c.subdomain)) signal.set(c.subdomain, `${c.note}.`);
  }
  const entry = selected ? SUBDOMAINS.find((s) => s.id === selected) : null;
  // A second tap on the open quarter closes it; a part from another quarter leaves the panel.
  const toggleQuarter = (layer: Layer) => {
    const next = quarter === layer ? null : layer;
    setQuarter(next);
    if (entry && entry.layer !== next) setSelected(null);
  };
  const ordered = [...LAYERS.filter((l) => l !== quarter), ...LAYERS.filter((l) => l === quarter)];
  const { games, modules } = selected ? panelFor(selected) : { games: [], modules: [] };

  return (
    <div className="care-map">
      <svg className="care-map-svg" viewBox="0 0 500 500" role="group" aria-label="The care map: brain, body, environment and people, with a node for each part of life ADHD touches">
        {LAYERS.map((layer) => {
          const [a, b] = WEDGE[layer];
          // The label sits on the wedge's outer arc, following it, so a long word never runs off the disc.
          // On the bottom half the arc runs the other way, so the letters stand upright; a reversed arc
          // puts them on its inner side, so its baseline moves out by the cap height to keep the band.
          const bottom = BOTTOM.has(layer);
          const r = bottom ? R_OUT - 3 : R_OUT - 11;
          const [x1, y1] = polar(bottom ? b - 4 : a + 4, r);
          const [x2, y2] = polar(bottom ? a + 4 : b - 4, r);
          const arcId = `care-map-arc-${layer}`;
          return (
            <g key={layer}>
              <path d={wedgePath(layer)} style={{ fill: COLOURS[layer].fill, stroke: "var(--paper)" }} strokeWidth="4" />
              <defs><path id={arcId} d={`M${x1} ${y1}A${r} ${r} 0 0 ${bottom ? 0 : 1} ${x2} ${y2}`} /></defs>
              <text className="care-map-layer" fontSize="11" fontWeight="800" letterSpacing="1.5" style={{ fill: COLOURS[layer].ink }}>
                <textPath href={`#${arcId}`} startOffset="50%" textAnchor="middle">{LAYER_LABELS[layer].toUpperCase()}</textPath>
              </text>
            </g>
          );
        })}
        <circle cx={CX} cy={CY} r={R_IN - 6} style={{ fill: "var(--paper)" }} />
        <text x={CX} y={CY + 5} textAnchor="middle" fontSize="13" fontWeight="700" style={{ fill: "var(--ink)" }}>You</text>
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
              onClick={() => open(s.id)}
              onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(s.id); } }}
            >
              <circle cx={p.x} cy={p.y} r={has ? R_NODE + 2 : R_NODE} style={{ fill: "var(--paper)", stroke: COLOURS[p.layer].ink }} strokeWidth={has ? 3 : 1.5} />
              <text x={p.x} y={p.y + 3.25} textAnchor="middle" fontSize="8.75" fontWeight="700" style={{ fill: COLOURS[p.layer].ink }}>
                {labelLines(s.label).map((line, i, all) => (
                  <tspan key={line} x={p.x} dy={i === 0 ? (all.length - 1) * -LABEL_LEADING / 2 : LABEL_LEADING}>{line}</tspan>
                ))}
              </text>
            </g>
          );
        })}
      </svg>

      {/* The phone's wheel: four quarters, each a button. The open one is drawn last so its ring
          is not covered by a neighbour. */}
      <div className="care-map-phone">
        <svg className="care-map-quarters" viewBox="0 0 500 500" role="group" aria-label="The care map: brain, body, environment and people">
          {ordered.map((layer) => {
            const [a, b] = WEDGE[layer];
            const [x, y] = polar((a + b) / 2, QUARTER_LABEL_R);
            const isOpen = quarter === layer;
            return (
              <g
                key={layer}
                className="care-map-quarter"
                role="button"
                tabIndex={0}
                aria-label={LAYER_LABELS[layer]}
                aria-expanded={isOpen}
                onClick={() => toggleQuarter(layer)}
                onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); toggleQuarter(layer); } }}
              >
                <path d={wedgePath(layer)} style={{ fill: COLOURS[layer].fill, stroke: isOpen ? "var(--ink)" : "var(--paper)" }} strokeWidth={isOpen ? 5 : 4} />
                <text x={x} y={y} textAnchor="middle" dominantBaseline="central" fontSize="25" fontWeight="700" style={{ fill: COLOURS[layer].ink }}>
                  {LAYER_LABELS[layer]}<tspan aria-hidden="true" dx="8">{isOpen ? "−" : "+"}</tspan>
                </text>
              </g>
            );
          })}
          <circle cx={CX} cy={CY} r={R_IN - 6} style={{ fill: "var(--paper)" }} />
          <text x={CX} y={CY} textAnchor="middle" dominantBaseline="central" fontSize="22" fontWeight="700" style={{ fill: "var(--ink)" }}>You</text>
        </svg>
        {quarter && (
          <section className="care-map-parts" aria-labelledby="care-map-parts-title" style={{ "--l-bg": COLOURS[quarter].fill, "--l-ink": COLOURS[quarter].ink } as CSSProperties}>
            <h2 id="care-map-parts-title">{LAYER_LABELS[quarter]}</h2>
            <ul>
              {subdomainsOf(quarter).map((s) => (
                <li key={s.id}>
                  <button
                    type="button"
                    className={signal.has(s.id) ? "is-signal" : undefined}
                    aria-label={`${s.label} (${LAYER_LABELS[s.layer]})${signal.has(s.id) ? ", in your picture" : ""}`}
                    aria-pressed={selected === s.id}
                    onClick={() => open(s.id)}
                  >
                    {s.label}
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>

      <section ref={panel} className={`care-map-detail${entry ? "" : " is-empty"}`} aria-live="polite" aria-labelledby="care-map-title">
        {entry ? (
          <>
            <h2 id="care-map-title">{entry.label}</h2>
            <p>{entry.meaning}</p>
            {signal.get(entry.id) && <p className="care-map-you"><strong>For you:</strong> {signal.get(entry.id)}</p>}
            <p className="care-map-nwia"><span>Wellness dimension</span> {nwiaFor(entry.id).map((d) => NWIA_LABELS[d]).join(" · ")}</p>
            {/* Games about this part of life beside the modules for it (PLAN.md W9), so the map leads
                to both. A glyph tells them apart, not a label. */}
            {games.length + modules.length > 0 ? (
              <ul className="care-map-modules" aria-label="Games and modules for this">
                {games.map((g) => (
                  <li key={`${g.kind}:${g.id}`}>
                    <Link href={g.kind === "life" ? g.href : `/approach?module=${g.id}`} aria-label={`${g.title}, a game`}>
                      <Play size={16} weight="fill" aria-hidden="true" />
                      <span>{g.title}</span>
                      <ArrowRight size={16} weight="bold" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
                {modules.map((m) => (
                  <li key={m.id}>
                    <Link href={`/lives/learn?module=${encodeURIComponent(m.moduleId)}`} aria-label={`${m.title}, a module`}>
                      <BookOpen size={16} weight="bold" aria-hidden="true" />
                      <span>{m.title}</span>
                      <ArrowRight size={16} weight="bold" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            ) : null}
          </>
        ) : (
          <>
            <h2 id="care-map-title">Tap a part of life.</h2>
            {/* The one place the NWIA paradigm is said (founder-directed, 2026-09-08): attributed, linked, once. */}
            <p className="care-map-nwia t-voice">{NWIA_PARADIGM} <a href={NWIA_URL} rel="noopener noreferrer" target="_blank">{NWIA_NAME}</a>.</p>
          </>
        )}
      </section>
    </div>
  );
}
