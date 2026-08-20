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
import { MotionScreen, Pressable, WaveformMark, Wordmark } from "./shared";

export function ListeningStage({
  heard,
  reducedMotion,
  speechLang,
  onFinish,
  onCancel,
  onType,
  onLanguage,
}: {
  heard: string;
  reducedMotion: boolean | null;
  speechLang: SpeechLanguage;
  onFinish: () => void;
  onCancel: () => void;
  onType: () => void;
  onLanguage: (language: SpeechLanguage) => void;
}) {
  return (
    <MotionScreen key="listening" className="listening-screen">
      <header className="minimal-header">
        <Wordmark />
        <button className="icon-button" type="button" onClick={onCancel} aria-label="Cancel">
          <X size={25} weight="light" aria-hidden="true" />
        </button>
      </header>

      <div className="voice-prompt listening-copy">
        <p className="eyebrow">Listening</p>
        <h1>Describe the GP you’d feel comfortable with.</h1>
        {/* The transcript replaces the prompt as soon as there is one: once somebody is
            talking, the instruction is noise and the words are the feedback. `aria-live`
            is polite so a screen reader is not interrupted on every revision. */}
        {heard ? (
          <p className="listening-transcript" aria-live="polite">{heard}</p>
        ) : (
          <p className="example">What you need looked at, your language, how you want to be treated. Whatever matters to you.</p>
        )}
      </div>

      <div className="voice-actions">
        <motion.div
          animate={reducedMotion ? undefined : { scale: [1, 1.035, 1] }}
          transition={{ duration: 1.5, ease: "easeInOut", repeat: Infinity }}
        >
          <Pressable className="mic-button recording" type="button" onClick={onFinish} aria-label="Finish voice description">
            <Microphone size={38} weight="light" aria-hidden="true" />
          </Pressable>
        </motion.div>
        <WaveformMark active />
        <button className="primary-button listening-done" type="button" onClick={onFinish}>Done</button>
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
