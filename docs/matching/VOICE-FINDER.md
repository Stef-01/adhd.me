# The voice finder

Status: built 2026-09-28. On wherever `OPENAI_API_KEY` is set, unless `ADHDME_VOICE=0` (founder,
2026-09-29: voice on by default). The finder's AI or Standard choice (below its box, kept on the
device) decides per person: AI talks through this finder, Standard's microphone is dictation.

## What it is

The finder's microphone opens a spoken conversation, after ChatGPT's voice mode (founder: "talking
to ChatGPT voice, which progressively asks you questions (max 8 follow ups) and then reveals the
clinician matches"). The screen is Javi0108/VoiceChatGpt-Prototype's (founder: "make it exactly
like this"): the orb and one stop button. The app asks one short question at a time, at most 8
after the first answer; the request is the person's own answers, each its own sentence; the finder
ranks on it exactly as it ranks a typed one, and the results arrive where the orb was.

### The app asks (O263, 2026-09-30)

Until 2026-09-30 the realtime model chose each question. The calls on record show what that cost: it
thought aloud ("let me ask one more small question"), asked two questions before one was answered,
put a city nobody had said into a question ("someone in Perth?"), cut in on a person who had paused
mid-sentence, and never asked what was hard at work of a person who had asked for help at work. The
founder, that morning: "there should be more standardized questions, like asking someone from your
culture … Should also have asked for more detail about what the struggle at work is."

The questions are now the app's, in fixed words and a fixed order (`src/voice/plan.ts`):

| Question | Said | Skipped when |
| --- | --- | --- |
| opening | "Hi. What kind of support are you looking for?" | never |
| detail | "What's hardest at work?" (or with school or study, at home, in your relationship, with other people), or "What would you like help with?" when the first answer names no help | the first answer says what it wants (an assessment, scripts, a dose), or already names two things that are hard |
| place | "Where are you, or would telehealth suit you?" | a place or telehealth has been said |
| lived | "Would you like someone who has ADHD themselves?" | already asked for |
| culture | "Would you like someone from your own culture?", then "Which culture or language?" of a yes that named none | a culture or a language has been named |
| extra | "Is there anything else a clinician should know?" | never |

Each sentence is a recording in the call's own voice (`public/voice/*.mp3`, made and heard back by
`scripts/voice-clips.mjs`, listed in `src/voice/clips.json`), played by the browser the moment it is
due. Where a recording has not arrived the model says the sentence, exactly, with no conversation
behind it to colour it.

### Each answer is heard three ways (O264, 2026-09-30)

For some hours each answer was read by rules: twenty patterns for yes, no, "say that again", "show
me who fits", a culture's name, a place. The founder's next call broke them at once. The transcriber
wrote his yes to the culture question as "ja ta pi grejda"; the rules took it for an answer; nobody
asked him which culture; and his complaint about that, at "anything else a clinician should know",
was written into the request. Rules for speech are the same whack-a-mole as a phrase lexicon.

Now, from the moment the person stops:

1. The transcriber (`gpt-4o-transcribe`; the smaller model wrote "Oh, Sydney" as "Hello, Sydney")
   writes the words and says how sure it is of them. Under `SURE` (0.5) the words are words nobody
   said: clear speech scores 0.89 to 1.00, and the same speech under noise comes back as fluent
   sentences ("The sky is blue", "He is a good guy") at 0.01 to 0.31. The call says it did not catch
   that, and asks again.
2. The model, hearing the same audio, fills a form of eight fields (`FORM`): understood, a yes or a
   no, a request to hear the question again, a request for the matches, a place, telehealth, a
   culture, a language. Only what was said. A plain yes or no to a question that asks for one waits
   for no form. Measured on the founder's own utterances and the ways people say yes and no
   (`scripts/voice-form.mjs`): 211 of 213 fields right, heard as audio.
3. The words go to the model with one question, answered in a word: do they say danger? Nothing
   waits on the answer; "danger" stops whatever is being said, and the numbers come first. Asked
   as a field of the form it raised the alarm on "my son hits his sister" and missed "I don't see
   the point in being alive" two times in three; asked this alone, of the words, it missed none.

The code reads the three and decides what is said next (`src/voice/plan.ts`): a yes to the culture
question with no culture named is asked "Which culture or language?"; a place named in the first
answer skips "Where are you?"; the part of life is read from the words ("at my job", "at uni").
Each answer's hearing is on the record beside the words (`heard {"sure":0.97,"place":"Sydney"}`).

An answer belongs to the question the person last heard in full (60% of it played). Words said over
the start of a question are the rest of the answer before, and the question is asked again. The
finder's own voice in the microphone is three words or more that are all in the sentence last said,
in its order; or any words of a sentence that the same sound cut short ("Where are"), and that
sentence is then said through, whatever the microphone hears.

The request is the person's free answers in their words (the first, "hardest at work", "anything
else"), and their answers to the finder's yes-or-no questions in the finder's words ("someone who has
ADHD themselves", "someone from my own culture, Indian", "telehealth is fine"). A yes, a no, a place
and a garble never reach it as text: "Hello, Sydney" and "ja ta pi grejda" are on the record and not
in the request.

### Verified on production (2026-09-30, commit d57e26ef)

Four calls from a fresh browser: the first sound 0.28 to 0.37 s after the tap, the channel open at
2.6 to 3.7 s. The founder's call replayed with real audio (journal row d1a7695f, `revealed`, five
questions, 80 s): "With someone that would help me at work." / "What's hardest at work?" / "With my
needs with focusing." / where / lived experience / culture / anything else. Heard: Getting organised,
At work. Shown: Alex Lawson, Kate Dallimore, Donna Italiano, Erin Lysle, Romney Taylor. The call cost
$0.0005 for the model and about $0.004 for transcription.

| Part | File |
| --- | --- |
| The questions, their order, what each answer adds to the request | `src/voice/plan.ts` |
| What the model is told, its one tool, the danger check's wording | `src/voice/interviewer.ts` |
| The conversation: who holds the floor, which question an answer belongs to, what is said next | `src/voice/conversation.ts` |
| The recordings and their loader | `public/voice/`, `src/voice/clips.json`, `src/voice/clips.ts`, `scripts/voice-clips.mjs` |
| The call: WebRTC, the data channel, the recordings played, loudness | `src/voice/link.ts` |
| The scripted call for e2e, the text budget and audits | `src/voice/fake-link.ts` |
| The call route: the browser's offer to OpenAI, the key never leaves | `app/api/voice/session/route.ts` |
| The screen, the orb (the prototype's sphere visualizer, MIT, in WebGL2) | `app/finder-stages/voice-stage.tsx`, `voice-orb.tsx`, `app/voice-orb/` |
| The record: every turn, the request, the place, how it ended (founder, 2026-09-29) | `src/db/finder.ts` (`voice_calls`), read back by `scripts/voice-transcripts.mjs`; a scripted call also lands whole under `qa/voice/runs/` |

## Guards

- **The cap is the client's.** The plan has six questions after the first; the call never asks a
  ninth, and a question is said again at most twice (after "Sorry, I didn't catch that", a request
  to repeat it, or an answer to the person's own question). Unit-tested to the question.
- **The request is the person's words**, each answer its own sentence. The finder's words stand in
  for a bare yes ("someone who has ADHD themselves", "someone from my own culture, Indian",
  "telehealth is fine") and for what a person names as hardest in answer to the detail question
  ("deadlines" reads as help with focus and getting things done). Nothing is added to "anything else
  a clinician should know". "specialist" never reaches the screen. The place is the suburb or
  postcode alone.
- **Urgent help** opens from the person's own words through the safety rules (self-harm,
  hopelessness, danger), and from the model's silent check on each thing said
  (`qa/voice/safety-check.md`: no false alarm in 84, no miss in 48). Whatever is being said stops,
  the contacts open, the numbers are said once, and the call asks whether to keep looking. The app
  header, with Urgent help, stays on the screen.
- **The transcriber is told the language and nothing else.** A prompt is text it recites on
  silence as the person's words (R18).
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

- `scripts/voice-eval.mjs`: the conversation against thirteen personas, headless, no browser.
- `scripts/voice-call.mjs`: a real spoken call from Chromium, its microphone a WAV built by macOS
  `say` from the lines given; `CONNECT_ONLY=1` times each step from the tap to the first sound and
  the open channel; `LEAD=3` has the person begin three seconds after the microphone opens.
- `scripts/voice-safety.mjs`: the silent danger check, put ordinary answers and dangerous ones.
- `scripts/voice-clips.mjs`: records a sentence that was changed, and hears it back before keeping it.

### Drift on the record (`scripts/voice-drift.mjs`)

The text eval simulates the model; the calls on record are what it said. `node --env-file=.env.local
scripts/voice-drift.mjs` reads every call under `qa/voice/runs/` and, with the Supabase variables,
the `voice_calls` table, and flags an assistant question that asks two things, joins them with
"or" outside the given wording, adds a choice or an example, says what it is about to do, or runs
past fifteen words. Measured 2026-09-29 over the six production calls of the day: the three before
the interviewer's rewording, 15 questions and 6 flagged; the three after, 15 questions and 1 flagged
("Does anything matter to you about the clinician, like their approach or background?"). The
residual is the realtime model adding an example to the one open question; the text eval passes it
11 of 11.

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

## Cost and speed (live, 2026-09-30, the app asking)

The founder, 2026-09-30: "there is load time for when you open the AI orb."

| From the tap | Before (production, the model saying the question) | After (local build, the recording) |
| --- | --- | --- |
| The microphone open | 0.27 to 0.41 s | 0.26 to 0.39 s |
| The first sound | 3.5, 7.4 and 12.8 s (three calls that morning; 3.8 s the night before) | 0.26 to 0.40 s (nine calls) |
| The offer sent | 0.29 to 0.45 s, before the browser's routes were gathered | 0.40 to 0.47 s, with them |
| The channel open | 2.5, 3.4 and 11.7 s | 2.2 to 3.4 s in six calls, 4.5 s in one |

- The tap starts the microphone, the call and the recordings' loader together. The opening sentence
  (2.5 s) plays as soon as the microphone is open, while the call connects behind it.
- The offer waits for the browser's routes (0.1 to 0.15 s; at most 0.7 s). Sent without them, each
  layer of the connection waited out a lost first packet (ICE, then DTLS, then SCTP, in steps of one
  and two seconds: 4.0 to 8.5 s to open in six calls). With them the channel opened 1.3 s after
  OpenAI's answer in six calls of seven. Eight samples on 2026-09-28 had shown no gain; the two
  days' measurements disagree, and the cost is a tenth of a second.
- A recorded greeting was weighed on 2026-09-28 and refused, because a person might answer before
  the line is open. Two calls where the person began 2.9 s and 3.3 s after the microphone opened,
  the moment the greeting ended, were heard whole. For the call that is not, the browser listens to
  its own microphone until the connection carries it: a voice in that gap is answered with "Sorry, I
  didn't catch that" and the question again, once the call opens.
- The next question starts 0.0 to 1.1 s after a spoken answer stops (the words must arrive first).
- A whole spoken call of 85 s: $0.0005 for the model, which says nothing, and about $0.004 for
  transcription. A simulated call: $0.0014 (26 calls), where it was $0.009 to $0.0115.

## Evaluation (`scripts/voice-eval.mjs`)

Thirteen personas played by gpt-5-mini from a hidden brief (an adult, a parent, a stable patient
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
| 8 | 10/11, then 2/2 on the two that ask back (a postpartum persona added) | R15: questions asked in their given words with no choices in them; the manner question skipped once answered; a life stage kept in the person's own word; after one double question ("… and is telehealth better?"), one question mark a turn |
| 14 | 10/13 (the three misses the old reader's: "no re-assessment" read as an assessment ask, "sensory/attention stuff" too, a child lost to the model's vote) | O264, the form. The founder's call of 10:53 replayed with real audio: "Yes, I want someone from my culture" is asked "Which culture or language?", "Indian" is heard, and the request reads work, focus and cultural background. What the eval still misses is the matching reader, which the next unit replaces |
| 13 | 8/13, 10/13, then 26/26 (each persona twice; questions p50 3; $0.0014 a call) | O263, the app asking. The first run found four things. The model's danger check, asked to call `urgent_help`, called it on "Yes, that would be helpful." in two calls, and the crisis numbers were read to people who had agreed to a question: the check answers in one word now, given the question with the words. The finder's paraphrases were being added to "anything else a clinician should know" ("he gets overwhelmed easily" became "help with stress and overwhelm"): nothing is added there now. A person who only asks questions looped: a question is said again at most twice and the model answers at most three. An answer that was neither a yes nor a name was read as asking for a culture. The second run found "understands adult ADHD" read as an assessment ask (the bare word stands down where ADHD is only what the clinician should know) and the evaluation's own advice pattern matching a refusal. `asker` no longer expects bulk billing of "cost matters" |
| 12 | 11/13, 11/13, 10/13, then the run recorded in the commit, with a `work` persona ("help at work with focus and getting things done") added | O261 and the composition rules of the small hours (RCA-NIGHT-2026-09-29.md, stage 2): questions asked of the assistant leave the request, a yes that opens its own request is that request, filler after a yes goes, a non-English answer reads through the model's English request. The misses left are the grader calling a quoted phrase invented and the realtime model's own drift |
| 11 | 11/12, 11/12, 11/12 over three runs (first word p50 1.0 to 1.25 s, p90 1.8 to 2.0 s; questions p50 3; $0.009 a call) | The request is the person's own words, each answer a sentence (stage 2 of RCA-NIGHT-2026-09-29.md), read by the same reader as a typed one; the eval's request cap is 250 for a runaway, a rambler's ran to 165 words and read right. Each run missed one persona, each a different one: the first the old 35-word cap; the second `scripts`, whose "stable on Vyvanse … ADHD-experienced" read as an assessment until treatment under way stood the bare words down (O260); the third `advice`, where the realtime model revealed on the person's own question with "I want help finding ADHD care" (its own words, the fallback) and asked nothing: the model's drift, not the reader's, and guarded since: a show_matches before any answer is answered as not shown and the model is told to ask again (`TOO_SOON`). No invented key and no `never` key in any run after O260 |
| 10 | 12/12 (first word p50 1.00 s, p90 1.16 s; questions p50 4; $0.0115 a call) | O257: the two manner questions gone ("How would you like a clinician to treat you?", "Does anything matter to you about the clinician?"), "Would you like someone who has ADHD themselves?" and "Is there a language or a background that matters?" in their place; a `lived` persona added |
| 9 | 11/11 (first word p50 1.15 s, p90 2.02 s; questions p50 3; $0.011 a call) | The same interviewer after O256; a live production call the same hour still added a choice to the clinician question ("like their approach or background?") and said "Let me think" once, which the text eval does not catch: the realtime model's own drift, logged in qa/voice/runs/2026-09-29T09-38-*.json |

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
