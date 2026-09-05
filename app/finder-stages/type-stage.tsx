"use client";

// O95: the typing screen, verbatim from care-finder.tsx.

import { ArrowLeft } from "@phosphor-icons/react";
import { typeAnnouncement } from "@/finder/announce";
import { MotionScreen, Pressable, StatusLine, Wordmark } from "./shared";

/**
 * U9: focus lands in the field, not on the heading — this is the one stage whose heading is
 * not an instruction, and the person arrived here by choosing to type. The live region says
 * whether the microphone stopped (and the screen's own message after it) or that this is the
 * typing screen; the message itself is a plain paragraph, read once through the region rather
 * than twice through its own `role="status"`.
 */
export function TypeStage({
  draft,
  setDraft,
  speechMessage,
  speechRetryable,
  micStopped,
  focusOnArrival,
  onRetryMic,
  onBack,
  onSearch,
}: {
  draft: string;
  setDraft: (value: string) => void;
  speechMessage: string | null;
  speechRetryable: boolean;
  micStopped: boolean;
  focusOnArrival: boolean;
  onRetryMic: () => void;
  onBack: () => void;
  onSearch: (value: string) => void;
}) {
  return (
    <MotionScreen key="type" className="type-screen" focusOnArrival={focusOnArrival} focusTarget="#doctor-request">
      <StatusLine line={typeAnnouncement({ micStopped, speechMessage })} />
      <header className="minimal-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={25} weight="light" aria-hidden="true" />
        </button>
        <Wordmark />
        <span className="header-spacer" />
      </header>

      <div className="type-content">
        {/* transitions.dev toast: the banner rises in through a cross-blur, slower in than out —
            a mount animation, because the reducer only ever holds one banner at a time. */}
        {speechMessage && <p className="speech-error t-toast" role="status">{speechMessage}</p>}
        {speechRetryable && (
          <button className="speech-retry" type="button" onClick={onRetryMic}>
            Try the microphone again
          </button>
        )}
        {/* THIS SCREEN WAS STILL RUNNING THE TAGLINE O233 DELETED. The welcome used to open with
            "ADHD assessment / that takes you seriously." and the founder had it removed — a
            marketing claim on the screen whose job is to get a sentence out of somebody. The
            welcome was fixed and the type screen, which is the same box reached by another door,
            kept it: a person who taps "Type instead" on the listening screen met a slogan the
            product had already retracted, at display size, above a box it had pushed down. It asks
            the welcome's question now, word for word — one question, wherever the box is met.
            The eyebrow ("In your own words") went with it rather than being kept and shrunk: it
            was the question again in label type, and the flow from listening is continuous only if
            arriving here costs one line to read, not three. The placeholder is the welcome's too,
            for the same reason — one field, one example, whichever screen it is on. */}
        <h1 tabIndex={-1}>What kind of GP are you looking for?</h1>
        <label className="sr-only" htmlFor="doctor-request">Describe the GP you want to see</label>
        <textarea
          id="doctor-request"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="e.g. a woman GP near Beecroft who bulk bills"
        />
      </div>

      <div className="bottom-action">
        <Pressable className="primary-button" type="button" disabled={!draft.trim()} onClick={() => {
          onSearch(draft);
        }}>
          Find a GP
        </Pressable>
        <p>Don’t include identifying or urgent health details.</p>
      </div>
    </MotionScreen>
  );
}
