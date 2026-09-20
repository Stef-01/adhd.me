"use client";

// One axis of the map, opened in place.
//
// A SHEET, NOT A ROUTE, and the comp is right about that. The founder's My ADHD screen opens a
// domain in a drawer over the map rather than navigating away, which keeps the hub as the single
// object a person is looking at — the "minimalist end-state" the brief asks for, where somebody
// can use this for months and meet only four things. It also reuses `app/sheet.tsx`, so this has
// the same grabber, the same detents, the same focus trap and the same Escape as every other
// modal surface in the product, rather than being a screen that behaves unlike its neighbours.
//
// WHAT IS IN IT is the comp's own order: the word this axis is on, what the app has noticed, what
// seems to help, a way for the person to say whether that is right, and at most two ways onward.
// The five areas of a life are rows here rather than screens of their own — this is the matrix
// read one column at a time, which is why the tab has one kind of click-through and not two.

import Link from "next/link";
import { useMemo } from "react";
import { ArrowRight, Sparkle } from "@phosphor-icons/react";
import { INTERACTIVE_MODULES } from "@/learn/interactive";
import { surveyForDomain } from "@/learn/surveys";
import {
  AREA_LABELS,
  ASPECT_LABELS,
  ASPECT_MEANINGS,
  STATUS_LABEL,
  areaOf,
  aspectView,
  modulesOnAspect,
  type Aspect,
} from "@/model/matrix";
import { offerSurvey } from "@/model/offer";
import { escalationEligible } from "@/model/recommend";
import { recordInsight, type InsightVerdict, type ModelRecord } from "@/model/store";
import { Sheet } from "./sheet";

const VERDICTS: ReadonlyArray<{ id: InsightVerdict; label: string }> = [
  { id: "yes", label: "Yes" },
  { id: "partly", label: "Partly" },
  { id: "no", label: "Not really" },
];

/** Every insight step in the tree, with the module it belongs to — the same reading the map uses. */
const INSIGHTS = INTERACTIVE_MODULES.flatMap((m) =>
  m.steps
    .filter((s) => s.kind === "insight")
    .map((s) => ({ id: (s as { id: string }).id, heading: (s as { heading: string }).heading, module: m })),
);

export function MyAdhdSheet({
  aspect,
  record,
  onClose,
  onRefresh,
  storage,
}: {
  aspect: Aspect | null;
  record: ModelRecord;
  onClose: () => void;
  onRefresh: (next?: ModelRecord) => void;
  storage: Parameters<typeof recordInsight>[0];
}) {
  const view = useMemo(() => (aspect ? aspectView(record, aspect) : null), [aspect, record]);

  // The insight this axis can ask about: one the person has already been shown by a module here.
  const insight = useMemo(() => {
    if (!aspect) return null;
    const ids = new Set(modulesOnAspect(aspect).map((m) => m.id));
    return INSIGHTS.find((i) => ids.has(i.module.id)) ?? null;
  }, [aspect]);

  const top = view?.top ?? null;
  // What to offer here: the area's survey, then its deeper set, then the next module. `offerSurvey`
  // owns the rule and the fatigue gate; this only decides where the link points.
  const offer = offerSurvey(record);
  const survey = top ? surveyForDomain(areaOf(top, record)) : null;
  const offered = offer && survey && offer.survey.id === survey.id ? offer : null;
  const done = survey ? Boolean(record.surveys[survey.id]?.completedAt) && !offered?.deeper : false;
  const eligible = top ? escalationEligible(top, record) : false;
  const nextModule = aspect
    ? modulesOnAspect(aspect).find((m) => !record.completed.includes(m.id)) ?? null
    : null;

  return (
    <Sheet open={Boolean(aspect)} title={aspect ? ASPECT_LABELS[aspect] : ""} onClose={onClose}>
      {view && aspect && (
        <div className="map-sheet">
          <p className="map-sheet-meaning">{ASPECT_MEANINGS[aspect]}</p>

          <ul className="map-rows">
            {view.cells.map((cell) => (
              <li key={cell.area} className="map-row" data-status={cell.status}>
                <span className="map-row-name">{AREA_LABELS[cell.area]}</span>
                <span className="map-row-word" data-status={cell.status}>
                  {STATUS_LABEL[cell.status] || "—"}
                </span>
              </li>
            ))}
          </ul>

          {view.helps.length > 0 && (
            <ul className="map-chips is-strength" aria-label="What helps">
              {view.helps.slice(0, 1).map((h) => (
                <li key={h}>
                  <span className="map-chip is-strength">
                    <Sparkle size={13} weight="fill" aria-hidden="true" /> {h}
                  </span>
                </li>
              ))}
            </ul>
          )}

          {insight && (
            <div className="map-accuracy">
              {/* A short question, not the module's whole sentence. The reading it is asking
                  about is the axis a person just opened; restating it here cost fifteen words on
                  a screen whose ceiling is sixty. */}
              <p>Does this fit?</p>
              <div className="resonance-row" role="group" aria-label="Does this fit">
                {VERDICTS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    className="learn-chip"
                    aria-pressed={record.insights[insight.id] === v.id}
                    onClick={() => onRefresh(recordInsight(storage, insight.id, v.id))}
                  >
                    {v.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="map-sheet-actions">
            {survey && !done ? (
              <Link className="learn-primary" href={`/survey?id=${survey.id}${offered?.deeper ? "&deeper=1" : ""}`}>
                {offered?.deeper ? "Go deeper" : `${survey.title}, ${survey.minutes} min`}{" "}
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            ) : nextModule ? (
              <Link className="learn-primary" href={`/approach?module=${nextModule.id}`}>
                {nextModule.title} <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            ) : null}
            {eligible && (
              <Link className="learn-secondary" href="/support">
                Who helps here
              </Link>
            )}
          </div>
        </div>
      )}
    </Sheet>
  );
}
