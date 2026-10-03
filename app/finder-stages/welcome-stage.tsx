"use client";

// O95: the welcome screen, verbatim from care-finder.tsx. State and handlers live in the
// orchestrator; this renders them.

import { useRef } from "react";
import { ArrowRight, Microphone } from "@phosphor-icons/react";
import { AnimatePresence, motion } from "motion/react";
import { FINDER_ANNOUNCEMENTS } from "@/finder/announce";
import { EXAMPLE_SEARCHES } from "@/finder/examples";
import { OPENING_QUESTION } from "@/voice/interviewer";
import { AppSettings } from "../app-settings";
import { RateVisit } from "./rate-visit";
import { EASE_OUT, introItem, introStagger, MotionScreen, Pressable, StatusLine, Wordmark } from "./shared";

/** How the finder reads: the model and the voice finder, or the word matcher alone. A preference this device keeps. */
export type FinderMode = "ai" | "standard";
export const MODE_KEY = "adhdme.finder.mode";
const MODES: readonly [FinderMode, string][] = [["ai", "AI"], ["standard", "Standard"]];

/**
 * The visual and the action are the same thing: one large, unmistakable voice target. The nested
 * spans are light, not illustration, and stay silent to assistive technology; the button's name is
 * the instruction. This keeps AI mode to one decision instead of showing voice, typing and four
 * examples at once.
 */
function AuroraWisp({ onTalk }: { onTalk: () => void }) {
  return (
    <Pressable className="aurora-wisp" type="button" onClick={onTalk} aria-label="Talk instead of typing">
      <span className="aurora-wisp-aura" aria-hidden="true" />
      <span className="aurora-wisp-particle particle-one" aria-hidden="true" />
      <span className="aurora-wisp-particle particle-two" aria-hidden="true" />
      <span className="aurora-wisp-particle particle-three" aria-hidden="true" />
      <span className="aurora-wisp-flame" aria-hidden="true">
        <span className="aurora-wisp-mid">
          <span className="aurora-wisp-core"><Microphone size={30} weight="fill" /></span>
        </span>
      </span>
      <span className="aurora-wisp-instruction">Tap to speak</span>
    </Pressable>
  );
}

export function WelcomeStage({
  draft,
  setDraft,
  reducedMotion,
  focusOnArrival,
  onSearch,
  onTalk,
  mode,
  onMode,
}: {
  draft: string;
  setDraft: (value: string) => void;
  reducedMotion: boolean | null;
  /** U9: true only when the person came BACK here — a page load announces nothing and moves no focus. */
  focusOnArrival: boolean;
  onSearch: (value: string) => void;
  onTalk: () => void;
  /** The chosen mode, or null where this server offers only Standard. */
  mode: FinderMode | null;
  onMode: (mode: FinderMode) => void;
}) {
  const box = useRef<HTMLTextAreaElement | null>(null);
  return (
    <MotionScreen key="welcome" className="voice-screen" focusOnArrival={focusOnArrival}>
      {focusOnArrival && <StatusLine line={FINDER_ANNOUNCEMENTS.welcome} />}
      <header className="minimal-header has-settings">
        <Wordmark />
        {/* O233 (founder-directed): the settings control, top right. About and Questions live in
            its sheet, things consulted once do not belong in a bar meant for destinations
            somebody returns to. */}
        <AppSettings />
      </header>

      {/* O233 (founder-directed): the tagline is gone. "ADHD assessment that takes you seriously"
          was a marketing claim on the one screen whose whole job is to get a sentence out of
          somebody, and the founder's question, what does a person practically need to see, has one
          answer: what to type, and a box big enough to type it in.
          The `h1` stays because `finder-a11y.spec.ts` walks focus onto it and axe needs the heading;
          it is now the question the box answers, at a size that leads without shouting. */}
      <motion.div className="voice-core" variants={reducedMotion ? undefined : introStagger}>
        <motion.div className="voice-prompt" variants={reducedMotion ? undefined : introItem}>
          <h1 tabIndex={-1} className="t-question">{OPENING_QUESTION}</h1>
        </motion.div>
      </motion.div>

      <motion.div
        className="voice-actions"
        initial={reducedMotion ? undefined : { opacity: 0, y: 14 }}
        animate={reducedMotion ? undefined : { opacity: 1, y: 0 }}
        transition={{ delay: 0.24, duration: 0.5, ease: EASE_OUT }}
      >
        {mode === "ai" && <AuroraWisp onTalk={onTalk} />}

        {/* ONE field, ONE dual-functional control. Empty → a microphone that talks; the
            moment there is text → a send arrow that searches. Both routes converge on the
            same voice/findMatches() path, so speaking and writing rank clinicians identically. */}
        <div className={mode === "ai" ? "dual-input is-ai" : "dual-input"}>
          <label className="sr-only" htmlFor="welcome-request">
            Describe the support you are looking for, or use the microphone to talk
          </label>
          {/* AI mode keeps the typed path immediately available, but at one line so voice stays
              the visual lead. Standard restores the full sentence-sized composer. */}
          <textarea
            ref={box}
            id="welcome-request"
            className="dual-input-field"
            rows={mode === "ai" ? 1 : 3}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                if (draft.trim()) onSearch(draft);
              }
            }}
            placeholder={mode === "ai" ? "Or type what you need" : "A GP near Hornsby for an adult ADHD assessment, by telehealth"}
          />
          <Pressable
            className={draft.trim() ? "dual-input-action is-send" : "dual-input-action is-talk"}
            type="button"
            onClick={() => (draft.trim() ? onSearch(draft) : onTalk())}
            aria-label={draft.trim() ? "Find support" : "Talk instead of typing"}
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

        {mode !== "ai" && (
          /* W6b: four requests a person can see and tap. Each fills the box and puts the cursor at
             its end, so the mic becomes the search arrow and the words can still be changed. */
          <ul className="finder-examples" aria-label="Examples">
            {EXAMPLE_SEARCHES.map((example) => (
              <li key={example.label}>
                <button
                  type="button"
                  className="finder-example"
                  onClick={() => {
                    setDraft(example.request);
                    box.current?.focus();
                    requestAnimationFrame(() => {
                      box.current?.setSelectionRange(example.request.length, example.request.length);
                    });
                  }}
                >
                  {example.label}
                </button>
              </li>
            ))}
          </ul>
        )}

        {mode && (
          <div className="finder-mode" role="group" aria-label="Matching">
            {MODES.map(([value, name]) => (
              <button
                key={value}
                type="button"
                className="finder-example"
                aria-pressed={mode === value}
                onClick={() => {
                  onMode(value);
                  // Swapping the tall voice light for the composer must not let the browser keep
                  // the focused switch in place by scrolling the question under the sticky header.
                  requestAnimationFrame(() => {
                    requestAnimationFrame(() => window.scrollTo({ top: 0, left: 0 }));
                  });
                }}
              >
                {name}
              </button>
            ))}
          </div>
        )}

        {/* A day after a tap on "Book": how was the visit? One line, five stars (rate-visit.tsx). */}
        <RateVisit />

        {/* O233: the testing options moved into the settings sheet (see the header above), so
            the app has one place a person changes anything. */}
      </motion.div>


    </MotionScreen>
  );
}
