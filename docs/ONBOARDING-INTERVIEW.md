# Doctor onboarding: minimal screen, then a conversation that becomes a profile (O22)

**Goal (founder, 2026-08-18):** onboarding as minimalist as possible — after the initial
screen we already have, an interview that collates rich text about the doctor's expertise and
maps it to what a patient would type into the finder.

**The law this designs within:** free text is never published (`src/directory/profile.ts`
refuses bios; `src/onboarding/interview.ts`: *the form is the enforcement point*). So the rich
text is an internal transcript, and everything patient-facing stays closed-vocabulary.

## The flow

```
1. Initial screen (exists)      /clinicians/join — identity, AHPRA number, NSW training,
                                languages, access facts. Two minutes, no prose.
2. The conversation (new)       Founder + doctor, ~20 minutes, recorded as TEXT ONLY into a
                                transcript field in the console. The doctor talks about what
                                they are good at, who they see, how they work. No form on
                                screen — that is what makes it feel like an interview and
                                not an intake.
3. The machine reads it TWICE   `readTranscript` (src/onboarding/transcript.ts, W221) hears
                                clinician speech with clinician vocabulary and proposes
                                facets — it is the proposer. `proposeDeclarations` +
                                `reachGaps` (src/onboarding/expertise.ts, W227) re-read the
                                same words with the PATIENT lexicon: what both readers reach
                                is a declaration patients genuinely ask for; what neither
                                reaches feeds lexicon review as a discovered reach gap.
4. Confirm, per proposal        The interviewer reads each `toConfirm` question back; the
                                doctor answers often / sometimes / not-me — the existing
                                three-state answer, recorded in the existing structured
                                interview (`INTERVIEW` in interview.ts). A proposal is never
                                a declaration; the confirm step is what makes it one.
5. Gap sweep                    Facets the transcript never reached are asked from the
                                structured question list as before. The conversation shrinks
                                the checklist; it does not replace it.
6. Profile                      Declarations render exactly as today. The transcript itself
                                is retained in the console (internal, unpublished) as the
                                provenance record for every declaration.
```

## Why dogfooding the patient lexicon is the design, not a shortcut

- **One vocabulary, both sides.** The doctor's "people can be honest with me about drinking"
  and the patient's "somewhere I can be honest about drinking" are read by the same cues into
  the same facet. When a doctor describes real expertise the lexicon cannot hear, that is a
  discovered gap in PATIENT reach too — widening it improves both directions at once, which is
  the W221 symmetry.
- **Interview quality becomes measurable.** After each onboarding, the set
  `facets confirmed − facets proposed` is the checklist the conversation failed to surface;
  if it stays large across doctors, the conversation prompts (not the lexicon) need work.
- **No new compliance surface.** No free text renders anywhere a patient looks; the copy
  linter's scope is unchanged; the census does not grow.

## What the interviewer's screen shows (console, behind sign-in)

A single column: the transcript textarea, and beneath it the live proposal list — label,
"heard: …", and the read-back question. No auto-accept, no bulk accept. Each confirmed answer
writes the same record a keyboard-first interview writes today.

## Deliberately refused

- **Publishing transcript excerpts on profiles** — the bio refusal, reworded.
- **Auto-declaring from the transcript** — "I don't do titration" contains "titration";
  clause rules catch some negations, not all. The human confirm is load-bearing.
- **Audio recording** — text only. An audio file of a doctor discussing their practice is a
  retention and consent burden the product does not need for any of the value above.

## Build order (each is one unit)

1. `expertise.ts` + tests — DONE with this document.
2. Console onboarding page: transcript field + live proposals + confirm buttons wired to the
   existing interview record.
3. Gap-sweep view: unproposed facets rendered as the remaining question list.
4. Reach report: per-onboarding list of expertise sentences that proposed nothing (the
   lexicon-gap feed, reviewed the same way O13's misses were).
