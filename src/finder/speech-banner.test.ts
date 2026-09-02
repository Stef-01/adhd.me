// U10: every path through the typing screen's banner, walked as data.
//
// The reducer is the whole point of the unit: the orchestrator used to own two setters that
// were cleared from one place and written from five, and the defect was a message outliving the
// screen it was about. So the tests here are about ORDER — what stands after each event, from
// each state — and about the sentences themselves, which go under the patient rule set the way
// every other line of finder copy does (`announce.test.ts`).

import { describe, expect, it } from "vitest";
import { sweepSurface } from "@/compliance/public-surfaces";
import { lintPartyToCare } from "@/compliance/party-to-care";
import { eachOf } from "@/quality/non-vacuous";
import { SPEECH_ERROR_COPY, SPEECH_UNAVAILABLE_COPY, type SpeechError } from "@/voice/speech";
import { MIC_STOPPED_COPY, NO_BANNER, speechBanner, type SpeechBanner, type SpeechBannerEvent } from "./speech-banner";

const ERRORS = Object.keys(SPEECH_ERROR_COPY) as SpeechError[];

/** A banner every event can start from: the reducer must not depend on what stood before. */
const STANDING: SpeechBanner[] = [
  NO_BANNER,
  { message: MIC_STOPPED_COPY, retryable: false },
  { message: SPEECH_ERROR_COPY["not-allowed"], retryable: true },
  { message: `${SPEECH_ERROR_COPY.network} [network]`, retryable: false },
];

describe("U10 the speech banner reducer", () => {
  it("`cleared` empties the banner from any state — the fix for the message that outlived its screen", () => {
    for (const state of eachOf(STANDING, "the standing banners")) {
      expect(speechBanner(state, { type: "cleared" })).toBe(NO_BANNER);
    }
  });

  it("a browser-initiated end with words says the microphone stopped; with none it says nothing", () => {
    for (const state of eachOf(STANDING, "the standing banners")) {
      expect(speechBanner(state, { type: "ended", text: "a GP near Hornsby", timedOut: false })).toEqual({
        message: MIC_STOPPED_COPY,
        retryable: false,
      });
      // W212: a quiet room the browser closed on is not a failure.
      expect(speechBanner(state, { type: "ended", text: "", timedOut: false })).toBe(NO_BANNER);
    }
  });

  it("the listening timeout earns the `no-speech` sentence, never the error's controls", () => {
    const out = speechBanner(NO_BANNER, { type: "ended", text: "", timedOut: true });
    expect(out).toEqual({ message: SPEECH_ERROR_COPY["no-speech"], retryable: false });
    expect(out.message).not.toMatch(/\[/);
    // Words in hand at the minute mark are words in the box, said the same way as any other end.
    expect(speechBanner(NO_BANNER, { type: "ended", text: "someone who bulk bills", timedOut: true }).message).toBe(MIC_STOPPED_COPY);
  });

  it("a failure shows the patient sentence, offers the retry control to the permission pair only", () => {
    for (const error of eachOf(ERRORS, "the speech errors")) {
      const out = speechBanner(NO_BANNER, { type: "failed", error, raw: `raw-${error}`, debug: false });
      expect(out.message, error).toBe(SPEECH_ERROR_COPY[error]);
      expect(out.message, error).not.toContain("raw-");
      expect(out.retryable, error).toBe(error === "not-allowed" || error === "service-not-allowed");
    }
  });

  it("with `debug` the raw code follows the sentence in brackets, and the O70 facts join it when they resolve", () => {
    const failed = speechBanner(NO_BANNER, { type: "failed", error: "network", raw: "network", debug: true });
    expect(failed).toEqual({ message: `${SPEECH_ERROR_COPY.network} [network]`, retryable: false });
    const withFacts = speechBanner(failed, { type: "facts", error: "network", raw: "network", facts: "standalone=false" });
    expect(withFacts.message).toBe(`${SPEECH_ERROR_COPY.network} [network | standalone=false]`);
    expect(withFacts.retryable).toBe(false);
  });

  it("facts that resolve late land nowhere: not on a cleared banner, not on a later failure, never twice", () => {
    const facts: SpeechBannerEvent = { type: "facts", error: "network", raw: "network", facts: "standalone=false" };
    expect(speechBanner(NO_BANNER, facts)).toBe(NO_BANNER);
    const later = speechBanner(NO_BANNER, { type: "failed", error: "audio-capture", raw: "audio-capture", debug: true });
    expect(speechBanner(later, facts)).toBe(later);
    const plain = speechBanner(NO_BANNER, { type: "failed", error: "network", raw: "network", debug: false });
    expect(speechBanner(plain, facts)).toBe(plain);
    const once = speechBanner(speechBanner(NO_BANNER, { type: "failed", error: "network", raw: "network", debug: true }), facts);
    expect(speechBanner(once, facts)).toBe(once);
  });

  it("no speech at all says why, and never offers a microphone retry", () => {
    for (const reason of eachOf(["unsupported", "insecure-context"] as const, "the unavailable reasons")) {
      expect(speechBanner(STANDING[2]!, { type: "unavailable", reason })).toEqual({
        message: SPEECH_UNAVAILABLE_COPY[reason],
        retryable: false,
      });
    }
  });

  it("every sentence a patient can read here passes the patient rule set and the party-to-care rule", () => {
    const lines = [
      MIC_STOPPED_COPY,
      ...ERRORS.map((error) => speechBanner(NO_BANNER, { type: "failed", error, raw: error, debug: false }).message),
      speechBanner(NO_BANNER, { type: "ended", text: "", timedOut: true }).message,
      ...(["unsupported", "insecure-context"] as const).map(
        (reason) => speechBanner(NO_BANNER, { type: "unavailable", reason }).message,
      ),
    ];
    for (const line of eachOf(lines, "the banner sentences")) {
      expect(line).toBeTruthy();
      expect(sweepSurface("(finder banner)", "patient", line!), line!).toEqual([]);
      expect(lintPartyToCare(line!), line!).toEqual([]);
    }
  });
});
