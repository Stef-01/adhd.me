"use client";

// The voice finder (founder, 2026-09-28: "exactly like talking to ChatGPT voice, which
// progressively asks you questions (max 8 follow ups) and then reveals the clinician matches").
// The screen is the prototype's (founder, the same day: "remove that bar entirely, make it exactly
// like this", Javi0108/VoiceChatGpt-Prototype): the orb, and one button that ends the call. The
// question being asked is the heading for a screen reader; everybody else hears it. The questions
// are src/voice/plan.ts, the conversation src/voice/conversation.ts, the call src/voice/link.ts,
// the recordings src/voice/clips.ts, what the model is told src/voice/interviewer.ts.

import { ChatCircleText, Phone } from "@phosphor-icons/react";
import { useCallback, useEffect, useRef, useState } from "react";
import { FINDER_ANNOUNCEMENTS } from "@/finder/announce";
import { contact, type CrisisContactId } from "@/model/crisis-contacts";
import { clipReady } from "@/voice/clips";
import { initialVoice, saidAsRequest, stalled, step, type Action, type ClientEvent, type Reveal, type Step, type VoiceState, type Turn } from "@/voice/conversation";
import { claimLink, failureOf, type VoiceLink } from "@/voice/link";
import { FINDER_COPY } from "../finder-copy";
import { Sheet } from "../sheet";
import { MotionScreen, StatusLine } from "./shared";
import { VoiceOrb } from "./voice-orb";

const COPY = FINDER_COPY.voice;

/** The call, for the finder's record (src/db/finder.ts): how it went, and every turn of it. */
export interface CallSummary {
  /** Minted when the call starts, so every report of the call, mid-call or final, is one row. */
  id: string;
  model: string;
  questions: number;
  seconds: number;
  outcome: "revealed" | "stopped" | "failed" | "urgent";
  /** The request the call wrote, and the place, when it reached its reveal. */
  request: string;
  place: string;
  turns: Turn[];
}
/** A call that runs this long is wound up: the answers so far are enough to rank on. */
const MAX_CALL_MS = 6 * 60_000;
/** How long the reveal waits for the last sentence to finish playing. */
const LAST_WORDS_MS = 6000;
/** The orb's exit, before the matches arrive. */
const REVEAL_MS = 560;
/** How long a person may say nothing after the assistant has finished before a gentle check. */
const QUIET_MS = 18_000;
/** How long the call waits on words that have not arrived, or on a sound that was nobody's turn. */
const UNHEARD_MS = 4_000;
/** A sound in a recording's first moments is the recording itself in the microphone: it plays on. */
const GRACE_MS = 300;
/** The contacts the urgent sheet lists, in the order a person in danger needs them. */
const URGENT: readonly CrisisContactId[] = ["emergency", "emergency-text", "lifeline", "lifeline-text"];

export function VoiceStage({
  focusOnArrival,
  reducedMotion,
  onReveal,
  onHeard,
  onCallEnd,
  onCallProgress,
  onLeave,
  onType,
}: {
  focusOnArrival: boolean;
  reducedMotion: boolean | null;
  /** The last answer is in: rank on the model's sentence, near its place. */
  onReveal: (reveal: Reveal) => void;
  /** The model has written the sentence: the finder can start reading it before the reveal. */
  onHeard?: (request: string) => void;
  /** Once per call, however it ends. */
  onCallEnd?: (call: CallSummary) => void;
  /** After every turn, the call so far (RCA night, stage 5): a call that ends in a tunnel still has its turns. */
  onCallProgress?: (call: CallSummary) => void;
  /** The stop button: back to the start, with what the person said in the box. */
  onLeave: (words: string) => void;
  /** The call could not start: the typing screen, with what was said. */
  onType: (words: string) => void;
}) {
  const [view, setView] = useState<VoiceState>(initialVoice);
  const state = useRef(view);
  const link = useRef<VoiceLink | null>(null);
  const queued = useRef<ClientEvent[]>([]);
  /** The recorded sentence being played: which playing it is, when it began, whether a sound may cut it short. */
  const playing = useRef<{ turn: number; began: number; firm: boolean } | null>(null);
  const wanted = useRef<NonNullable<Step["say"]> | null>(null);
  const plays = useRef(0);
  const revealTo = useRef(onReveal);
  const heardTo = useRef(onHeard);
  const endTo = useRef(onCallEnd);
  const progressTo = useRef(onCallProgress);
  const callId = useRef(crypto.randomUUID());
  const began = useRef(Date.now());
  const ended = useRef(false);

  useEffect(() => {
    revealTo.current = onReveal;
    heardTo.current = onHeard;
    endTo.current = onCallEnd;
    progressTo.current = onCallProgress;
  }, [onReveal, onHeard, onCallEnd, onCallProgress]);

  /** The call as the record keeps it, at this moment. */
  const summary = useCallback((s: VoiceState, outcome: CallSummary["outcome"]): CallSummary => ({
    id: callId.current,
    model: link.current?.model ?? "realtime",
    questions: s.asked,
    seconds: Math.round((Date.now() - began.current) / 1000),
    outcome,
    request: s.reveal?.request ?? "",
    place: s.reveal?.place ?? "",
    turns: s.turns,
  }), []);

  /** Reports the call once: the first way it ends is the one that counts. */
  const end = useCallback((outcome: CallSummary["outcome"]) => {
    if (ended.current) return;
    ended.current = true;
    const s = state.current;
    endTo.current?.(summary(s, outcome === "revealed" || outcome === "failed" ? outcome : s.urgent ? "urgent" : outcome));
  }, [summary]);

  const act = useCallback((action: Action) => {
    const before = state.current.turns.length;
    const spoke = state.current.talking === "person";
    const { state: next, send, say, hush } = step(state.current, action, clipReady);
    state.current = next;
    setView(next);
    // A new turn on the record: the call so far goes out as "stopped", overwritten by the end. Not on the turn that
    // reveals: its report and the end's would leave the client together and race in the table, and production
    // (2026-09-30, 14:57) kept the "stopped" one. The end report follows within the second and carries every turn.
    if (!ended.current && next.turns.length > before && next.phase !== "revealing") progressTo.current?.(summary(next, next.urgent ? "urgent" : "stopped"));
    for (const event of send) {
      if (link.current) link.current.emit(event);
      else queued.current.push(event);
    }
    // The person has begun to speak over a recording: it stops, unless it has only just begun or must be said through.
    const now = playing.current;
    const over = !spoke && next.talking === "person" && now !== null && !now.firm && performance.now() - now.began > GRACE_MS;
    if (hush || over) {
      wanted.current = null;
      link.current?.hush();
    }
    if (say) play(say);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `play` calls `act` when a sentence ends: each reads the other through refs.
  }, []);

  /** Plays a recorded sentence on the call, and tells the conversation how much of it was heard. */
  const play = useCallback((say: NonNullable<Step["say"]>) => {
    const call = link.current;
    if (!call) {
      // The call is on its way: the sentence is played the moment it is here.
      wanted.current = say;
      return;
    }
    const turn = ++plays.current;
    playing.current = { turn, began: performance.now(), firm: say.firm };
    void call.say(say.id).then((heard) => {
      // A sentence another has taken the place of, or one the screen has left, has nothing to report.
      if (plays.current !== turn || !link.current) return;
      playing.current = null;
      act({ type: "said", say: say.id, heard });
    });
  }, [act]);

  // The tap started the call (`startLink`); the screen claims it a tick after arrival, so React's
  // development double mount claims it once, and any way off this screen closes it.
  useEffect(() => {
    let live = true;
    const start = window.setTimeout(() => {
      claimLink({
        onMic: () => live && act({ type: "mic" }),
        onOpen: (missed) => live && act({ type: "connected", missed }),
        onEvent: (event) => live && act({ type: "server", event }),
        onFail: (failure) => live && act({ type: "failed", failure }),
      }).then(
        (opened) => {
          if (!live) return opened.close();
          link.current = opened;
          for (const event of queued.current.splice(0)) opened.emit(event);
          const say = wanted.current;
          wanted.current = null;
          if (say) play(say);
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
  }, [act, play]);

  // Leaving by any other way (the browser's Back) still reports the call, once it had connected: the
  // development double mount, which unmounts while connecting, is not a call.
  useEffect(
    () => () => {
      if (state.current.phase !== "connecting") end(state.current.phase === "failed" ? "failed" : "stopped");
    },
    [end],
  );

  // The reveal: after the last sentence has been said, the orb leaves and the matches arrive.
  const { phase, reveal, talking } = view;
  const speaking = talking === "assistant";
  // The sentence exists before its last words are said: hand it on at once.
  useEffect(() => {
    if (reveal) heardTo.current?.(reveal.request);
  }, [reveal]);
  useEffect(() => {
    if (phase !== "revealing" || !reveal) return;
    const wait = speaking ? LAST_WORDS_MS : reducedMotion ? 0 : REVEAL_MS;
    const timer = window.setTimeout(() => {
      end("revealed");
      revealTo.current(reveal);
    }, wait);
    return () => window.clearTimeout(timer);
  }, [phase, reveal, speaking, reducedMotion]);

  // Quiet after the assistant has finished: a gentle check, then (once they have said anything) the
  // matches for what they said. Any sound from either side starts the wait again.
  const busy = view.responding || view.saying !== null;
  useEffect(() => {
    if (phase !== "live" || talking !== null || busy) return;
    const timer = window.setTimeout(() => act({ type: "quiet" }), QUIET_MS);
    return () => window.clearTimeout(timer);
  }, [phase, talking, busy, view.quiet, view.answers, act]);

  // Words that have not arrived, or a sound that cut a sentence short and was nobody's turn: the call
  // waits a few seconds, then carries on.
  const stuck = stalled(view);
  useEffect(() => {
    if (!stuck) return;
    const timer = window.setTimeout(() => act({ type: "unheard" }), UNHEARD_MS);
    return () => window.clearTimeout(timer);
  }, [stuck, view.open, view.turns.length, act]);

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
          <button
            className="primary-button voice-mode-type"
            type="button"
            onClick={() => {
              end("failed");
              onType(saidAsRequest(view.said));
            }}
          >
            {COPY.typeInstead.text}
          </button>
        ) : (
          <button
            className="voice-stop"
            type="button"
            aria-label={COPY.end.text}
            onClick={() => {
              end("stopped");
              onLeave(saidAsRequest(state.current.said));
            }}
          >
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
