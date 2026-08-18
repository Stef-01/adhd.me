// W212: speech to text for the finder microphone, on the browser Web Speech API.
//
//
// WHY THE BROWSER API AND NOT A SERVICE. The alternatives are a cloud transcription API (an audio
// recording of somebody describing their health, leaving to a vendor this product would then have
// to name in the privacy notice and hold a contract with) or an on-device model (Whisper via
// transformers.js, which is a 40MB+ download before the first word). The Web Speech API is already
// in the browser, needs no key, no vendor relationship and no bundle.
//
// WHAT IT COSTS, WHICH THE UI HAS TO SAY OUT LOUD. In Chrome and Edge the API is NOT on-device:
// audio is streamed to the browser vendor's speech service and the text comes back. Safari does
// the same through Apple. So a person describing why they think they have ADHD is sending that
// audio to Google or Apple, and they should be told before they press the button rather than
// afterwards. `SPEECH_DISCLOSURE` below is rendered next to the microphone, not buried in a
// policy page, for the same reason the founder disclosure sits beside the listing it concerns.
//
// NOTHING IS RECORDED HERE. No audio is stored, no transcript is sent anywhere by this product,
// and the text lands in React state on the person's own device. That is worth stating because it
// is the question the disclosure above invites.
//
// TYPING IS ALWAYS AVAILABLE. Recognition is unsupported in Firefox, blocked without HTTPS, and
// fails on a denied permission or a bad connection. Every one of those paths returns the person to
// the typed route rather than a dead end, which is also why this module reports a REASON rather
// than a boolean.

/** What the browser calls the constructor, and what TypeScript does not ship types for. */
type SpeechRecognitionCtor = new () => SpeechRecognitionLike;

interface SpeechRecognitionLike {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start(): void;
  stop(): void;
  abort(): void;
  onresult: ((event: SpeechResultEventLike) => void) | null;
  onerror: ((event: { error: string }) => void) | null;
  onend: (() => void) | null;
  onstart: (() => void) | null;
}

interface SpeechResultEventLike {
  resultIndex: number;
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}

/** Rendered beside the microphone. See the header: this is a disclosure, not a policy link. */
export const SPEECH_DISCLOSURE =
  "Your browser converts speech to text, which means the audio goes to your browser's speech " +
  "service. ADHD.ME does not record it or receive it. You can type instead.";

export type SpeechUnavailableReason =
  /** Firefox, and any browser without the API. */
  | "unsupported"
  /** The API exists but the page is not on a secure origin, so the browser refuses. */
  | "insecure-context";

/**
 * Why the microphone went straight to typing, said out loud (O12 RCA). The old path routed to
 * the typing screen SILENTLY when speech was unavailable — on an http LAN address (testing the
 * demo from a phone), the mic button appeared to just not work, with no explanation, which is
 * indistinguishable from a bug. A person told why is a person who stops retrying.
 */
export const SPEECH_UNAVAILABLE_COPY: Readonly<Record<SpeechUnavailableReason, string>> = {
  unsupported: "This browser does not do speech input, so it is typing from here.",
  "insecure-context":
    "Speech input only works on a secure (https) connection, so it is typing from here.",
};

export type SpeechError =
  | "not-allowed"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "aborted"
  | "unknown";

/** Plain sentences, because an error code in front of a patient is not an error message. */
export const SPEECH_ERROR_COPY: Readonly<Record<SpeechError, string>> = {
  "not-allowed": "Your browser blocked the microphone. You can allow it in the address bar, or type instead.",
  "no-speech": "Nothing was picked up. Try again, or type instead.",
  "audio-capture": "No microphone was found. You can type instead.",
  network: "The speech service could not be reached. You can type instead.",
  aborted: "Listening stopped.",
  unknown: "Speech input did not work. You can type instead.",
};

function constructor(): SpeechRecognitionCtor | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionCtor;
    webkitSpeechRecognition?: SpeechRecognitionCtor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** Why speech is not available, or null when it is. Callers branch on the reason, not a boolean. */
export function speechUnavailable(): SpeechUnavailableReason | null {
  if (!constructor()) return "unsupported";
  // The API is present in an insecure context but throws on start(), which would surface as a
  // generic failure after the person has already pressed the button.
  if (typeof window !== "undefined" && !window.isSecureContext) return "insecure-context";
  return null;
}

export interface SpeechSession {
  /** Ask the browser to stop and deliver whatever it has. */
  stop(): void;
  /** Drop the session without delivering. Used on unmount. */
  cancel(): void;
}

export interface SpeechHandlers {
  /** Fires repeatedly as the browser revises its guess. Interim text, safe to render. */
  onPartial(text: string): void;
  /** Fires once, with everything recognised. May be empty if nothing was heard. */
  onFinal(text: string): void;
  onError(error: SpeechError): void;
}

/**
 * Start listening. Returns null when speech is unavailable, so the caller routes to typing.
 *
 * `continuous` is on because people describing a health concern pause mid-sentence, and the
 * default stops at the first silence. `interimResults` is on so the screen shows words appearing
 * while somebody speaks, which is what makes it obvious the microphone is working.
 */
export function startSpeech(handlers: SpeechHandlers): SpeechSession | null {
  const Ctor = constructor();
  if (!Ctor || speechUnavailable()) return null;

  const recognition = new Ctor();
  recognition.lang = "en-AU";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.maxAlternatives = 1;

  let settled = false;
  let finalText = "";
  let interimText = "";

  recognition.onresult = (event) => {
    /**
     * REBUILT FROM THE WHOLE LIST EVERY EVENT, NOT ACCUMULATED (O12 RCA). The result list is
     * cumulative, so rebuilding is equivalent on a well-behaved browser — and idempotent on one
     * that is not. Safari's continuous mode is known to re-deliver earlier final segments
     * (resultIndex snapping back to 0), and `finalText +=` turned each re-delivery into a
     * duplicate: "my dose my dose wearing off wearing off", intermittently, only on Safari.
     * Rebuilding makes a re-sent list produce the same text instead of twice the text.
     */
    let final = "";
    let interim = "";
    for (let i = 0; i < event.results.length; i += 1) {
      const result = event.results[i];
      if (!result) continue;
      const text = result[0]?.transcript ?? "";
      if (result.isFinal) final += text;
      else interim += text;
    }
    finalText = final;
    interimText = interim;
    handlers.onPartial((finalText + interim).trim());
  };

  recognition.onerror = (event) => {
    if (settled) return;
    // `no-speech` and `aborted` arrive on ordinary paths (a silent room, a deliberate stop) and
    // are still reported, because the caller decides which of them deserve a message.
    const known: SpeechError[] = ["not-allowed", "no-speech", "audio-capture", "network", "aborted"];
    const error = known.find((k) => k === event.error) ?? "unknown";
    settled = true;
    /**
     * WORDS THE PERSON WATCHED APPEAR ARE NEVER THROWN AWAY (O12 RCA). Chrome's recogniser is a
     * streaming network service, and it can die mid-utterance — AFTER results arrived. The old
     * path reported the error and discarded `finalText`, so somebody saw their sentence on
     * screen and then got "the speech service could not be reached" and an empty box: the exact
     * "sometimes it works, sometimes it fails" report. If anything was recognised, a late
     * failure is a finish, not a failure — the words are delivered and the error is not shown.
     * The errors that mean nothing was captured (denied mic, silence, no device) still report,
     * because their text is empty by definition.
     */
    const captured = (finalText + interimText).trim();
    if (captured && error !== "aborted") {
      handlers.onFinal(captured);
      return;
    }
    handlers.onError(error);
  };

  recognition.onend = () => {
    if (settled) return;
    settled = true;
    handlers.onFinal(finalText.trim());
  };

  try {
    recognition.start();
  } catch {
    // Chrome throws if start() is called twice, and on some insecure-context combinations that
    // `speechUnavailable` cannot detect ahead of time.
    return null;
  }

  return {
    stop: () => recognition.stop(),
    cancel: () => {
      settled = true;
      recognition.abort();
    },
  };
}
