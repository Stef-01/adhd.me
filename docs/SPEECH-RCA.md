# Speech input: root-cause analysis of "sometimes it works, sometimes it fails" (O12)

The report: the finder's microphone works on some attempts and fails on others, with no visible
pattern. This document is the full causal analysis — every mechanism found in the code and the
platform that produces exactly that experience, which are fixed, and which are environmental
facts the product can only name. Fixes shipped with unit pins in `src/voice/speech.test.ts`.

## The system under analysis

`src/voice/speech.ts` (W212) wraps the browser Web Speech API; `app/care-finder.tsx` drives it.
Chrome/Edge/Safari implement recognition as a **streaming network service** (audio to
Google/Apple, text back — disclosed beside the mic). That one fact generates most of the
intermittency: the microphone's reliability is the reliability of a third-party network call
that the page cannot observe ahead of time.

## Root causes — code defects, now fixed

### RC1 — Recognised words were thrown away on a late error  ← the headline "sometimes fails"
The service can drop **mid-utterance, after words were already recognised** (network blip, VPN,
captive portal, service hiccup). `onerror` set `settled` and reported the error; the accumulated
transcript was discarded. The person watched their sentence appear on screen, then got "the
speech service could not be reached" and an empty box. Same room, same browser, different
minute → different outcome.
**Fix:** a late failure with captured text is a *finish*, not a failure — the words are
delivered and no error is shown. Errors that mean nothing was captured (denied mic, silence, no
device) still report. Pinned: "delivers the words when the service dies after they were
recognised".

### RC2 — Safari duplicated the transcript
Safari's continuous mode is known to re-deliver earlier final segments with `resultIndex`
snapped back to 0. `finalText +=` turned each re-delivery into a duplicate ("my dose my dose
wearing off wearing off") — only on Safari, only sometimes.
**Fix:** the transcript is rebuilt from the whole cumulative result list on every event —
equivalent on a well-behaved browser, idempotent under re-delivery. Pinned: "does not duplicate
text when a browser re-delivers final segments".

### RC3 — A second tap orphaned a live recogniser
`startListening` never cancelled an existing session. Two quick taps (or stage churn) left the
first recogniser running with no handle: its stale handlers nulled the shared ref out from under
the new session, the stage-change cleanup then found nothing to cancel, and the microphone light
stayed on over the typing screen while nothing worked.
**Fix:** `startListening` cancels any live session first, and handlers release the ref only if
they still own it (`speech.current === session`).

### RC4 — Unavailability was silent, so it read as breakage
When speech is unavailable (`startSpeech` returns null) the finder routed to typing **with no
message**. The commonest trigger: opening the demo from a phone over a LAN `http://` address —
an insecure context, where the API exists but refuses. To the person, the mic button "just
didn't work", on one device but not another: reported, reasonably, as intermittent failure.
**Fix:** `SPEECH_UNAVAILABLE_COPY` says why, in patient words, on the typing screen
("Speech input only works on a secure (https) connection, so it is typing from here.").

## Root causes — environmental, named rather than fixable

### RC5 — Chromium-family browsers without the speech service
`webkitSpeechRecognition` **exists** in vanilla Chromium, Electron shells and some WebViews but
the service behind it needs Google API keys those builds do not carry; Brave ships the API and
blocks the service. Every attempt fails with `network` — undetectable ahead of `start()`.
"Works in my Chrome, fails in my other browser" is this. The `network` error copy covers it;
RC1's fix means any words that did land are no longer lost with it. (This is also why the e2e
suite stubs the API: Playwright's Chromium is exactly such a build.)

### RC6 — Chrome ends recognition on prolonged silence
Even with `continuous: true`, Chrome terminates after extended silence or tab backgrounding. If
somebody taps the mic and thinks for ten seconds, recognition may end (`no-speech`) before they
speak. The finder's handling is deliberate: gentle copy, straight to typing, no auto-retry — a
retry loop against a genuinely absent microphone traps the person the fallback exists to free.

### RC7 — Permission and device states
Denied permission (`not-allowed`), no microphone (`audio-capture`), OS-level mic privacy
toggles: each maps to its own sentence with typing as the way out. Unchanged; verified.

## Why it presented as random

Five independent mechanisms (RC1, RC3, RC4, RC5, RC6) each produce "tapped the mic, ended up
typing" with different frequencies on different devices, networks and browsers. Any one of them
alone would have looked like a pattern; together they looked like noise. The three code defects
are fixed and pinned; the two environmental causes now either speak (RC4) or fail with the
person's words preserved (RC1 under RC5/RC6).

## Verification

- `src/voice/speech.test.ts`: 23 tests including the four new RCA pins.
- `e2e/voice.spec.ts`: browser-level routing (fake recogniser; the honest boundary is stated in
  its header — CI cannot prove Chrome transcribes).
- What no test can cover: the real service's availability. That is RC5/RC6 territory, and the
  design answer is the fallback: typing is always one tap away and now always explained.

## Addendum (O16): the iPhone's generic error, named

A production screenshot showed "Speech input did not work. You can type instead." on an
iPhone — the `unknown` fallback. iOS fires `service-not-allowed` when the phone's dictation
is switched off (Settings → General → Keyboard → Enable Dictation) or restricted by screen
time, and `language-not-supported` where the device cannot listen in the requested language.
Neither code was in the error map, so both collapsed to a sentence with nothing actionable in
it. Both are now mapped, and the dictation copy names the switch to look for. Pinned in
`speech.test.ts`.
