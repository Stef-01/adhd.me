"use client";

// The six-axis map (founder, 2026-09-19, drawn in the Calm Clarity comp): the person's own shape,
// with a word on every axis and no number anywhere.
//
// OUTWARD MEANS EASE, NOT SEVERITY. The design system this comes from says it plainly — "outward
// dimensional sprawl signifies stability and ease, framing ADHD characteristics around resilience
// and environmental fit rather than pathology". So the polygon draws `reach`, which is how much
// somebody has BUILT here (`src/model/matrix.ts`), and never their cost. A shape that grew because
// a person was struggling would be a severity chart wearing a friendly palette.
//
// THE CHART IS DECORATION AND THE CHIPS ARE THE CONTROLS. A six-pointed polygon cannot carry six
// readable labels and 44px targets at 390px, and `e2e/controls.spec.ts` has already caught 17px
// targets on this tree's other radar. So the SVG is `aria-hidden` and the six buttons under it are
// the real, sized, focusable controls and the text equivalent. ONE list of six, positioned two
// ways: a grid under the chart on a phone, and around the perimeter from ≥768px where there is
// room — same DOM, so the words are written once and counted once.
//
// STILL LEARNING IS DRAWN, NOT WRITTEN OFF. An axis the model cannot place yet gets a dotted spoke
// and a hollow node, and the polygon pulls in to it rather than pretending to a position. That is
// the comp's own "axis confidence state", and it is the honest rendering of unasked: the absence
// sits on the app, which has not asked, rather than on the person, who has not answered.

import { useMemo } from "react";
import { HeartStraight, Lightning, ListChecks, Moon, Target, UsersThree, type Icon } from "@phosphor-icons/react";
import { ASPECT_LABELS, STATUS_LABEL, type AxisPoint } from "@/model/matrix";

/** One place for the geometry, so the rings, the spokes, the polygon and the nodes cannot disagree. */
const SIZE = 500;
const CENTRE = SIZE / 2;
const R = 180;
/** Five concentric guides, as the comp draws them; the middle one is dashed. */
const RINGS = [0.2, 0.4, 0.6, 0.8, 1] as const;
const DASHED_RING = 0.6;
/** The soft wash behind the shape, the comp's "ambient". */
const AMBIENT_R = R * 0.92;
/** An axis nothing has reached still shows its node, just off centre, rather than vanishing. */
const MIN_REACH = 0.1;
const NODE_R = 4.5;

function angleAt(index: number, count: number): number {
  return (Math.PI * 2 * index) / count - Math.PI / 2;
}

function pointAt(index: number, count: number, reach: number): [number, number] {
  const a = angleAt(index, count);
  return [CENTRE + Math.cos(a) * R * reach, CENTRE + Math.sin(a) * R * reach];
}

const round = (n: number) => Math.round(n * 100) / 100;

/** One glyph and one tint per axis, the comp's discs. Identity only: a status never changes them. */
const AXIS_ICON: Readonly<Record<AxisPoint["aspect"], { icon: Icon; tint: string }>> = {
  starting: { icon: Lightning, tint: "warm" },
  focus: { icon: Target, tint: "sky" },
  organisation: { icon: ListChecks, tint: "stone" },
  "emotional-regulation": { icon: HeartStraight, tint: "cool" },
  relationships: { icon: UsersThree, tint: "gold" },
  "sleep-energy": { icon: Moon, tint: "sage" },
};
const path = (points: ReadonlyArray<[number, number]>) => points.map(([x, y]) => `${round(x)},${round(y)}`).join(" ");

export function MyAdhdRadar({
  points,
  /** Day one, in the same order, drawn dashed under the shape. Null when nothing has moved. */
  baseline = null,
  onOpen,
  openAspect,
  /** Ids of axes that just moved, for the one animation in this tab. */
  moved = [],
}: {
  points: readonly AxisPoint[];
  baseline?: readonly AxisPoint[] | null;
  onOpen: (aspect: AxisPoint["aspect"]) => void;
  openAspect?: AxisPoint["aspect"] | null;
  moved?: ReadonlyArray<AxisPoint["aspect"]>;
}) {
  const n = points.length;
  const shape = useMemo(
    () => points.map((p, i) => pointAt(i, n, Math.max(MIN_REACH, p.reach))),
    [points, n],
  );
  const movedSet = useMemo(() => new Set(moved), [moved]);
  const then = useMemo(
    () => (baseline ? baseline.map((p, i) => pointAt(i, n, Math.max(MIN_REACH, p.reach))) : null),
    [baseline, n],
  );

  return (
    <div className="map-radar">
      <div className="map-chart-frame">
        <svg className="map-chart" viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true" focusable="false">
          <defs>
            <radialGradient id="map-ambient-fade" cx="50%" cy="50%" r="50%">
              <stop offset="0%" className="map-ambient-in" />
              <stop offset="100%" className="map-ambient-out" />
            </radialGradient>
          </defs>
          <circle className="map-ambient" cx={CENTRE} cy={CENTRE} r={AMBIENT_R} fill="url(#map-ambient-fade)" />
          {RINGS.map((ring) => (
            <polygon
              key={ring}
              className="map-ring"
              data-dashed={ring === DASHED_RING || undefined}
              points={path(points.map((_, i) => pointAt(i, n, ring)))}
            />
          ))}
          {points.map((p, i) => {
            const [x, y] = pointAt(i, n, 1);
            return (
              <line
                key={p.aspect}
                className="map-spoke"
                data-learning={p.stillLearning || undefined}
                x1={CENTRE}
                y1={CENTRE}
                x2={round(x)}
                y2={round(y)}
              />
            );
          })}
          {then && (
            <>
              <polygon className="map-then" points={path(then)} />
              {then.map(([x, y], i) => (
                <circle key={points[i]!.aspect} className="map-then-node" cx={round(x)} cy={round(y)} r={3.5} />
              ))}
            </>
          )}
          <polygon className="map-you" points={path(shape)} />
          {points.map((p, i) => {
            const [x, y] = shape[i]!;
            return (
              <circle
                key={p.aspect}
                className="map-node"
                data-learning={p.stillLearning || undefined}
                data-moved={movedSet.has(p.aspect) || undefined}
                cx={round(x)}
                cy={round(y)}
                r={NODE_R}
              />
            );
          })}
        </svg>
      </div>

      <ul className="map-axes">
        {points.map((p, i) => {
          const a = angleAt(i, n);
          const Glyph = AXIS_ICON[p.aspect].icon;
          return (
            <li
              key={p.aspect}
              className="map-axis-seat"
              style={
                {
                  // Where the seat sits around the chart from 768px up. Unused below that, where
                  // the list is a plain grid.
                  "--seat-x": `${round(50 + Math.cos(a) * 44)}%`,
                  "--seat-y": `${round(50 + Math.sin(a) * 44)}%`,
                } as React.CSSProperties
              }
            >
              <button
                type="button"
                className="map-axis"
                aria-pressed={openAspect === p.aspect}
                data-status={p.status}
                data-learning={p.stillLearning || undefined}
                onClick={() => onOpen(p.aspect)}
              >
                <span className="map-axis-icon" data-tint={AXIS_ICON[p.aspect].tint} aria-hidden="true">
                  <Glyph size={16} weight="bold" />
                </span>
                <span className="map-axis-name">{ASPECT_LABELS[p.aspect]}</span>
                {STATUS_LABEL[p.status] ? (
                  <span className="map-axis-word">{STATUS_LABEL[p.status]}</span>
                ) : (
                  <span className="map-axis-word is-quiet">Unasked</span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
