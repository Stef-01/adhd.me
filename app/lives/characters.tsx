"use client";

// Characters (PRD §41, §47): the eight lives as the bridge between play and learning. Each card
// is who they are, the pattern they live, the line from their moment, "Things they are trying"
// as strategies, and "This is me" — a resonance signal, which is the only thing that personalises.

import Link from "next/link";
import { CHARACTERS, recordResonance, strategy, type ResonanceSignal } from "@/lives";
import { track } from "@/model/events";
import { LifeBean } from "./bean";
import { useProfile } from "./profile-hook";

const RESPONSES: ReadonlyArray<{ id: ResonanceSignal["response"]; label: string }> = [{ id: "this_is_me", label: "This is me" }, { id: "sometimes", label: "Sometimes" }, { id: "not_me", label: "Not me" }];

export function LivesCharacters() {
  const { profile, apply } = useProfile();
  return (
    <div className="me-screen learn-screen lives-screen">
      <header className="life-head">
        <span className="life-eyebrow">ADHD Lives</span>
        <h1 className="life-title">Eight lives</h1>
      </header>
      <ul className="lives-cards lives-cast-list">
        {CHARACTERS.map((c) => {
          const answer = profile?.resonanceSignals.find((s) => s.sourceType === "character" && s.sourceId === c.id)?.response;
          return (
            <li key={c.id} className="life-card lives-character" data-character={c.id}>
              <div className="lives-tool-head">
                <LifeBean who={c.id} mood={answer === "this_is_me" ? "pleased" : "neutral"} size={72} />
                <div className="lives-strategy-text">
                  <strong>{c.name}</strong>
                  <p className="lives-pattern">{c.pattern}</p>
                </div>
              </div>
              <details className="match-more lives-more">
                <summary>Their moment</summary>
                <p className="lives-hook">{c.hook}</p>
                <p className="lives-moment-line">“{c.moment}”</p>
                <span className="lives-kicker">Things {c.name} is trying</span>
                <ul className="lives-rows">
                  {c.trying.map((id) => { const s = strategy(id); return <li key={id}><Link className="lives-row" href={`/lives/learn?module=${encodeURIComponent(s.moduleId)}`}><span className="lives-row-text"><strong>{s.title}</strong><span>{s.estimatedMinutes} min</span></span></Link></li>; })}
                </ul>
              </details>
              {c.id === "leo" && <Link className="lives-row" href="/lives/play/leo-mosquito">Play Leo’s moment →</Link>}
              <div className="lives-choices is-three" role="group" aria-label={`${c.name}: is this you`}>
                {RESPONSES.map((r) => <button key={r.id} type="button" className="lives-choice is-small" aria-pressed={answer === r.id} onClick={() => { apply((s) => recordResonance(s, { sourceType: "character", sourceId: c.id, response: r.id })); track("RESONANCE_SELECTED", { source: c.id, response: r.id }); }}>{r.label}</button>)}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
