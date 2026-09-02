"use client";

// O95: the demo-scenario browser, verbatim from care-finder.tsx.

import { ArrowLeft, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { careArchetypes, type CareArchetype } from "@/demo/care-archetypes";
import { FINDER_ANNOUNCEMENTS } from "@/finder/announce";
import { MotionScreen, Pressable, StatusLine, Wordmark } from "./shared";

export function ScenariosStage({
  archetype,
  archetypeIndex,
  matchDirection,
  focusOnArrival,
  onBack,
  onCycle,
  onTry,
}: {
  archetype: CareArchetype;
  archetypeIndex: number;
  matchDirection: 1 | -1;
  focusOnArrival: boolean;
  onBack: () => void;
  onCycle: (direction: 1 | -1) => void;
  onTry: () => void;
}) {
  /* O141: CHECKED AT THE HOOK, not left to the enclosing MotionConfig.
     `MotionConfig reducedMotion="user"` disables the TWEEN and keeps the transform VALUES, so
     with an ungated `x` the quote SNAPPED to a 9px offset and held there ~240ms before landing —
     measured, under `prefers-reduced-motion: reduce`. That is strictly worse than the animation:
     the reader who asked for less motion got an instant displacement instead of a smooth one.
     The taste law says every effect needs a static equal checked AT THE HOOK, and the enclosing
     config looking like it handles this is exactly why nobody noticed. The static equal here is
     no displacement at all — the quote simply swaps. */
  const reduce = useReducedMotion();
  const slide = reduce ? 0 : matchDirection * 9;

  return (
    <MotionScreen key="scenarios" className="scenario-screen" focusOnArrival={focusOnArrival}>
      <StatusLine line={FINDER_ANNOUNCEMENTS.scenarios} />
      <header className="minimal-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back to start">
          <ArrowLeft size={25} weight="light" aria-hidden="true" />
        </button>
        <Wordmark />
        <span className="header-spacer" />
      </header>

      <div className="scenario-core">
        {/* U9: the eyebrow IS this screen's heading — it had none, so focus had nowhere to land
            and a screen reader had no landmark for the stage. Same class, so the same pixels. */}
        {/* O232: was `Demo scenarios` in eyebrow type — an h1 rendered at label size, saying
            the product was a demo. Every search product offers example searches; that is what
            these are, and the heading is now sized like the heading it is. */}
        <h1 tabIndex={-1}>Example searches</h1>
        <div className="archetype-switcher" role="group" aria-label="Demo care scenarios">
          <Pressable type="button" onClick={() => onCycle(-1)} aria-label="Previous care scenario">
            <CaretLeft size={22} weight="light" aria-hidden="true" />
          </Pressable>
          <AnimatePresence mode="wait" initial={false}>
            <motion.blockquote
              className="scenario-quote"
              key={archetype.id}
              initial={{ opacity: 0, x: slide }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -slide }}
              transition={{ duration: 0.22 }}
            >
              <q>{archetype.example}</q>
            </motion.blockquote>
          </AnimatePresence>
          <Pressable type="button" onClick={() => onCycle(1)} aria-label="Next care scenario">
            <CaretRight size={22} weight="light" aria-hidden="true" />
          </Pressable>
        </div>
        <p className="scenario-count">{archetypeIndex + 1} of {careArchetypes.length}</p>
      </div>

      <div className="bottom-action">
        <Pressable className="primary-button" type="button" onClick={onTry}>
          Search with this
        </Pressable>
      </div>
    </MotionScreen>
  );
}
