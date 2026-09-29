// A scripted call for the e2e suite, the text budget and screenshot audits: it answers the client's
// events the way the realtime API does, with a fixed question for each turn and show_matches when
// the client forces the last turn. `window.__adhdmeVoiceFake = true` holds at the first question;
// an array of answers is a person who says each one in turn, so a whole call runs to its reveal.
// No microphone, no network, no spend.

import type { ClientEvent, ServerEvent } from "./conversation";
import { OPENING_QUESTION, SHOW_MATCHES } from "./interviewer";
import type { LinkHandlers, VoiceLink } from "./link";

/** The interviewer's questions (src/voice/interviewer.ts), then clarifying ones, so a call of eight follow-ups runs. */
export const FAKE_QUESTIONS = [
  "Where are you, or would telehealth suit you?",
  "Would you like someone who has ADHD themselves?",
  "Is there a language or a background that matters?",
  "Is there anything else a clinician should know?",
  "Is that an assessment, or help with treatment?",
  "Is there a time of day that suits you?",
  "Anything more before I look?",
  "Would anything make a first appointment easier?",
  "Anything else at all?",
] as const;

/** The pause between one scripted event and the next, so the screen shows each state in turn. */
const BEAT_MS = 60;

export function fakeLink(handlers: LinkHandlers, answers: readonly string[] = []): VoiceLink {
  const words: string[] = [];
  const queue = [...answers];
  let turn = 0;
  let replies = 0;
  let closed = false;
  let respondOnTurn = true;
  let tail = 0;
  const timers = new Set<ReturnType<typeof setTimeout>>();
  /** Events, and steps that decide what comes next, in order, one beat apart, after anything already due. */
  const later = (items: (ServerEvent | (() => void))[]) => {
    for (const item of items) {
      tail = Math.max(tail, Date.now()) + BEAT_MS;
      const timer = setTimeout(() => {
        timers.delete(timer);
        if (closed) return;
        if (typeof item === "function") item();
        else handlers.onEvent(item);
      }, tail - Date.now());
      timers.add(timer);
    }
  };

  /** One spoken reply; the scripted person answers once it has been said. */
  function speak(text: string) {
    const id = `resp_fake_${++replies}`;
    later([
      { type: "response.created", response: { id } },
      { type: "output_audio_buffer.started", response_id: id },
      { type: "response.output_audio_transcript.delta", response_id: id, delta: text },
      { type: "response.output_audio_transcript.done", response_id: id, transcript: text },
      { type: "response.done", response: { id, status: "completed", output: [{ type: "message", role: "assistant" }] } },
      { type: "output_audio_buffer.stopped", response_id: id },
      answer,
    ]);
  }

  /** The scripted person says their next answer; the server replies on its own only while it may. */
  function answer() {
    const next = queue.shift();
    if (next === undefined) return;
    words.push(next);
    later([
      { type: "input_audio_buffer.speech_started" },
      { type: "input_audio_buffer.speech_stopped" },
      { type: "input_audio_buffer.committed" },
      { type: "conversation.item.input_audio_transcription.completed", transcript: next },
      () => respondOnTurn && speak(FAKE_QUESTIONS[turn++ % FAKE_QUESTIONS.length]!),
    ]);
  }

  function finish(metadata: unknown) {
    const id = `resp_fake_${++replies}`;
    const call = { type: "function_call", name: SHOW_MATCHES, call_id: `call_${id}`, arguments: JSON.stringify({ request: words.join(", "), place: "" }) };
    later([
      { type: "response.created", response: { id } },
      { type: "response.done", response: { id, status: "completed", metadata, output: [call] } },
    ]);
  }

  setTimeout(() => {
    if (!closed) handlers.onOpen();
  }, BEAT_MS);

  return {
    model: "scripted",
    emit(event: ClientEvent) {
      if (closed) return;
      if (event.type === "session.update") {
        const detection = (event.session as { audio?: { input?: { turn_detection?: { create_response?: boolean } } } } | undefined)?.audio?.input?.turn_detection;
        if (detection) respondOnTurn = detection.create_response !== false;
        return;
      }
      const item = event.item as { role?: string; content?: { text?: string }[] } | undefined;
      if (event.type === "conversation.item.create" && item?.role === "user") {
        words.push(item.content?.[0]?.text ?? "");
        return;
      }
      if (event.type !== "response.create") return;
      const response = event.response as { tool_choice?: { name?: string }; metadata?: unknown } | undefined;
      if (response?.tool_choice?.name === SHOW_MATCHES) return finish(response.metadata ?? null);
      speak(replies === 0 ? `Hi. ${OPENING_QUESTION}` : FAKE_QUESTIONS[turn++ % FAKE_QUESTIONS.length]!);
    },
    setMuted() {},
    // A scripted call is silent unless a test or a capture plays a voice to the orb.
    level: () => {
      const played = window.__adhdmeVoiceLevel;
      return (typeof played === "function" ? played() : played) ?? { input: 0, output: 0 };
    },
    close() {
      closed = true;
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    },
  };
}
