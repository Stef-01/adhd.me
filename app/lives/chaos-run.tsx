"use client";

// The Chaos Run (PRD v2 §4, §44, §59–§61): games one after another on the session director, three
// lives, a score, FASTER every fourth success. The engine (`src/lives/session.ts`) decides the
// facts; this component drives the frames.
//
// Each game has three beats on one clock: PRE — the life and the shouted instruction, still —
// ACTIVE — the bar drains and the engine is live — RESULT — hit or miss, then the next game. A
// miss is a life and the next game, never a modal (§61). FASTER is one word on a card between
// games, crossfaded, still: the PRD asks for the beat and the calm rule (play plan §14) says
// nothing may move while a person reads, and both hold.
//
// Under reduced motion there is no clock; PRE, RESULT and FASTER end on a button and every
// engine ends on one.

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Heart, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { difficultyFor } from "@/lives/difficulty";
import { FASTER_MS, PRE_MS, RESULT_MS, type Beat } from "@/lives/layout";
import { seededRng, type Rng } from "@/lives/random";
import { fasterWord, STARTING_LIVES } from "@/lives/score";
import { allowedMs, beginGame, resolveGame, startSession } from "@/lives/session";
import type { GameDefinition, GameResult, SessionState } from "@/lives/types";
import { track } from "@/model/events";
import { Engine } from "./engines";
import { LIFE_TINTS, LifeBean } from "./bean";

const FADE = { duration: 0.18, ease: "easeOut" } as const;

export interface ChaosRunProps {
  pool: readonly GameDefinition[];
  sessionId: string;
  onOver: (state: SessionState) => void;
  onLeave: () => void;
}

interface Frame { state: SessionState; game: GameDefinition; seed: number; gap: "faster" | null }

export function ChaosRun({ pool, sessionId, onOver, onLeave }: ChaosRunProps) {
  const reducedMotion = Boolean(useReducedMotion());
  const [frame, setFrame] = useState<Frame>(() => {
    const begun = beginGame(startSession(sessionId), pool);
    return { state: begun.state, game: begun.game, seed: begun.seed, gap: null };
  });
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(STARTING_LIVES);
  useEffect(() => { track("MODULE_STARTED", { module: "chaos-run", format: "run" }); }, []);

  const advance = useCallback((state: SessionState, faster: boolean) => {
    if (state.over) { onOver(state); return; }
    const begun = beginGame(state, pool);
    setFrame({ state: begun.state, game: begun.game, seed: begun.seed, gap: faster ? "faster" : null });
  }, [onOver, pool]);

  const resolve = useCallback((result: GameResult) => {
    const r = resolveGame(frame.state, result);
    setScore(r.state.score);
    setLives(r.state.lives);
    track("MODULE_STEP_COMPLETED", { module: "chaos-run", step: frame.state.gameIndex, kind: frame.game.engine, hit: result.outcome === "success" });
    return r;
  }, [frame]);

  return (
    <section className="learn-module play-run lives-run" aria-labelledby="lives-run-title" data-game={frame.game.id} data-index={frame.state.gameIndex}>
      <h1 id="lives-run-title" className="sr-only">Chaos Run</h1>
      <div className="play-top">
        <button type="button" className="play-x" aria-label="Leave the run" onClick={onLeave}><X size={20} weight="bold" aria-hidden="true" /></button>
        <div className="play-hut lives-hud">
          <span className="lives-hearts" role="img" aria-label={`${lives} of ${STARTING_LIVES} lives`}>
            {Array.from({ length: STARTING_LIVES }, (_, i) => <Heart key={i} size={18} weight={i < lives ? "fill" : "regular"} aria-hidden="true" />)}
          </span>
          <output className="lives-score t-digit" aria-label="Score">{score}</output>
        </div>
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={`${frame.state.gameIndex}-${frame.gap ?? "game"}`} className="play-stage" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }} transition={FADE}>
          {frame.gap === "faster" ? (
            <FasterCard word={fasterWord(frame.state.successes)} reducedMotion={reducedMotion} onDone={() => setFrame((f) => ({ ...f, gap: null }))} />
          ) : (
            <GameFrame
              key={`${frame.state.gameIndex}`}
              game={frame.game}
              seed={frame.seed}
              difficulty={frame.state.difficulty}
              reducedMotion={reducedMotion}
              onResult={(result) => resolve(result)}
              onAdvance={(r) => advance(r.state, r.faster)}
            />
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

function FasterCard({ word, reducedMotion, onDone }: { word: string; reducedMotion: boolean; onDone: () => void }) {
  useEffect(() => {
    if (reducedMotion) return;
    const t = window.setTimeout(onDone, FASTER_MS);
    return () => window.clearTimeout(t);
  }, [reducedMotion, onDone]);
  return (
    <div className="play-card is-title lives-faster" role="status">
      <p className="play-title lives-shout">{word}</p>
      {reducedMotion && <button type="button" className="play-tempt is-go" onClick={onDone} autoFocus>Go <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>}
    </div>
  );
}

type Resolution = ReturnType<typeof resolveGame>;

/** One game: PRE, ACTIVE on the clock, RESULT, advance. */
function GameFrame({ game, seed, difficulty, reducedMotion, onResult, onAdvance }: { game: GameDefinition; seed: number; difficulty: number; reducedMotion: boolean; onResult: (result: GameResult) => Resolution; onAdvance: (r: Resolution) => void }) {
  const params = difficultyFor(difficulty);
  const allowed = allowedMs(game, difficulty);
  const rng = useRef<Rng>(seededRng(seed));
  const [beat, setBeat] = useState<Beat>("pre");
  const [resolution, setResolution] = useState<Resolution | null>(null);
  const [progress, setProgress] = useState(0);
  const start = useRef<number | null>(null);
  const settled = useRef(false);

  const settle = useCallback((outcome: "success" | "failure" | "timeout", mistakes = 0) => {
    if (settled.current) return;
    settled.current = true;
    const elapsed = start.current === null ? undefined : Math.round(performance.now() - start.current);
    const r = onResult({ outcome, allowedMs: allowed, completionMs: elapsed, reactionTimeMs: elapsed, mistakes });
    setResolution(r);
    setBeat("result");
  }, [allowed, onResult]);

  // PRE → ACTIVE on a short timer; under reduced motion, on the button.
  useEffect(() => {
    if (beat !== "pre" || reducedMotion) return;
    const t = window.setTimeout(() => setBeat("active"), PRE_MS);
    return () => window.clearTimeout(t);
  }, [beat, reducedMotion]);

  // ACTIVE: the clock, from the first frame; a hidden tab pauses it.
  useEffect(() => {
    if (beat !== "active" || reducedMotion) return;
    let raf = 0;
    let hiddenAt: number | null = null;
    const tick = (now: number) => {
      if (start.current === null) start.current = now;
      const p = Math.min(1, (now - start.current) / allowed);
      setProgress(p);
      if (p >= 1) return;
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (document.hidden) { hiddenAt = performance.now(); cancelAnimationFrame(raf); return; }
      if (hiddenAt !== null && start.current !== null) start.current += performance.now() - hiddenAt;
      hiddenAt = null;
      raf = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVisibility); };
  }, [beat, reducedMotion, allowed]);

  // RESULT → next game on a short timer; under reduced motion, on the button.
  useEffect(() => {
    if (beat !== "result" || reducedMotion || !resolution) return;
    const t = window.setTimeout(() => onAdvance(resolution), RESULT_MS);
    return () => window.clearTimeout(t);
  }, [beat, reducedMotion, resolution, onAdvance]);

  const hit = resolution ? resolution.scoreDelta > 0 : null;
  const mood = beat === "result" ? (hit ? "pleased" : "embarrassed") : beat === "active" ? "engaged" : "neutral";
  const tint = LIFE_TINTS[game.character];
  return (
    <div className={`play-card is-round lives-game${beat === "result" ? (hit ? " is-hit" : " is-miss") : ""}`} data-beat={beat} data-engine={game.engine} style={{ background: tint }}>
      {!reducedMotion && beat === "active" && <div className="play-clock" aria-hidden="true"><span style={{ transform: `scaleX(${1 - progress})` }} /></div>}
      <h2 className="play-title lives-shout" tabIndex={-1}>{game.instruction}</h2>
      <div className="lives-stage" data-character={game.character}>
        {game.character !== "random" && <div className="lives-stage-bean"><LifeBean who={game.character} mood={mood} size={beat === "pre" ? 150 : 96} /></div>}
        {beat === "pre" && game.config.kind === "object_search" && game.config.remindBefore && <p className="lives-remind">Get the {game.config.goal}</p>}
        {beat !== "result" && (
          <Engine game={game} live={beat === "active"} rng={rng.current} params={params} allowedMs={allowed} reducedMotion={reducedMotion} progress={progress} onResult={(outcome, mistakes) => settle(outcome, mistakes)} />
        )}
        {beat === "result" && (
          <motion.p className="play-result lives-result" role="status" data-hit={hit ? "true" : "false"} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={FADE}>
            {hit ? `+${resolution!.scoreDelta}` : resolution!.over ? "Out of lives" : "A life"}
          </motion.p>
        )}
      </div>
      {reducedMotion && beat === "pre" && <button type="button" className="play-tempt is-go" onClick={() => setBeat("active")} autoFocus>Go <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>}
      {reducedMotion && beat === "result" && resolution && <button type="button" className="play-tempt is-go" onClick={() => onAdvance(resolution)} autoFocus>Next <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>}
    </div>
  );
}
