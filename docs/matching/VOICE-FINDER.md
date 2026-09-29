# The voice finder

Status: built 2026-09-28. On wherever `OPENAI_API_KEY` is set, unless `ADHDME_VOICE=0` (founder,
2026-09-29: voice on by default). The finder's AI or Standard choice (below its box, kept on the
device) decides per person: AI talks through this finder, Standard's microphone is dictation.

## What it is

The finder's microphone opens a spoken conversation, after ChatGPT's voice mode (founder: "talking
to ChatGPT voice, which progressively asks you questions (max 8 follow ups) and then reveals the
clinician matches"). The screen is Javi0108/VoiceChatGpt-Prototype's (founder: "make it exactly
like this"): the orb and one stop button. The model asks one short question at a time, at most 8
after the first answer, then writes one request sentence; the finder ranks on it exactly as it
ranks a typed one, and the results arrive where the orb was.

| Part | File |
| --- | --- |
| What the model is told, its two tools, the cap | `src/voice/interviewer.ts` |
| The conversation: events in, events out, the cap held by the client | `src/voice/conversation.ts` |
| The call: WebRTC, the data channel, loudness | `src/voice/link.ts` |
| The scripted call for e2e, the text budget and audits | `src/voice/fake-link.ts` |
| The call route: the browser's offer to OpenAI, the key never leaves | `app/api/voice/session/route.ts` |
| The screen, the orb (the prototype's sphere visualizer, MIT, in WebGL2) | `app/finder-stages/voice-stage.tsx`, `voice-orb.tsx`, `app/voice-orb/` |
| The record: every turn, the request, the place, how it ended (founder, 2026-09-29) | `src/db/finder.ts` (`voice_calls`), read back by `scripts/voice-transcripts.mjs`; a scripted call also lands whole under `qa/voice/runs/` |

## Guards

- **The cap is the client's.** After the 8th question the next answer starts no response on its
  own, and the one after it is forced to call `show_matches`. Unit-tested to the question.
- **The request is held to the person's words** at the reveal: a kind of clinician they did not
  name becomes "clinician" (a named kind is a hard filter), "adult" goes from a request for a child,
  and "specialist" never reaches the screen. The place is the suburb or postcode alone.
- **Urgent help** opens from the model's `urgent_help` call, or from the person's own words through
  the safety rules (self-harm, hopelessness, danger), whatever the model does. The app header, with
  Urgent help, stays on the screen.
- **Spend:** 8 calls in ten minutes from one caller, `ADHDME_VOICE_DAILY_SESSIONS` a UTC day (default
  40), a six-minute ceiling on a call, and a key that fails pauses voice for ten minutes.

## The orb

The prototype has two: `Circle`, a flat shader of soft ovals in polar coordinates over a Perlin
texture, which its call screen used and this finder first vendored; and `Sphere`, its visualizer.
At the finder's size the circle read as a spinning disc (founder, 2026-09-28: "weird, CD-disc
looking ... make it much more fluid, engaging and reactive, like a visualizer"), so the orb is the
sphere now (`app/voice-orb/sphere.ts`): its surface flows with 4D simplex noise under a domain warp,
deep blue where it is pulled in and cyan where it is pushed out, lit by one light from the viewer as
three.js lit it; a voice, the person's or the assistant's, swells it, quickens its ripples and
deepens them, rising to a voice within a tenth of a second and settling over about half of one, by
the clock rather than the frame. It floats over its shadow while the call is live, breathes while it
connects, and under reduced motion is one still frame. One departure: its roughness never drops
below 0.3, where the prototype's pinpoint highlight read as a dead pixel. `e2e/voice-mode.spec.ts`
reads the pixels it draws: they change with nobody speaking, and the sphere covers over 40% more of
its canvas under either voice, then settles back.

## Live checks

- `scripts/voice-eval.mjs`: the interviewer against nine personas, headless, no browser.
- `scripts/voice-call.mjs`: a real spoken call from Chromium, its microphone a WAV built by macOS
  `say` from the lines given; `CONNECT_ONLY=1` times each step from the tap to the first word.

## Cost and speed (live, 2026-09-28, gpt-realtime-2.1-mini)

- A typed-answer call of 43 seconds: $0.013. The evaluator's calls: $0.003 to $0.022 each, patient
  simulator included. Spoken input adds transcription, about $0.003 a minute.
- First word of each reply: 0.3 to 1.0 s after a spoken answer stops, about 1.0 s after a typed one.
- From the tap: the microphone is asked for at 165 ms and the offer sent at 240 ms (the call starts in
  the tap); OpenAI answers the offer at 1.0 to 1.3 s; the data channel opens 1.2 to 1.3 s later on a
  warm browser. A fresh headless browser's first call waits about 5 s there, inside WebRTC's own
  setup; candidates in the offer did not help (eight samples).
- The voice sentence is read by level 1 the moment the model writes it, while its last words are
  said, so the matches do not wait behind "Reading what you asked".
- Three more fresh-browser calls (2026-09-28, evening, the machine under load): OpenAI answered the
  offer 0.4 to 1.5 s after it was sent; the channel opened 1.2 to 4.6 s after that and the session
  0.8 to 3.0 s after the channel; the first word followed the session by 1.0 s: 6.0, 9.6 and 10.5 s
  from the tap. Nearly all of it is WebRTC and OpenAI's session, outside the page. A recorded
  greeting was weighed and refused: the person would answer before the line is open and lose the
  start of their answer. While it connects the orb breathes instead, so the wait reads as getting
  ready.

## Evaluation (`scripts/voice-eval.mjs`)

Nine personas played by gpt-5-mini from a hidden brief (an adult, a parent, a stable patient
needing scripts, a rambler, a person asking for advice, a prompt injection, a person saying what they
do not want, a Vietnamese-speaking mother, and a person in crisis), each through the app's own
conversation code. A persona passes when the call stays within the cap, asks one question a turn,
reveals (or opens urgent help), and its request carries the brief's needs, none of its `never`
needs, nothing the person did not say (a grader reads the transcript), at most 35 words, and no
advice. Runs are in `qa/voice/runs/`.

| Run | Pass | What changed |
| --- | --- | --- |
| 1 | 7/9 (loose scoring) | Requests invented kinds of clinician, a gender and costs; asked leading questions |
| 2 | 5/9 | No clinician-kind questions; 30-word requests; who it is for; the reveal guard |
| 3 | 6/9 | Scored on the level-1 read; a medication review named |
| 4 | 5/9 | A grader judges invention; it caught "an adult assessment for my 15-year-old daughter" |
| 5 | 7/9 | "adult" guard; "a woman"; the two misses were a medication persona's wording, which varies |

| 6 | 17/20 (each persona twice, a tenth who asks questions back) | The person may ask how things work; answers do not count toward the eight; "adult" and "ADHD" only where they belong |
| 7 | 18/20 | No leading questions; never drop a need to fit the length |

**Which model.** Twice over ten personas, same prompt:

| Model, effort | Pass | Cost a call | First word p50 / p90 |
| --- | --- | --- | --- |
| gpt-realtime-2.1-mini, default | 18/20 | $0.012 | 1.00 / 1.77 s |
| gpt-realtime-2.1-mini, low | 15/20 | $0.012 | 1.01 / 1.05 s |
| gpt-realtime-2.1, default | 16/20 | $0.041 | 1.00 / 1.06 s |

The mini model at its default effort stays: the full model costs 3.4 times as much, is no more
accurate here and asks fewer questions. `ADHDME_VOICE_MODEL` and `ADHDME_VOICE_EFFORT` switch either.

**Back and forth.** The person may ask how things work ("what does bulk billing mean?"); the
interviewer answers in a sentence or two, generally and never about their own health, and carries
on. Only replies that ask something count toward the eight. After 18 seconds of quiet it checks once
("Still there? I can show you matches now if you like"); a second quiet spell, once the person has
said anything, shows the matches for what they said.

The readers' own gaps the requests exposed are in `qa/matching/rca.md` R11.
