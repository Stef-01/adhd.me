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

/**
 * The languages the microphone offers (O59, Standing debt 4).
 *
 * A CLOSED LIST WITH A STATED BASIS: English, plus exactly the languages the listed GPs
 * themselves declare on their profiles — because "speak to the microphone in Hindi" is only
 * an honest offer on a directory where somebody actually consults in Hindi. A test derives
 * this basis from the roster, so the list cannot quietly outgrow the people on it. When a GP
 * who consults in another language joins, their language joins here with them.
 *
 * `label` is the language in its own script, because the control exists for the person who
 * prefers that script; `english` is the roster's own spelling of the same language, which is
 * what the basis test checks against the clinicians' declared lists.
 */
export interface SpeechLanguage {
  /** BCP-47 tag handed to the recogniser. Whether a DEVICE supports it varies, which is why
   *  the `language-not-supported` copy below exists and the fallback ladder is unchanged. */
  tag: string;
  label: string;
  english: string;
}

export const SPEECH_LANGUAGES: readonly SpeechLanguage[] = [
  { tag: "en-AU", label: "English", english: "English" },
  { tag: "hi-IN", label: "हिन्दी", english: "Hindi" },
  { tag: "ur-PK", label: "اردو", english: "Urdu" },
];

/** The default stays what it always was; everything else is a choice somebody made. */
export const DEFAULT_SPEECH_LANGUAGE = SPEECH_LANGUAGES[0]!;

/**
 * THE HONESTY LINE THAT SHIPS WITH THE PICKER, NOT AFTER IT. The finder's reader matches
 * English words to declared facets; words spoken in another language are kept, shown and
 * searchable as text, but the reader cannot weigh them yet — so the moment a non-English
 * language is chosen, the product says so, BEFORE anything is spoken. Without this sentence
 * the picker would be an invitation into a list that quietly ignores what was said, which is
 * the exact dishonesty W221 exists to prevent.
 */
export const SPEECH_ENGLISH_MATCHING_NOTE =
  "Matching reads English for now, so what you say is kept and shown, but may not order the list.";

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
  | "service-not-allowed"
  | "language-not-supported"
  | "no-speech"
  | "audio-capture"
  | "network"
  | "aborted"
  | "unknown";

/** Plain sentences, because an error code in front of a patient is not an error message. */
export const SPEECH_ERROR_COPY: Readonly<Record<SpeechError, string>> = {
  "not-allowed": "Your browser blocked the microphone. You can allow it in the address bar, or type instead.",
  /**
   * THE iPHONE CASE, seen in production twice (O16, then the O18 correction). iOS fires
   * `service-not-allowed` for a FAMILY of causes: dictation or Siri switched off, Safari not
   * allowed to use the microphone for this site, screen-time or enterprise restrictions, the
   * page running as a home-screen web app (WebKit withholds the API there), and a known
   * intermittent WebKit failure where the very same tap works on retry. The O16 copy asserted
   * the first cause as fact — and the founder, with dictation demonstrably ON, was told his
   * phone's dictation was off. A diagnosis this module cannot verify must not be stated as one.
   * The copy now names the switches worth checking without claiming any of them is the culprit,
   * and `startSpeech` retries once behind a microphone permission warm-up before saying it.
   */
  "service-not-allowed":
    "Your phone would not let speech start. If Siri or dictation is on and Safari is allowed to use the microphone, try once more — or just type instead.",
  "language-not-supported": "This device cannot listen in this language. You can type instead.",
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
  /**
   * `raw` is the browser's own error string, unmapped. It exists because of the O16 aftermath:
   * when a device fires a code this module has never seen, `error` collapses to "unknown" and the
   * patient copy is the generic sentence — correct for the patient, invisible for the founder.
   * The raw code is the only diagnostic the Web Speech API gives, so it is handed to the caller
   * (who may surface it behind a debug flag) instead of being flattened away here.
   */
  onError(error: SpeechError, raw: string): void;
}

/**
 * Start listening. Returns null when speech is unavailable, so the caller routes to typing.
 *
 * `continuous` is on because people describing a health concern pause mid-sentence, and the
 * default stops at the first silence. `interimResults` is on so the screen shows words appearing
 * while somebody speaks, which is what makes it obvious the microphone is working.
 */
export function startSpeech(handlers: SpeechHandlers, lang: string = DEFAULT_SPEECH_LANGUAGE.tag): SpeechSession | null {
  const Ctor = constructor();
  if (!Ctor || speechUnavailable()) return null;

  let settled = false;
  let finalText = "";
  let interimText = "";
  let retried = false;
  /** The recogniser currently listening. Reassigned by the O18 retry, so stop/cancel act on it. */
  let active: SpeechRecognitionLike | null = null;
  /**
   * The O18 warm-up stream, HELD OPEN while the retried recogniser runs (O46). The first
   * version stopped the tracks the moment permission resolved — and the founder's phone showed
   * the exact result: the permission prompt appears, Allow is pressed, and it still breaks.
   * The reported WebKit behaviour is that recognition succeeds while the audio session is
   * genuinely live, so the stream is released only when the session settles.
   */
  let warmStream: MediaStream | null = null;
  const releaseWarmStream = () => {
    warmStream?.getTracks().forEach((track) => track.stop());
    warmStream = null;
  };

  const wire = (recognition: SpeechRecognitionLike) => {
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

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
      const known: SpeechError[] = [
        "not-allowed",
        "service-not-allowed",
        "language-not-supported",
        "no-speech",
        "audio-capture",
        "network",
        "aborted",
      ];
      const error = known.find((k) => k === event.error) ?? "unknown";
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
        settled = true;
        releaseWarmStream();
        handlers.onFinal(captured);
        return;
      }
      /**
       * THE iPHONE RETRY (O18). iOS Safari fires `service-not-allowed` intermittently even with
       * dictation on — seen in production against a device where the setting was verified. The
       * widely reported workaround is to obtain microphone permission through getUserMedia
       * (which surfaces the proper prompt and warms up the audio session) and start again.
       * One retry, only on the permission-flavoured codes, only when nothing was captured:
       * if it works the person never sees a message, and if it does not, the honest copy shows.
       */
      const permissionFlavoured = error === "service-not-allowed" || error === "not-allowed";
      const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
      if (permissionFlavoured && !retried && media?.getUserMedia) {
        retried = true;
        // This recogniser is done; releasing it here keeps its onend (Safari fires one after
        // onerror) from being read as the session finishing while the retry is still pending.
        active = null;
        media.getUserMedia({ audio: true }).then(
          (stream) => {
            // Held open, not stopped — see `warmStream` above (O46). One honest caveat this
            // retry cannot remove: WebKit also gates start() on a user gesture, and a start
            // reached through a permission prompt may be outside one. If it refuses again,
            // the error copy shows — and the person's NEXT tap starts with permission already
            // granted and the gesture WebKit wants, which is why the copy says "try once more".
            warmStream = stream;
            if (settled) {
              releaseWarmStream();
              return;
            }
            const again = new Ctor();
            wire(again);
            try {
              again.start();
              active = again;
            } catch {
              settled = true;
              releaseWarmStream();
              handlers.onError(error, event.error);
            }
          },
          () => {
            if (settled) return;
            settled = true;
            handlers.onError(error, event.error);
          },
        );
        return;
      }
      settled = true;
      releaseWarmStream();
      handlers.onError(error, event.error);
    };

    recognition.onend = () => {
      // The recogniser the retry replaced also ends; only the active one's end is a finish.
      if (settled || recognition !== active) return;
      settled = true;
      releaseWarmStream();
      handlers.onFinal(finalText.trim());
    };
  };

  const first = new Ctor();
  wire(first);

  try {
    first.start();
  } catch {
    // Chrome throws if start() is called twice, and on some insecure-context combinations that
    // `speechUnavailable` cannot detect ahead of time.
    return null;
  }
  active = first;

  return {
    stop: () => {
      if (active) {
        active.stop();
        return;
      }
      // Stop pressed inside the retry gap. The retry only runs when nothing was captured, so
      // there is nothing to deliver — finish quietly instead of letting the pending retry
      // re-open the microphone over a screen that asked it to stop.
      if (!settled) {
        settled = true;
        releaseWarmStream();
        handlers.onFinal("");
      }
    },
    cancel: () => {
      settled = true;
      releaseWarmStream();
      active?.abort();
    },
  };
}
