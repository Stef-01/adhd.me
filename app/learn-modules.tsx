"use client";

// O239 (founder-directed): the Learn tab as modules. O244 (founder-directed): redesigned, and
// widened to what the tab is FOR — "to help people learn about ADHD and managing symptoms, little
// Buzzfeed-style trendy quizzes, but also learning content in an engaging way. It should not look
// vibe coded or blocky."
//
// THE DESIGN. One inverted route field opens the tab — the eyebrow, the list's title and a rail
// that fills as modules are finished. Under it, two shelves: Understanding ADHD (two reading
// modules and two quizzes) and Finding care (the story's three). Each module is a soft-tinted
// card — no hairline box — with a drawn mark in one of the three token families, a serif title,
// a length in minutes and a tick when done. Inside a reading module: one card at a time, its
// scene number set large and faint, a display serif heading, the body, the specifics. Inside a
// quiz: the question in serif, big option pills, the reveal (tick or cross, then the sentence
// that explains), and at the end the score with a line that says the quiz was about ADHD and
// never about the reader. Every colour is a token; nothing loops; every effect has a static equal.
//
// EVERY CARD IS IN THE DOM FROM THE FIRST PAINT. The current card is chosen with a class, not by
// mounting, so a reader without JavaScript gets every card in reading order and the server render
// carries no `opacity: 0`. Finishing a module is remembered on this device (`src/learn/progress.ts`).
// A quiz score is not — it is a game, not a record.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock, X } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { markDone, readProgress, type Progress } from "@/learn/progress";
import { cardCount, MODULES, scenesOf, SHELVES, type LearnModule, type Question } from "@/learn/scenes";

const SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.85 } as const;
const POP = { type: "spring", stiffness: 520, damping: 28 } as const;

/** Three marks, three token families: a route ring, an accent arc, an ink tick. Drawn, not loaded. */
function ModuleMark({ tint, quiz }: { tint: LearnModule["tint"]; quiz: boolean }) {
  return (
    <span className={`learn-mark is-${tint}`} aria-hidden="true">
      <svg viewBox="0 0 64 64" focusable="false">
        <circle cx="32" cy="32" r="26" className="learn-mark-halo" />
        {quiz ? (
          <>
            <path d="M24 26 a8 8 0 1 1 11 7.4 c-2.4 1.1 -3 2.6 -3 5" className="learn-mark-ring" />
            <circle cx="32" cy="45" r="2.4" className="learn-mark-core" />
          </>
        ) : tint === "route" ? (
          <>
            <circle cx="32" cy="32" r="15" className="learn-mark-ring" />
            <circle cx="32" cy="32" r="5.5" className="learn-mark-core" />
          </>
        ) : tint === "accent" ? (
          <>
            <path d="M17 38 A15 15 0 0 1 47 38" className="learn-mark-ring" />
            <circle cx="32" cy="38" r="5.5" className="learn-mark-core" />
          </>
        ) : (
          <>
            <circle cx="32" cy="32" r="17" className="learn-mark-ring" />
            <path d="M23 32 L29.5 38.5 L42 25" className="learn-mark-tick" />
          </>
        )}
      </svg>
    </span>
  );
}

export function LearnModules() {
  const reducedMotion = useReducedMotion();
  const [progress, setProgress] = useState<Progress>({ v: 1, done: [] });
  const [direction, setDirection] = useState<1 | -1>(1);
  const [open, setOpen] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  /** Quiz: the option chosen for each question so far, by question index. */
  const [picks, setPicks] = useState<number[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(readProgress(window.localStorage));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (open) window.scrollTo({ top: 0, behavior: "auto" });
  }, [open, step]);

  const current = open ? MODULES.find((m) => m.id === open) ?? null : null;
  const finished = progress.done.length;

  const start = (id: string) => { setOpen(id); setStep(0); setPicks([]); setDirection(1); };
  const leave = () => { setOpen(null); setStep(0); setPicks([]); };
  const finish = (id: string) => { setProgress(markDone(window.localStorage, id)); leave(); };

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
          {current.kind === "quiz" ? quizView(current) : readView(current)}
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
        <p className="learn-module-kicker">
          <span className="learn-module-index">{String(MODULES.findIndex((m) => m.id === current.id) + 1).padStart(2, "0")}</span>
          <span id="learn-module-title" className="learn-module-title">{current.title}</span>
        </p>
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
              className={i === step ? "learn-card is-current" : "learn-card"}
              aria-hidden={hydrated && i !== step ? "true" : undefined}
              initial={hydrated && !reducedMotion && i === step ? { opacity: 0, x: 28 * direction } : false}
              animate={{ opacity: 1, x: 0 }}
              transition={{ ...SPRING, opacity: { duration: 0.2 } }}
            >
              <span className="learn-card-number" aria-hidden="true">{card.n}</span>
              <p className="learn-card-eyebrow">{card.eyebrow}</p>
              <h3 className="learn-card-heading">{card.heading}</h3>
              <p className="learn-card-body">{card.body}</p>
              {card.detail && (
                <ul className="learn-card-detail">
                  {card.detail.map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}
              {card.foot && <p className="learn-card-foot">{card.foot}</p>}
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
                className={i === step ? "learn-card learn-question is-current" : "learn-card learn-question"}
                aria-hidden={hydrated && i !== step ? "true" : undefined}
                initial={hydrated && !reducedMotion && i === step ? { opacity: 0, x: 28 } : false}
                animate={{ opacity: 1, x: 0 }}
                transition={{ ...SPRING, opacity: { duration: 0.2 } }}
              >
                <span className="learn-card-number" aria-hidden="true">{String(i + 1).padStart(2, "0")}</span>
                <p className="learn-card-eyebrow">{current.kind === "quiz" && current.id === "myth-or-fact" ? "Myth or fact?" : "Which is it?"}</p>
                <h3 className="learn-card-heading">{q.prompt}</h3>
                <ul className="learn-options" role="group" aria-label="Answers">
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
                            {answered && o === q.answer && <Check size={16} weight="bold" />}
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
            className={done ? "learn-card learn-score is-current" : "learn-card learn-score"}
            aria-hidden={hydrated && !done ? "true" : undefined}
            initial={hydrated && !reducedMotion && done ? { opacity: 0, scale: 0.96 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING, opacity: { duration: 0.2 } }}
          >
            <p className="learn-card-eyebrow">{score === questions.length ? "All of them" : score >= questions.length / 2 ? "Nicely done" : "Now you know"}</p>
            <h3 className="learn-card-heading learn-score-figure">
              {score} of {questions.length}
            </h3>
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
        <div className="learn-hero">
          <p className="learn-hero-eyebrow">Learn</p>
          <h2 id="learn-list-title" className="learn-hero-title">ADHD, in your own time.</h2>
          <p className="learn-hero-lede">Short reads and quick quizzes — a few minutes each. General information, never about you.</p>
          <ol className="learn-rail" aria-label={`${finished} of ${MODULES.length} finished`}>
            {MODULES.map((module) => (
              <motion.li
                key={module.id}
                className={progress.done.includes(module.id) ? "is-done" : ""}
                animate={{ opacity: progress.done.includes(module.id) ? 1 : 0.4 }}
                transition={reducedMotion ? { duration: 0 } : POP}
              />
            ))}
          </ol>
          <span className="learn-hero-count" aria-hidden="true">
            {finished === 0 ? "Nothing finished yet" : `${finished} of ${MODULES.length} finished`}
          </span>
        </div>

        {SHELVES.map((shelf) => (
          <div key={shelf.title} className="learn-shelf">
            <h3 className="learn-shelf-title">{shelf.title}</h3>
            <ol className="learn-tiles">
              {shelf.modules.map((id) => {
                const module = MODULES.find((m) => m.id === id)!;
                const done = progress.done.includes(module.id);
                const count = cardCount(module);
                return (
                  <li key={module.id}>
                    <motion.button
                      type="button"
                      className={`learn-tile is-${module.tint}${done ? " is-done" : ""}${module.kind === "quiz" ? " is-quiz" : ""}`}
                      onClick={() => start(module.id)}
                      whileHover={reducedMotion ? undefined : { y: -2 }}
                      whileTap={reducedMotion ? undefined : { scale: 0.985, y: 0 }}
                      transition={POP}
                    >
                      <ModuleMark tint={module.tint} quiz={module.kind === "quiz"} />
                      <span className="learn-tile-text">
                        <span className="learn-tile-kind">{module.kind === "quiz" ? "Quiz" : "Read"}</span>
                        <strong>{module.title}</strong>
                        <small>{module.subtitle}</small>
                        <span className="learn-tile-meta">
                          <span className="learn-tile-time"><Clock size={13} weight="bold" aria-hidden="true" />{module.minutes} min</span>
                          <span className="learn-tile-dot" aria-hidden="true" />
                          <span>{count} {module.kind === "quiz" ? "questions" : "cards"}</span>
                          {done && (
                            <>
                              <span className="learn-tile-dot" aria-hidden="true" />
                              <motion.span className="learn-tile-done" initial={reducedMotion ? false : { scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={POP}>
                                <Check size={13} weight="bold" aria-hidden="true" />Done
                              </motion.span>
                            </>
                          )}
                        </span>
                      </span>
                      <span className="learn-tile-arrow" aria-hidden="true">
                        <ArrowRight size={18} weight="bold" />
                      </span>
                    </motion.button>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}

        <dl className="learn-figures">
          <div>
            <dt>6–12 months</dt>
            <dd>typical wait for an adult ADHD assessment appointment</dd>
          </div>
          <div>
            <dt>$1k to $5k</dt>
            <dd>common out-of-pocket cost of a private adult assessment</dd>
          </div>
        </dl>
        <p className="learn-figures-note">Indicative figures pending source confirmation.</p>

        <Link className="learn-cta" href="/">
          Find a GP near you
          <ArrowRight size={17} weight="bold" aria-hidden="true" />
        </Link>
      </section>
    );
  }
}
