"use client";

// The library and focused lessons share content and progress, but have separate layout classes.
// Public module IDs live in the URL; answers stay in memory; device progress lives in src/learn.

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Clock, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { INDICATIVE_FIGURES } from "@/compliance/landing-copy";
import { clearProgress, markDone, readProgress, type Progress } from "@/learn/progress";
import { clearCursor, deviceLearningStorage, readCursor, writeCursor, type LearnCursor } from "@/learn/cursor";
import { cardCount, MODULES, scenesOf, SHELVES, type LearnModule, type Question } from "@/learn/scenes";
import { LearningScene, LearningCoverArt, LearningExplorer, CarePathExplorer } from "./learning-scene";
import { InteractiveView } from "./interactive-module";
import { CharacterMark } from "./characters";
import { RunPlayer } from "./play/run-player";
import { Bean } from "./play/beans";

const SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.85 } as const;
const POP = { type: "spring", stiffness: 520, damping: 28 } as const;

const COLLECTION_COLOURS: Readonly<Record<string, string>> = {
  adhd: "amber", everyday: "oat", "myth-or-fact": "forest", words: "lilac", finding: "coral", cost: "slate", changed: "saffron",
  context: "amber", "more-than-attention": "oat", starting: "coral", deadlines: "lilac", "working-memory": "slate", hyperfocus: "saffron",
  ambiguity: "oat", interruption: "lilac", perfectionism: "amber",
  "not-listening": "forest", "forgotten-commitments": "oat", conflict: "coral",
  household: "saffron", sleep: "slate", exercise: "forest",
};

function ScoreFigure({ score, outOf }: { score: number; outOf: number }) {
  const digits = String(score).split("");
  return (
    <>
      {digits.map((digit, i) => (
        // eslint-disable-next-line react/no-array-index-key -- digit position is its identity.
        <span key={i} className="t-digit" data-stagger={i > 0 ? String(Math.min(i, 2)) : undefined}>
          {digit}
        </span>
      ))}
      {" of "}
      {outOf}
    </>
  );
}

function LessonHeading({ active, children, className = "learn-card-heading" }: { active: boolean; children: React.ReactNode; className?: string }) {
  const heading = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    if (!active) return;
    heading.current?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "auto" });
  }, [active]);
  return <h2 ref={heading} tabIndex={-1} className={className}>{children}</h2>;
}

export function LearnModules() {
  const params = useSearchParams();
  const moduleId = params.get("module");
  /** PLAY-PLAN.md §6: the nine-stage player stays for one release behind `&long=1`. */
  const longForm = params.get("long") === "1";
  const reducedMotion = useReducedMotion();
  /** RADIANT: which topic chip is on — "all", or one shelf's title. */
  const [shelfFilter, setShelfFilter] = useState<string>("all");
  const [progress, setProgress] = useState<Progress>({ v: 1, done: [] });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [open, setOpen] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  /** Quiz: the option chosen for each question so far, by question index. */
  const [picks, setPicks] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [cursor, setCursor] = useState<LearnCursor | null>(null);
  const [completed, setCompleted] = useState<string | null>(null);
  const internalRoute = useRef<string | null | undefined>(undefined);

  useEffect(() => {
    setProgress(readProgress(deviceLearningStorage));
    setCursor(readCursor(deviceLearningStorage));
    setHydrated(true);
  }, []);

  useEffect(() => {
    // Explicit card/Continue actions already chose a step; only external navigation restores it.
    if (internalRoute.current === moduleId) {
      internalRoute.current = undefined;
      return;
    }
    internalRoute.current = undefined;
    const module = MODULES.find(module => module.id === moduleId);
    const saved = readCursor(deviceLearningStorage);
    setOpen(module?.id ?? null);
    setStep(module && saved?.moduleId === module.id ? saved.step : 0);
    setPicks([]);
  }, [moduleId]);

  useEffect(() => {
    if (!hydrated || !open) return;
    writeCursor(deviceLearningStorage, open, step);
    setCursor(readCursor(deviceLearningStorage));
  }, [hydrated, open, step]);


  const current = open ? MODULES.find((m) => m.id === open) ?? null : null;
  const finished = progress.done.length;

  const route = (id: string | null) => {
    if (id !== moduleId) internalRoute.current = id;
    const url = new URL(window.location.href);
    if (id) url.searchParams.set("module", id); else url.searchParams.delete("module");
    window.history.pushState(null, "", url);
  };
  const start = (id: string, resume = false) => { setCompleted(null); route(id); setOpen(id); setStep(resume && cursor?.moduleId === id ? cursor.step : 0); setPicks([]); setDirection(1); };
  const leave = () => { route(null); setOpen(null); setStep(0); setPicks([]); };
  const finish = (id: string) => {
    setCompleted(id);
    const saved = markDone(deviceLearningStorage, id);
    setProgress({ v: 1, done: [...new Set([...progress.done, ...saved.done, id])] });
    clearCursor(deviceLearningStorage); setCursor(null); leave();
  };

  return (
    <AnimatePresence mode="wait" initial={false}>
      {current ? (
        <motion.div
          key={`module-${current.id}`}
          initial={hydrated && !reducedMotion ? { opacity: 0, x: 24 } : false}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, x: 24, transition: { duration: 0.14 } }}
          transition={{ ...SPRING, opacity: { duration: 0.2 } }}
        >
          {current.kind === "quiz" ? quizView(current) : current.kind === "run" && current.run && !longForm ? (
            <RunPlayer
              run={current.run}
              step={step}
              onStep={(next) => { setDirection(next > step ? 1 : -1); setStep(next); }}
              onFinish={() => finish(current.id)}
              onOpenModule={(id) => { markDone(deviceLearningStorage, current.id); setProgress((p) => ({ v: 1, done: [...new Set([...p.done, current.id])] })); start(id); }}
              bar={bar(current, cardCount(current))}
            />
          ) : (current.kind === "interactive" || (current.kind === "run" && longForm)) && current.interactive ? (
            <InteractiveView
              module={current.interactive}
              step={step}
              direction={direction}
              hydrated={hydrated}
              onStep={(next) => { setDirection(next > step ? 1 : -1); setStep(next); }}
              onFinish={() => finish(current.id)}
              onOpenModule={(id) => { markDone(deviceLearningStorage, current.id); setProgress((p) => ({ v: 1, done: [...new Set([...p.done, current.id])] })); start(id); }}
              bar={bar(current, current.interactive.steps.length)}
            />
          ) : readView(current)}
        </motion.div>
      ) : (
        <motion.div
          key="list"
          initial={hydrated && !reducedMotion ? { opacity: 0, x: -16 } : false}
          animate={{ opacity: 1, x: 0 }}
          exit={reducedMotion ? undefined : { opacity: 0, x: -16, transition: { duration: 0.14 } }}
          transition={{ ...SPRING, opacity: { duration: 0.2 } }}
        >
          {listView()}
        </motion.div>
      )}
    </AnimatePresence>
  );

  // Render helpers, called as functions — not components, so their identity never changes
  // between renders and nothing remounts.

  function bar(current: LearnModule, total: number) {
    return (
      <>
        <div className="learn-module-bar">
          <button type="button" className="learn-back" onClick={leave}>
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
            All modules
          </button>
          <span className="learn-step-count" aria-live="polite">
            {Math.min(step + 1, total)} of {total}
          </span>
        </div>
        <div className="learn-module-kicker">
          <span className="learn-module-index">{String(MODULES.findIndex((m) => m.id === current.id) + 1).padStart(2, "0")}</span>
          <h1 id="learn-module-title" className="learn-module-title">{current.title}</h1>
        </div>
        <ol className="learn-dots" aria-hidden="true">
          {Array.from({ length: total }, (_, i) => (
            <motion.li
              key={i}
              className={i === step ? "is-current" : i < step ? "is-done" : ""}
              animate={{ opacity: i <= step ? 1 : 0.5 }}
              transition={reducedMotion ? { duration: 0 } : POP}
            />
          ))}
        </ol>
      </>
    );
  }

  function readView(current: LearnModule) {
    const cards = scenesOf(current);
    const last = step === cards.length - 1;
    return (
      <section className={`learn-module is-${current.tint}`} aria-labelledby="learn-module-title" data-hydrated={hydrated ? "true" : undefined}>
        {bar(current, cards.length)}
        <div className="learn-cards">
          {cards.map((card, i) => (
            <motion.article
              key={card.n}
              className={i === step ? "learn-lesson is-current" : "learn-lesson"}
              aria-hidden={hydrated && i !== step ? "true" : undefined}
              initial={hydrated && !reducedMotion && i === step ? { opacity: 0, x: 28 * direction } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRING, opacity: { duration: 0.2 } }}
            >
              <div className="learning-lesson-art"><LearningScene topic={current.id} variant={i} /></div>
              <p className="learn-card-eyebrow">{card.eyebrow}</p>
              <LessonHeading active={i === step}>{card.heading}</LessonHeading>
              <p className="learn-card-body">{card.body}</p>
              {card.detail && (
                <ul className="learn-card-detail">
                  {card.detail.map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}
              {card.foot && <p className="learn-card-foot">{card.foot}</p>}
              {current.id === "everyday" && i === 0 && <LearningExplorer />}
              {current.id === "finding" && i === 2 && <CarePathExplorer />}
            </motion.article>
          ))}
        </div>
        <div className="learn-controls">
          <motion.button type="button" className="learn-secondary" onClick={() => { setDirection(-1); setStep((s) => Math.max(0, s - 1)); }} disabled={step === 0} whileTap={reducedMotion || step === 0 ? undefined : { scale: 0.97 }}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Back
          </motion.button>
          {last ? (
            <motion.button type="button" className="learn-primary" onClick={() => finish(current.id)} whileTap={reducedMotion ? undefined : { scale: 0.97 }}>
              <Check size={17} weight="bold" aria-hidden="true" />
              Finish
            </motion.button>
          ) : (
            <motion.button type="button" className="learn-primary" onClick={() => { setDirection(1); setStep((s) => Math.min(cards.length - 1, s + 1)); }} whileTap={reducedMotion ? undefined : { scale: 0.97 }}>
              Next
              <ArrowRight size={17} weight="bold" aria-hidden="true" />
            </motion.button>
          )}
        </div>
      </section>
    );
  }

  function quizView(current: LearnModule) {
    const questions: readonly Question[] = current.questions ?? [];
    const done = step >= questions.length;
    const question = questions[step];
    const picked = picks[step];
    const score = picks.filter((pick, i) => pick === questions[i]?.answer).length;
    return (
      <section className={`learn-module learn-quiz is-${current.tint}`} aria-labelledby="learn-module-title" data-hydrated={hydrated ? "true" : undefined}>
        {bar(current, questions.length)}
        {/* Every question is in the DOM; the current one is shown. A quiz needs JavaScript to be
            answered, and without it a reader gets the questions and their explanations as a page. */}
        <div className="learn-cards">
          {questions.map((q, i) => {
            const chosen = picks[i];
            const answered = chosen !== undefined;
            return (
              <motion.article
                key={q.prompt}
                className={i === step ? "learn-lesson learn-question is-current" : "learn-lesson learn-question"}
                aria-hidden={hydrated && i !== step ? "true" : undefined}
                initial={hydrated && !reducedMotion && i === step ? { opacity: 0, x: 28 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, opacity: { duration: 0.2 } }}
              >
                <div className="learning-lesson-art"><LearningScene topic={current.id} reaction={answered ? chosen === q.answer ? "correct" : "reflect" : undefined} /></div>
                <p className="learn-card-eyebrow">{current.kind === "quiz" && current.id === "myth-or-fact" ? "Myth or fact?" : "Which is it?"}</p>
                <LessonHeading active={i === step}>{q.prompt}</LessonHeading>
                <ul className="learn-options" aria-label="Answers">
                  {q.options.map((option, o) => {
                    const state = !answered ? "" : o === q.answer ? " is-right" : o === chosen ? " is-wrong" : " is-dim";
                    return (
                      <li key={option}>
                        <motion.button
                          type="button"
                          className={`learn-option${state}`}
                          disabled={answered}
                          aria-pressed={answered ? o === chosen : undefined}
                          onClick={() => setPicks((p) => { const next = [...p]; next[i] = o; return next; })}
                          whileTap={reducedMotion || answered ? undefined : { scale: 0.97 }}
                          transition={POP}
                        >
                          <span className="learn-option-mark" aria-hidden="true">
                            {/* The tick arrives rotated, blurred and low, and settles — the
                                success-check beat. The cross does not: being wrong is not a
                                moment to celebrate, and animating it would read as the app
                                enjoying itself at the reader's expense. */}
                            {answered && o === q.answer && (
                              <span className="t-success-check">
                                <Check size={16} weight="bold" />
                              </span>
                            )}
                            {answered && o === chosen && o !== q.answer && <X size={16} weight="bold" />}
                          </span>
                          {option}
                        </motion.button>
                      </li>
                    );
                  })}
                </ul>
                <AnimatePresence initial={false}>
                  {answered && (
                    <motion.p
                      key="explain"
                      className={chosen === q.answer ? "learn-reveal is-right" : "learn-reveal is-wrong"}
                      role="status"
                      initial={reducedMotion ? false : { opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ ...SPRING, opacity: { duration: 0.2 } }}
                    >
                      <strong>{chosen === q.answer ? "Yes." : "Not quite."}</strong> {q.explain}
                    </motion.p>
                  )}
                </AnimatePresence>
                {!hydrated && <p className="learn-reveal">{q.explain}</p>}
              </motion.article>
            );
          })}

          {/* The end: the score, and the sentence the whole quiz exists to say. */}
          <motion.article
            className={done ? "learn-lesson learn-score is-current" : "learn-lesson learn-score"}
            aria-hidden={hydrated && !done ? "true" : undefined}
            initial={hydrated && !reducedMotion && done ? { opacity: 0, scale: 0.96 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING, opacity: { duration: 0.2 } }}
          >
            <div className="learning-lesson-art"><LearningScene topic={current.id} reaction="complete" /></div>
            <p className="learn-card-eyebrow">{score === questions.length ? "All of them" : score >= questions.length / 2 ? "Nicely done" : "Now you know"}</p>
            <LessonHeading active={done} className="learn-card-heading learn-score-figure">
              <ScoreFigure score={score} outOf={questions.length} />
            </LessonHeading>
            <p className="learn-card-body">
              {score === questions.length
                ? "Every one. You would be hard to surprise about how this works."
                : "The ones you got wrong are the ones most people get wrong — that is why they are in here."}
            </p>
            <p className="learn-card-foot">This was about ADHD in general, never about you. The finder is where you talk to a person.</p>
          </motion.article>
        </div>

        <div className="learn-controls">
          <motion.button type="button" className="learn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0} whileTap={reducedMotion || step === 0 ? undefined : { scale: 0.97 }}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Back
          </motion.button>
          {done ? (
            <motion.button type="button" className="learn-primary" onClick={() => finish(current.id)} whileTap={reducedMotion ? undefined : { scale: 0.97 }}>
              <Check size={17} weight="bold" aria-hidden="true" />
              Finish
            </motion.button>
          ) : (
            <motion.button type="button" className="learn-primary" disabled={picked === undefined} onClick={() => setStep((s) => s + 1)} whileTap={reducedMotion || picked === undefined ? undefined : { scale: 0.97 }}>
              {step === questions.length - 1 ? "See my score" : "Next"}
              <ArrowRight size={17} weight="bold" aria-hidden="true" />
            </motion.button>
          )}
        </div>
        {question && <span className="sr-only">{`Question ${step + 1}: ${question.prompt}`}</span>}
      </section>
    );
  }

  function listView() {
    return (
      <section className="learn-list" aria-labelledby="learn-list-title">
        {completed && ["interactive", "run"].includes(MODULES.find(module => module.id === completed)?.kind ?? "") && (
          <div className="learning-feature learning-completion">
            <div role="status">
              <p className="learning-overline">MODULE FINISHED</p>
              <h2>Your picture just got sharper.</h2>
              <p>What you said is on My ADHD now, with what seems to contribute and what to try next.</p>
              <Link className="learn-secondary" href="/my-adhd">See My ADHD <ArrowRight size={17} weight="bold" aria-hidden="true" /></Link>
            </div>
            <LearningScene topic={completed} reaction="complete" />
          </div>
        )}
        {completed && MODULES.find(module => module.id === completed)?.kind === "read" && (
          <div className="learning-feature learning-completion">
            <div role="status">
              <p className="learning-overline">MODULE FINISHED</p>
              <h2>One more idea to take with you.</h2>
              <p>{scenesOf(MODULES.find(module => module.id === completed)! ).at(-1)?.body}</p>
              <button className="learn-secondary" type="button" onClick={() => start(completed)}>Read again</button>
            </div>
            <LearningScene topic={completed} reaction="complete" />
          </div>
        )}
        <div className="learning-feature">
          <div>
            <p className="learning-overline">A LITTLE UNDERSTANDING GOES A LONG WAY</p>
            <h2>Get to know ADHD.<br />One idea at a time.</h2>
            <p>Short reads, everyday examples, and a few things that might surprise you. Take them at your own pace.</p>
            <button className="learn-primary" type="button" onClick={() => start(cursor?.moduleId ?? "context", Boolean(cursor))}>{cursor ? `Continue ${MODULES.find(module => module.id === cursor.moduleId)?.title}` : "Explore the first module"} <ArrowRight size={18} aria-hidden="true" /></button>
          </div>
          <LearningScene />
        </div>
        {/* Topic filters and device progress sit above the illustrated collections. */}
        <h2 id="learn-list-title" className="sr-only">ADHD, in your own time.</h2>
        <nav className="learn-chips" aria-label="Topics">
          {[{ key: "all", label: "All" }, ...SHELVES.map((shelf) => ({ key: shelf.title, label: shelf.title }))].map((chip) => (
            <button
              key={chip.key}
              type="button"
              className="learn-chip"
              aria-pressed={shelfFilter === chip.key}
              onClick={() => setShelfFilter(chip.key)}
            >
              {chip.label}
            </button>
          ))}
        </nav>
        <p className="learn-progress" aria-live="polite">
          {finished === 0 ? "Nothing finished yet" : `${finished} of ${MODULES.length} finished`}
        </p>
        {(finished > 0 || cursor) && <button className="learn-reset" type="button" onClick={() => { clearProgress(deviceLearningStorage); clearCursor(deviceLearningStorage); setProgress({ v: 1, done: [] }); setCursor(null); }}>Reset learning progress on this device</button>}

        <ol className="learn-stack">
          {SHELVES.filter((shelf) => shelfFilter === "all" || shelf.title === shelfFilter)
            .flatMap((shelf) => shelf.modules)
            .map((id, index) => {
              const module = MODULES.find((m) => m.id === id)!;
              const done = progress.done.includes(module.id);
              const count = cardCount(module);
              const colour = COLLECTION_COLOURS[module.id] ?? "oat";
              return (
                <motion.li
                  key={module.id}
                  // SMOOTH: the one list on this tab that appears as a list. Each card rises a beat
                  // after the last, capped at a quarter second so the seventh is never waited for;
                  // only on the first paint after hydration, never on a chip change, never under
                  // reduced motion.
                  initial={hydrated && !reducedMotion ? { opacity: 0, y: 12 } : false}
                  animate={{ opacity: 1, y: 0 }}
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
                      <small>{module.subtitle}</small>
                      <span className="learn-card-meta">
                        <span>{module.kind === "quiz" ? "Quiz" : module.kind === "run" ? "Play" : module.kind === "interactive" ? "Interactive" : "Read"}</span>
                        <span className="learn-tile-dot" aria-hidden="true" />
                        <span className="learn-tile-time"><Clock size={12} weight="bold" aria-hidden="true" />{module.minutes} min</span>
                        <span className="learn-tile-dot" aria-hidden="true" />
                        <span>{module.kind === "run" ? `${module.run?.rounds.length ?? 0} rounds` : `${count} ${module.kind === "quiz" ? "questions" : module.kind === "interactive" ? "steps" : "cards"}`}</span>
                        {done && (
                          <>
                            <span className="learn-tile-dot" aria-hidden="true" />
                            <motion.span className="learn-card-done" initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={POP}>
                              <Check size={12} weight="bold" aria-hidden="true" />Done
                            </motion.span>
                          </>
                        )}
                      </span>
                    </span>
                    <span className="learn-card-art" aria-hidden="true">
                      {module.kind === "run" && module.run
                        ? <Bean who={module.run.bean} mood="engaged" size={72} />
                        : module.kind === "interactive" && module.interactive
                        ? <CharacterMark who={module.interactive.characters[0]!} mood="engaged" />
                        : <LearningCoverArt id={module.id} />}
                    </span>
                  </motion.button>
                </motion.li>
              );
            })}
        </ol>

        <dl className="learn-figures">
          {/* Read from the one register every public page quotes, so this page cannot say a
              different number from the story or the practices page under the same label. */}
          {[INDICATIVE_FIGURES.wait, INDICATIVE_FIGURES.cost].map((figure) => (
            <div key={figure.label}>
              <dt>{figure.value}</dt>
              <dd>{figure.label}</dd>
            </div>
          ))}
        </dl>
        <p className="learn-figures-note">Indicative figures pending source confirmation.</p>

        <Link className="learn-cta" href="/">
          Find support near you
          <ArrowRight size={17} weight="bold" aria-hidden="true" />
        </Link>
      </section>
    );
  }
}
