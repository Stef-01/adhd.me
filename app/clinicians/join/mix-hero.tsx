"use client";

// O24: the join page opens with the reason to finish it.
//
// THE COMPLETION PROBLEM THIS EXISTS FOR. The join page led with the form — the cost — and
// nowhere showed the payoff: a GP shaping their own case mix instead of taking whatever walks
// in. This hero puts that one idea in one sentence the GP completes themselves: "I want N% of
// my patients to be ⟨condition⟩", with the condition flicking through the work GPs actually
// weigh up, and the sentence resolving into what that mix would look like as a daily number.
//
// HONESTY LINE, STATED ONCE AND KEPT. The daily figure is an ILLUSTRATION pegged to the
// declared mix, and the copy says so in the same breath — this product has no live referral
// volume to promise, and a professional surface does not get to invent one. What IS true and
// is said plainly: the matcher only sends what a clinician declares, so the mix is genuinely
// theirs to set. That is the dream being sold, and it is the product's actual mechanism.

import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { useEffect, useState } from "react";
import { MIX_PERCENT_MAX, MIX_PERCENT_MIN, MIX_PERCENT_STEP } from "@/onboarding/types";

/**
 * The rotating conditions, in the clinician's own shorthand. Professional surface (see
 * `src/compliance/public-surfaces.ts` — /clinicians/join), so clinical vocabulary is
 * permitted; the list mirrors care areas the interview actually lets a GP declare, because a
 * mix the onboarding cannot record must not be dangled here.
 */
const CONDITIONS = ["ADHD", "anxiety", "depression", "autism and ADHD", "complex mental health"];

/**
 * Controlled since O26: the parent (join-experience.tsx) owns the percent, because the same
 * number now has two readers — this sentence and the application form below it. The bounds
 * live in `src/onboarding/types.ts` beside the validator that enforces them at submission.
 */
export function MixHero({
  percent,
  onSetPercent,
}: {
  percent: number;
  onSetPercent: (value: number) => void;
}) {
  const reducedMotion = useReducedMotion();
  const [conditionIndex, setConditionIndex] = useState(0);

  useEffect(() => {
    if (reducedMotion) return;
    const timer = window.setInterval(
      () => setConditionIndex((index) => (index + 1) % CONDITIONS.length),
      2200,
    );
    return () => window.clearInterval(timer);
  }, [reducedMotion]);

  const condition = CONDITIONS[conditionIndex] ?? CONDITIONS[0]!;
  // The illustration's whole arithmetic: a tenth of the percentage, as patients in a day.
  // Deliberately simple enough to verify at a glance — 30% reads as about 3 a day.
  const perDay = Math.round(percent / MIX_PERCENT_STEP);

  return (
    <section className="mix-hero" aria-label="Set the patient mix you want">
      <p className="mix-line" aria-hidden="true">
        I want{" "}
        <span className="mix-percent-group">
          <button
            type="button"
            className="mix-step"
            aria-hidden="true"
            tabIndex={-1}
            disabled={percent <= MIX_PERCENT_MIN}
            onClick={() => onSetPercent(Math.max(MIX_PERCENT_MIN, percent - MIX_PERCENT_STEP))}
          >
            &minus;
          </button>
          <span className="mix-percent">{percent}%</span>
          <button
            type="button"
            className="mix-step"
            aria-hidden="true"
            tabIndex={-1}
            disabled={percent >= MIX_PERCENT_MAX}
            onClick={() => onSetPercent(Math.min(MIX_PERCENT_MAX, percent + MIX_PERCENT_STEP))}
          >
            +
          </button>
        </span>{" "}
        of my patients to&nbsp;be
        <span className="mix-condition-slot">
          <AnimatePresence mode="wait" initial={false}>
            <motion.em
              key={condition}
              className="mix-condition"
              initial={reducedMotion ? false : { opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reducedMotion ? undefined : { opacity: 0, y: -10 }}
              transition={{ duration: 0.28 }}
            >
              {condition}
            </motion.em>
          </AnimatePresence>
        </span>
      </p>

      {/* The visual sentence above is decorative to a screen reader (rotating text and
          unlabelled steppers are noise read aloud); this is the same control said once. */}
      <div className="sr-only">
        <label htmlFor="mix-percent-input">
          Percentage of your patients you would want in a chosen area
        </label>
        <input
          id="mix-percent-input"
          type="range"
          min={MIX_PERCENT_MIN}
          max={MIX_PERCENT_MAX}
          step={MIX_PERCENT_STEP}
          value={percent}
          onChange={(event) => onSetPercent(Number(event.target.value))}
        />
      </div>

      <p className="mix-result" role="status">
        That mix looks like about <strong>{perDay === 1 ? "1 matched patient" : `${perDay} matched patients`} a day</strong> asking
        for exactly that work.
      </p>
      <p className="mix-honesty">
        An illustration, not a booking forecast — volume follows patient demand in your area.
        What is real: the matcher only ever sends what you declare, so the mix is yours to set.
      </p>
      <a className="mix-cta" href="#join-form">
        Set my mix
      </a>
    </section>
  );
}
