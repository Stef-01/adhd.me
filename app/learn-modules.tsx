"use client";

// O239 (founder-directed): the Learn tab as modules — "a real functioning minimalist
// Headspace-inspired learning module section".
//
// WHAT WAS BORROWED FROM HEADSPACE, AND WHAT WAS NOT. Borrowed: the shape. A short list of
// modules as calm rounded tiles, each with a mark, a title, a length a person can plan for and a
// tick when it is done; inside a module, one card at a time, with a dot rail, Back and Next, and a
// Finish that returns to the list. Not borrowed: the mascots, the streaks, the nudges and the
// gradients — this product's design law forbids ambient decoration and its copy law forbids
// motivational claims on a patient surface, so the tiles are the app's own tokens and the cards
// say only what the story already argued (`src/learn/scenes.ts`).
//
// EVERY CARD IS IN THE DOM FROM THE FIRST PAINT. The current card is chosen with a class, not by
// mounting, so a reader without JavaScript gets every card of every module in reading order —
// the same rule the story sequence followed — and the server render carries no `opacity: 0`.
//
// Finishing a module is remembered on this device (`src/learn/progress.ts`). Nothing else is.

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Check, Clock } from "@phosphor-icons/react";
import { markDone, readProgress, type Progress } from "@/learn/progress";
import { MODULES, scenesOf, type LearnModule } from "@/learn/scenes";

/** Three marks, three token families: a route ring, an accent arc, an ink dot. Drawn, not loaded. */
function ModuleMark({ tint }: { tint: LearnModule["tint"] }) {
  return (
    <span className={`learn-mark is-${tint}`} aria-hidden="true">
      <svg viewBox="0 0 48 48" focusable="false">
        {tint === "route" && (
          <>
            <circle cx="24" cy="24" r="14" className="learn-mark-ring" />
            <circle cx="24" cy="24" r="5" className="learn-mark-core" />
          </>
        )}
        {tint === "accent" && (
          <>
            <path d="M10 30 A14 14 0 0 1 38 30" className="learn-mark-ring" />
            <circle cx="24" cy="30" r="5" className="learn-mark-core" />
          </>
        )}
        {tint === "ink" && (
          <>
            <circle cx="24" cy="24" r="16" className="learn-mark-ring" />
            <path d="M16 24 L22 30 L33 18" className="learn-mark-tick" />
          </>
        )}
      </svg>
    </span>
  );
}

export function LearnModules() {
  const [progress, setProgress] = useState<Progress>({ v: 1, done: [] });
  const [open, setOpen] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setProgress(readProgress(window.localStorage));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (open) window.scrollTo({ top: 0, behavior: "auto" });
  }, [open, step]);

  const current = open ? MODULES.find((m) => m.id === open) ?? null : null;

  if (current) {
    const cards = scenesOf(current);
    const last = step === cards.length - 1;
    const finish = () => {
      setProgress(markDone(window.localStorage, current.id));
      setOpen(null);
      setStep(0);
    };
    return (
      <section className="learn-module" aria-labelledby="learn-module-title" data-hydrated={hydrated ? "true" : undefined}>
        <div className="learn-module-bar">
          <button type="button" className="learn-back" onClick={() => { setOpen(null); setStep(0); }}>
            <ArrowLeft size={18} weight="bold" aria-hidden="true" />
            All modules
          </button>
          <span className="learn-step-count" aria-live="polite">
            {step + 1} of {cards.length}
          </span>
        </div>
        <h2 id="learn-module-title" className="learn-module-title">{current.title}</h2>
        <ol className="learn-dots" aria-hidden="true">
          {cards.map((card, index) => (
            <li key={card.n} className={index === step ? "is-current" : index < step ? "is-done" : ""} />
          ))}
        </ol>

        <div className="learn-cards">
          {cards.map((card, index) => (
            <article key={card.n} className={index === step ? "learn-card is-current" : "learn-card"} aria-hidden={hydrated && index !== step ? "true" : undefined}>
              <p className="learn-card-eyebrow">{card.eyebrow}</p>
              <h3 className="learn-card-heading">{card.heading}</h3>
              <p className="learn-card-body">{card.body}</p>
              {card.detail && (
                <ul className="learn-card-detail">
                  {card.detail.map((line) => <li key={line}>{line}</li>)}
                </ul>
              )}
              {card.foot && <p className="learn-card-foot">{card.foot}</p>}
            </article>
          ))}
        </div>

        <div className="learn-controls">
          <button type="button" className="learn-secondary" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft size={17} weight="bold" aria-hidden="true" />
            Back
          </button>
          {last ? (
            <button type="button" className="learn-primary" onClick={finish}>
              <Check size={17} weight="bold" aria-hidden="true" />
              Finish
            </button>
          ) : (
            <button type="button" className="learn-primary" onClick={() => setStep((s) => Math.min(cards.length - 1, s + 1))}>
              Next
              <ArrowRight size={17} weight="bold" aria-hidden="true" />
            </button>
          )}
        </div>
      </section>
    );
  }

  const finished = progress.done.length;
  return (
    <section className="learn-list" aria-labelledby="learn-list-title">
      <div className="learn-list-head">
        <h2 id="learn-list-title">Three short modules</h2>
        <span className="learn-list-count">{finished === 0 ? "None finished yet" : `${finished} of ${MODULES.length} finished`}</span>
      </div>
      <ul className="learn-tiles">
        {MODULES.map((module) => {
          const done = progress.done.includes(module.id);
          return (
            <li key={module.id}>
              <button type="button" className={done ? "learn-tile is-done" : "learn-tile"} onClick={() => { setOpen(module.id); setStep(0); }}>
                <ModuleMark tint={module.tint} />
                <span className="learn-tile-text">
                  <strong>{module.title}</strong>
                  <small>{module.subtitle}</small>
                </span>
                <span className="learn-tile-meta">
                  {done ? (
                    <span className="learn-tile-done"><Check size={14} weight="bold" aria-hidden="true" />Done</span>
                  ) : (
                    <span className="learn-tile-time"><Clock size={14} weight="bold" aria-hidden="true" />{module.minutes} min</span>
                  )}
                  <ArrowRight size={16} weight="bold" aria-hidden="true" />
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* The figures the modules cite, on the overview too, with their qualification beside them —
          the same copy the front page carried, so the sweeps have read every word of it. */}
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
