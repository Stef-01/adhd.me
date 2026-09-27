"use client";

// Characters (PRD §41, §47): the eight lives as the bridge between play and learning. Each card
// is who they are, the pattern they live, the line from their moment, "Things they are trying"
// as strategies, and "This is me" — a resonance signal, which is the only thing that personalises.

import Link from "next/link";
import { Play } from "@phosphor-icons/react";
import { CHARACTERS, recordResonance, strategy, type ResonanceSignal } from "@/lives";
import { GAME_ENTRY } from "@/lives/entry-points";
import { JOURNEYS } from "@/lives/journeys";
import { track } from "@/model/events";
import { LifeBean } from "./bean";
import { useProfile } from "./profile-hook";

const RESPONSES: ReadonlyArray<{ id: ResonanceSignal["response"]; label: string }> = [{ id: "this_is_me", label: "This is me" }, { id: "sometimes", label: "Sometimes" }, { id: "not_me", label: "Not me" }];

export function LivesCharacters() {
  const { profile, apply } = useProfile();
  return (
    <div className="me-screen learn-screen lives-screen">
      <header className="life-head">
        <h1 className="life-title">Eight lives</h1>
      </header>
      <ul className="lives-cards lives-cast-list">
        {CHARACTERS.map((c) => {
          const answer = profile?.resonanceSignals.find((s) => s.sourceType === "character" && s.sourceId === c.id)?.response;
          const journey = JOURNEYS.find(j => j.who === c.id);
          const href = GAME_ENTRY[c.id].href;
          const title = journey?.title ?? (c.id === "leo" ? "One tiny sound." : "Just get out the door.");
          return (
            <li key={c.id} className="life-card lives-character" data-character={c.id}>
              <Link className="lives-character-play" href={href} aria-label={`Play ${c.name}’s ${c.id === "theo" ? "morning" : "moment"} →`}>
                <LifeBean who={c.id} mood={answer === "this_is_me" ? "pleased" : "neutral"} size={64} />
                <span><strong>{c.name}</strong><span>{title}</span></span>
                <Play size={20} weight="fill" aria-hidden="true" />
              </Link>
              <details className="match-more lives-more lives-character-fold">
                <summary aria-label={`About ${c.name}`}>About</summary>
                <p className="lives-pattern">{c.pattern}</p>
                <p className="lives-hook">{c.hook}</p>
                <p className="lives-moment-line">“{c.moment}”</p>
                <div className="lives-choices is-three" role="group" aria-label={`${c.name}: is this you`}>
                {RESPONSES.map((r) => <button key={r.id} type="button" className="lives-choice is-small" aria-pressed={answer === r.id} onClick={() => { apply((s) => recordResonance(s, { sourceType: "character", sourceId: c.id, response: r.id })); track("RESONANCE_SELECTED", { source: c.id, response: r.id }); }}>{r.label}</button>)}
              </div>
                <span className="lives-kicker">Things {c.name} is trying</span>
                <ul className="lives-rows">
                  {c.trying.map((id) => { const s = strategy(id); return <li key={id}><Link className="lives-row" href={`/lives/learn?module=${encodeURIComponent(s.moduleId)}`}><span className="lives-row-text"><strong>{s.title}</strong><span>{s.estimatedMinutes} min</span></span></Link></li>; })}
                </ul>
              </details>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
