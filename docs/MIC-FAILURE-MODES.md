# The microphone: every way it can fail (O70)

Written after the founder's field test failed against a build the deploy quota had silently
kept the fix out of — which is itself failure mode D1 below, and the reason this inventory
covers the whole path from tap to production, not just the Web Speech API.

Each mode lists: **trigger** (what makes it happen), **today** (how the shipped code handles
it), and **fix** (shipped / candidate / founder-side / impossible-with-reason). The speech
module's own tests pin most of the "today" column; this file is the map, not the gate.

Status words: **SHIPPED** (handled, pinned), **PARTIAL** (handled, known residue),
**CANDIDATE** (brainstormed fix, buildable unit), **FOUNDER** (a human act), **ACCEPTED**
(no honest fix exists; the handling is the fix).

---

## A. Feature-detection layer — before any tap

**A1. Browser has no Web Speech API** (Firefox, many WebViews, some Android browsers).
Trigger: `SpeechRecognition`/`webkitSpeechRecognition` both absent.
Today: `speechUnavailable() === "unsupported"`; mic routes to typing WITH the reason said
out loud (O12: the silent version read as a broken button). SHIPPED.

**A2. Insecure origin** (http LAN address while testing from a phone).
Trigger: API present, `window.isSecureContext` false; `start()` would throw after the tap.
Today: detected up front, own copy. SHIPPED (O12's second half).

**A3. iOS home-screen web app (standalone PWA).**
Trigger: page launched from a Home Screen icon; WebKit withholds or breaks the API there.
Today: if the API is absent → A1 handles it; if present-but-broken → falls through to the
E-layer errors with no hint of the real cause.
Fix: cannot hard-block (newer iOS versions reportedly work), but the standalone flag is
DETECTABLE (`navigator.standalone`) — so it now rides the debug facts (O70), turning "it
fails only from the icon" into a diagnosable report. PARTIAL → instrumented.

**A4. Embedded WebView** (Instagram/Facebook/LinkedIn in-app browsers).
Trigger: API sometimes present but permission UI broken or absent.
Today: falls through to E-layer errors; typing always works.
Fix: user-agent sniffing for WebViews is a blocklist that rots. ACCEPTED, with the E-layer
copy carrying it; debug facts (standalone + UA available in any screenshot) help diagnosis.

**A5. `start()` throws synchronously** (double-start; corner cases A2 cannot see).
Trigger: Chrome throws on a second `start()`; some insecure-context combos throw.
Today: caught; `startSpeech` returns null; caller routes to typing with the unavailable
copy. SHIPPED.

## B. Permission layer

**B1. Microphone denied in the browser** (`not-allowed`).
Trigger: user (or a past visit) blocked mic for the site.
Today: honest copy naming the address bar; O48 renders "Try the microphone again" as a
button; O18 retry attempts a getUserMedia warm-up first. SHIPPED.

**B2. iOS `service-not-allowed` — the FAMILY.** The single most field-reported failure.
Sub-causes iOS refuses to distinguish: (a) Siri & Dictation off; (b) Safari not allowed the
microphone in Settings→Safari or per-site; (c) Screen Time / enterprise restrictions;
(d) standalone PWA (A3); (e) a known intermittent WebKit refusal where the SAME tap works
on retry.
Today: copy names the switches without asserting any as fact (the O16 lesson: never state a
diagnosis the code cannot verify); O18 one-shot warm retry; O46 holds the warm stream while
the retry runs; O48 makes the once-more a tap; O69 carries the warm stream to that tap so
it starts with gesture AND live session at once. SHIPPED to the platform's limit — the
sub-causes (a)–(c) are device settings only the person can flip. Residue: FOUNDER (field
verification with the ?debug=1 code, now with environment facts).

**B3. getUserMedia itself denied** (warm-up refused).
Trigger: user denies the mic prompt the retry surfaces.
Today: the original error is reported with honest copy; nothing loops. SHIPPED.

**B4. Permission prompt eats the gesture.**
Trigger: any `await` before `start()` expires the tap's user-activation.
Today: first start is SYNCHRONOUS in the tap, always; the only awaited start is the O18
retry, whose known weakness is exactly this — and whose recovery is O48+O69. SHIPPED.

## C. Gesture layer

**C1. Programmatic start refused** (retry runs outside user activation).
Today: O69's carried stream makes the NEXT tap the strong path instead of fighting WebKit.
SHIPPED. Candidate beyond it: none honest — user activation cannot be minted in code, by
design of the platform. ACCEPTED for the auto-retry itself.

**C2. Stop pressed during the retry gap.**
Trigger: person taps Done while getUserMedia is pending; a late stream could re-open the mic
over a screen that asked for silence.
Today: `stop()` with no active recogniser settles quietly with an empty final; the late
stream is released on arrival. SHIPPED (pinned).

## D. Deploy & delivery layer — the failure that LOOKS like all the others

**D1. The fix is not the build under the thumb.** Today's live lesson: Vercel's free-tier
daily quota silently created NO deployment for the O69 push; the founder tested O68 and
reported "it failed".
Today: deploy-watch check armed (send_later) to confirm when a fix is actually live before
asking for a retest.
Fix: FOUNDER (plan upgrade, debt 9) or accepted batching; build-side discipline — never
claim "live" without checking the deployment list — is now practice. PARTIAL.

**D2. Stale cached JS on the phone** (Safari serving yesterday's bundle).
Trigger: bfcache/asset cache after a deploy.
Today: Next hashes assets, so a hard refresh picks up the new build; nothing forces it.
Fix: SHIPPED (O73) — the ?debug=1 facts open with `build:<sha7>`, inlined at build time from
NEXT_PUBLIC_VERCEL_GIT_COMMIT_SHA, so a screenshot proves which code ran. `build:dev` in
production is itself a visible signal (system envs unexposed on the Vercel project — a
founder toggle), never a guess. Pinned present/absent.

## E. Session layer — after a successful start

**E1. Browser ends the session on its own** (iOS closes continuous recognition after a
pause or a few seconds).
Today: a browser-initiated end lands the words in the editable box with one plain sentence;
ONLY a tapped Done searches (O46 — this was the "results screen headlined 'Cx.'" bug).
SHIPPED.

**E2. Recogniser dies mid-utterance AFTER words arrived** (Chrome's streaming service).
Today: a late failure with captured text is a FINISH — words delivered, error suppressed
(O12: words the person watched appear are never thrown away). SHIPPED.

**E3. Safari re-delivers earlier final segments** (resultIndex snaps back).
Today: transcript rebuilt from the whole cumulative list every event — idempotent under
re-delivery ("my dose my dose" bug). SHIPPED.

**E4. Silence** (`no-speech`).
Today: empty final, typing screen, NO red message — a quiet room is not a failure. SHIPPED.

**E5. No microphone hardware** (`audio-capture`).
Today: honest copy; never offered the retry button (a missing mic won't appear on tap).
SHIPPED.

**E6. Speech service unreachable** (`network`).
Today: honest copy; captured words still delivered per E2. SHIPPED. Candidate: none — an
on-device fallback is the refused 40MB model; a vendor API is the refused disclosure.

**E7. Unknown/new error code.**
Today: mapped to "unknown" for the patient; the RAW code rides to the caller and shows
under ?debug=1 (the O16 lesson: "unknown" flattened the only diagnostic). SHIPPED.

**E8. Deliberate abort** (`aborted`, cancel, leaving the screen).
Today: reported but never shown as red; unmount aborts the recogniser so the mic light
cannot outlive its page; O69's carried stream is dropped on unmount too. SHIPPED.

## F. Language layer (O59)

**F1. Device cannot listen in the chosen language** (`language-not-supported`).
Trigger: hi-IN / ur-PK recognition absent on the device.
Today: own copy; typing always available; English remains one tap away on the picker.
Fix: CANDIDATE — auto-revert to English with a sentence saying so, saving one tap. Small
unit; queued rather than folded in here.

**F2. Wrong-language transcription** (English spoken while Hindi selected, or vice versa).
Today: words land as text and are searchable; the O59 honesty note already governs
non-English matching. ACCEPTED (no reliable detection exists worth its false positives).

## G. Integration layer (care-finder)

**G1. Stale session clobbers its successor** (second tap orphaning a live recogniser).
Today: cancel-first on every start; handlers only release the ref they still own (O12 RCA,
pinned). SHIPPED.

**G2. Mic light outlives its purpose.**
Today: every stream has a path to off — session settle, cancel, unmount, carry adoption,
45s carry expiry (all pinned). SHIPPED.

**G3. Retry button shown for unfixable failures.**
Today: only permission-flavoured codes render it (pinned: audio-capture does not). SHIPPED.

**G4. Adopted stream orphaned by a second warm-up** — found BY this inventory's refactor.
Trigger: a session adopts the O69 carried stream, still fails on a permission code, and the
O18 retry's fresh getUserMedia overwrote `warmStream` without stopping the adopted one:
live orphaned tracks, mic light stuck with no path to off.
Today: release-before-assign in the retry's success handler; pinned with a two-stream test.
SHIPPED (O70).

---

## The instrument this inventory demanded (shipped with it)

`speechDebugFacts()` — appended to the ?debug=1 banner: standalone-mode flag, microphone
permission state where the browser can report it, secure-context flag, the chosen
recognition language, and whether the API + mediaDevices exist. The founder's next
bracketed code arrives WITH the environment that produced it, which converts B2's residue
from guesswork into a lookup: `standalone:yes` → A3; `mic-permission:denied` → B1 settings;
`mic-permission:granted` + still failing → the WebKit intermittent, where O69's warm tap is
the recovery.

## Candidate units this file queues (in order of expected value)

1. ~~Build SHA in debug facts (D2)~~ — SHIPPED, O73.
2. **Language auto-revert** (F1) — one tap saved on an unsupported language.
3. **Bare-not negation** (unrelated to mic; already queued by O68's corpus pin).
