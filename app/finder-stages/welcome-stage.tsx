"use client";

// O95: the welcome screen, verbatim from care-finder.tsx. State and handlers live in the
// orchestrator; this renders them.

import Link from "next/link";
import { ArrowLeft, ArrowRight, CaretRight, Microphone } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { FINDER_ANNOUNCEMENTS } from "@/finder/announce";
import { FinderContext, introItem, introStagger, MotionScreen, Pressable, StatusLine, Wordmark } from "./shared";

export function WelcomeStage({
  draft,
  setDraft,
  reducedMotion,
  focusOnArrival,
  onSearch,
  onTalk,
  onScenarios,
  includeSynthetic,
  onToggleSynthetic,
}: {
  draft: string;
  setDraft: (value: string) => void;
  reducedMotion: boolean | null;
  /** U9: true only when the person came BACK here — a page load announces nothing and moves no focus. */
  focusOnArrival: boolean;
  onSearch: (value: string) => void;
  onTalk: () => void;
  onScenarios: () => void;
  /** O226: the example-roster switch lives HERE now, folded away — configuration belongs at the
   * door, not between a reader and their results (founder-directed; the harmony review agreed:
   * the toggle card was the loudest block on a screen whose one job is the list). */
  includeSynthetic: boolean;
  onToggleSynthetic: (next: boolean) => void;
}) {
  return (
    <MotionScreen key="welcome" className="voice-screen" focusOnArrival={focusOnArrival}>
      {focusOnArrival && <StatusLine line={FINDER_ANNOUNCEMENTS.welcome} />}
      <header className="minimal-header">
        <Wordmark />
        <Link href="/" className="quiet-link finder-home-link">
          <ArrowLeft size={15} weight="regular" aria-hidden="true" /> Home
        </Link>
      </header>

      <motion.div className="voice-core" variants={reducedMotion ? undefined : introStagger}>
        <motion.div className="voice-prompt" variants={reducedMotion ? undefined : introItem}>
          <h1 tabIndex={-1}>
            <span>ADHD assessment</span>
            <em>that takes you seriously.</em>
          </h1>
        </motion.div>
      </motion.div>

      <motion.div
        className="voice-actions"
        initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ delay: 0.24, duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* ONE field, ONE dual-functional control. Empty → a microphone that talks; the
            moment there is text → a send arrow that searches. Both routes converge on the
            same voice/findMatches() path, so speaking and writing rank clinicians identically. */}
        <div className="dual-input">
          <label className="sr-only" htmlFor="welcome-request">
            Describe the GP you are looking for, or use the microphone to talk
          </label>
          <input
            id="welcome-request"
            type="text"
            className="dual-input-field"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => { if (event.key === "Enter" && draft.trim()) onSearch(draft); }}
            placeholder="Describe the GP you're looking for…"
          />
          <Pressable
            className={draft.trim() ? "dual-input-action is-send" : "dual-input-action is-talk"}
            type="button"
            onClick={() => (draft.trim() ? onSearch(draft) : onTalk())}
            aria-label={draft.trim() ? "Find a GP" : "Talk instead of typing"}
          >
            {draft.trim()
              ? <ArrowRight size={21} weight="bold" aria-hidden="true" />
              : <Microphone size={21} weight="fill" aria-hidden="true" />}
          </Pressable>
        </div>

        <button className="scenario-toggle" type="button" onClick={onScenarios}>
          Try a demo scenario
          <CaretRight size={14} weight="bold" aria-hidden="true" />
        </button>

        {/* O226: hidden away by default — a closed disclosure, not a card. The example roster
            ships ON for this testing deployment (founder decision synthetic-roster-tickbox,
            amended), so what this holds is the way OFF, for reading the real network alone. */}
        <details className="finder-demo-tools">
          <summary>Testing options</summary>
          <label className="finder-demo-toggle">
            <input
              type="checkbox"
              checked={includeSynthetic}
              onChange={(event) => onToggleSynthetic(event.target.checked)}
            />
            <span>
              <strong>Include example profiles</strong>
              <small>Fictional GPs for trying the finder — not real people, and not bookable.</small>
            </span>
          </label>
        </details>
      </motion.div>

      <FinderContext />

    </MotionScreen>
  );
}
