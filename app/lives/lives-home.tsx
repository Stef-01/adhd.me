"use client";

// ADHD Lives (PRD v2 §4–§5): the front of the Chaos Run and the score screen. One heading, one
// button. AGAIN is the whole loop (§116) — everything learning is L3 and sits under it, never in
// the way of it. The high score is the one number the device keeps for the game (§63).

import { useEffect, useState } from "react";
import { Play } from "@phosphor-icons/react";
import { deviceLearningStorage } from "@/learn/cursor";
import { GAMES } from "@/lives/games";
import { readProfile, recordHighScore } from "@/lives/profile";
import type { SessionState } from "@/lives/types";
import { track } from "@/model/events";
import { LifeHeader } from "../life-shell";
import { LifeBean } from "./bean";
import { ChaosRun } from "./chaos-run";

type View = { kind: "front" } | { kind: "run"; sessionId: string } | { kind: "over"; state: SessionState };

function newSessionId(): string {
  try { return crypto.randomUUID(); } catch { return `${Date.now()}-${Math.random().toString(36).slice(2)}`; }
}

export function LivesHome() {
  const [view, setView] = useState<View>({ kind: "front" });
  const [high, setHigh] = useState<number | null>(null);
  useEffect(() => { try { setHigh(readProfile(deviceLearningStorage).highScore); } catch { setHigh(0); } }, []);
  const play = () => { track("MODULE_STARTED", { module: "lives", format: "run" }); setView({ kind: "run", sessionId: newSessionId() }); };
  const over = (state: SessionState) => {
    try { setHigh(recordHighScore(deviceLearningStorage, state.score).highScore); } catch { /* memory only */ }
    track("MODULE_COMPLETED", { module: "lives", format: "run" });
    setView({ kind: "over", state });
  };

  if (view.kind === "run") return <ChaosRun pool={GAMES} sessionId={view.sessionId} onOver={over} onLeave={() => setView({ kind: "front" })} />;

  return (
    <main id="main-content" className="me-screen life-screen app-page-with-tabs lives-home">
      <LifeHeader />
      {view.kind === "front" ? (
        <section className="lives-front" aria-labelledby="lives-title">
          <div className="lives-cast" aria-hidden="true">
            <LifeBean who="maya" mood="engaged" size={92} /><LifeBean who="leo" mood="thinking" size={92} /><LifeBean who="zoe" mood="surprised" size={92} />
          </div>
          <h1 id="lives-title" className="play-title">Chaos Run</h1>
          <button type="button" className="play-tempt is-go" onClick={play} autoFocus><Play size={18} weight="fill" aria-hidden="true" /> Play</button>
          {high !== null && high > 0 && <p className="lives-high">Best <output className="t-digit">{high}</output></p>}
        </section>
      ) : (
        <section className="lives-front lives-over" aria-labelledby="lives-over-title">
          <LifeBean who="maya" mood="relieved" size={120} />
          <p className="lives-final t-digit" aria-label={`Score ${view.state.score}`}>{view.state.score}</p>
          <h1 id="lives-over-title" className="play-title">{high !== null && view.state.score >= high && view.state.score > 0 ? "Best yet" : "Run over"}</h1>
          <button type="button" className="play-tempt is-go" onClick={play} autoFocus>Again</button>
        </section>
      )}
    </main>
  );
}
