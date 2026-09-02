// U8 (O229): the fake recogniser, lifted out of voice.spec.ts so finder-history.spec.ts can drive
// the same listening screen. Verbatim from W212's spec: what it proves and does not prove is that
// file's header — the FINDER handles each outcome; nothing here transcribes speech.

import { type Page } from "@playwright/test";

/**
 * Install a controllable fake recogniser.
 *
 * Exposes `__speech` on the page so a test can drive results and errors from the outside, and
 * records `aborted` so teardown can be asserted rather than assumed.
 */
export async function installFakeSpeech(page: Page, opts: { present?: boolean; holdStop?: boolean } = {}) {
  const present = opts.present !== false;
  // U9: `holdStop` makes `stop()` return without ending, so a test can observe the finder's
  // "finishing" window (the toggle busy, the line "Finishing.") before it calls `finish()` itself.
  // A real recogniser takes a beat here; the default fake ends at once, as W212 wrote it.
  const holdStop = opts.holdStop === true;
  await page.addInitScript(({ isPresent, hold }: { isPresent: boolean; hold: boolean }) => {
    const w = window as unknown as Record<string, unknown>;
    if (!isPresent) {
      delete w.SpeechRecognition;
      delete w.webkitSpeechRecognition;
      return;
    }
    const state = { instance: null as unknown, aborted: false, started: 0 };
    class Fake {
      lang = ""; continuous = false; interimResults = false; maxAlternatives = 0;
      onresult: ((e: unknown) => void) | null = null;
      onerror: ((e: unknown) => void) | null = null;
      onend: (() => void) | null = null;
      onstart: (() => void) | null = null;
      constructor() { state.instance = this; }
      start() { state.started += 1; }
      stop() { if (!hold) this.onend?.(); }
      abort() { state.aborted = true; }
    }
    w.SpeechRecognition = Fake;
    delete w.webkitSpeechRecognition;
    w.__speech = {
      state,
      say(text: string, final: boolean) {
        const inst = state.instance as Fake;
        const results = [Object.assign([{ transcript: text }], { isFinal: final })];
        inst.onresult?.({ resultIndex: 0, results });
      },
      finish() { (state.instance as Fake).onend?.(); },
      fail(error: string) { (state.instance as Fake).onerror?.({ error }); },
    };
  }, { isPresent: present, hold: holdStop });
}
