"use client";

// O95: the listening screen, verbatim from care-finder.tsx. The speech SESSION stays in
// the orchestrator (the O69 carried-stream lifecycle must not split across files); this
// screen renders the live transcript and the controls.

import { Microphone, X } from "@phosphor-icons/react";
import { motion } from "motion/react";
import {
  DEFAULT_SPEECH_LANGUAGE,
  SPEECH_DISCLOSURE,
  SPEECH_ENGLISH_MATCHING_NOTE,
  SPEECH_LANGUAGES,
  type SpeechLanguage,
} from "@/voice/speech";
import { FINDER_ANNOUNCEMENTS, listeningAgainIn } from "@/finder/announce";
import { MotionScreen, Pressable, StatusLine, WaveformMark, Wordmark } from "./shared";

/**
 * U9: one microphone control. The screen used to carry two — the microphone itself, labelled
 * "Finish voice description", and a "Done" button under it — that did the same thing, and a
 * screen reader met two ways to stop before it met the transcript. The microphone is now a
 * toggle: `aria-pressed` says it is on, `aria-busy` says the recogniser is finishing its last
 * phrase after the tap, and the caption under it says what a tap does — the sighted reader lost
 * the word "Done" and gets the instruction where the control is. The language controls restart
 * listening and the live region says so, in the language's own name.
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

  return (
    <MotionScreen key="listening" className="listening-screen" focusOnArrival={focusOnArrival}>
      <StatusLine line={line} />
      <header className="minimal-header">
        <Wordmark />
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Cancel">
          <X size={25} weight="light" aria-hidden="true" />
        </button>
      </header>

      <div className="voice-prompt listening-copy">
        <p className="eyebrow">Listening</p>
        <h1 tabIndex={-1}>Describe the GP you’d feel comfortable with.</h1>
        {/* The transcript replaces the prompt as soon as there is one: once somebody is
            talking, the instruction is noise and the words are the feedback. It is not live
            (U9): a person hears their own words as they say them, and a region that read every
            revision back talked over them. */}
        {heard ? (
          <p className="listening-transcript">{heard}</p>
        ) : (
          <p className="example">What you need looked at, your language, how you want to be treated. Whatever matters to you.</p>
        )}
      </div>

      <div className="voice-actions">
        {/* U9: the breathing is the halo's, not the button's. The whole control used to scale
            on a loop, so the one tap target on the screen never held still — a finger (or a
            pointer waiting for a stable box) chased it. The ring behind it breathes instead;
            the button stays exactly where it was. */}
        <div className="mic-stage">
          <motion.span
            className="mic-halo"
            aria-hidden="true"
            animate={reducedMotion || finishing ? undefined : { scale: [1, 1.06, 1] }}
            transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
          />
          <Pressable
            className="mic-button recording"
            type="button"
            onClick={onFinish}
            aria-label="Microphone"
            aria-pressed={!finishing}
            aria-busy={finishing || undefined}
          >
            <Microphone size={38} weight="light" aria-hidden="true" />
          </Pressable>
        </div>
        <WaveformMark active={!finishing} />
        <p className="mic-caption">{finishing ? "Finishing…" : "Tap the microphone when you’ve finished."}</p>
        <button className="text-action" type="button" onClick={onType}>Type instead</button>
        {/* Beside the microphone, not in a policy page. See src/voice/speech.ts. */}
        <p className="speech-disclosure">{SPEECH_DISCLOSURE}</p>
        {/* O59: the language control lives inside the disclosure block it shares rules
            with — one quiet line, the alternatives being exactly the languages listed
            GPs declare. Choosing one restarts listening in it. */}
        <p className="speech-language" data-testid="speech-language">
          Listening in {speechLang.label}.
          {SPEECH_LANGUAGES.filter((l) => l.tag !== speechLang.tag).map((l) => (
            <button
              key={l.tag}
              className="text-action speech-language-choice"
              type="button"
              lang={l.tag}
              onClick={() => onLanguage(l)}
            >
              {l.label}
            </button>
          ))}
        </p>
        {/* The honesty line ships with the picker, not after it — see speech.ts. */}
        {speechLang.tag !== DEFAULT_SPEECH_LANGUAGE.tag && (
          <p className="speech-language-note">{SPEECH_ENGLISH_MATCHING_NOTE}</p>
        )}
      </div>
    </MotionScreen>
  );
}
