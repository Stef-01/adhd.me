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
        <p className="eyebrow">In your own words</p>
        {speechMessage && <p className="speech-error">{speechMessage}</p>}
        {speechRetryable && (
          <button className="speech-retry" type="button" onClick={onRetryMic}>
            Try the microphone again
          </button>
        )}
        <h1 tabIndex={-1}>
          <span>ADHD assessment</span>
          <em>that takes you seriously.</em>
        </h1>
        <label className="sr-only" htmlFor="doctor-request">Describe the GP you want to see</label>
        <textarea
          id="doctor-request"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="For example: A woman GP who assesses adult ADHD, speaks Tamil, and understands a family who thinks this is an excuse."
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
