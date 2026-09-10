"use client";

// Institutional navigation (PRD §45): two tracks — university and work — each saying what is
// commonly available, who to ask, what to bring and in what order. Content only: the app applies
// for nothing and holds no letter. The track the person's own record points at leads; the other
// is one tap away. The finder link narrows to the profession that grants the thing.

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ListChecks, Paperclip, UsersThree } from "@phosphor-icons/react";
import { ADJUSTMENT_TRACKS, adjustmentTrack, leadingTrack, type AdjustmentTrack } from "@/model/adjustments";
import { topNeed } from "@/model/needs";
import { track } from "@/model/events";
import { profession, type Profession } from "@/support/professions";
import { readFilters, writeFilters } from "@/finder/filters";
import { useModel } from "./use-model";

export function Adjustments() {
  const { record } = useModel();
  const [chosen, setChosen] = useState<AdjustmentTrack | null>(null);
  if (!record) return <p role="status">Loading…</p>;
  const need = topNeed(record);
  const active = chosen ?? leadingTrack(record, need?.subdomain ?? null);
  const entry = adjustmentTrack(active);
  const seeProviders = (id: Profession) => {
    try {
      const held = readFilters(window.localStorage);
      writeFilters(window.localStorage, { ...held, professions: [id] });
    } catch {
      // Storage refused: the finder opens unnarrowed, which is still the finder.
    }
    track("ADJUSTMENTS_PROVIDERS", { track: active, profession: id });
  };

  return (
    <div className="me-screen learn-screen adjust-screen">
      <header className="life-head">
        <h1 className="life-title">Most of it already exists.</h1>
      </header>

      <div className="adjust-tracks" role="tablist" aria-label="Where">
        {ADJUSTMENT_TRACKS.map((t) => (
          <button key={t.id} type="button" role="tab" id={`adjust-tab-${t.id}`} aria-selected={t.id === active} aria-controls="adjust-panel" className={`adjust-tab${t.id === active ? " is-active" : ""}`} onClick={() => { setChosen(t.id); track("ADJUSTMENTS_TRACK", { track: t.id }); }}>
            {t.eyebrow}
          </button>
        ))}
      </div>

      <div id="adjust-panel" role="tabpanel" aria-labelledby={`adjust-tab-${entry.id}`}>
        <section className="life-card is-lead" aria-labelledby="adjust-title">
          <h2 id="adjust-title">{entry.title}</h2>
        </section>

        <details className="life-card match-more" open>
          <summary>Available</summary>
                    <ul className="life-list">
            {entry.commonlyAvailable.map((line) => <li key={line}><Check size={16} weight="bold" aria-hidden="true" /><span>{line}</span></li>)}
          </ul>
        </details>

        <details className="life-card match-more">
          <summary>Who to ask</summary>
          <ul className="life-list">
            {entry.whoToAsk.map((line) => <li key={line}><ArrowRight size={16} weight="bold" aria-hidden="true" /><span>{line}</span></li>)}
          </ul>
        </details>

        <details className="life-card match-more">
          <summary>What to bring</summary>
          <ul className="life-list">
            {entry.bring.map((line) => <li key={line}><ArrowRight size={16} weight="bold" aria-hidden="true" /><span>{line}</span></li>)}
          </ul>
          <div className="life-actions">
            <Link className="learn-secondary" href="/manual">{record.manual.updatedAt ? "Open my manual" : "Start my manual"}</Link>
            <Link className="learn-secondary" href="/support">The brief for a clinician</Link>
          </div>
        </details>

        <details className="life-card match-more">
          <summary>In order</summary>
          <ol className="adjust-steps">
            {entry.steps.map((line) => <li key={line}>{line}</li>)}
          </ol>
        </details>

        <details className="life-card match-more">
          <summary>Help asking</summary>
          <ul className="profession-list">
            {entry.professions.map((id, i) => {
              const p = profession(id);
              return (
                <li key={id} className={`profession-card${i === 0 ? " is-first" : ""}`}>
                  <strong>{p.label}</strong>
                  <p>{p.typicallyFor}</p>
                  <Link className="learn-secondary" href="/" onClick={() => seeProviders(id)}>See {p.plural} <ArrowRight size={16} weight="bold" aria-hidden="true" /></Link>
                </li>
              );
            })}
          </ul>
        </details>
      </div>
    </div>
  );
}
