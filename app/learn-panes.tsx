"use client";

// The Learn page as two panes (founder-directed, 2026-09-10): GAMES on the left, MODULES on the
// right, a tab pair to switch and a swipe to do the same thing with a thumb.
//
//   Games are other people's moments. The Chaos Run's eight lives, Leo's mosquito, and the twenty
//   bean runs all walk a person through a scene of somebody else's ADHD; what they raise is
//   awareness ("this is me"). Modules are the moves: the sixteen strategy modules the Lives loop
//   recommends from that awareness, and the reads and quizzes about ADHD itself. Two to five
//   minutes each, structured, and ordered "for you" from what the games surfaced.
//
// Before this the Learn tab was one flat stack of twenty-seven tiles that mixed the two, and a
// third library lived at /lives/learn that nothing linked to. One page, two panes, both libraries.
//
// THE WORDS. The gold-standard apps hold about forty words above the fold, so this page holds a
// heading, two tab names, one card and the tiles' titles. What the panes mean is behind the
// walkthrough switch (deleted 2026-09-10: the words went, not into hiding).
//
// EVERY GESTURE NEEDS A TAP EQUIVALENT (the sheet's law): the tabs are the equivalent of the
// swipe, and under reduced motion the swipe is not offered at all.

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowRight, Check, Play } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion, type PanInfo } from "motion/react";
import { CHARACTERS, recentlyCompleted, recommendStrategies, selectGoals, STRATEGIES, strategy, type LearningDomain, type StrategyDefinition } from "@/lives";
import { MODULES, type LearnModule } from "@/learn/scenes";
import type { Progress } from "@/learn/progress";
import type { LearnCursor } from "@/learn/cursor";
import { deviceLearningStorage } from "@/learn/cursor";
import { LearningCoverArt, LearningScene } from "./learning-scene";
import { LifeBean } from "./lives/bean";
import { LeoBedroom } from "./lives/leo-mosquito";
import { useProfile } from "./lives/profile-hook";
import { Bean } from "./play/beans";

export type Pane = "games" | "modules";
export const PANES: readonly Pane[] = ["games", "modules"];
export const PANE_KEY = "adhdme.learn.pane.v1";

const SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.85 } as const;
const POP = { type: "spring", stiffness: 520, damping: 28 } as const;

/** The strategy shelves, by life area (the /lives/learn shelves, unchanged). */
const STRATEGY_SHELVES: ReadonlyArray<{ title: string; domains: readonly LearningDomain[] }> = [
  { title: "Sleep", domains: ["sleep"] },
  { title: "Work and study", domains: ["attention", "prioritisation", "working_memory"] },
  { title: "Relationships", domains: ["relationships", "communication"] },
  { title: "Getting things done", domains: ["task_initiation", "time_management", "transitions", "planning", "organisation"] },
  { title: "Managing overwhelm", domains: ["sensory_management", "emotional_regulation", "impulsivity", "environment"] },
  { title: "Understanding your ADHD", domains: ["mindfulness", "self_understanding"] },
];

const GOALS: ReadonlyArray<{ id: LearningDomain; label: string }> = [
  { id: "sleep", label: "Sleep" },
  { id: "attention", label: "Focus" },
  { id: "task_initiation", label: "Getting started" },
  { id: "time_management", label: "Time" },
  { id: "relationships", label: "Relationships" },
  { id: "sensory_management", label: "Overwhelm" },
  { id: "working_memory", label: "Remembering things" },
];

const COVER_RAMP = ["amber", "oat", "forest", "lilac", "coral", "slate", "saffron", "night"] as const;
const COLLECTION_COLOURS: Readonly<Record<string, string>> = {
  adhd: "amber", everyday: "oat", "myth-or-fact": "forest", words: "lilac", finding: "coral", cost: "slate", changed: "saffron",
  context: "amber", "more-than-attention": "oat", starting: "coral", deadlines: "lilac", "working-memory": "slate", hyperfocus: "saffron",
  ambiguity: "oat", interruption: "lilac", perfectionism: "amber",
  "not-listening": "forest", "forgotten-commitments": "oat", conflict: "coral",
  household: "saffron", sleep: "slate", exercise: "forest",
};
const coverOf = (module: LearnModule) => COLLECTION_COLOURS[module.id] ?? COVER_RAMP[MODULES.indexOf(module) % COVER_RAMP.length]!;

/** The pane for this page load when the store is denied: the last one written, else games. */
let memoryPane: Pane = "games";

export function readPane(): Pane {
  try {
    const raw = window.localStorage.getItem(PANE_KEY);
    if (raw === "modules" || raw === "games") return raw;
  } catch {
    // A denied store: the memory below is the record.
  }
  return memoryPane;
}

export function writePane(pane: Pane): void {
  memoryPane = pane;
  try {
    window.localStorage.setItem(PANE_KEY, pane);
  } catch {
    // Memory only.
  }
}

export interface LearnPanesProps {
  progress: Progress;
  cursor: LearnCursor | null;
  completed: string | null;
  hydrated: boolean;
  start: (id: string, resume?: boolean) => void;
  reset: () => void;
  finished: number;
}

export function LearnPanes({ progress, cursor, completed, hydrated, start, reset, finished }: LearnPanesProps) {
  const params = useSearchParams();
  const reducedMotion = useReducedMotion();
  const [pane, setPane] = useState<Pane>("games");
  const [direction, setDirection] = useState<1 | -1>(1);

  useEffect(() => {
    const asked = params.get("pane");
    setPane(asked === "modules" || asked === "games" ? asked : readPane());
  }, [params]);

  function go(next: Pane) {
    if (next === pane) return;
    setDirection(PANES.indexOf(next) > PANES.indexOf(pane) ? 1 : -1);
    setPane(next);
    writePane(next);
  }

  function onDragEnd(_event: unknown, info: PanInfo) {
    const swipe = info.offset.x + info.velocity.x * 0.2;
    if (swipe < -60) go("modules");
    else if (swipe > 60) go("games");
  }

  const variants = {
    enter: (d: 1 | -1) => ({ x: d * 48, opacity: 0 }),
    centre: { x: 0, opacity: 1 },
    exit: (d: 1 | -1) => ({ x: d * -48, opacity: 0 }),
  };

  return (
    <section className="learn-panes" aria-labelledby="learn-list-title">
      <h2 id="learn-list-title" className="sr-only">ADHD, in your own time.</h2>
      <div className="learn-pane-tabs" role="tablist" aria-label="Games or modules">
        {PANES.map((p) => (
          <button
            key={p}
            type="button"
            role="tab"
            id={`learn-tab-${p}`}
            aria-selected={pane === p}
            aria-controls="learn-pane-panel"
            className={`learn-pane-tab${pane === p ? " is-active" : ""}`}
            onClick={() => go(p)}
            data-testid={`learn-tab-${p}`}
          >
            {p === "games" ? "Games" : "Modules"}
          </button>
        ))}
      </div>
      <div id="learn-pane-panel" role="tabpanel" aria-labelledby={`learn-tab-${pane}`} data-pane={pane}>
        <AnimatePresence initial={false} custom={direction} mode="wait">
          <motion.div
            key={pane}
            custom={direction}
            variants={reducedMotion ? undefined : variants}
            initial="enter"
            animate="centre"
            exit="exit"
            transition={{ ...SPRING, opacity: { duration: 0.18 } }}
            drag={reducedMotion ? false : "x"}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.12}
            dragSnapToOrigin
            onDragEnd={onDragEnd}
            className="learn-pane"
          >
            {pane === "games" ? (
              <GamesPane progress={progress} completed={completed} hydrated={hydrated} start={start} reducedMotion={!!reducedMotion} />
            ) : (
              <ModulesPane progress={progress} cursor={cursor} completed={completed} hydrated={hydrated} start={start} reducedMotion={!!reducedMotion} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
      {(finished > 0 || cursor) && (
        <button className="learn-reset" type="button" onClick={reset}>
          Reset learning progress on this device
        </button>
      )}
    </section>
  );
}

function Tile({ module, done, hydrated, index, start, reducedMotion }: { module: LearnModule; done: boolean; hydrated: boolean; index: number; start: (id: string) => void; reducedMotion: boolean }) {
  const colour = coverOf(module);
  return (
    <motion.li
      initial={hydrated && !reducedMotion ? { opacity: 0 } : false}
      animate={{ opacity: 1 }}
      transition={{ ...POP, delay: Math.min(index * 0.035, 0.25), opacity: { duration: 0.22, delay: Math.min(index * 0.035, 0.25) } }}
    >
      <motion.button
        type="button"
        className={`learn-card is-${colour}${done ? " is-done" : ""}${module.kind === "quiz" ? " is-quiz" : ""}`}
        onClick={() => start(module.id)}
        whileTap={reducedMotion ? undefined : { scale: 0.985 }}
        transition={POP}
      >
        <span className="learn-card-text">
          <strong>{module.title}</strong>
          {/* The name carries what the tile does not show: a screen reader is not looking at it. */}
          <span className="sr-only">
            {`. ${module.subtitle}. ${module.kind === "quiz" ? "Quiz" : module.kind === "run" ? "Game" : "Read"}, ${module.minutes} minutes.`}
          </span>
          {done && (
            <span className="learn-card-done">
              <Check size={12} weight="bold" aria-hidden="true" />
              Done
            </span>
          )}
        </span>
        <span className="learn-card-art" aria-hidden="true">
          {module.kind === "run" && module.run ? <Bean who={module.run.bean} mood="engaged" size={72} /> : <LearningCoverArt id={module.id} />}
        </span>
      </motion.button>
    </motion.li>
  );
}

function Completion({ completed, start }: { completed: string | null; start: (id: string) => void }) {
  const module = completed ? MODULES.find((m) => m.id === completed) : undefined;
  if (!module) return null;
  return (
    <div className="learning-feature learning-completion">
      <div role="status">
        {module.kind === "run" ? (
          <>
            <h2>Your picture just got sharper.</h2>
            <Link className="learn-secondary" href="/my-adhd">
              See My ADHD <ArrowRight size={17} weight="bold" aria-hidden="true" />
            </Link>
          </>
        ) : (
          <>
            <h2>Done.</h2>
            <button className="learn-secondary" type="button" onClick={() => start(module.id)}>
              Read again
            </button>
          </>
        )}
      </div>
      <LearningScene topic={module.id} reaction="complete" />
    </div>
  );
}

const FIRST_TILES = 8;

function GamesPane({ progress, completed, hydrated, start, reducedMotion }: { progress: Progress; completed: string | null; hydrated: boolean; start: (id: string) => void; reducedMotion: boolean }) {
  const [showAll, setShowAll] = useState(false);
  const allRuns = MODULES.filter((m) => m.kind === "run");
  const runs = showAll ? allRuns : allRuns.filter((m, i) => i < FIRST_TILES || progress.done.includes(m.id));
  const completedRun = completed && MODULES.find((m) => m.id === completed)?.kind === "run" ? completed : null;
  return (
    <>
      <Completion completed={completedRun} start={start} />
      <div className="learn-pane-top">
      <div className="learn-play-card">
        <div className="lives-cast" aria-hidden="true">
          {CHARACTERS.map((c) => (
            <LifeBean key={c.id} who={c.id} mood="engaged" size={40} />
          ))}
        </div>
        <Link className="play-tempt is-go lives-play" href="/lives/play" data-testid="learn-play">
          <Play size={20} weight="fill" aria-hidden="true" /> Play
        </Link>
        <Link className="learn-play-cast-link" href="/lives/characters">
          The eight lives <ArrowRight size={16} weight="bold" aria-hidden="true" />
        </Link>
      </div>
      <Link className="leo-feature" href="/lives/play/leo-mosquito">
        <span className="leo-feature-art">
          <LeoBedroom />
        </span>
        <span>
          <strong>One tiny sound.</strong>
          <span>
            Play Leo&rsquo;s moment <ArrowRight size={18} />
          </span>
        </span>
      </Link>
      </div>
      <ol className="learn-stack" data-testid="learn-games">
        {runs.map((module, index) => (
          <Tile key={module.id} module={module} done={progress.done.includes(module.id)} hydrated={hydrated} index={index} start={start} reducedMotion={reducedMotion} />
        ))}
      </ol>
      {!showAll && allRuns.length > FIRST_TILES && (
        <button type="button" className="learn-secondary learn-show-all" onClick={() => setShowAll(true)} data-testid="learn-show-all">
          All {allRuns.length} games
        </button>
      )}
    </>
  );
}

function ModulesPane({ progress, cursor, completed, hydrated, start, reducedMotion }: { progress: Progress; cursor: LearnCursor | null; completed: string | null; hydrated: boolean; start: (id: string, resume?: boolean) => void; reducedMotion: boolean }) {
  const { profile, apply } = useProfile();
  const reads = MODULES.filter((m) => m.kind !== "run");
  const completedRead = completed && MODULES.find((m) => m.id === completed)?.kind !== "run" ? completed : null;
  const done = profile?.completedModuleIds ?? [];
  const goals = profile?.selectedGoals ?? [];
  const toggle = (id: LearningDomain) => apply((s) => selectGoals(s, goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id].slice(0, 3)));
  const forYou = useMemo(() => {
    if (!profile) return [];
    return recommendStrategies(
      {
        encounteredGameIds: [],
        encounteredCharacterIds: [],
        resonanceSignals: profile.resonanceSignals,
        savedStrategyIds: profile.savedStrategyIds,
        completedModuleIds: profile.completedModuleIds,
        recentlyCompletedModuleIds: recentlyCompleted(profile),
        dismissedStrategyIds: profile.dismissedStrategyIds,
        selectedGoals: profile.selectedGoals,
      },
      STRATEGIES,
    )
      .filter((r) => r.score > 0)
      .map((r) => r.strategy);
  }, [profile]);
  const started = profile?.saved.find((s) => s.status === "started");
  const quick = STRATEGIES.filter((s) => s.estimatedMinutes <= 2);
  const continuing = cursor ? MODULES.find((m) => m.id === cursor.moduleId) : undefined;

  return (
    <>
      <Completion completed={completedRead} start={start} />
      <div className="learning-feature">
        <div>
          <h2>Get to know ADHD.</h2>
          <button className="learn-primary" type="button" onClick={() => start(cursor?.moduleId ?? "adhd", Boolean(cursor))}>
            {continuing ? `Continue ${continuing.title}` : "Start here"} <ArrowRight size={18} aria-hidden="true" />
          </button>
        </div>
        <LearningScene />
      </div>
      {started && (
        <ul className="lives-rows">
          <li>
            <Link className="lives-row" href={`/lives/learn?module=${encodeURIComponent(strategy(started.strategyId).moduleId)}`}>
              <span className="lives-row-text">
                <strong>Continue {strategy(started.strategyId).title}</strong>
                <span>{strategy(started.strategyId).estimatedMinutes} min</span>
              </span>
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          </li>
        </ul>
      )}
      {forYou.length > 0 && <Shelf title="For you" strategies={forYou} done={done} open />}
      <details className="lives-shelf learn-shelf" data-shelf="reads">
        <summary className="lives-section-title">Understand ADHD</summary>
      <ol className="learn-stack" data-testid="learn-reads">
        {reads.map((module, index) => (
          <Tile key={module.id} module={module} done={progress.done.includes(module.id)} hydrated={hydrated} index={index} start={start} reducedMotion={reducedMotion} />
        ))}
      </ol>
      </details>
      <Shelf title="Two-minute tools" strategies={quick} done={done} />
      {STRATEGY_SHELVES.map((shelf) => {
        const rows = STRATEGIES.filter((s) => s.domains.some((d) => shelf.domains.includes(d)) && !quick.includes(s));
        return rows.length ? <Shelf key={shelf.title} title={shelf.title} strategies={rows} done={done} /> : null;
      })}
      <ul className="lives-rows learn-more-rows">
        <li>
          <Link className="lives-row" href="/lives/toolkit">
            <span className="lives-row-text">
              <strong>Your Toolkit</strong>
            </span>
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </li>
        <li>
          <Link className="lives-row" href="/approach/meditate">
            <span className="lives-row-text">
              <strong>A quiet moment</strong>
              <span>5 min</span>
            </span>
            <ArrowRight size={16} weight="bold" aria-hidden="true" />
          </Link>
        </li>
      </ul>
      <details className="life-why lives-goals">
        <summary>What would you most like help with?</summary>
        <div className="lives-chips" role="group" aria-label="Goals">
          {GOALS.map((g) => (
            <button key={g.id} type="button" className="lives-chip" aria-pressed={goals.includes(g.id)} onClick={() => toggle(g.id)}>
              {g.label}
            </button>
          ))}
        </div>
      </details>
    </>
  );
}

function Shelf({ title, strategies, done, open = false }: { title: string; strategies: readonly StrategyDefinition[]; done: readonly string[]; open?: boolean }) {
  const id = `shelf-${title.replace(/\W+/g, "-").toLowerCase()}`;
  return (
    <details className="lives-shelf learn-shelf" open={open} data-shelf={id}>
      <summary className="lives-section-title" id={id}>
        {title}
      </summary>
      <ul className="lives-rows">
        {strategies.map((s) => (
          <li key={s.id}>
            <Link className="lives-row" href={`/lives/learn?module=${encodeURIComponent(s.moduleId)}`} data-strategy={s.id}>
              <span className="lives-row-text">
                <strong>{s.title}</strong>
                <span>
                  {s.estimatedMinutes} min{done.includes(s.moduleId) ? " · done" : ""}
                </span>
              </span>
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          </li>
        ))}
      </ul>
    </details>
  );
}

export { deviceLearningStorage };
