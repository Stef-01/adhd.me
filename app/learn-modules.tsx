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
import { INDICATIVE_FIGURES } from "@/compliance/landing-copy";
import { markDone, readProgress, type Progress } from "@/learn/progress";
import { cardCount, MODULES, scenesOf, SHELVES, type LearnModule, type Question } from "@/learn/scenes";

const SPRING = { type: "spring", stiffness: 380, damping: 36, mass: 0.85 } as const;
const POP = { type: "spring", stiffness: 520, damping: 28 } as const;

/** Three marks, three token families: a route ring, an accent arc, an ink tick. Drawn, not loaded. */
/**
 * RADIANT: the founder's card stack. Each module sits on one of the mockup's card colours with
 * its sticker — the drawings are the mockup's own, verbatim, as static art. Colours are tokens
 * on `.learn-screen` (globals.css, region 16); a title on a card is 20px bold, which is large
 * text, and every subtitle colour was measured at 4.5:1 or better on its card.
 */
const CARD_ART: Readonly<Record<string, { card: string; sticker: React.ReactNode }>> = {
  adhd: {
    card: "amber",
    sticker: (
      <svg viewBox="0 0 68 68" fill="none" aria-hidden="true">
        <rect width="68" height="68" rx="20" fill="#FDE68A" />
        <ellipse cx="34" cy="35" rx="22" ry="20" fill="#1C1917" />
        <circle cx="27" cy="31" r="2.5" fill="#FEF3C7" />
        <circle cx="41" cy="31" r="2.5" fill="#FEF3C7" />
        <path d="M28 38C29.5 42 38.5 42 40 38" stroke="#FEF3C7" strokeWidth="2.5" strokeLinecap="round" />
        <ellipse cx="23" cy="36" rx="2.5" ry="1.5" fill="#F59E0B" />
        <ellipse cx="45" cy="36" rx="2.5" ry="1.5" fill="#F59E0B" />
        <path d="M19 22C24 16 44 16 49 22" stroke="#B45309" strokeWidth="2" strokeLinecap="round" strokeDasharray="2 3" />
        <circle cx="34" cy="15" r="2.5" fill="#B45309" />
      </svg>
    ),
  },
  everyday: {
    card: "oat",
    sticker: (
      <svg viewBox="0 0 68 68" fill="none" aria-hidden="true">
        <circle cx="34" cy="34" r="30" fill="#FFEDDE" />
        <rect x="20" y="18" width="28" height="32" rx="14" fill="#E85B28" />
        <circle cx="29" cy="28" r="2" fill="white" />
        <circle cx="39" cy="28" r="2" fill="white" />
        <path d="M30 35C32 38 36 38 38 35" stroke="white" strokeWidth="2" strokeLinecap="round" />
        <line x1="12" y1="26" x2="16" y2="26" stroke="#E85B28" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="10" y1="34" x2="16" y2="34" stroke="#E85B28" strokeWidth="2.5" strokeLinecap="round" />
        <line x1="13" y1="42" x2="17" y2="42" stroke="#E85B28" strokeWidth="2.5" strokeLinecap="round" />
        <circle cx="50" cy="22" r="3" fill="#F5A623" />
      </svg>
    ),
  },
  "myth-or-fact": {
    card: "forest",
    sticker: (
      <svg viewBox="0 0 68 68" fill="none" aria-hidden="true">
        <rect width="68" height="68" rx="20" fill="#065F46" />
        <circle cx="34" cy="24" r="11" fill="#FBBF24" />
        <path d="M12 52L26 32L38 48L46 38L56 52H12Z" fill="#34D399" />
        <path d="M26 32L38 48L30 52H12L26 32Z" fill="#10B981" />
        <circle cx="31" cy="23" r="1.2" fill="#78350F" />
        <circle cx="37" cy="23" r="1.2" fill="#78350F" />
        <path d="M32 27C33 28 35 28 36 27" stroke="#78350F" strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    ),
  },
  words: {
    card: "lilac",
    sticker: (
      <svg viewBox="0 0 68 68" fill="none" aria-hidden="true">
        <rect width="68" height="68" rx="20" fill="#F3E8FF" />
        <path d="M18 46C18 36.0589 25.1634 28 34 28C42.8366 28 50 36.0589 50 46" stroke="#EF4444" strokeWidth="3.5" strokeLinecap="round" />
        <path d="M22 46C22 38.8203 27.3726 33 34 33C40.6274 33 46 38.8203 46 46" stroke="#F59E0B" strokeWidth="3" strokeLinecap="round" />
        <path d="M26 46C26 41.5817 29.5817 38 34 38C38.4183 38 42 41.5817 42 46" stroke="#10B981" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M48 18L49 22L53 23L49 24L48 28L47 24L43 23L47 22L48 18Z" fill="#F59E0B" />
        <circle cx="20" cy="23" r="2.5" fill="#8B5CF6" />
      </svg>
    ),
  },
  finding: {
    card: "coral",
    sticker: (
      <svg viewBox="0 0 68 68" fill="none" aria-hidden="true">
        <circle cx="34" cy="34" r="30" fill="#C2410C" />
        <path d="M34 48C34 48 18 38 18 26C18 21.0294 22.0294 17 27 17C30.2 17 33 19 34 21C35 19 37.8 17 41 17C45.9706 17 50 21.0294 50 26C50 38 34 48 34 48Z" fill="#FED7AA" />
        <circle cx="28" cy="27" r="1.5" fill="#7C2D12" />
        <circle cx="40" cy="27" r="1.5" fill="#7C2D12" />
        <path d="M31 32C33 34 35 34 37 32" stroke="#7C2D12" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="48" cy="18" r="7" fill="#FACC15" />
        <path d="M48 21V15M48 15L45 18M48 15L51 18" stroke="#78350F" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    ),
  },
  cost: {
    card: "slate",
    sticker: (
      <svg viewBox="0 0 68 68" fill="none" aria-hidden="true">
        <rect width="68" height="68" rx="20" fill="#2D3139" />
        <circle cx="34" cy="34" r="21" fill="#FDE047" />
        <circle cx="28" cy="31" r="2.2" fill="#1C1917" />
        <circle cx="40" cy="31" r="2.2" fill="#1C1917" />
        <path d="M30 38C32 41 36 41 38 38" stroke="#1C1917" strokeWidth="2" strokeLinecap="round" />
        <ellipse cx="24" cy="35" rx="2.5" ry="1.5" fill="#F59E0B" />
        <ellipse cx="44" cy="35" rx="2.5" ry="1.5" fill="#F59E0B" />
        <circle cx="34" cy="34" r="27" stroke="#FEF08A" strokeWidth="1.5" strokeDasharray="3 4" />
      </svg>
    ),
  },
  changed: {
    card: "saffron",
    sticker: (
      <svg viewBox="0 0 68 68" fill="none" aria-hidden="true">
        <rect width="68" height="68" rx="20" fill="#FEF3C7" />
        <rect x="18" y="28" width="32" height="24" rx="8" fill="#D97706" />
        <polygon points="34,14 48,28 20,28" fill="#E11D48" />
        <circle cx="34" cy="22" r="3" fill="#FDE047" />
        <circle cx="28" cy="38" r="1.8" fill="white" />
        <circle cx="40" cy="38" r="1.8" fill="white" />
        <path d="M30 44C32 46 36 46 38 44" stroke="white" strokeWidth="1.8" strokeLinecap="round" />
      </svg>
    ),
  },
};


/**
 * The score, digit by digit — the one number in this app that changes.
 *
 * Each character is its own span so it rises, unblurs and settles on the
 * overshoot curve independently, with the second digit a beat behind the first.
 * The number is inside a heading a screen reader announces as text; splitting it
 * into spans does not change what is announced, and the sentence beneath it
 * carries the meaning either way.
 */
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

export function LearnModules() {
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
            className={done ? "learn-card learn-score is-current" : "learn-card learn-score"}
            aria-hidden={hydrated && !done ? "true" : undefined}
            initial={hydrated && !reducedMotion && done ? { opacity: 0, scale: 0.96 } : false}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ ...SPRING, opacity: { duration: 0.2 } }}
          >
            <p className="learn-card-eyebrow">{score === questions.length ? "All of them" : score >= questions.length / 2 ? "Nicely done" : "Now you know"}</p>
            <h3 className="learn-card-heading learn-score-figure">
              <ScoreFigure score={score} outOf={questions.length} />
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
        {/* RADIANT: the founder's learn screen — a line under the header, a row of topic chips,
            and the modules as one stack of coloured cards with their stickers. The hero card is
            gone as drawn; the progress it carried is the line under the chips. */}
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

        <ol className="learn-stack">
          {SHELVES.filter((shelf) => shelfFilter === "all" || shelf.title === shelfFilter)
            .flatMap((shelf) => shelf.modules)
            .map((id) => {
              const module = MODULES.find((m) => m.id === id)!;
              const done = progress.done.includes(module.id);
              const count = cardCount(module);
              const art = CARD_ART[module.id] ?? { card: "oat", sticker: null };
              return (
                <li key={module.id}>
                  <motion.button
                    type="button"
                    className={`learn-card is-${art.card}${done ? " is-done" : ""}${module.kind === "quiz" ? " is-quiz" : ""}`}
                    onClick={() => start(module.id)}
                    whileTap={reducedMotion ? undefined : { scale: 0.985 }}
                    transition={POP}
                  >
                    <span className="learn-card-text">
                      <strong>{module.title}</strong>
                      <small>{module.subtitle}</small>
                      <span className="learn-card-meta">
                        <span>{module.kind === "quiz" ? "Quiz" : "Read"}</span>
                        <span className="learn-tile-dot" aria-hidden="true" />
                        <span className="learn-tile-time"><Clock size={12} weight="bold" aria-hidden="true" />{module.minutes} min</span>
                        <span className="learn-tile-dot" aria-hidden="true" />
                        <span>{count} {module.kind === "quiz" ? "questions" : "cards"}</span>
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
                    <span className="learn-card-art" aria-hidden="true">{art.sticker}</span>
                  </motion.button>
                </li>
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
          Find a GP near you
          <ArrowRight size={17} weight="bold" aria-hidden="true" />
        </Link>
      </section>
    );
  }
}
