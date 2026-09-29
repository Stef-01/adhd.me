"use client";

// The Learn page as two panes (founder-directed, 2026-09-10): GAMES on the left, MODULES on the
// right, a tab pair to switch and a swipe to do the same thing with a thumb.
//
//   Games are other people's moments. The Chaos Run's eight lives, Leo's mosquito, and the twenty
//   bean runs all walk a person through a scene of somebody else's ADHD; what they raise is
//   awareness ("this is me"). Modules are the moves: the nineteen strategy modules the Lives loop
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
import { ArrowRight, CaretDown, Check, Play } from "@phosphor-icons/react";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "motion/react";
import { reasonLine, recentlyCompleted, recommendStrategies, selectGoals, skipGoals, STRATEGIES, strategy, type LearningDomain, type StrategyDefinition } from "@/lives";
import { MODULES, type LearnModule } from "@/learn/scenes";
import type { Progress } from "@/learn/progress";
import type { LearnCursor } from "@/learn/cursor";
import { resumable } from "@/learn/cursor";
import { LearningCoverArt, LearningScene } from "./learning-scene";
import { LifeBean } from "./lives/bean";
import { GAME_ENTRY } from "@/lives/entry-points";
import { useProfile } from "./lives/profile-hook";
import { usePlayed } from "./lives/played-hook";
import { GAME_GROUPS, LIFE_GAMES, RUN_GAMES, tryFirst, type GameItem } from "@/learn/games";
import { Bean } from "./play/beans";

export type Pane = "games" | "modules";
export const PANES: readonly Pane[] = ["games", "modules"];
export const PANE_KEY = "adhdme.learn.pane.v1";

const SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.85 } as const;
const POP = { type: "spring", stiffness: 520, damping: 28 } as const;

/**
 * How far a thumb may wander before the pane calls it a swipe rather than a tap. Motion's own
 * threshold is three pixels, which is narrower than a thumb: resting on a tile and pressing was
 * enough to start the pane moving under it. Measured 2026-09-11, a fourteen-pixel wobble now
 * leaves the pane at 0.00px and a real swipe still switches in both directions. The tabs remain
 * the tap equivalent of the swipe either way.
 */
const TAP_SLOP = 24;

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

export function LearnPanes({ progress, cursor, completed, hydrated, start }: LearnPanesProps) {
  const params = useSearchParams();
  const reducedMotion = useReducedMotion();
  const played = usePlayed();
  const { profile } = useProfile();
  // Anything either pane has written to this device: a game or module done, a goal, a strategy.
  const saved = hydrated && (
    progress.done.length > 0 ||
    Object.keys(played.at).length > 0 ||
    (profile?.selectedGoals?.length ?? 0) > 0 ||
    (profile?.completedModuleIds.length ?? 0) > 0 ||
    (profile?.saved.length ?? 0) > 0
  );
  const [pane, setPane] = useState<Pane>("games");
  const [direction, setDirection] = useState<1 | -1>(1);
  const swipe = useDragControls();

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
    const travel = info.offset.x + info.velocity.x * 0.2;
    if (travel < -60) go("modules");
    else if (travel > 60) go("games");
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
            dragControls={swipe}
            dragListener={false}
            onPointerDown={reducedMotion ? undefined : (e) => swipe.start(e, { distanceThreshold: TAP_SLOP })}
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
      {saved && <p className="learn-saved">Saved on this device.</p>}
    </section>
  );
}

/** A drop's spring: quick, and it overshoots a touch before it settles. */
const DROP = { type: "spring", stiffness: 520, damping: 16, mass: 0.7 } as const;

/* No light follows the finger any more (founder, 2026-09-11: "it should just be a bubble not
   shimmer"). Each tile is a bubble of its own colour that holds its light in one place, built in
   app/styles/glass.css; app/glass/glass-pointer.tsx keeps only the point a TAP landed on, which is
   where that tap's bubble opens from. The four pointer handlers each tile used to carry are gone,
   and with them the chance that one of them was what swallowed a tap. */

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
        whileTap={reducedMotion ? undefined : { scale: 0.955 }}
        transition={reducedMotion ? POP : DROP}
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

/**
 * The games pane (PLAN.md W7): one line that says what these are, the one primary, three to try
 * first, and every game one tap away under "All games", ticked when played. "All games" sits beside
 * the primary and takes the three's place below it, opening on the eight lives, so the button stays
 * put and the open list stays one screen. No date and no result on any tile (D2); the page foot
 * says where that is kept.
 */
function GamesPane({ progress, completed, hydrated, start, reducedMotion: _reduced }: { progress: Progress; completed: string | null; hydrated: boolean; start: (id: string) => void; reducedMotion: boolean }) {
  const { profile } = useProfile();
  const played = usePlayed();
  const [all, setAll] = useState(false);
  const [group, setGroup] = useState<string | null>(null);
  // The three depend on the goals and on what has been played, both read from the device after
  // mount. Until then the list holds its space empty, so three tiles never show and then swap.
  const ready = hydrated && profile !== null;
  const goals = ready ? profile.selectedGoals ?? [] : [];
  const isPlayed = (g: GameItem) => (g.kind === "run" ? progress.done.includes(g.id) : Boolean(played.at[g.id]));
  const first = ready ? tryFirst(goals, isPlayed) : [];
  // Until the device has been read, the default three stand in, hidden, so the space they hold is
  // the real tiles' own height and nothing below moves when the real three arrive.
  const shown = ready ? first : tryFirst([], () => false);
  const anyPlayed = hydrated && [...LIFE_GAMES, ...RUN_GAMES].some(isPlayed);
  const completedRun = completed && MODULES.find((m) => m.id === completed)?.kind === "run" ? completed : null;
  return (
    <div className="learn-games-scope" data-liquid>
      <Completion completed={completedRun} start={start} />
      <p className="learn-pane-line">Short scenes from everyday life.</p>
      <div className="learn-game-toolbar">
        <Link className="learn-secondary learn-mix-link" href="/lives/play" data-testid="learn-play"><Play size={18} weight="fill" aria-hidden="true" />Play mix</Link>
        <button
          type="button"
          className="learn-secondary learn-show-all learn-all-games"
          aria-expanded={all}
          onClick={() => {
            setAll(!all);
            setGroup(all ? null : GAME_GROUPS[0]!.title);
          }}
          data-testid="learn-show-all"
        >
          All games
          {anyPlayed && <Check className="learn-played-tick" size={16} weight="bold" aria-hidden="true" data-testid="learn-played-tick" />}
          <CaretDown size={16} weight="bold" aria-hidden="true" />
        </button>
      </div>
      {!all && (!ready || first.length > 0) && (
        <>
          <h2 className="learn-try-title">Try these first.</h2>
          <ol className="learn-try" data-testid="learn-try" data-ready={ready || undefined} aria-hidden={ready ? undefined : true}>
            {shown.map((g) => (
              <li key={`${g.kind}:${g.id}`}>
                <GameTile game={g} start={start} />
              </li>
            ))}
          </ol>
        </>
      )}
      {all && (
        <div className="learn-game-groups">
          {GAME_GROUPS.map((gr) => {
            const open = group === gr.title;
            return (
              <section key={gr.title} className="learn-game-group">
                <button type="button" className="learn-group-toggle" aria-expanded={open} onClick={() => setGroup(open ? null : gr.title)}>
                  {gr.title}
                  <CaretDown size={16} weight="bold" aria-hidden="true" />
                </button>
                {open && (
                  <ul className="learn-game-names">
                    {gr.games.map((g) => {
                      const done = isPlayed(g);
                      const inner = (
                        <>
                          {g.title}
                          {done && <Check size={16} weight="bold" aria-hidden="true" />}
                        </>
                      );
                      // The tick is a picture; the name says it in one phrase.
                      const name = done ? `${g.title}, played` : undefined;
                      return (
                        <li key={`${g.kind}:${g.id}`} data-played={done || undefined}>
                          {g.kind === "life" ? (
                            <Link href={g.href} aria-label={name}>{inner}</Link>
                          ) : (
                            <button type="button" aria-label={name} onClick={() => start(g.id)}>{inner}</button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** One of the three: the game's face, its name and its four-word hook. The long tagline is its description. */
function GameTile({ game, start }: { game: GameItem; start: (id: string) => void }) {
  if (game.kind === "life") {
    return (
      <Link className="learn-try-tile" href={game.href} style={{ "--game-colour": GAME_ENTRY[game.id].colour } as React.CSSProperties}>
        <LifeBean who={game.id} mood="engaged" size={52} />
        <span><strong>{game.title}</strong><small>{game.hint}</small></span>
        <ArrowRight size={18} aria-hidden="true" />
      </Link>
    );
  }
  const module = MODULES.find((m) => m.id === game.id);
  return (
    <button type="button" className={`learn-try-tile is-${module ? coverOf(module) : "sky"}`} onClick={() => start(game.id)}>
      {module?.run && <Bean who={module.run.bean} mood="engaged" size={52} />}
      <span>
        <strong>{game.title}</strong>
        <small>{game.hint}</small>
        {module && <span className="sr-only">{`. ${module.subtitle}.`}</span>}
      </span>
      <ArrowRight size={18} aria-hidden="true" />
    </button>
  );
}

/**
 * The modules pane (PLAN.md W8): the hero, then the goals question until it is answered or skipped,
 * then "For you" directly under it with one line that says what the picks came from, so a tap on a
 * goal shows its effect in the same glance. Everything else is one tap away under "Explore all
 * modules", which takes their place while it is open, as "All games" does on the games pane.
 */
function ModulesPane({ progress, cursor, completed, hydrated, start, reducedMotion }: { progress: Progress; cursor: LearnCursor | null; completed: string | null; hydrated: boolean; start: (id: string, resume?: boolean) => void; reducedMotion: boolean }) {
  const { profile, apply } = useProfile();
  const [editing, setEditing] = useState(false);
  const [explore, setExplore] = useState(false);
  const reads = MODULES.filter((m) => m.kind !== "run");
  const completedRead = completed && MODULES.find((m) => m.id === completed)?.kind !== "run" ? completed : null;
  const done = profile?.completedModuleIds ?? [];
  const goals = profile?.selectedGoals ?? [];
  const toggle = (id: LearningDomain) => apply((s) => selectGoals(s, goals.includes(id) ? goals.filter((g) => g !== id) : [...goals, id].slice(0, 3)));
  const picks = useMemo(() => {
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
    ).filter((r) => r.score > 0);
  }, [profile]);
  const why = reasonLine(picks, (g) => GOALS.find((x) => x.id === g)?.label ?? g);
  const forYou = why ? picks.map((r) => r.strategy) : [];
  const ask = hydrated && profile !== null && (editing || (goals.length === 0 && !profile.goalsSkipped));
  const started = profile?.saved.find((s) => s.status === "started");
  const toolkit = (profile?.personalStrategies.length ?? 0) > 0;
  const quick = STRATEGIES.filter((s) => s.estimatedMinutes <= 2);
  // A finished run's last card is kept for Back, not offered as Continue (resumable).
  const resume = resumable(cursor, progress.done);
  const continuing = resume ? MODULES.find((m) => m.id === resume.moduleId) : undefined;

  const goalsQuestion = ask && (
    <section className="learn-goals" aria-labelledby="learn-goals-title">
      <h2 id="learn-goals-title" className="t-question">What do you want help with?</h2>
      <div className="lives-chips" role="group" aria-labelledby="learn-goals-title">
        {GOALS.map((g) => (
          <button
            key={g.id}
            type="button"
            className="lives-chip"
            aria-pressed={goals.includes(g.id)}
            onClick={() => {
              // The question stays open until "Done", so "For you" changes under it as goals are tapped.
              setEditing(true);
              toggle(g.id);
            }}
          >
            {g.label}
          </button>
        ))}
      </div>
      <button
        type="button"
        className="learn-secondary learn-goals-done"
        onClick={() => {
          if (goals.length === 0) apply((s) => skipGoals(s));
          setEditing(false);
        }}
      >
        {goals.length === 0 ? "Skip" : "Done"}
      </button>
    </section>
  );
  const forYouSection = forYou.length > 0 && (
    <section className="learn-for-you" aria-labelledby="learn-for-you-title" data-testid="learn-for-you">
      <div className="learn-for-you-head">
        <h2 id="learn-for-you-title" className="lives-section-title">For you</h2>
        {!ask && (
          <button type="button" className="learn-secondary learn-change-goals" onClick={() => setEditing(true)}>
            Change goals
          </button>
        )}
      </div>
      <p className="learn-for-you-why">{why}</p>
      <StrategyRows strategies={forYou} done={done} />
    </section>
  );

  return (
    <>
      <Completion completed={completedRead} start={start} />
      {!explore && (
        <>
          {goalsQuestion}
          {ask && forYouSection}
          <div className="learning-feature">
            <div>
              <h2>Get to know ADHD.</h2>
              <button className="learn-primary" type="button" onClick={() => start(resume?.moduleId ?? "adhd", Boolean(resume))}>
                {continuing ? `Continue ${continuing.title}` : "Start"} <ArrowRight size={18} aria-hidden="true" />
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
          {!ask && forYouSection}
        </>
      )}
      {toolkit && !explore && (
        <ul className="lives-rows">
          <li>
            <Link className="lives-row" href="/lives/toolkit">
              <span className="lives-row-text">
                <strong>Your Toolkit</strong>
              </span>
              <ArrowRight size={16} weight="bold" aria-hidden="true" />
            </Link>
          </li>
        </ul>
      )}
      <div className="learn-explore-row">
        <button type="button" className="learn-secondary learn-explore" aria-expanded={explore} onClick={() => setExplore(!explore)} data-testid="learn-explore">
          Explore all modules
          <CaretDown size={16} weight="bold" aria-hidden="true" />
        </button>
        {/* After a skip with nothing else to go on there is no "For you" to sit beside, so the way
            back to the question sits here. */}
        {hydrated && !ask && !explore && forYou.length === 0 && (
          <button type="button" className="learn-secondary learn-change-goals" onClick={() => setEditing(true)}>
            Choose goals
          </button>
        )}
      </div>
      {explore && (
        <div className="learn-explore-all">
          <details className="lives-shelf learn-shelf" data-shelf="reads">
            <summary className="lives-section-title">The basics</summary>
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
              <Link className="lives-row" href="/approach/meditate">
                <span className="lives-row-text">
                  <strong>A quiet moment</strong>
                  <span>5 min</span>
                </span>
                <ArrowRight size={16} weight="bold" aria-hidden="true" />
              </Link>
            </li>
          </ul>
        </div>
      )}
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
      <StrategyRows strategies={strategies} done={done} />
    </details>
  );
}

function StrategyRows({ strategies, done }: { strategies: readonly StrategyDefinition[]; done: readonly string[] }) {
  return (
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
  );
}
