"use client";

// The score screen (PRD §5–§7, §36, §62): the arcade reward first — score, high score, moments
// survived, AGAIN — then, below a rule, "Anything feel familiar?" with the characters this run
// met, then up to three strategies with TRY NOW / SAVE / NOT FOR ME. Nothing educational is
// scored, nothing here is required, and AGAIN is never visually outweighed.

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowCounterClockwise, BookmarkSimple, Check, Play, X } from "@phosphor-icons/react";
import { character, dismissStrategy, recentlyCompleted, recommendStrategies, recordResonance, saveStrategy, STRATEGIES, type CharacterId, type ResonanceSignal, type SessionState } from "@/lives";
import { track } from "@/model/events";
import { LifeBean } from "./bean";
import { useProfile } from "./profile-hook";

const RESPONSES: ReadonlyArray<{ id: ResonanceSignal["response"]; label: string }> = [{ id: "this_is_me", label: "This is me" }, { id: "sometimes", label: "Sometimes" }, { id: "not_me", label: "Not me" }];

export function Results({ session, highBefore, onAgain }: { session: SessionState; highBefore: number; onAgain: () => void }) {
  const { profile, apply } = useProfile();
  const [saved, setSaved] = useState<string[]>([]);
  const [dismissed, setDismissed] = useState<string[]>([]);
  // The ranking re-reads resonance as it is given (§6: the card answers "This is me"), but a row
  // does not vanish because it was saved or dismissed: those weights (§34) shape the NEXT run.
  const baseline = useRef<typeof profile>(null);
  if (profile && !baseline.current) baseline.current = profile;
  const newHigh = session.score > highBefore && session.score > 0;
  const met: CharacterId[] = session.encounteredCharacterIds.slice(0, 3);
  const recommendations = useMemo(() => {
    const base = baseline.current;
    if (!profile || !base) return [];
    return recommendStrategies({
      encounteredGameIds: session.encounteredGameIds,
      encounteredCharacterIds: session.encounteredCharacterIds,
      resonanceSignals: profile.resonanceSignals,
      savedStrategyIds: base.savedStrategyIds,
      completedModuleIds: base.completedModuleIds,
      recentlyCompletedModuleIds: recentlyCompleted(base),
      dismissedStrategyIds: base.dismissedStrategyIds,
      selectedGoals: profile.selectedGoals,
    }, STRATEGIES);
  }, [profile, session]);
  useEffect(() => { for (const r of recommendations) track("STRATEGY_IMPRESSION", { strategy: r.strategy.id, score: r.score }); }, [recommendations]);
  const signalFor = (id: CharacterId) => profile?.resonanceSignals.find((s) => s.sourceType === "character" && s.sourceId === id)?.response;

  return (
    <section className="lives-results play-run" aria-labelledby="lives-results-title" data-phase="over">
      <div className="lives-results-top">
        <Link className="play-x" href="/lives" aria-label="Back to ADHD Lives"><X size={20} weight="bold" aria-hidden="true" /></Link>
      </div>
      <div className="lives-scoreboard">
        {newHigh && <p className="lives-newhigh">New high score</p>}
        <h1 id="lives-results-title" className="lives-bigscore t-digit">{session.score.toLocaleString("en-AU")}</h1>
        <p className="lives-survived">{session.completedGames} {session.completedGames === 1 ? "moment" : "moments"} survived · {session.encounteredGameIds.length} {session.encounteredGameIds.length === 1 ? "game" : "games"} met</p>
        {!newHigh && highBefore > 0 && <p className="lives-high">High score {highBefore.toLocaleString("en-AU")}</p>}
        <button type="button" className="play-tempt is-go lives-again" onClick={onAgain} autoFocus><ArrowCounterClockwise size={18} weight="bold" aria-hidden="true" /> Again</button>
      </div>

      {met.length > 0 && (
        <div className="lives-familiar">
          <h2 className="lives-section-title">Anything feel familiar?</h2>
          <ul className="lives-cards">
            {met.map((id) => {
              const c = character(id);
              const answer = signalFor(id);
              return (
                <li key={id} className="life-card lives-moment" data-character={id}>
                  <LifeBean who={id} mood={answer === "this_is_me" ? "pleased" : "thinking"} size={64} />
                  <div className="lives-moment-text">
                    <strong>{c.name}</strong>
                    <p>“{c.moment}”</p>
                  </div>
                  <div className="lives-choices is-three" role="group" aria-label={`${c.name}: is this you`}>
                    {RESPONSES.map((r) => <button key={r.id} type="button" className="lives-choice is-small" aria-pressed={answer === r.id} onClick={() => { apply((s) => recordResonance(s, { sourceType: "character", sourceId: id, response: r.id })); track("RESONANCE_SELECTED", { source: id, response: r.id }); }}>{r.label}</button>)}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {recommendations.length > 0 && (
        <div className="lives-try">
          <h2 className="lives-section-title">Try something useful</h2>
          <ul className="lives-cards">
            {recommendations.map(({ strategy }) => {
              const isSaved = saved.includes(strategy.id) || profile?.savedStrategyIds.includes(strategy.id);
              const isDismissed = dismissed.includes(strategy.id);
              return (
                <li key={strategy.id} className={`life-card lives-strategy${isDismissed ? " is-dismissed" : ""}`} data-strategy={strategy.id} data-dismissed={isDismissed ? "true" : undefined}>
                  <div className="lives-strategy-text">
                    <strong>{strategy.title}</strong>
                    <span className="lives-minutes">{strategy.estimatedMinutes} min</span>
                    <p>{strategy.shortDescription}</p>
                  </div>
                  <div className="lives-actions">
                    <Link className="play-tempt is-go is-small" href={`/lives/learn?module=${encodeURIComponent(strategy.moduleId)}&from=score`}><Play size={14} weight="fill" aria-hidden="true" /> Try now</Link>
                    {isSaved ? <span className="lives-saved"><Check size={14} weight="bold" aria-hidden="true" /> Saved</span> : (
                      <button type="button" className="lives-choice is-small" onClick={() => { apply((s) => saveStrategy(s, { strategyId: strategy.id, source: "score_screen", relatedCharacterId: strategy.characterIds[0] })); setSaved((x) => [...x, strategy.id]); track("STRATEGY_SAVED", { strategy: strategy.id, source: "score_screen" }); }}><BookmarkSimple size={14} weight="bold" aria-hidden="true" /> Save</button>
                    )}
                    {isDismissed ? <span className="lives-saved is-quiet">Not for you, noted</span> : <button type="button" className="lives-choice is-small is-quiet" onClick={() => { apply((s) => dismissStrategy(s, strategy.id)); setDismissed((x) => [...x, strategy.id]); track("STRATEGY_DISMISSED", { strategy: strategy.id }); }}>Not for me</button>}
                  </div>
                </li>
              );
            })}
          </ul>
          <p className="lives-foot"><Link href="/lives/toolkit">Your Toolkit</Link></p>
        </div>
      )}
    </section>
  );
}
