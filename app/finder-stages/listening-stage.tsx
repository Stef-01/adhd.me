"use client";

// O95: the listening screen. The speech SESSION stays in the orchestrator (the O69
// carried-stream lifecycle must not split across files); this screen renders the live transcript
// and the controls.
//
// O245 (founder-directed): "this looks terrible … compare to Wispr Flow and other speech-to-text
// interfaces that are far less cluttered." THE RCA, honestly: the screen had seven things
// competing for one job. A display-scale headline ("Describe the GP you'd feel comfortable
// with"), an example paragraph, the transcript in a third size, a 102px near-black microphone
// whose glyph said "start" on a screen that was already listening, a waveform floating under it,
// a two-line caption, a full-width "Type instead" with left-aligned text, a four-line privacy
// paragraph, then the language line with its choices stacked as pills. Every capture app that
// gets this right (Wispr Flow, the iOS keyboard's dictation, Otter) does the opposite: the
// transcript IS the screen, one control carries the waveform, and everything else is a quiet
// chip or a single line.
//
// So: the h1 is the word "Listening" (the a11y landing line it always was), the transcript is
// the hero in serif and grows as words arrive, the microphone carries the waveform inside it
// while it listens and the halo breathes behind it, one caption says what a tap does, and the
// two secondary actions are chips side by side — "Type instead" and the language, which opens
// its choices in place. The disclosure stays (voice.spec pins it visible before anything is
// said), as one faint line. Nothing else is on the screen.

import { Microphone, X, CaretDown } from "@phosphor-icons/react";
import { motion } from "motion/react";
import { useState } from "react";
import {
  DEFAULT_SPEECH_LANGUAGE,
  SPEECH_DISCLOSURE,
  SPEECH_ENGLISH_MATCHING_NOTE,
  SPEECH_LANGUAGES,
  type SpeechLanguage,
} from "@/voice/speech";
import { FINDER_ANNOUNCEMENTS, listeningAgainIn } from "@/finder/announce";
import { MotionScreen, Pressable, StatusLine, Wordmark } from "./shared";

/**
 * U9: one microphone control — a toggle: `aria-pressed` says it is on, `aria-busy` says the
 * recogniser is finishing its last phrase after the tap, and the caption under it says what a
 * tap does. The language controls restart listening and the live region says so.
 */
export function ListeningStage({
  heard,
  reducedMotion,
  speechLang,
  finishing,
  restartedIn,
  focusOnArrival,
  onFinish,
  onCancel,
  onType,
  onLanguage,
}: {
  heard: string;
  reducedMotion: boolean | null;
  speechLang: SpeechLanguage;
  finishing: boolean;
  /** Set once a language control has been tapped: the line changes to name the restart. */
  restartedIn: SpeechLanguage | null;
  focusOnArrival: boolean;
  onFinish: () => void;
  onCancel: () => void;
  onType: () => void;
  onLanguage: (language: SpeechLanguage) => void;
}) {
  const line = finishing
    ? FINDER_ANNOUNCEMENTS.finishing
    : restartedIn
      ? listeningAgainIn(restartedIn.label)
      : FINDER_ANNOUNCEMENTS.listening;
  const [langOpen, setLangOpen] = useState(false);

  return (
    <MotionScreen key="listening" className="listening-screen" focusOnArrival={focusOnArrival}>
      <StatusLine line={line} />
      <header className="minimal-header">
        <Wordmark />
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Cancel">
          <X size={25} weight="light" aria-hidden="true" />
        </button>
      </header>

      {/* The transcript is the screen. Before the first word, a short placeholder in the same
          place, so the words land where the eye already is. Not live (U9): a person hears
          their own words as they say them. */}
      <div className="listen-stage">
        <h1 className="listen-eyebrow" tabIndex={-1}>Listening</h1>
        <p className={heard ? "listen-transcript" : "listen-transcript is-empty"} aria-live="off">
          {heard || "Say what you’re looking for…"}
        </p>
      </div>

      <div className="voice-actions listen-actions">
        <div className="mic-stage">
          <motion.span
            className="mic-halo"
            aria-hidden="true"
            animate={reducedMotion || finishing ? undefined : { scale: [1, 1.08, 1], opacity: [0.9, 0.6, 0.9] }}
            transition={{ duration: 1.6, ease: "easeInOut", repeat: Infinity }}
          />
          <Pressable
            className={finishing ? "mic-button recording is-finishing" : "mic-button recording"}
            type="button"
            onClick={onFinish}
            aria-label="Microphone"
            aria-pressed={!finishing}
            aria-busy={finishing || undefined}
          >
            {/* While it listens, the control shows the sound; while it finishes, the glyph. */}
            {finishing ? (
              <Microphone size={34} weight="light" aria-hidden="true" />
            ) : (
              <span className={reducedMotion ? "mic-bars" : "mic-bars is-live"} aria-hidden="true">
                <span /><span /><span /><span /><span />
              </span>
            )}
          </Pressable>
        </div>
        <p className="mic-caption">{finishing ? "Finishing…" : "Tap when you’ve finished."}</p>

        <div className="listen-chips">
          <button className="listen-chip" type="button" onClick={onType}>Type instead</button>
          {/* O59: the language line, as a chip that opens its choices in place — the
              alternatives are exactly the languages listed GPs declare. */}
          <div className="listen-lang" data-testid="speech-language">
            <button
              className={langOpen ? "listen-chip is-open" : "listen-chip"}
              type="button"
              aria-expanded={langOpen}
              aria-controls="listen-lang-choices"
              onClick={() => setLangOpen((o) => !o)}
            >
              Listening in {speechLang.label}.
              <CaretDown size={14} weight="bold" aria-hidden="true" />
            </button>
            {langOpen && (
              <ul id="listen-lang-choices" className="listen-lang-choices" aria-label="Change language">
                {SPEECH_LANGUAGES.filter((l) => l.tag !== speechLang.tag).map((l) => (
                  <li key={l.tag}>
                    <button
                      className="listen-chip speech-language-choice"
                      type="button"
                      lang={l.tag}
                      onClick={() => { setLangOpen(false); onLanguage(l); }}
                    >
                      {l.label}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
        {/* The honesty line ships with the picker — see speech.ts. */}
        {speechLang.tag !== DEFAULT_SPEECH_LANGUAGE.tag && (
          <p className="speech-language-note">{SPEECH_ENGLISH_MATCHING_NOTE}</p>
        )}
        {/* Beside the microphone, not in a policy page. See src/voice/speech.ts. */}
        <p className="speech-disclosure">{SPEECH_DISCLOSURE}</p>
      </div>
    </MotionScreen>
  );
}
