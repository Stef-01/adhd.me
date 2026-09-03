"use client";

// O95: the welcome screen, verbatim from care-finder.tsx. State and handlers live in the
// orchestrator; this renders them.

import { ArrowRight, CaretRight, Microphone } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { FINDER_ANNOUNCEMENTS } from "@/finder/announce";
import { AppSettings } from "../app-settings";
import { EASE_OUT, FinderContext, introItem, introStagger, MotionScreen, Pressable, STAGE_SPRING, StatusLine, Wordmark } from "./shared";

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
      <header className="minimal-header has-settings">
        <Wordmark />
        {/* O233 (founder-directed): the settings control, top right. About and Questions live in
            its sheet — things consulted once do not belong in a bar meant for destinations
            somebody returns to. The finder's own testing options ride in the same sheet, so the
            app has one settings surface rather than two that look alike. */}
        <AppSettings>
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
        </AppSettings>
      </header>

      {/* O233 (founder-directed): the tagline is gone. "ADHD assessment that takes you seriously"
          was a marketing claim on the one screen whose whole job is to get a sentence out of
          somebody — and the founder's question, what does a person practically need to see, has one
          answer: what to type, and a box big enough to type it in.
          The `h1` stays because `finder-a11y.spec.ts` walks focus onto it and axe needs the heading;
          it is now the question the box answers, at a size that leads without shouting. */}
      <motion.div className="voice-core" variants={reducedMotion ? undefined : introStagger}>
        <motion.div className="voice-prompt" variants={reducedMotion ? undefined : introItem}>
          <h1 tabIndex={-1}>What kind of GP are you looking for?</h1>
        </motion.div>
      </motion.div>

      <motion.div
        className="voice-actions"
        initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ delay: 0.24, duration: 0.5, ease: EASE_OUT }}
      >
        {/* ONE field, ONE dual-functional control. Empty → a microphone that talks; the
            moment there is text → a send arrow that searches. Both routes converge on the
            same voice/findMatches() path, so speaking and writing rank clinicians identically. */}
        <div className="dual-input">
          <label className="sr-only" htmlFor="welcome-request">
            Describe the GP you are looking for, or use the microphone to talk
          </label>
          {/* O233: a textarea, not a one-line input. The thing a person is asked for is a
              SENTENCE — "a woman GP near Chatswood who speaks Mandarin and can do the whole
              assessment" — and a 66px single line showed them a fifth of it while they typed.
              Enter still searches, so the keyboard contract is unchanged; Shift+Enter makes a line
              for anybody who wants one. `rows` sets the resting height and the field grows no
              further, because a box that reflows the screen under a typing hand is worse than one
              that scrolls. */}
          <textarea
            id="welcome-request"
            className="dual-input-field"
            rows={3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (draft.trim()) onSearch(draft);
              }
            }}
            placeholder="Describe the GP you're looking for…"
          />
          <Pressable
            className={draft.trim() ? "dual-input-action is-send" : "dual-input-action is-talk"}
            type="button"
            onClick={() => (draft.trim() ? onSearch(draft) : onTalk())}
            aria-label={draft.trim() ? "Find a GP" : "Talk instead of typing"}
          >
            {/* O243: the glyph MORPHS as the first character lands — the mic turns into the arrow on a
                spring, which is the screen saying "now it searches" without a sentence. */}
            <AnimatePresence mode="wait" initial={false}>
              <motion.span
                key={draft.trim() ? "send" : "talk"}
                className="dual-input-glyph"
                initial={reducedMotion ? false : { scale: 0.5, rotate: -30, opacity: 0 }}
                animate={{ scale: 1, rotate: 0, opacity: 1 }}
                exit={reducedMotion ? undefined : { scale: 0.5, rotate: 30, opacity: 0, transition: { duration: 0.1 } }}
                transition={{ type: "spring", stiffness: 560, damping: 30 }}
              >
                {draft.trim()
                  ? <ArrowRight size={21} weight="bold" aria-hidden="true" />
                  : <Microphone size={21} weight="fill" aria-hidden="true" />}
              </motion.span>
            </AnimatePresence>
          </Pressable>
        </div>

        <motion.button
          className="scenario-toggle"
          type="button"
          onClick={onScenarios}
          initial={reducedMotion ? undefined : { opacity: 0, y: 8 }}
          animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
          transition={{ ...STAGE_SPRING, delay: 0.38, opacity: { duration: 0.25, delay: 0.38 } }}
        >
          Try an example search
          <CaretRight size={14} weight="bold" aria-hidden="true" />
        </motion.button>

        {/* O233: the testing options moved into the settings sheet (see the header above), so
            the app has one place a person changes anything. */}
      </motion.div>

      <FinderContext />

    </MotionScreen>
  );
}
