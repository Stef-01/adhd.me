"use client";

// W14: weekly attended-per-1,000 line chart, invite arm vs holdout arm.
// Built to the dataviz method: two categorical slots in fixed order (validated on the
// white surface: CVD ΔE 24.7, normal 33.6, both ≥3:1 contrast), 2px lines, recessive
// hairline grid, legend + direct end labels, crosshair + tooltip hover layer, and the
// table view lives beside this component on the page.

import { useMemo, useState } from "react";
import type { WeeklyPoint } from "@/sim/dashboard-data";

// W42: labels are overridable so the practice-facing page can reuse this chart with
// plain-English series names. Colours are fixed — identity follows the entity, and
// these two slots are the validated categorical pair (never repick per page).
const SERIES = {
  invite: { label: "Invite arm", color: "#2a78d6" }, // categorical slot 1
  holdout: { label: "Holdout arm", color: "#eb6834" }, // categorical slot 2
} as const;

export interface ChartLabels {
  invite: string;
  holdout: string;
  /** Sentence under the plot; also the SVG's accessible name. */
  caption: string;
  /** Y-axis unit, used in the accessible name. */
  unit: string;
  /** Tooltip label for the gap between the series. */
  difference: string;
}

const DEFAULT_LABELS: ChartLabels = {
  invite: SERIES.invite.label,
  holdout: SERIES.holdout.label,
  caption:
    "Attended appointments per 1,000 arm patients per week. Both arms share the same organic " +
    "process; the gap is the generated lift.",
  unit: "per 1,000 arm patients",
  difference: "Δ",
};

const W = 720;
const H = 300;
const M = { top: 16, right: 96, bottom: 28, left: 44 };

export function WeeklyArmsChart({
  weekly,
  labels = DEFAULT_LABELS,
  /** Divide the stored per-1,000 values by this for display (W42 shows per 100). */
  scale = 1,
}: {
  weekly: WeeklyPoint[];
  labels?: ChartLabels;
  scale?: number;
}) {
  const [hover, setHover] = useState<number | null>(null);

  const { xFor, yFor, yTicks, invitePath, holdoutPath } = useMemo(() => {
    const innerW = W - M.left - M.right;
    const innerH = H - M.top - M.bottom;
    const yMaxRaw = Math.max(
      ...weekly.map((p) => Math.max(p.invitePer1000, p.holdoutPer1000)),
      1,
    );
    const yMax = Math.ceil(yMaxRaw / 20) * 20;
    // A 1-point series must not divide by zero (NaN path data); it renders centred.
    const span = Math.max(weekly.length - 1, 1);
    const xFor = (week: number) => M.left + ((week - 1) / span) * innerW;
    const yFor = (v: number) => M.top + innerH - (v / yMax) * innerH;
    const path = (pick: (p: WeeklyPoint) => number) =>
      weekly.map((p, i) => `${i === 0 ? "M" : "L"}${xFor(p.week).toFixed(1)},${yFor(pick(p)).toFixed(1)}`).join("");
    const yTicks = [0, yMax / 4, yMax / 2, (3 * yMax) / 4, yMax];
    return {
      xFor,
      yFor,
      yTicks,
      invitePath: path((p) => p.invitePer1000),
      holdoutPath: path((p) => p.holdoutPer1000),
    };
  }, [weekly]);

  const onMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    const week = Math.round(((x - M.left) / (W - M.left - M.right)) * (weekly.length - 1)) + 1;
    setHover(Math.min(Math.max(week, 1), weekly.length));
  };

  const hovered = hover === null ? null : weekly[hover - 1] ?? null;
  const last = weekly[weekly.length - 1];

  return (
    <figure>
      <div className="mb-3 flex items-center gap-5" aria-hidden="true">
        {[
          { label: labels.invite, color: SERIES.invite.color },
          { label: labels.holdout, color: SERIES.holdout.color },
        ].map((s) => (
          <span key={s.label} className="flex items-center gap-1.5 text-xs text-stone-500">
            <span className="inline-block h-0.5 w-4 rounded" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>
      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          aria-label={`Attended appointments ${labels.unit}, weekly, ${labels.invite} versus ${labels.holdout}`}
          onMouseMove={onMove}
          onMouseLeave={() => setHover(null)}
        >
          {yTicks.map((t) => (
            <g key={t}>
              <line
                x1={M.left}
                x2={W - M.right}
                y1={yFor(t)}
                y2={yFor(t)}
                stroke={t === 0 ? "#c3c2b7" : "#e1e0d9"}
                strokeWidth={1}
              />
              <text x={M.left - 8} y={yFor(t) + 3.5} textAnchor="end" fontSize={11} fill="#898781">
                {scale === 1 ? t : +(t / scale).toFixed(1)}
              </text>
            </g>
          ))}
          {[...new Set([1, 0.25, 0.5, 0.75, 1.0].map((f, i) => (i === 0 ? 1 : Math.round(weekly.length * f))))]
            .filter((w) => w >= 1 && w <= weekly.length)
            .map((w) => (
            <text
              key={w}
              x={xFor(w)}
              y={H - M.bottom + 18}
              textAnchor="middle"
              fontSize={11}
              fill="#898781"
            >
              W{w}
            </text>
          ))}
          <path d={holdoutPath} fill="none" stroke={SERIES.holdout.color} strokeWidth={2} data-series="holdout" />
          <path d={invitePath} fill="none" stroke={SERIES.invite.color} strokeWidth={2} data-series="invite" />
          {last && (
            <>
              <text x={W - M.right + 8} y={yFor(last.invitePer1000) + 3.5} fontSize={11} fill="#52514e">
                {labels.invite.split(" ")[0]}
              </text>
              <text x={W - M.right + 8} y={yFor(last.holdoutPer1000) + 3.5} fontSize={11} fill="#52514e">
                {labels.holdout.split(" ")[0]}
              </text>
            </>
          )}
          {hovered && (
            <g>
              <line
                x1={xFor(hovered.week)}
                x2={xFor(hovered.week)}
                y1={M.top}
                y2={H - M.bottom}
                stroke="#c3c2b7"
                strokeWidth={1}
              />
              <circle cx={xFor(hovered.week)} cy={yFor(hovered.invitePer1000)} r={4} fill={SERIES.invite.color} stroke="#ffffff" strokeWidth={2} />
              <circle cx={xFor(hovered.week)} cy={yFor(hovered.holdoutPer1000)} r={4} fill={SERIES.holdout.color} stroke="#ffffff" strokeWidth={2} />
            </g>
          )}
        </svg>
        {hovered && (
          <div
            data-testid="chart-tooltip"
            className="pointer-events-none absolute top-2 rounded-lg border border-stone-200 bg-white px-3 py-2 text-xs shadow-sm"
            style={{
              left: `${(xFor(hovered.week) / W) * 100}%`,
              transform: xFor(hovered.week) > W / 2 ? "translateX(-105%)" : "translateX(8px)",
            }}
          >
            <div className="font-medium text-stone-900">
              Week {hovered.week} · {hovered.weekStartIso}
            </div>
            <div className="mt-1 space-y-0.5 tabular-nums text-stone-500">
              <div>
                <span className="mr-1 inline-block h-2 w-2 rounded-full align-baseline" style={{ background: SERIES.invite.color }} />
                {labels.invite} {(hovered.invitePer1000 / scale).toFixed(1)}
              </div>
              <div>
                <span className="mr-1 inline-block h-2 w-2 rounded-full align-baseline" style={{ background: SERIES.holdout.color }} />
                {labels.holdout} {(hovered.holdoutPer1000 / scale).toFixed(1)}
              </div>
              <div className="text-stone-900">{labels.difference} {hovered.incrementalPer1000 === null ? "—" : (hovered.incrementalPer1000 / scale).toFixed(1)}</div>
            </div>
          </div>
        )}
      </div>
      <figcaption className="mt-2 text-xs text-stone-500">{labels.caption}</figcaption>
    </figure>
  );
}
