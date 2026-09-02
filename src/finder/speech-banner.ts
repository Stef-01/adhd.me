// U10: the sentence over the typing screen's box, as one pure reducer.
//
// Until U10 the banner was two `useState`s in the orchestrator, written from five places and
// cleared from exactly one — `startListening`. Every other way off the typing screen left it
// standing: a person whose microphone was blocked, who typed and searched, then came back with
// "Change what you said", met the block message again over words they had typed themselves.
// The message lives here as state with events, so the orchestrator dispatches what happened and
// this file decides what is said; `speech-banner.test.ts` walks every path.
//
// Copy law (CLAUDE.md §6): every sentence here is either one of `speech.ts`'s own — the plain
// sentences a patient reads instead of an error code — or `MIC_STOPPED_COPY`, which describes the
// microphone and never the person.

import {
  SPEECH_ERROR_COPY,
  SPEECH_UNAVAILABLE_COPY,
  type SpeechError,
  type SpeechUnavailableReason,
} from "@/voice/speech";

export interface SpeechBanner {
  /** The sentence over the box, or null when there is nothing to say. */
  message: string | null;
  /** Whether "Try the microphone again" is offered beside it (O48: the permission family only). */
  retryable: boolean;
}

export const NO_BANNER: SpeechBanner = { message: null, retryable: false };

/** The browser ended recognition unasked with words in hand (O46): they land in the box, said. */
export const MIC_STOPPED_COPY = "The microphone stopped on its own. What it heard is below — add to it, or search.";

export type SpeechBannerEvent =
  /** The microphone starting, or the typing screen left by any route: nothing to say. */
  | { type: "cleared" }
  /**
   * The recogniser delivered its final transcript without the person asking it to — the browser's
   * own end, or the U10 listening timeout. A finish the person asked for never reaches the banner:
   * it searches.
   */
  | { type: "ended"; text: string; timedOut: boolean }
  /** A failure the module could not absorb. `debug` is the founder's own phone (O18/O70). */
  | { type: "failed"; error: SpeechError; raw: string; debug: boolean }
  /** The O70 environment facts, resolved after the failure they belong to. */
  | { type: "facts"; error: SpeechError; raw: string; facts: string }
  /** No speech here at all — unsupported browser or insecure origin (O12). */
  | { type: "unavailable"; reason: SpeechUnavailableReason };

/** The debug banner's shape: the patient sentence, then the raw code in brackets. */
function debugMessage(error: SpeechError, raw: string, facts?: string): string {
  return `${SPEECH_ERROR_COPY[error]} [${facts ? `${raw} | ${facts}` : raw}]`;
}

export function speechBanner(state: SpeechBanner, event: SpeechBannerEvent): SpeechBanner {
  switch (event.type) {
    case "cleared":
      return NO_BANNER;
    case "ended":
      if (event.text) return { message: MIC_STOPPED_COPY, retryable: false };
      // A quiet room is not a failure (W212): the browser closing on silence says nothing. A full
      // minute of it is worth a sentence (U10) — the same one the `no-speech` code would earn,
      // without the timeout being an error: no retry control, no debug suffix, no `onError`.
      return event.timedOut ? { message: SPEECH_ERROR_COPY["no-speech"], retryable: false } : NO_BANNER;
    case "failed":
      return {
        message: event.debug ? debugMessage(event.error, event.raw) : SPEECH_ERROR_COPY[event.error],
        retryable: event.error === "service-not-allowed" || event.error === "not-allowed",
      };
    case "facts":
      // Appended only while the banner they belong to is still up: the facts resolve after the
      // failure, and by then the person may have left, or a second failure may have replaced it.
      if (state.message !== debugMessage(event.error, event.raw)) return state;
      return { ...state, message: debugMessage(event.error, event.raw, event.facts) };
    case "unavailable":
      return { message: SPEECH_UNAVAILABLE_COPY[event.reason], retryable: false };
  }
}
