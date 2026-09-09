"use client";

// Home (PRD §82–§84): a large PLAY, one line under it, then continue learning and the Toolkit.
// No dashboard, no questionnaire before play. The optional "what would you most like help with"
// sits under a fold, up to three, skip always available; it only orders recommendations.

import Link from "next/link";
import { ArrowRight, Play } from "@phosphor-icons/react";
import { CHARACTERS, selectGoals, strategy, type LearningDomain } from "@/lives";
import { LifeBean } from "./bean";
import { useProfile } from "./profile-hook";

const GOALS: ReadonlyArray<{ id: LearningDomain; label: string }> = [
  { id: "sleep", label: "Sleep" },
  { id: "attention", label: "Focus" },
  { id: "task_initiation", label: "Getting started" },
  { id: "time_management", label: "Time" },
  { id: "relationships", label: "Relationships" },
  { id: "sensory_management", label: "Overwhelm" },
  { id: "working_memory", label: "Remembering things" },
];

export function LivesHome() {
  const { profile, apply } = useProfile();
  const started = profile?.saved.find((s) => s.status === "started") ?? profile?.saved.find((s) => s.status === "saved");
  const tools = profile?.personalStrategies.filter((p) => p.status !== "saved").length ?? 0;
  const goals = profile?.selectedGoals ?? [];
  const toggle = (id: LearningDomain) => apply((s) => selectGoals(s, goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id].slice(0, 3)));
  return (
    <div className="me-screen learn-screen lives-screen lives-home">
      <header className="life-head lives-home-head">
        <span className="life-eyebrow">ADHD Lives</span>
        <div className="lives-cast" aria-hidden="true">{CHARACTERS.map((c) => <LifeBean key={c.id} who={c.id} mood="engaged" size={44} />)}</div>
        <h1 className="life-title">Eight lives. Three of yours.</h1>
        <Link className="play-tempt is-go lives-play" href="/lives/play"><Play size={20} weight="fill" aria-hidden="true" /> Play</Link>
        <p className="life-lede lives-tagline">Everything was under control thirty seconds ago.</p>
      </header>

      <ul className="lives-home-rows">
        {started && (
          <li><Link className="lives-row" href={`/lives/learn?module=${encodeURIComponent(strategy(started.strategyId).moduleId)}`}><span className="lives-row-text"><strong>Continue learning</strong><span>{strategy(started.strategyId).title} · {strategy(started.strategyId).estimatedMinutes} min</span></span><ArrowRight size={16} weight="bold" aria-hidden="true" /></Link></li>
        )}
        <li><Link className="lives-row" href="/lives/toolkit"><span className="lives-row-text"><strong>Your Toolkit</strong><span>{tools === 0 ? "Nothing yet" : `${tools} ${tools === 1 ? "strategy" : "strategies"}`}</span></span><ArrowRight size={16} weight="bold" aria-hidden="true" /></Link></li>
        <li><Link className="lives-row" href="/lives/characters"><span className="lives-row-text"><strong>The eight lives</strong><span>Who they are, what they are trying</span></span><ArrowRight size={16} weight="bold" aria-hidden="true" /></Link></li>
        <li><Link className="lives-row" href="/lives/learn"><span className="lives-row-text"><strong>Learn</strong><span>Sixteen strategies, two to five minutes each</span></span><ArrowRight size={16} weight="bold" aria-hidden="true" /></Link></li>
      </ul>

      <details className="life-why lives-goals">
        <summary>What would you most like help with?</summary>
        <p className="lives-goals-note">Up to three. It only changes what is suggested first.</p>
        <div className="lives-chips" role="group" aria-label="Goals">
          {GOALS.map((g) => <button key={g.id} type="button" className="lives-chip" aria-pressed={goals.includes(g.id)} onClick={() => toggle(g.id)}>{g.label}</button>)}
        </div>
      </details>
    </div>
  );
}
