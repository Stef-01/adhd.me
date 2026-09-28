"use client";

// The voice finder (founder, 2026-09-28: "exactly like talking to ChatGPT voice, which
// progressively asks you questions (max 8 follow ups) and then reveals the clinician matches").
// The screen is the prototype's (founder, the same day: "remove that bar entirely, make it exactly
// like this", Javi0108/VoiceChatGpt-Prototype): the orb, and one button that ends the call. The
// question being asked is the heading for a screen reader; everybody else hears it. The
// conversation is src/voice/conversation.ts, the call src/voice/link.ts, what the model is told
// src/voice/interviewer.ts.

import { ChatCircleText, Phone } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FINDER_ANNOUNCEMENTS } from "@/finder/announce";
import { contact, type CrisisContactId } from "@/model/crisis-contacts";
import { initialVoice, saidAsRequest, step, type Action, type ClientEvent, type Reveal, type VoiceState } from "@/voice/conversation";
import { failureOf, openLink, type VoiceLink } from "@/voice/link";
import { FINDER_COPY } from "../finder-copy";
import { Sheet } from "../sheet";
import { MotionScreen, StatusLine } from "./shared";
import { VoiceOrb } from "./voice-orb";

const COPY = FINDER_COPY.voice;
/** A call that runs this long is wound up: the answers so far are enough to rank on. */
const MAX_CALL_MS = 6 * 60_000;
/** How long the reveal waits for the last sentence to finish playing. */
const LAST_WORDS_MS = 6000;
/** The orb's exit, before the matches arrive. */
const REVEAL_MS = 560;
/** The contacts the urgent sheet lists, in the order a person in danger needs them. */
const URGENT: readonly CrisisContactId[] = ["emergency", "emergency-text", "lifeline", "lifeline-text"];

export function VoiceStage({
  focusOnArrival,
  reducedMotion,
  onReveal,
  onLeave,
  onType,
}: {
  focusOnArrival: boolean;
  reducedMotion: boolean | null;
  /** The last answer is in: rank on the model's sentence, near its place. */
  onReveal: (reveal: Reveal) => void;
  /** The stop button: back to the start, with what the person said in the box. */
  onLeave: (words: string) => void;
  /** The call could not start: the typing screen, with what was said. */
  onType: (words: string) => void;
}) {
  const [view, setView] = useState<VoiceState>(initialVoice);
  const state = useRef(view);
  const link = useRef<VoiceLink | null>(null);
  const queued = useRef<ClientEvent[]>([]);
  const revealTo = useRef(onReveal);

  useEffect(() => {
    revealTo.current = onReveal;
  }, [onReveal]);

  const act = useCallback((action: Action) => {
    const { state: next, send } = step(state.current, action);
    state.current = next;
    setView(next);
    for (const event of send) {
      if (link.current) link.current.emit(event);
      else queued.current.push(event);
    }
  }, []);

  // The call opens a tick after arrival, so React's development double mount opens one, and any
  // way off this screen closes it.
  useEffect(() => {
    let live = true;
    const start = window.setTimeout(() => {
      openLink({
        onOpen: () => live && act({ type: "connected" }),
        onEvent: (event) => live && act({ type: "server", event }),
        onFail: (failure) => live && act({ type: "failed", failure }),
      }).then(
        (opened) => {
          if (!live) return opened.close();
          link.current = opened;
          for (const event of queued.current.splice(0)) opened.emit(event);
        },
        (error: unknown) => live && act({ type: "failed", failure: failureOf(error) }),
      );
    }, 0);
    const cap = window.setTimeout(() => live && act({ type: "finish" }), MAX_CALL_MS);
    return () => {
      live = false;
      window.clearTimeout(start);
      window.clearTimeout(cap);
      link.current?.close();
      link.current = null;
    };
  }, [act]);

  // The reveal: after the last sentence has been said, the orb leaves and the matches arrive.
  const { phase, reveal, talking } = view;
  const speaking = talking === "assistant";
  useEffect(() => {
    if (phase !== "revealing" || !reveal) return;
    const wait = speaking ? LAST_WORDS_MS : reducedMotion ? 0 : REVEAL_MS;
    const timer = window.setTimeout(() => revealTo.current(reveal), wait);
    return () => window.clearTimeout(timer);
  }, [phase, reveal, speaking, reducedMotion]);

  const level = useCallback(() => link.current?.level() ?? { input: 0, output: 0 }, []);

  const failed = phase === "failed";
  const failure = COPY.failed[view.failure ?? "unavailable"].text;
  const line =
    phase === "connecting" ? FINDER_ANNOUNCEMENTS.voiceConnecting
    : phase === "revealing" ? FINDER_ANNOUNCEMENTS.voiceRevealing
    : failed ? failure
    : FINDER_ANNOUNCEMENTS.voiceLive;

  return (
    <MotionScreen key="voice" className="voice-mode" focusOnArrival={focusOnArrival}>
      <StatusLine line={line} />
      {/* The question being asked, as it is said: the heading a screen reader lands on. */}
      <h1 tabIndex={-1} className="sr-only">
        {failed ? failure : view.caption}
      </h1>

      <div className="voice-mode-stage">
        <VoiceOrb phase={phase === "revealing" && speaking ? "live" : phase} level={level} reducedMotion={reducedMotion} />
        {failed && <p className="voice-mode-failed">{failure}</p>}
      </div>

      <div className="voice-mode-foot">
        {failed ? (
          <button className="primary-button voice-mode-type" type="button" onClick={() => onType(saidAsRequest(view.said))}>
            {COPY.typeInstead.text}
          </button>
        ) : (
          <button className="voice-stop" type="button" aria-label={COPY.end.text} onClick={() => onLeave(saidAsRequest(state.current.said))}>
            <svg viewBox="0 0 56 56" aria-hidden="true">
              <circle cx="28" cy="28" r="21.9" fill="none" stroke="currentColor" strokeWidth="4" />
              <rect x="19.7" y="19.7" width="16.6" height="16.6" rx="2.3" fill="currentColor" />
            </svg>
          </button>
        )}
      </div>

      <Sheet open={view.urgent} title={COPY.urgent.text} onClose={() => act({ type: "urgent-seen" })}>
        <ul className="urgent-list">
          {URGENT.map((id) => {
            const c = contact(id);
            const Icon = c.method === "call" ? Phone : ChatCircleText;
            return (
              <li key={id}>
                <a className="urgent-call" href={c.href} data-method={c.method}>
                  <span className="urgent-name">
                    <strong>{c.service}</strong>
                    <span>{c.when}</span>
                  </span>
                  <span className="urgent-number t-digit">
                    <Icon size={18} weight="fill" aria-hidden="true" />
                    {c.said}
                  </span>
                </a>
              </li>
            );
          })}
        </ul>
      </Sheet>
    </MotionScreen>
  );
}
