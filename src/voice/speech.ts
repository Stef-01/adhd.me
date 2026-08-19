// W212: speech to text for the finder microphone, on the browser Web Speech API.
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
//
// THE FULL FAILURE MAP lives in docs/MIC-FAILURE-MODES.md (O70): every mode from feature
// detection to the deploy layer, with its handling and its fix status. This file is organised
// in the same order — detection, copy, the carried stream, then the session itself.

// ─────────────────────────────────────────────────────────────────────────────────────────────
// The browser surface, as TypeScript does not ship it.
// ─────────────────────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Copy and vocabulary: everything a person might read, in one place.
// ─────────────────────────────────────────────────────────────────────────────────────────────

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

// ─────────────────────────────────────────────────────────────────────────────────────────────
// Detection: whether speech can run here at all, and why not (failure modes A1–A5).
// ─────────────────────────────────────────────────────────────────────────────────────────────

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

/** Map the browser's raw error string to this module's closed vocabulary (failure mode E7:
 *  a code this list has never seen collapses to "unknown" for the patient, while the raw
 *  string rides to the caller for the debug surface — the O16 lesson). */
export function mapSpeechError(raw: string): SpeechError {
  const known: readonly SpeechError[] = [
    "not-allowed",
    "service-not-allowed",
    "language-not-supported",
    "no-speech",
    "audio-capture",
    "network",
    "aborted",
  ];
  return known.find((k) => k === raw) ?? "unknown";
}

/**
 * The environment, said as one compact line for the ?debug=1 banner (O70).
 *
 * The B2 family (iOS `service-not-allowed`) refuses to say WHICH of its causes fired, so the
 * debug surface now carries the facts that separate them: `standalone:yes` points at the
 * home-screen web app case (A3); `mic:denied` points at a settings switch (B1); `mic:granted`
 * with the failure persisting points at the WebKit intermittent, whose recovery is the O69
 * warm tap. Async because the Permissions API is; callers append the line when it resolves.
 * Every probe is defensive — a browser that lacks one reports the fact as absent, never throws.
 */
export async function speechDebugFacts(lang: string = DEFAULT_SPEECH_LANGUAGE.tag): Promise<string> {
  const facts: string[] = [`lang:${lang}`];
  if (typeof window !== "undefined") {
    facts.push(`secure:${window.isSecureContext ? "yes" : "no"}`);
    const standalone = (window.navigator as unknown as { standalone?: boolean }).standalone;
    if (standalone !== undefined) facts.push(`standalone:${standalone ? "yes" : "no"}`);
  }
  facts.push(`api:${constructor() ? "yes" : "no"}`);
  if (typeof navigator !== "undefined") {
    facts.push(`media:${typeof navigator.mediaDevices?.getUserMedia === "function" ? "yes" : "no"}`);
    try {
      const permissions = (navigator as unknown as {
        permissions?: { query(d: { name: string }): Promise<{ state: string }> };
      }).permissions;
      if (permissions?.query) {
        const status = await permissions.query({ name: "microphone" });
        facts.push(`mic:${status.state}`);
      }
    } catch {
      // Safari versions that reject the "microphone" name: the fact is simply not reportable.
    }
  }
  return facts.join(" ");
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// The carried stream (O69): the bridge between WebKit's two demands.
// ─────────────────────────────────────────────────────────────────────────────────────────────

/**
 * The O46 caveat, read to its conclusion: WebKit gates recognition.start() on a USER GESTURE,
 * and the reported behaviour is that recognition only succeeds while an audio session is
 * GENUINELY LIVE. No pre-O69 path had both at once — the in-session retry holds the live
 * stream but starts outside the gesture (getUserMedia resolves after the tap has expired),
 * and the O48 recovery tap has a fresh gesture but starts cold, because the second failure
 * released the warm stream on its way to the error copy.
 *
 * So when the retried recogniser ALSO fails on a permission-flavoured code, the stream is
 * carried here instead of released. The next `startSpeech` — the person's recovery tap —
 * adopts it, which means recognition starts synchronously inside the gesture WITH the audio
 * session already live: both requirements, met at last, one tap after Allow.
 *
 * THE PRICE, STATED WHERE IT IS PAID: the phone's microphone indicator stays lit for up to
 * CARRY_WINDOW_MS after the failure. That is deliberate and bounded — dropped on adoption,
 * on the adopting session's settle or cancel, when the finder leaves the screen, or when the
 * timer runs out, whichever comes first. A mic light with no path to off would be its own
 * bug (the O46 rule), which is exactly what the timer exists to prevent.
 */
const CARRY_WINDOW_MS = 45_000;
let carriedStream: MediaStream | null = null;
let carriedTimer: ReturnType<typeof setTimeout> | null = null;

/** Stop and forget the carried stream. Exported so the finder can drop it on leaving. */
export function dropCarriedStream(): void {
  carriedStream?.getTracks().forEach((track) => track.stop());
  carriedStream = null;
  if (carriedTimer !== null) {
    clearTimeout(carriedTimer);
    carriedTimer = null;
  }
}

function carryStream(stream: MediaStream): void {
  dropCarriedStream();
  carriedStream = stream;
  carriedTimer = setTimeout(dropCarriedStream, CARRY_WINDOW_MS);
}

/** Take the carried stream, if one is still alive, clearing the carry state. */
function adoptCarriedStream(): MediaStream | null {
  const stream = carriedStream;
  carriedStream = null;
  if (carriedTimer !== null) {
    clearTimeout(carriedTimer);
    carriedTimer = null;
  }
  return stream;
}

// ─────────────────────────────────────────────────────────────────────────────────────────────
// The session.
// ─────────────────────────────────────────────────────────────────────────────────────────────

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
 * Rebuild the transcript from the WHOLE cumulative list, never accumulate (O12 RCA, failure
 * mode E3). Rebuilding is equivalent on a well-behaved browser — and idempotent on one that
 * is not. Safari's continuous mode is known to re-deliver earlier final segments (resultIndex
 * snapping back to 0), and `finalText +=` turned each re-delivery into a duplicate: "my dose
 * my dose wearing off wearing off", intermittently, only on Safari.
 */
function readCumulativeResults(event: SpeechResultEventLike): { final: string; interim: string } {
  let final = "";
  let interim = "";
  for (let i = 0; i < event.results.length; i += 1) {
    const result = event.results[i];
    if (!result) continue;
    const text = result[0]?.transcript ?? "";
    if (result.isFinal) final += text;
    else interim += text;
  }
  return { final, interim };
}

/**
 * Start listening. Returns null when speech is unavailable, so the caller routes to typing.
 *
 * `continuous` is on because people describing a health concern pause mid-sentence, and the
 * default stops at the first silence. `interimResults` is on so the screen shows words appearing
 * while somebody speaks, which is what makes it obvious the microphone is working.
 *
 * The session is a small state machine held in this closure: `settled` latches exactly one
 * outcome (final, or error); `active` names the recogniser whose end counts (the O18 retry
 * replaces it); the warm stream's lifecycle is the O46/O69 story told above. Each named step
 * below handles one failure family from docs/MIC-FAILURE-MODES.md.
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
  /**
   * O69: on a second permission-flavoured failure the stream is carried for the recovery tap
   * instead of stopped — see the module note on `carriedStream`. Everything else releases.
   */
  const settleStream = (permissionFlavoured: boolean) => {
    if (permissionFlavoured && warmStream) {
      carryStream(warmStream);
      warmStream = null;
      return;
    }
    releaseWarmStream();
  };

  // The recovery tap adopts the stream a failed session carried (O69): recognition below
  // starts synchronously inside this tap's gesture, with the audio session already live.
  warmStream = adoptCarriedStream();

  /**
   * WORDS THE PERSON WATCHED APPEAR ARE NEVER THROWN AWAY (O12 RCA, failure mode E2).
   * Chrome's recogniser is a streaming network service, and it can die mid-utterance — AFTER
   * results arrived. The old path reported the error and discarded `finalText`, so somebody
   * saw their sentence on screen and then got "the speech service could not be reached" and
   * an empty box: the exact "sometimes it works, sometimes it fails" report. If anything was
   * recognised, a late failure is a finish, not a failure — the words are delivered and the
   * error is not shown. Returns true when it finished the session that way.
   */
  const finishWithCapturedInstead = (error: SpeechError): boolean => {
    const captured = (finalText + interimText).trim();
    if (!captured || error === "aborted") return false;
    settled = true;
    releaseWarmStream();
    handlers.onFinal(captured);
    return true;
  };

  /**
   * THE iPHONE RETRY (O18, failure mode B2). iOS Safari fires `service-not-allowed`
   * intermittently even with dictation on — seen in production against a device where the
   * setting was verified. The widely reported workaround is to obtain microphone permission
   * through getUserMedia (which surfaces the proper prompt and warms up the audio session)
   * and start again. One retry, only on the permission-flavoured codes, only when nothing was
   * captured: if it works the person never sees a message, and if it does not, the honest
   * copy shows. Returns true when the retry was launched (the session stays open for it).
   */
  const attemptWarmRetry = (error: SpeechError, raw: string): boolean => {
    const media = typeof navigator !== "undefined" ? navigator.mediaDevices : undefined;
    if (retried || !media?.getUserMedia) return false;
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
        // granted, the gesture WebKit wants, AND the carried stream (O69).
        // Release-before-assign (O70, failure mode G4): a session that ADOPTED a carried
        // stream and still failed would otherwise orphan it here with its tracks live —
        // a mic light with no path to off, found by this refactor's own audit.
        releaseWarmStream();
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
          settleStream(true);
          handlers.onError(error, raw);
        }
      },
      () => {
        if (settled) return;
        settled = true;
        handlers.onError(error, raw);
      },
    );
    return true;
  };

  /** The one place an error becomes the session's outcome (stream carried or released first). */
  const settleWithError = (error: SpeechError, raw: string, permissionFlavoured: boolean) => {
    settled = true;
    settleStream(permissionFlavoured);
    handlers.onError(error, raw);
  };

  const wire = (recognition: SpeechRecognitionLike) => {
    recognition.lang = lang;
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;

    recognition.onresult = (event) => {
      const { final, interim } = readCumulativeResults(event);
      finalText = final;
      interimText = interim;
      handlers.onPartial((finalText + interim).trim());
    };

    recognition.onerror = (event) => {
      if (settled) return;
      // `no-speech` and `aborted` arrive on ordinary paths (a silent room, a deliberate stop)
      // and are still reported, because the caller decides which of them deserve a message.
      const error = mapSpeechError(event.error);
      if (finishWithCapturedInstead(error)) return;
      const permissionFlavoured = error === "service-not-allowed" || error === "not-allowed";
      if (permissionFlavoured && attemptWarmRetry(error, event.error)) return;
      settleWithError(error, event.error, permissionFlavoured);
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
    // `speechUnavailable` cannot detect ahead of time (failure mode A5).
    return null;
  }
  active = first;

  return {
    stop: () => {
      if (active) {
        active.stop();
        return;
      }
      // Stop pressed inside the retry gap (failure mode C2). The retry only runs when nothing
      // was captured, so there is nothing to deliver — finish quietly instead of letting the
      // pending retry re-open the microphone over a screen that asked it to stop.
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
