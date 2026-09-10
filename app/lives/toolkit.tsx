"use client";

// My Toolkit (PRD §29, §80–§81): not module completion — which practical strategies have I decided
// are worth trying? Your tools, then the Learn Later queue. Open, mark tried, useful or not, a
// note in your own words, remove. Device-local; the note reaches no event.

import Link from "next/link";
import { useRef, useState } from "react";
import { ArrowRight, Check, Play, Trash } from "@phosphor-icons/react";
import { markStrategy, removeFromToolkit, strategy, type PersonalStrategy } from "@/lives";
import { track } from "@/model/events";
import { LifeBean } from "./bean";
import { useProfile } from "./profile-hook";

const STATUS: Record<PersonalStrategy["status"], string> = { saved: "Saved", trying: "Trying", useful: "Useful", not_useful: "Not for me" };

export function Toolkit() {
  const { profile, apply } = useProfile();
  const timers = useRef<Record<string, number>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  if (!profile) return <p role="status">Loading…</p>;
  const tools = profile.personalStrategies.filter((p) => p.status !== "saved");
  const queue = profile.saved.filter((s) => s.status === "saved" || s.status === "started");
  const configOf = (p: PersonalStrategy) => Object.values(p.personalConfig ?? {}).flatMap((v) => (Array.isArray(v) ? v : typeof v === "string" ? [v] : [])).join(" · ");
  const note = (id: string, text: string) => {
    setNotes((n) => ({ ...n, [id]: text }));
    window.clearTimeout(timers.current[id]);
    timers.current[id] = window.setTimeout(() => apply((s) => markStrategy(s, id, profile.personalStrategies.find((p) => p.strategyId === id)?.status ?? "trying", text)), 400);
  };

  return (
    <div className="me-screen learn-screen lives-screen">
      <header className="life-head">
        <span className="life-eyebrow">ADHD Lives</span>
        <h1 className="life-title">My Toolkit</h1>
        {tools.length === 0 && queue.length === 0 && <p className="life-lede">Nothing yet. Play a run; save a strategy.</p>}
      </header>

      {tools.length > 0 && (
        <section className="lives-toolkit-section" aria-labelledby="lives-tools">
          <h2 id="lives-tools" className="lives-section-title">Your tools</h2>
          <ul className="lives-cards">
            {tools.map((p) => {
              const s = strategy(p.strategyId);
              return (
                <li key={p.strategyId} className="life-card lives-tool" data-strategy={p.strategyId} data-status={p.status}>
                  <div className="lives-tool-head">
                    <LifeBean who={s.characterIds[0] ?? "maya"} mood={p.status === "useful" ? "pleased" : "neutral"} size={48} />
                    <div className="lives-strategy-text">
                      <strong>{s.title}</strong>
                      <span className="lives-status">{STATUS[p.status]}</span>
                      <p>{configOf(p) || s.shortDescription}</p>
                    </div>
                  </div>
                  <div className="lives-choices is-three" role="group" aria-label={`${s.title}: how is it going`}>
                    <button type="button" className="lives-choice is-small" aria-pressed={p.status === "trying"} onClick={() => apply((st) => markStrategy(st, p.strategyId, "trying"))}>Trying</button>
                    <button type="button" className="lives-choice is-small" aria-pressed={p.status === "useful"} onClick={() => { apply((st) => markStrategy(st, p.strategyId, "useful")); track("STRATEGY_MARKED_USEFUL", { strategy: p.strategyId }); }}>Useful</button>
                    <button type="button" className="lives-choice is-small" aria-pressed={p.status === "not_useful"} onClick={() => { apply((st) => markStrategy(st, p.strategyId, "not_useful")); track("STRATEGY_MARKED_NOT_USEFUL", { strategy: p.strategyId }); }}>Not for me</button>
                  </div>
                  <label className="lives-note">
                    <span className="sr-only">Your note on {s.title}</span>
                    <textarea rows={2} value={notes[p.strategyId] ?? p.customNote ?? ""} placeholder="Your version, in your words. Stays on this device." maxLength={400} onChange={(e) => note(p.strategyId, e.target.value)} />
                  </label>
                  <div className="lives-actions">
                    <Link className="lives-choice is-small" href={`/lives/learn?module=${encodeURIComponent(s.moduleId)}`}><Play size={14} weight="fill" aria-hidden="true" /> Open</Link>
                    <button type="button" className="lives-choice is-small is-quiet" onClick={() => apply((st) => removeFromToolkit(st, p.strategyId))}><Trash size={14} weight="bold" aria-hidden="true" /> Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      {queue.length > 0 && (
        <section className="lives-toolkit-section" aria-labelledby="lives-queue">
          <h2 id="lives-queue" className="lives-section-title">Saved to learn</h2>
          <ul className="lives-cards">
            {queue.map((item) => {
              const s = strategy(item.strategyId);
              return (
                <li key={item.strategyId} className="life-card lives-queued" data-strategy={item.strategyId}>
                  <div className="lives-strategy-text">
                    <strong>{s.title}</strong>
                    <span className="lives-minutes">{s.estimatedMinutes} min{item.status === "started" ? " · started" : ""}</span>
                    <p>{s.shortDescription}</p>
                  </div>
                  <div className="lives-actions">
                    <Link className="play-tempt is-go is-small" href={`/lives/learn?module=${encodeURIComponent(s.moduleId)}`}>{item.status === "started" ? "Continue" : "Start"} <ArrowRight size={14} weight="bold" aria-hidden="true" /></Link>
                    <button type="button" className="lives-choice is-small is-quiet" onClick={() => apply((st) => removeFromToolkit(st, item.strategyId))}>Remove</button>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="lives-foot"><Link href="/lives/learn"><Check size={14} weight="bold" aria-hidden="true" /> All strategies</Link> · <Link href="/lives/play">Play</Link></p>
    </div>
  );
}
