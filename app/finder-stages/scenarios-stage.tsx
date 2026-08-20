"use client";

// O95: the demo-scenario browser, verbatim from care-finder.tsx.

import { ArrowLeft, CaretLeft, CaretRight } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { careArchetypes, type CareArchetype } from "@/demo/care-archetypes";
import { MotionScreen, Pressable, Wordmark } from "./shared";

export function ScenariosStage({
  archetype,
  archetypeIndex,
  matchDirection,
  onBack,
  onCycle,
  onTry,
}: {
  archetype: CareArchetype;
  archetypeIndex: number;
  matchDirection: 1 | -1;
  onBack: () => void;
  onCycle: (direction: 1 | -1) => void;
  onTry: () => void;
}) {
  return (
    <MotionScreen key="scenarios" className="scenario-screen">
      <header className="minimal-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Back to start">
          <ArrowLeft size={25} weight="light" aria-hidden="true" />
        </button>
        <Wordmark />
        <span className="header-spacer" />
      </header>

      <div className="scenario-core">
        <p className="eyebrow">Demo scenarios</p>
        <div className="archetype-switcher" role="group" aria-label="Demo care scenarios">
          <Pressable type="button" onClick={() => onCycle(-1)} aria-label="Previous care scenario">
            <CaretLeft size={22} weight="light" aria-hidden="true" />
          </Pressable>
          <AnimatePresence mode="wait" initial={false}>
            <motion.blockquote
              className="scenario-quote"
              key={archetype.id}
              initial={{ opacity: 0, x: matchDirection * 9 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: matchDirection * -9 }}
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
          Try this scenario
        </Pressable>
      </div>
    </MotionScreen>
  );
}
