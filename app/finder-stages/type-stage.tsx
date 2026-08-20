"use client";

// O95: the typing screen, verbatim from care-finder.tsx.

import { ArrowLeft } from "@phosphor-icons/react";
import { MotionScreen, Pressable, Wordmark } from "./shared";

export function TypeStage({
  draft,
  setDraft,
  speechMessage,
  speechRetryable,
  onRetryMic,
  onBack,
  onSearch,
}: {
  draft: string;
  setDraft: (value: string) => void;
  speechMessage: string | null;
  speechRetryable: boolean;
  onRetryMic: () => void;
  onBack: () => void;
  onSearch: (value: string) => void;
}) {
  return (
    <MotionScreen key="type" className="type-screen">
      <header className="minimal-header">
        <button className="icon-button" type="button" onClick={onBack} aria-label="Go back">
          <ArrowLeft size={25} weight="light" aria-hidden="true" />
        </button>
        <Wordmark />
        <span className="header-spacer" />
      </header>

      <div className="type-content">
        <p className="eyebrow">In your own words</p>
        {speechMessage && <p className="speech-error" role="status">{speechMessage}</p>}
        {speechRetryable && (
          <button className="speech-retry" type="button" onClick={onRetryMic}>
            Try the microphone again
          </button>
        )}
        <h1>
          <span>ADHD assessment</span>
          <em>that takes you seriously.</em>
        </h1>
        <label className="sr-only" htmlFor="doctor-request">Describe the GP you want to see</label>
        <textarea
          id="doctor-request"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="For example: A woman GP who assesses adult ADHD, speaks Tamil, and understands a family who thinks this is an excuse."
          autoFocus
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
