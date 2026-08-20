// Speech-to-text, tested against a fake recogniser.
//
// The Web Speech API is not available in jsdom, so these drive a stand-in with the same surface.
// That is worth being explicit about: this asserts THIS MODULE'S behaviour (feature detection, the
// interim/final split, teardown, error mapping) and not that Chrome transcribes correctly. The
// half a fake cannot cover is the half a browser owns.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_SPEECH_LANGUAGE,
  dropCarriedStream,
  mapSpeechError,
  speechDebugFacts,
  SPEECH_DISCLOSURE,
  SPEECH_ENGLISH_MATCHING_NOTE,
  SPEECH_ERROR_COPY,
  SPEECH_LANGUAGES,
  SPEECH_UNAVAILABLE_COPY,
  speechUnavailable,
  startSpeech,
  type SpeechError,
} from "./speech";
import { clinicians } from "@/demo/clinicians";

type Handler = ((e: unknown) => void) | (() => void) | null;

class FakeRecognition {
  static last: FakeRecognition | null = null;
  static throwOnStart = false;

  lang = "";
  continuous = false;
  interimResults = false;
  maxAlternatives = 0;
  started = false;
  aborted = false;
  onresult: Handler = null;
  onerror: Handler = null;
  onend: Handler = null;
  onstart: Handler = null;

  constructor() {
    FakeRecognition.last = this;
  }
  start() {
    if (FakeRecognition.throwOnStart) throw new Error("already started");
    this.started = true;
  }
  stop() {
    (this.onend as (() => void) | null)?.();
  }
  abort() {
    this.aborted = true;
  }

  /**
   * Feed a result the way the browser actually does.
   *
   * The list is CUMULATIVE and `resultIndex` points at the first entry that changed since the last
   * event. A first draft of this fake sent only the changed entries, which made the accumulation
   * test fail against correct code: the loop starts at `resultIndex`, so a one-entry list with
   * resultIndex 1 contains nothing to read. Getting the fake wrong looks exactly like getting the
   * module wrong, which is the argument for modelling the real contract rather than a convenient one.
   */
  emit(entries: Array<{ text: string; final: boolean }>, resultIndex = 0) {
    const results = entries.map((e) => Object.assign([{ transcript: e.text }], { isFinal: e.final }));
    (this.onresult as ((e: unknown) => void) | null)?.({ resultIndex, results });
  }
  fail(error: string) {
    (this.onerror as ((e: unknown) => void) | null)?.({ error });
  }
}

function install({ secure = true, present = true } = {}) {
  const w = globalThis as unknown as Record<string, unknown>;
  if (present) w.SpeechRecognition = FakeRecognition;
  else delete w.SpeechRecognition;
  delete w.webkitSpeechRecognition;
  Object.defineProperty(globalThis, "isSecureContext", { value: secure, configurable: true });
  if (!("window" in globalThis)) w.window = globalThis;
}

/**
 * A grantable microphone, for the O18 retry tests. jsdom ships no `navigator.mediaDevices`,
 * which the module treats as "no warm-up possible" — so every pre-O18 test runs the immediate
 * error path unchanged, and only tests that install this see the retry.
 */
function installMicrophone(outcome: "granted" | "denied") {
  const nav = globalThis.navigator as unknown as Record<string, unknown>;
  nav.mediaDevices = {
    getUserMedia: () =>
      outcome === "granted"
        ? Promise.resolve({ getTracks: () => [] })
        : Promise.reject(new Error("denied")),
  };
}

afterEach(() => {
  const w = globalThis as unknown as Record<string, unknown>;
  delete w.SpeechRecognition;
  delete w.webkitSpeechRecognition;
  delete (globalThis.navigator as unknown as Record<string, unknown>).mediaDevices;
  FakeRecognition.last = null;
  FakeRecognition.throwOnStart = false;
  // O69: carried-stream state is module-level by design; tests must not leak it to each other.
  dropCarriedStream();
  vi.useRealTimers();
});

const noop = { onPartial: () => {}, onFinal: () => {}, onError: () => {} };

describe("availability is a reason, not a boolean", () => {
  it("names an unsupported browser", () => {
    install({ present: false });
    expect(speechUnavailable()).toBe("unsupported");
  });

  it("names an insecure origin separately", () => {
    // The API EXISTS here and would throw on start(). Detecting it up front is the difference
    // between routing somebody to typing and showing them a microphone that cannot work.
    install({ secure: false });
    expect(speechUnavailable()).toBe("insecure-context");
  });

  it("is null when speech can actually run", () => {
    install();
    expect(speechUnavailable()).toBeNull();
  });

  it("returns no session when unavailable, so the caller can route to typing", () => {
    install({ present: false });
    expect(startSpeech(noop)).toBeNull();
  });

  it("returns no session when start() throws rather than surfacing an exception", () => {
    install();
    FakeRecognition.throwOnStart = true;
    expect(startSpeech(noop)).toBeNull();
  });
});

describe("the interim and final split", () => {
  it("streams a partial while somebody is still talking", () => {
    install();
    const onPartial = vi.fn();
    startSpeech({ ...noop, onPartial });
    FakeRecognition.last!.emit([{ text: "I think I have", final: false }]);
    expect(onPartial).toHaveBeenCalledWith("I think I have");
  });

  it("accumulates finals across pauses instead of replacing them", () => {
    // The failure this pins: `continuous` is on because people describing a health concern pause
    // mid-sentence. If finals overwrote rather than accumulated, every pause would silently
    // discard the sentence before it.
    install();
    const onPartial = vi.fn();
    const onFinal = vi.fn();
    startSpeech({ ...noop, onPartial, onFinal });
    const r = FakeRecognition.last!;
    const first = { text: "I was treated for anxiety ", final: true };
    r.emit([first]);
    // Cumulative list, resultIndex pointing at the new entry, exactly as a browser sends it.
    r.emit([first, { text: "and it never fitted", final: false }], 1);
    expect(onPartial).toHaveBeenLastCalledWith("I was treated for anxiety and it never fitted");
    r.emit([first, { text: "and it never fitted", final: true }], 1);
    r.stop();
    expect(onFinal).toHaveBeenCalledWith("I was treated for anxiety and it never fitted");
  });

  it("delivers an empty final when nothing was heard, rather than an error", () => {
    // A silent room is not a failure. The caller sends this person to the typing screen with no
    // red message, which is a different path from a denied microphone.
    install();
    const onFinal = vi.fn();
    startSpeech({ ...noop, onFinal });
    FakeRecognition.last!.stop();
    expect(onFinal).toHaveBeenCalledWith("");
  });
});

describe("errors and teardown", () => {
  it.each([
    ["not-allowed", "not-allowed"],
    ["no-speech", "no-speech"],
    ["audio-capture", "audio-capture"],
    ["network", "network"],
    ["some-new-code-chrome-invented", "unknown"],
  ])("maps %s to %s", (raw, mapped) => {
    install();
    const onError = vi.fn();
    startSpeech({ ...noop, onError });
    FakeRecognition.last!.fail(raw);
    // The mapped code drives the copy; the raw code rides along for the debug surface (O18).
    expect(onError).toHaveBeenCalledWith(mapped as SpeechError, raw);
  });

  it("does not also fire a final after an error", () => {
    // Chrome fires onend after onerror. Without the settled flag the caller would be told the
    // session failed and then handed an empty transcript, moving the UI twice.
    install();
    const onFinal = vi.fn();
    const onError = vi.fn();
    startSpeech({ ...noop, onFinal, onError });
    const r = FakeRecognition.last!;
    r.fail("not-allowed");
    r.stop();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onFinal).not.toHaveBeenCalled();
  });

  it("cancel aborts the recogniser and delivers nothing", () => {
    // This is what stops the microphone light staying on after the screen is gone.
    install();
    const onFinal = vi.fn();
    const session = startSpeech({ ...noop, onFinal })!;
    session.cancel();
    expect(FakeRecognition.last!.aborted).toBe(true);
    FakeRecognition.last!.stop();
    expect(onFinal).not.toHaveBeenCalled();
  });

  it("configures for the way people actually speak here", () => {
    install();
    startSpeech(noop);
    const r = FakeRecognition.last!;
    expect(r.lang).toBe("en-AU");
    expect(r.continuous).toBe(true);
    expect(r.interimResults).toBe(true);
  });
});

describe("O59 the microphone's languages are the roster's, and the default never moved", () => {
  it("threads a chosen language to the recogniser, with en-AU still the default", () => {
    install();
    startSpeech(noop);
    expect(FakeRecognition.last!.lang).toBe("en-AU");
    startSpeech(noop, "hi-IN");
    expect(FakeRecognition.last!.lang).toBe("hi-IN");
  });

  it("offers English first, plus exactly the languages listed GPs declare — no more", () => {
    // The list's stated basis, derived rather than trusted: a language nobody on the roster
    // consults in must not be offered to the microphone, because "speak Hindi to us" is only
    // an honest invitation on a directory where somebody actually speaks Hindi back.
    expect(DEFAULT_SPEECH_LANGUAGE.tag).toBe("en-AU");
    expect(SPEECH_LANGUAGES[0]).toBe(DEFAULT_SPEECH_LANGUAGE);
    const declared = new Set(clinicians.flatMap((c) => c.languages));
    for (const language of SPEECH_LANGUAGES) {
      expect(declared.has(language.english), `${language.english} is offered but nobody on the roster declares it`).toBe(true);
    }
    // Well-formed: unique BCP-47-shaped tags, own-script labels present.
    expect(new Set(SPEECH_LANGUAGES.map((l) => l.tag)).size).toBe(SPEECH_LANGUAGES.length);
    for (const language of SPEECH_LANGUAGES) {
      expect(language.tag).toMatch(/^[a-z]{2}-[A-Z]{2}$/);
      expect(language.label.length).toBeGreaterThan(0);
    }
  });

  it("says the honesty line whole: kept and shown, but maybe not ordering the list", () => {
    // Both halves matter. "Kept and shown" alone would oversell; "may not order the list"
    // alone would read as the words being discarded. And it must never claim the words ARE
    // used for ordering, which is the one thing the reader cannot do yet.
    expect(SPEECH_ENGLISH_MATCHING_NOTE).toMatch(/reads English/i);
    expect(SPEECH_ENGLISH_MATCHING_NOTE).toMatch(/kept and shown/i);
    expect(SPEECH_ENGLISH_MATCHING_NOTE).toMatch(/may not order/i);
  });
});

describe("the disclosure says where the audio goes", () => {
  it("names the browser as the processor and this product as not receiving it", () => {
    // The point of the disclosure is the second half. A sentence that only said "speech is
    // converted to text" would be true and would not tell anybody what they need to know.
    expect(SPEECH_DISCLOSURE).toMatch(/browser/i);
    expect(SPEECH_DISCLOSURE).toMatch(/does not record it|does not receive/i);
    expect(SPEECH_DISCLOSURE).toMatch(/type instead/i);
  });

  it("offers typing in every error message, since that is always the way out", () => {
    for (const [error, copy] of Object.entries(SPEECH_ERROR_COPY)) {
      if (error === "aborted") continue; // a deliberate stop needs no escape hatch
      expect(copy, `${error} does not offer the typed route`).toMatch(/type instead/i);
    }
  });

  it("says nothing to a patient in error-code language", () => {
    for (const copy of Object.values(SPEECH_ERROR_COPY)) {
      expect(copy).not.toMatch(/not-allowed|audio-capture|no-speech|undefined|null/);
    }
  });
});

describe("O12 RCA: the intermittent failures, pinned", () => {
  it("delivers the words when the service dies after they were recognised", () => {
    // Chrome's recogniser is a streaming network service and can drop mid-utterance. The old
    // path reported `network` and discarded everything already recognised — the person watched
    // their sentence appear and then lost it, which is the "sometimes it fails" report.
    install();
    const onFinal = vi.fn();
    const onError = vi.fn();
    startSpeech({ ...noop, onFinal, onError });
    const r = FakeRecognition.last!;
    r.emit([{ text: "my dose keeps wearing off", final: true }]);
    r.fail("network");
    expect(onFinal).toHaveBeenCalledWith("my dose keeps wearing off");
    expect(onError).not.toHaveBeenCalled();
    // And the onend Chrome fires afterwards must not deliver a second time.
    r.stop();
    expect(onFinal).toHaveBeenCalledTimes(1);
  });

  it("still reports the errors that mean nothing was captured", () => {
    install();
    const onFinal = vi.fn();
    const onError = vi.fn();
    startSpeech({ ...noop, onFinal, onError });
    FakeRecognition.last!.fail("network");
    expect(onError).toHaveBeenCalledWith("network", "network");
    expect(onFinal).not.toHaveBeenCalled();
  });

  it("does not duplicate text when a browser re-delivers final segments", () => {
    // Safari's continuous mode re-sends earlier finals with resultIndex snapped back to zero.
    // Accumulation turned each re-delivery into "my dose my dose"; rebuilding from the whole
    // cumulative list is idempotent under exactly that misbehaviour.
    install();
    const onPartial = vi.fn();
    const onFinal = vi.fn();
    startSpeech({ ...noop, onPartial, onFinal });
    const r = FakeRecognition.last!;
    const segment = { text: "my dose keeps wearing off", final: true };
    r.emit([segment]);
    r.emit([segment], 0); // the Safari re-delivery
    expect(onPartial).toHaveBeenLastCalledWith("my dose keeps wearing off");
    r.stop();
    expect(onFinal).toHaveBeenCalledWith("my dose keeps wearing off");
  });

  it("names the reason speech is unavailable, in patient words, with typing as the way out", () => {
    for (const copy of Object.values(SPEECH_UNAVAILABLE_COPY)) {
      expect(copy).toMatch(/typing/i);
      expect(copy).not.toMatch(/error|code|exception/i);
    }
  });
});

describe("O16 the iPhone's own error codes are named, not shrugged at", () => {
  it.each([
    ["service-not-allowed", "service-not-allowed"],
    ["language-not-supported", "language-not-supported"],
  ])("maps %s to %s instead of unknown", (raw, mapped) => {
    // Seen in production on iOS: dictation switched off fires `service-not-allowed`, and the
    // old map's generic "did not work" gave the person nothing to act on.
    install();
    const onError = vi.fn();
    startSpeech({ ...noop, onError });
    FakeRecognition.last!.fail(raw);
    expect(onError).toHaveBeenCalledWith(mapped as SpeechError, raw);
  });

  it("names the switches worth checking without asserting any of them is off", () => {
    // The O16 copy said "your phone's dictation is switched off" — stated as fact, and false on
    // the production device that motivated O18. The module cannot see the phone's settings, so
    // the copy must suggest, never diagnose.
    const copy = SPEECH_ERROR_COPY["service-not-allowed"];
    expect(copy).toMatch(/dictation/i);
    expect(copy).toMatch(/type instead/i);
    expect(copy).not.toMatch(/is switched off|is turned off|is disabled/i);
  });
});

describe("O18 the iPhone retry: permission warm-up before the message shows", () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("retries once behind a granted microphone, and the person never sees an error", async () => {
    // Production case: dictation verifiably ON, `service-not-allowed` anyway. The reported
    // workaround is a getUserMedia warm-up; if the second attempt works, the failure is invisible.
    install();
    installMicrophone("granted");
    const onError = vi.fn();
    const onFinal = vi.fn();
    startSpeech({ ...noop, onError, onFinal });
    const first = FakeRecognition.last!;
    first.fail("service-not-allowed");
    await flush();
    const second = FakeRecognition.last!;
    expect(second).not.toBe(first);
    expect(second.started).toBe(true);
    second.emit([{ text: "kind and speaks Hindi", final: true }]);
    second.stop();
    expect(onFinal).toHaveBeenCalledWith("kind and speaks Hindi");
    expect(onError).not.toHaveBeenCalled();
  });

  it("reports the original error when the microphone is denied", async () => {
    install();
    installMicrophone("denied");
    const onError = vi.fn();
    startSpeech({ ...noop, onError });
    FakeRecognition.last!.fail("service-not-allowed");
    await flush();
    expect(onError).toHaveBeenCalledWith("service-not-allowed", "service-not-allowed");
  });

  it("retries only once: a second failure is reported, not looped", async () => {
    install();
    installMicrophone("granted");
    const onError = vi.fn();
    startSpeech({ ...noop, onError });
    FakeRecognition.last!.fail("service-not-allowed");
    await flush();
    FakeRecognition.last!.fail("service-not-allowed");
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
    expect(onError).toHaveBeenCalledWith("service-not-allowed", "service-not-allowed");
  });

  it("holds the warm-up stream open while the retried recogniser runs, releasing it on settle (O46)", async () => {
    // The first version stopped the tracks the moment permission resolved, and the founder's
    // phone showed the result: Allow pressed, broken anyway. The reported WebKit behaviour is
    // that recognition works while the audio session is live, so the stream is held until the
    // session settles — and released then, because a microphone light that never goes off is
    // its own bug.
    install();
    let stopped = 0;
    (globalThis.navigator as unknown as Record<string, unknown>).mediaDevices = {
      getUserMedia: () =>
        Promise.resolve({ getTracks: () => [{ stop: () => { stopped += 1; } }] }),
    };
    const onFinal = vi.fn();
    startSpeech({ ...noop, onFinal });
    FakeRecognition.last!.fail("service-not-allowed");
    await flush();
    const second = FakeRecognition.last!;
    expect(second.started).toBe(true);
    expect(stopped).toBe(0);
    second.emit([{ text: "kind and speaks Hindi", final: true }]);
    second.stop();
    expect(onFinal).toHaveBeenCalledWith("kind and speaks Hindi");
    expect(stopped).toBe(1);
  });

  it("does not re-open the microphone when stop was pressed during the warm-up", async () => {
    install();
    installMicrophone("granted");
    const onFinal = vi.fn();
    const session = startSpeech({ ...noop, onFinal })!;
    const first = FakeRecognition.last!;
    first.fail("service-not-allowed");
    session.stop();
    expect(onFinal).toHaveBeenCalledWith("");
    await flush();
    // The warm-up resolved after the stop; a new recogniser must not have started.
    expect(FakeRecognition.last).toBe(first);
  });

  it("does not retry the errors that already have honest answers", () => {
    // `network`, `no-speech`, `audio-capture` are not permission problems; a warm-up cannot fix
    // them and would only delay the message.
    install();
    installMicrophone("granted");
    const onError = vi.fn();
    startSpeech({ ...noop, onError });
    FakeRecognition.last!.fail("network");
    expect(onError).toHaveBeenCalledWith("network", "network");
  });
});

describe("O69 the recovery tap starts warm: the carried stream", () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));
  const microphone = (onStop: () => void) => ({
    getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop: onStop }] }),
  });

  /** Drive a session to the double permission failure that makes it carry its stream. */
  async function failTwice(onStop: () => void) {
    (globalThis.navigator as unknown as Record<string, unknown>).mediaDevices = microphone(onStop);
    const onError = vi.fn();
    startSpeech({ ...noop, onError });
    FakeRecognition.last!.fail("service-not-allowed");
    await flush();
    // The retried recogniser fails on the same code — pre-O69 this released the stream.
    FakeRecognition.last!.fail("service-not-allowed");
    await flush();
    expect(onError).toHaveBeenCalledTimes(1);
  }

  it("carries the stream past the second permission failure, and the next start adopts it", async () => {
    install();
    let stopped = 0;
    await failTwice(() => { stopped += 1; });
    // Carried, not stopped: the recovery tap needs the session live.
    expect(stopped).toBe(0);

    // The recovery tap: no new getUserMedia is awaited — recognition starts synchronously
    // inside the gesture, and the adopted stream is released when the session settles.
    (globalThis.navigator as unknown as Record<string, unknown>).mediaDevices = {
      getUserMedia: vi.fn(() => Promise.reject(new Error("must not be called on adoption"))),
    };
    const onFinal = vi.fn();
    startSpeech({ ...noop, onFinal });
    const second = FakeRecognition.last!;
    expect(second.started).toBe(true);
    second.emit([{ text: "heard at last", final: true }]);
    second.stop();
    expect(onFinal).toHaveBeenCalledWith("heard at last");
    expect(stopped).toBe(1);
  });

  it("drops the carried stream after the window, so the mic light always has a path to off", async () => {
    install();
    vi.useFakeTimers();
    let stopped = 0;
    (globalThis.navigator as unknown as Record<string, unknown>).mediaDevices = microphone(() => { stopped += 1; });
    startSpeech(noop);
    FakeRecognition.last!.fail("service-not-allowed");
    await vi.runOnlyPendingTimersAsync();
    FakeRecognition.last!.fail("service-not-allowed");
    await vi.advanceTimersByTimeAsync(0);
    expect(stopped).toBe(0);
    await vi.advanceTimersByTimeAsync(45_000);
    expect(stopped).toBe(1);
  });

  it("never carries for a failure a warm session cannot fix", async () => {
    install();
    let stopped = 0;
    (globalThis.navigator as unknown as Record<string, unknown>).mediaDevices = microphone(() => { stopped += 1; });
    startSpeech(noop);
    FakeRecognition.last!.fail("service-not-allowed");
    await flush();
    // The retried recogniser dies on a NON-permission code: no microphone, no fix by warmth.
    FakeRecognition.last!.fail("audio-capture");
    await flush();
    expect(stopped).toBe(1);
  });

  it("cancel on the adopting session releases the adopted stream", async () => {
    install();
    let stopped = 0;
    await failTwice(() => { stopped += 1; });
    const session = startSpeech(noop)!;
    session.cancel();
    expect(stopped).toBe(1);
  });

  it("dropCarriedStream releases it explicitly, for the finder leaving the screen", async () => {
    install();
    let stopped = 0;
    await failTwice(() => { stopped += 1; });
    dropCarriedStream();
    expect(stopped).toBe(1);
    // Idempotent: a second drop stops nothing twice.
    dropCarriedStream();
    expect(stopped).toBe(1);
  });
});

describe("O70 the refactor's own findings, pinned", () => {
  const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

  it("never orphans an adopted stream when the retry opens a fresh one (G4)", async () => {
    // The leak the O70 audit found: a session that ADOPTED the carried stream and still
    // failed ran the O18 retry, whose fresh getUserMedia overwrote warmStream with the
    // adopted tracks live — a mic light with no path to off.
    install();
    let adoptedStops = 0;
    (globalThis.navigator as unknown as Record<string, unknown>).mediaDevices = {
      getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop: () => { adoptedStops += 1; } }] }),
    };
    // Session one fails twice and carries its stream (stop count still 0).
    startSpeech(noop);
    FakeRecognition.last!.fail("service-not-allowed");
    await flush();
    FakeRecognition.last!.fail("service-not-allowed");
    await flush();
    expect(adoptedStops).toBe(0);

    // Session two adopts it, fails again, and the retry acquires a SECOND stream: the
    // adopted one must be stopped at that handoff, not orphaned.
    let secondStops = 0;
    (globalThis.navigator as unknown as Record<string, unknown>).mediaDevices = {
      getUserMedia: () => Promise.resolve({ getTracks: () => [{ stop: () => { secondStops += 1; } }] }),
    };
    const onFinal = vi.fn();
    startSpeech({ ...noop, onFinal });
    FakeRecognition.last!.fail("service-not-allowed");
    await flush();
    expect(adoptedStops).toBe(1); // released at the handoff, no orphan
    // And the second stream still follows the normal lifecycle: released on settle.
    FakeRecognition.last!.emit([{ text: "working now", final: true }]);
    FakeRecognition.last!.stop();
    expect(onFinal).toHaveBeenCalledWith("working now");
    expect(secondStops).toBe(1);
  });

  it("maps raw codes through the exported vocabulary, unknown included", () => {
    expect(mapSpeechError("service-not-allowed")).toBe("service-not-allowed");
    expect(mapSpeechError("brand-new-webkit-code")).toBe("unknown");
  });

  it("reports the environment as compact facts, defensively, for the debug banner", async () => {
    install();
    (globalThis.navigator as unknown as Record<string, unknown>).mediaDevices = {
      getUserMedia: () => Promise.resolve({ getTracks: () => [] }),
    };
    (globalThis.navigator as unknown as Record<string, unknown>).permissions = {
      query: ({ name }: { name: string }) =>
        name === "microphone" ? Promise.resolve({ state: "granted" }) : Promise.reject(new Error("no")),
    };
    const facts = await speechDebugFacts("hi-IN");
    expect(facts).toContain("lang:hi-IN");
    expect(facts).toContain("api:yes");
    expect(facts).toContain("media:yes");
    expect(facts).toContain("mic:granted");
    delete (globalThis.navigator as unknown as Record<string, unknown>).permissions;
  });

  it("never throws when a probe is missing — an absent fact is absent, not an error", async () => {
    install({ present: false });
    (globalThis.navigator as unknown as Record<string, unknown>).permissions = {
      query: () => Promise.reject(new Error("unsupported name")),
    };
    const facts = await speechDebugFacts();
    expect(facts).toContain("api:no");
    expect(facts).not.toContain("mic:");
    delete (globalThis.navigator as unknown as Record<string, unknown>).permissions;
  });
});

describe("O73 the banner proves which build ran (failure mode D2)", () => {
  it("carries the deploy's short SHA when the build stamped one", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", "1a266dcfeedbeefcafe");
    expect(await speechDebugFacts()).toContain("build:1a266dc");
    vi.unstubAllEnvs();
  });

  it("says build:dev when unstamped — a visible fact, never a guess", async () => {
    vi.stubEnv("NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA", "");
    expect(await speechDebugFacts()).toContain("build:dev");
    vi.unstubAllEnvs();
  });
});
