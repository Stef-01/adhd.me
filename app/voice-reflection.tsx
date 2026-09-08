"use client";

// Voice for the reflect step (PRD §28): one microphone control, the finder's own speech session
// underneath (`src/voice/speech.ts`), the transcript appended to the reflection as it settles.
// Unavailable browsers say why and leave typing where it was; an error is a plain sentence from
// the same copy table the finder uses; the session is cancelled on unmount so the mic light
// never outlives the screen. Nothing spoken goes anywhere but the reflection field.

import { useEffect, useRef, useState } from "react";
import { Microphone, Stop } from "@phosphor-icons/react";
import { SPEECH_ERROR_COPY, SPEECH_UNAVAILABLE_COPY, speechUnavailable, startSpeech, type SpeechSession } from "@/voice/speech";

export function VoiceReflection({ onText }: { onText: (text: string) => void }) {
  const session = useRef<SpeechSession | null>(null);
  const [listening, setListening] = useState(false);
  const [interim, setInterim] = useState("");
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => () => { session.current?.cancel(); session.current = null; }, []);

  const stop = () => { session.current?.stop(); };
  const start = () => {
    setMessage(null);
    const unavailable = speechUnavailable();
    if (unavailable) { setMessage(SPEECH_UNAVAILABLE_COPY[unavailable]); return; }
    const s = startSpeech({
      onPartial: setInterim,
      onFinal: (text) => { setListening(false); setInterim(""); session.current = null; if (text.trim()) onText(text.trim()); },
      onError: (error) => { setListening(false); setInterim(""); session.current = null; setMessage(SPEECH_ERROR_COPY[error]); },
    });
    if (!s) { setMessage(SPEECH_UNAVAILABLE_COPY.unsupported); return; }
    session.current = s;
    setListening(true);
  };

  return (
    <div className="voice-reflection">
      <button type="button" className="learn-secondary" aria-pressed={listening} aria-busy={listening} onClick={listening ? stop : start}>
        {listening ? <Stop size={16} weight="fill" aria-hidden="true" /> : <Microphone size={16} weight="fill" aria-hidden="true" />}
        {listening ? "Tap when you’ve finished" : "Say it instead"}
      </button>
      {listening && <p className="voice-reflection-live" aria-live="polite">{interim || "Listening…"}</p>}
      {message && <p className="learn-reveal" role="status">{message}</p>}
    </div>
  );
}
