// A scripted call for the e2e suite, the text budget and screenshot audits: it answers the client
// the way the real call does, with no microphone, no network and no spend. It "plays" each recorded
// sentence in a beat, says a sentence it is given the way the model would, and after every question
// a scripted person says their next answer. `window.__adhdmeVoiceFake = true` holds at the first
// question; an array of answers is a person who says each one in turn, so a whole call runs to its
// reveal.

import type { ClientEvent, ServerEvent } from "./conversation";
import type { LinkHandlers, VoiceLink } from "./link";
import { SENTENCES, type SayId } from "./plan";

/** The sentences that ask nothing: no answer follows them. */
const ASKS_NOTHING: ReadonlySet<SayId> = new Set(["catch", "nudge", "closing", "urgent"]);
/** What the scripted model says when the person asks it something. */
export const FAKE_ANSWER = "It means Medicare covers the fee, so there is usually nothing to pay.";

/** The pause between one scripted event and the next, so the screen shows each state in turn. */
const BEAT_MS = 60;

export function fakeLink(handlers: LinkHandlers, answers: readonly string[] = []): VoiceLink {
  const queue = [...answers];
  let replies = 0;
  let turns = 0;
  let closed = false;
  let tail = 0;
  let hushed: (() => void) | null = null;
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

  /** The scripted person says their next answer. */
  function answer() {
    const next = queue.shift();
    if (next === undefined) return;
    const item_id = `item_fake_${++turns}`;
    later([
      { type: "input_audio_buffer.speech_started", item_id },
      { type: "input_audio_buffer.speech_stopped", item_id },
      { type: "input_audio_buffer.committed", item_id },
      { type: "conversation.item.input_audio_transcription.completed", item_id, transcript: next },
    ]);
  }

  /** One response of the model's: said, or written, and done. */
  function reply(purpose: string, text: string, spoken: boolean, after?: () => void) {
    const id = `resp_fake_${++replies}`;
    const metadata = { purpose };
    later([
      { type: "response.created", response: { id, metadata } },
      ...(spoken
        ? [
            { type: "output_audio_buffer.started", response_id: id },
            { type: "response.output_audio_transcript.delta", response_id: id, delta: text },
            { type: "response.output_audio_transcript.done", response_id: id, transcript: text },
          ]
        : []),
      { type: "response.done", response: { id, status: "completed", metadata, output: [{ type: "message", role: "assistant", content: [{ type: spoken ? "output_audio" : "output_text", ...(spoken ? { transcript: text } : { text }) }] }] } },
      ...(spoken ? [{ type: "output_audio_buffer.stopped", response_id: id }] : []),
      ...(after ? [after] : []),
    ]);
  }

  const start = setTimeout(() => {
    timers.delete(start);
    if (closed) return;
    handlers.onMic();
    handlers.onOpen();
  }, BEAT_MS);
  timers.add(start);

  return {
    model: "scripted",
    emit(event: ClientEvent) {
      if (closed || event.type !== "response.create") return;
      const response = (event.response ?? {}) as { instructions?: string; metadata?: { purpose?: string } };
      const purpose = response.metadata?.purpose ?? "";
      if (purpose === "say") {
        // The sentence it was given, found by its words: the scripted model says what is written.
        const id = (Object.keys(SENTENCES) as SayId[]).find((key) => (response.instructions ?? "").includes(`"${SENTENCES[key].spoken ?? SENTENCES[key].text}"`));
        reply(purpose, id ? SENTENCES[id].text : "", true, id && !ASKS_NOTHING.has(id) ? answer : undefined);
      } else if (purpose === "answer") reply(purpose, FAKE_ANSWER, true);
      else if (purpose === "safety") reply(purpose, "fine", false);
      else if (purpose === "translate") reply(purpose, "", false);
    },
    setMuted() {},
    // A scripted call is silent unless a test or a capture plays a voice to the orb.
    level: () => {
      const played = window.__adhdmeVoiceLevel;
      return (typeof played === "function" ? played() : played) ?? { input: 0, output: 0 };
    },
    say(id: SayId) {
      hushed?.();
      return new Promise<number>((resolve) => {
        let done = false;
        const end = (share: number) => {
          if (done) return;
          done = true;
          hushed = null;
          resolve(share);
          if (share === 1 && !ASKS_NOTHING.has(id)) answer();
        };
        hushed = () => end(0);
        later([() => end(1)]);
      });
    },
    hush() {
      hushed?.();
    },
    close() {
      closed = true;
      hushed?.();
      for (const timer of timers) clearTimeout(timer);
      timers.clear();
    },
  };
}
