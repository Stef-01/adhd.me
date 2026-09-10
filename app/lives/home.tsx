"use client";

// Home (PRD §82–§84): a large PLAY, one line under it, then continue learning and the Toolkit.
// No dashboard, no questionnaire before play. The optional "what would you most like help with"
// sits under a fold, up to three, skip always available; it only orders recommendations.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, Play } from "@phosphor-icons/react";
import { CHARACTERS, selectGoals, strategy, type LearningDomain } from "@/lives";
import { LifeBean } from "./bean";
import { LIVES_HAPTICS_KEY, LIVES_LARGE_KEY, LIVES_REDUCED_FLASHING_KEY, LIVES_REDUCED_SENSORY_KEY, LIVES_RELAXED_KEY, readFlag, useProfile, writeFlag } from "./profile-hook";

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
  // §93: the five play settings, on this device, read after mount so the server and the client agree.
  const [relaxed, setRelaxed] = useState(false);
  const [large, setLarge] = useState(false);
  const [reducedFlashing, setReducedFlashing] = useState(false);
  const [reducedSensory, setReducedSensory] = useState(false);
  const [haptics, setHaptics] = useState(false);
  useEffect(() => {
    setRelaxed(readFlag(LIVES_RELAXED_KEY)); setLarge(readFlag(LIVES_LARGE_KEY));
    setReducedFlashing(readFlag(LIVES_REDUCED_FLASHING_KEY)); setReducedSensory(readFlag(LIVES_REDUCED_SENSORY_KEY)); setHaptics(readFlag(LIVES_HAPTICS_KEY));
  }, []);
  const flip = (key: string, on: boolean, set: (v: boolean) => void) => { writeFlag(key, !on); set(!on); };
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
        <li><Link className="lives-row" href="/lives/characters"><span className="lives-row-text"><strong>The eight lives</strong></span><ArrowRight size={16} weight="bold" aria-hidden="true" /></Link></li>
        <li><Link className="lives-row" href="/lives/learn"><span className="lives-row-text"><strong>Learn</strong></span><ArrowRight size={16} weight="bold" aria-hidden="true" /></Link></li>
      </ul>

      <details className="life-why lives-goals">
        <summary>Your goals</summary>
        <div className="lives-chips" role="group" aria-label="Goals">
          {GOALS.map((g) => <button key={g.id} type="button" className="lives-chip" aria-pressed={goals.includes(g.id)} onClick={() => toggle(g.id)}>{g.label}</button>)}
        </div>
      </details>

      <details className="life-why lives-goals lives-settings">
        <summary>Play settings</summary>
        <div className="lives-chips" role="group" aria-label="Play settings">
          <button type="button" className="lives-chip" aria-pressed={relaxed} onClick={() => flip(LIVES_RELAXED_KEY, relaxed, setRelaxed)}>Relaxed timing</button>
          <button type="button" className="lives-chip" aria-pressed={large} onClick={() => flip(LIVES_LARGE_KEY, large, setLarge)}>Larger instructions</button>
          <button type="button" className="lives-chip" aria-pressed={reducedFlashing} onClick={() => flip(LIVES_REDUCED_FLASHING_KEY, reducedFlashing, setReducedFlashing)}>Reduced flashing</button>
          <button type="button" className="lives-chip" aria-pressed={reducedSensory} onClick={() => flip(LIVES_REDUCED_SENSORY_KEY, reducedSensory, setReducedSensory)}>Reduced sensory effects</button>
          <button type="button" className="lives-chip" aria-pressed={haptics} onClick={() => flip(LIVES_HAPTICS_KEY, haptics, setHaptics)}>Haptics</button>
        </div>
      </details>
    </div>
  );
}
