"use client";

// The Chaos Run (PRD §2 Loop A, §4, §44, §57–§62, §89): title → game → game → FASTER → … → score.
// The engine (`src/lives/`) decides which game, how hard, what the scene is and what a result is
// worth; this component drives the beats on one clock and draws them. Layout after Dumb Ways to
// Die 2's structure (docs/adhd-lives/DESIGN-dwtd2.md): a shouted instruction, a bar that drains,
// three lives, a score, a one-word FASTER between games. Calm (PLAY-PLAN §14) outside the
// microgame: nothing on a card moves position; inside it the game moves and the instruction is
// the one line. Under reduced motion there is no clock and every beat ends on a button.

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, Play, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { allowedMs, beginGame, CHARACTERS, fasterWord, GAMES, hashSeed, layoutGame, recordHighScore, resolveGame, startSession, type CharacterId, type GameDefinition, type GameResult, type GameScene, type SessionState } from "@/lives";
import { track } from "@/model/events";
import { LifeBean, type LifeMood } from "./bean";
import { Engine, EXPIRY_IS_SUCCESS, type EngineResult } from "./engines";
import { Results } from "./results";
import { LIVES_TUTORED_KEY, readFlag, useProfile, writeFlag } from "./profile-hook";

const FADE = { duration: 0.18, ease: "easeOut" } as const;
/** §44: INTRO 350–800 ms; RESOLUTION 500–1500 ms; TRANSITION 150–350 ms. §59: FASTER 700 ms. */
const INTRO_MS = 650;
const REMIND_MS = 800;
const RESOLVE_MS = { success: 700, failure: 1300 } as const;
const FASTER_MS = 700;
/** §89: input from the last game cannot land on this one — the new game arms after a beat. */
const ARM_MS = 150;

const TUTORIAL: ReadonlyArray<{ line: string; mood: LifeMood }> = [
  { line: "The line at the top says what to do. The bar under it is the clock.", mood: "engaged" },
  { line: "Three lives. A miss costs one, and the run goes on.", mood: "thinking" },
  { line: "After the run, some moments may look familiar. That part is yours to skip.", mood: "pleased" },
];

/** §61: failure is a comedic outcome, then the next game. One line per engine, in the character's life. */
const LINES: Record<GameDefinition["engine"], { win: string; lose: string }> = {
  target_swat: { win: "Got it.", lose: "It got away." },
  semantic_filter: { win: "Locked in.", lose: "Gone. Completely gone." },
  trace_path: { win: "Across, in one piece.", lose: "Everything at once." },
  inhibition: { win: "Not sent. Still friends.", lose: "Sent. All fourteen of them." },
  object_search: { win: "That was it.", lose: "Why was I in here?" },
  goal_protection: { win: "Just milk.", lose: "The trolley is full." },
  hold_release: { win: "Said it, at the right moment.", lose: "The thought escaped." },
  rapid_sorting: { win: "Sorted.", lose: "Wrong pile." },
  wipe_scrub: { win: "Quieter.", lose: "Still loud." },
  precision_timing: { win: "Right on time.", lose: "Missed the moment." },
};

type Phase = "title" | "intro" | "active" | "resolution" | "faster" | "over";

interface Current { readonly game: GameDefinition; readonly scene: GameScene; readonly seed: number; readonly allowed: number; readonly instance: number }

export function ChaosRun({ seed }: { seed?: string }) {
  const reducedMotion = Boolean(useReducedMotion());
  const { profile, apply } = useProfile();
  const [session, setSession] = useState<SessionState | null>(null);
  const [phase, setPhase] = useState<Phase>("title");
  const [current, setCurrent] = useState<Current | null>(null);
  const [tutorial, setTutorial] = useState<number | null>(null);
  const [last, setLast] = useState<{ outcome: GameResult["outcome"]; line: string; delta: number; lostLife: boolean } | null>(null);
  const [faster, setFaster] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [elapsed, setElapsed] = useState(0);
  const [armed, setArmed] = useState(false);
  const [reminding, setReminding] = useState(false);
  const started = useRef<number | null>(null);
  const highBefore = useRef(0);

  useEffect(() => { setTutorial(readFlag(LIVES_TUTORED_KEY) ? -1 : 0); }, []);
  // The high score to beat is read before a run begins, never during one: the last game writes the
  // new score to the profile before the score screen opens, and "New high score" compares against
  // what stood before it.
  useEffect(() => { if (profile && phase === "title") highBefore.current = profile.highScore; }, [profile, phase]);

  const pool = GAMES;

  /** Begin the next game: the director picks, the engine lays it out, the intro shows. */
  const nextGame = useCallback((state: SessionState) => {
    const begun = beginGame(state, pool);
    const scene = layoutGame(begun.game, begun.state.difficulty, begun.seed);
    setSession(begun.state);
    setCurrent({ game: begun.game, scene, seed: begun.seed, allowed: allowedMs(begun.game, begun.state.difficulty), instance: begun.state.gameIndex });
    setLast(null);
    setProgress(0);
    setElapsed(0);
    setArmed(false);
    started.current = null;
    setReminding(Boolean(scene.remind));
    setPhase("intro");
    track("MINIGAME_STARTED", { game: begun.game.id, difficulty: begun.state.difficulty, index: begun.state.gameIndex });
  }, [pool]);

  const start = () => {
    const id = seed ?? `${Date.now().toString(36)}-${Math.floor(Math.random() * 1e6).toString(36)}`;
    const state = startSession(id);
    track("SESSION_STARTED", { seeded: Boolean(seed) });
    nextGame(state);
  };

  /** A result: the engine resolves it, the beat shows it, then FASTER or the next game or the end. */
  const settle = useCallback((result: EngineResult | { outcome: "timeout" }) => {
    if (!session || !current || phase !== "active") return;
    const completion = started.current === null ? current.allowed : Math.min(current.allowed, performance.now() - started.current);
    const engineResult: GameResult = { outcome: result.outcome, allowedMs: current.allowed, completionMs: reducedMotion ? current.allowed / 2 : completion, mistakes: "mistakes" in result ? result.mistakes : 0 };
    const resolution = resolveGame(session, engineResult);
    setSession(resolution.state);
    const success = result.outcome === "success";
    setLast({ outcome: result.outcome, line: ("line" in result && result.line) || LINES[current.game.engine][success ? "win" : "lose"], delta: resolution.scoreDelta, lostLife: resolution.lostLife });
    setFaster(resolution.faster ? fasterWord(resolution.state.successes) : null);
    setPhase("resolution");
    track(success ? "MINIGAME_SUCCESS" : "MINIGAME_FAILURE", { game: current.game.id, difficulty: session.difficulty, outcome: result.outcome });
    if (resolution.faster) track("DIFFICULTY_INCREASED", { to: resolution.state.difficulty });
    if (resolution.over) { apply((s) => recordHighScore(s, resolution.state.score)); track("SESSION_COMPLETED", { games: resolution.state.completedGames, score: resolution.state.score }); }
  }, [session, current, phase, reducedMotion, apply]);

  /** After the resolution beat: FASTER, the next game, or the end. */
  const advance = useCallback(() => {
    if (!session) return;
    if (session.over) { setPhase("over"); return; }
    if (faster && phase === "resolution") { setPhase("faster"); return; }
    nextGame(session);
  }, [session, faster, phase, nextGame]);

  // The beats on timers, motion only. Under reduced motion each beat ends on a button.
  useEffect(() => {
    if (reducedMotion) return;
    let t = 0;
    if (phase === "intro") t = window.setTimeout(() => { if (reminding) { setReminding(false); t = window.setTimeout(() => setPhase("active"), INTRO_MS); } else setPhase("active"); }, reminding ? REMIND_MS : INTRO_MS);
    if (phase === "resolution") t = window.setTimeout(advance, last?.outcome === "success" ? RESOLVE_MS.success : RESOLVE_MS.failure);
    if (phase === "faster") t = window.setTimeout(() => session && nextGame(session), FASTER_MS);
    return () => window.clearTimeout(t);
  }, [phase, reducedMotion, reminding, advance, last, session, nextGame]);

  // The clock: one rAF loop per active game, paused while the tab is hidden, armed after a beat (§89).
  useEffect(() => {
    if (phase !== "active" || !current) return;
    const arm = window.setTimeout(() => setArmed(true), ARM_MS);
    if (reducedMotion) return () => window.clearTimeout(arm);
    let raf = 0;
    let hiddenAt: number | null = null;
    const tick = (now: number) => {
      if (started.current === null) started.current = now;
      const e = now - started.current;
      const p = Math.min(1, e / current.allowed);
      setElapsed(e);
      setProgress(p);
      if (p >= 1) { settleRef.current(EXPIRY_IS_SUCCESS.has(current.game.engine) ? { outcome: "success", mistakes: 0 } : { outcome: "timeout" }); return; }
      raf = requestAnimationFrame(tick);
    };
    const onVisibility = () => {
      if (document.hidden) { hiddenAt = performance.now(); cancelAnimationFrame(raf); return; }
      if (hiddenAt !== null && started.current !== null) started.current += performance.now() - hiddenAt;
      hiddenAt = null;
      raf = requestAnimationFrame(tick);
    };
    document.addEventListener("visibilitychange", onVisibility);
    raf = requestAnimationFrame(tick);
    return () => { window.clearTimeout(arm); cancelAnimationFrame(raf); document.removeEventListener("visibilitychange", onVisibility); };
  }, [phase, current, reducedMotion]);
  const settleRef = useRef(settle);
  useEffect(() => { settleRef.current = settle; }, [settle]);

  const who: CharacterId | null = current && current.game.character !== "random" ? current.game.character : null;
  const mood: LifeMood = phase === "resolution" ? (last?.outcome === "success" ? "pleased" : "embarrassed") : phase === "active" ? "engaged" : "neutral";
  const endTutorial = () => { writeFlag(LIVES_TUTORED_KEY, true); setTutorial(-1); };

  if (phase === "over" && session) {
    return <Results session={session} highBefore={highBefore.current} onAgain={() => { setPhase("title"); setSession(null); setCurrent(null); }} />;
  }

  return (
    <section className="lives-run play-run" aria-labelledby="lives-run-title" data-phase={phase}>
      <h1 id="lives-run-title" className="sr-only">ADHD Lives</h1>
      <div className="play-top lives-top">
        <Link className="play-x" href="/lives" aria-label="Leave the run"><X size={20} weight="bold" aria-hidden="true" /></Link>
        {session && !session.over && phase !== "title" && <Hud session={session} who={who} />}
      </div>
      <AnimatePresence mode="wait" initial={false}>
        <motion.div key={phase === "title" ? `title-${tutorial}` : `${current?.instance ?? 0}-${phase === "faster" ? "faster" : "game"}`} className="play-stage lives-stage" initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} exit={reducedMotion ? undefined : { opacity: 0, transition: { duration: 0.12 } }} transition={FADE}>
          {phase === "title" && tutorial !== null && tutorial >= 0 && (
            <div className="play-card is-title lives-card" role="group" aria-label="How to play">
              <LifeBean who={CHARACTERS[tutorial % CHARACTERS.length]!.id} mood={TUTORIAL[tutorial]!.mood} size={160} className="play-hero-bean" />
              <h2 className="play-title">{TUTORIAL[tutorial]!.line}</h2>
              <button type="button" className="play-tempt is-go" onClick={() => (tutorial + 1 < TUTORIAL.length ? setTutorial(tutorial + 1) : endTutorial())} autoFocus>{tutorial + 1 < TUTORIAL.length ? "Next" : "Got it"} <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>
            </div>
          )}
          {phase === "title" && (tutorial === null || tutorial < 0) && (
            <div className="play-card is-title lives-card">
              <div className="lives-cast" aria-hidden="true">{CHARACTERS.slice(0, 4).map((c) => <LifeBean key={c.id} who={c.id} mood="engaged" size={72} />)}</div>
              <h2 className="play-title">Eight lives. Three of yours.</h2>
              <p className="play-line">Everything was under control thirty seconds ago.</p>
              <button type="button" className="play-tempt is-go lives-play" onClick={start} autoFocus><Play size={18} weight="fill" aria-hidden="true" /> Play</button>
            </div>
          )}

          {phase === "faster" && (
            <div className="play-card lives-card lives-faster" role="status">
              <p className="lives-faster-word">{faster}</p>
              {reducedMotion && <button type="button" className="play-tempt is-go" onClick={() => session && nextGame(session)} autoFocus>Go <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>}
            </div>
          )}

          {(phase === "intro" || phase === "active" || phase === "resolution") && current && session && (
            <div className={`play-card is-round lives-card lives-game${phase === "resolution" ? (last?.outcome === "success" ? " is-hit" : " is-miss") : ""}`} data-beat={phase} data-game={current.game.id} data-seed={current.seed}>
              {/* DESIGN-dwtd2.md: the game's name small over the shouted verb, on the intro beat only. */}
              {phase === "intro" && !reminding && <p className="lives-game-title">{current.game.title}</p>}
              <p className="lives-shout" aria-live="assertive" tabIndex={-1}>{phase === "intro" && reminding && current.scene.remind ? current.scene.remind : current.game.instruction}</p>
              {!reducedMotion && <div className="lives-clock" aria-hidden="true"><span style={{ transform: `scaleX(${phase === "active" ? 1 - progress : phase === "resolution" ? 0 : 1})` }} /></div>}
              <div className="lives-scene" data-engine={current.game.engine}>
                {who && <div className="lives-scene-bean"><LifeBean who={who} mood={mood} size={phase === "active" ? 72 : 120} /></div>}
                {phase === "active" && (
                  <Engine key={current.instance} game={current.game} scene={current.scene} live={armed} reducedMotion={reducedMotion} progress={progress} elapsedMs={elapsed} onResult={settle} />
                )}
                {phase === "resolution" && last && (
                  <motion.div className="lives-result" role="status" data-hit={last.outcome === "success" ? "true" : "false"} initial={reducedMotion ? false : { opacity: 0 }} animate={{ opacity: 1 }} transition={FADE}>
                    <p className="play-line lives-result-line">{last.line}</p>
                    {last.outcome === "success" ? <p className="lives-delta">+{last.delta}</p> : <p className="lives-delta is-life">One life gone</p>}
                  </motion.div>
                )}
              </div>
              {reducedMotion && phase === "intro" && <button type="button" className="play-tempt is-go" onClick={() => { setReminding(false); setPhase("active"); }} autoFocus>Go <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>}
              {reducedMotion && phase === "resolution" && <button type="button" className="play-tempt is-go" onClick={advance} autoFocus>{session.over ? "See the score" : "Next"} <ArrowRight size={16} weight="bold" aria-hidden="true" /></button>}
            </div>
          )}
        </motion.div>
      </AnimatePresence>
    </section>
  );
}

/** §60–§61: lives as three of the current bean, the score as a number. */
function Hud({ session, who }: { session: SessionState; who: CharacterId | null }) {
  const lives = useMemo(() => Array.from({ length: 3 }, (_, i) => i < session.lives), [session.lives]);
  return (
    <div className="play-hut lives-hud">
      <span className="lives-lives" role="img" aria-label={`${session.lives} of 3 lives`}>
        {lives.map((alive, i) => <span key={i} className={`lives-life${alive ? "" : " is-lost"}`} aria-hidden="true"><LifeBean who={who ?? "maya"} mood={alive ? "neutral" : "embarrassed"} size={22} /></span>)}
      </span>
      <span className="lives-score t-digit" aria-label={`Score ${session.score}`}>{session.score.toLocaleString("en-AU")}</span>
    </div>
  );
}

/** A URL seed is a fact about the run and nothing about the person (§90). */
export function seedFrom(param: string | null): string | undefined {
  if (!param) return undefined;
  const clean = param.replace(/[^a-z0-9_-]/gi, "").slice(0, 40);
  return clean ? `seed-${hashSeed(clean).toString(36)}` : undefined;
}
