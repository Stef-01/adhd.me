// Speech-to-text, tested against a fake recogniser.
//
// The Web Speech API is not available in jsdom, so these drive a stand-in with the same surface.
// That is worth being explicit about: this asserts THIS MODULE'S behaviour (feature detection, the
// interim/final split, teardown, error mapping) and not that Chrome transcribes correctly. The
// half a fake cannot cover is the half a browser owns.

import { afterEach, describe, expect, it, vi } from "vitest";
import {
  SPEECH_DISCLOSURE,
  SPEECH_ERROR_COPY,
  SPEECH_UNAVAILABLE_COPY,
  speechUnavailable,
  startSpeech,
  type SpeechError,
} from "./speech";

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
