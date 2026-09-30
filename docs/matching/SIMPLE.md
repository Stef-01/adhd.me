# The matching reader, made simple (R19, 2026-09-30)

The founder, 2026-09-30: "this should be very simple, not overengineered. Why are these basic
failures happening? Do a complete refactor of the system optimising for simplicity, explicitly name
what the failures are, and do thorough research online to find simple repos that have solved these
issues for their matching systems."

This document is the answer. §1 names the failures, each with its root cause. §2 is what the research
found. §3 is what the system is now. §4 is what was measured. §5 is what was deleted. §6 lists the
decisions that are the founder's.

## 1. The failures, named, with root causes

Every one of these is a real event from the founder's own calls and searches on production (the
journal rows are in `qa/matching/rca.md`, R15 to R18, and in the voice finder's notes).

| # | What happened | Where | Root cause |
| --- | --- | --- | --- |
| F1 | "help at work … with focusing" was read as **Non-medication supports** (07:49 AEST) | the lexicon | "coaching", "strategies first", "psychological approaches" were cues for `care:non-medication` with no word about medication beside them. A phrase list cannot tell "I want a coach" from "I don't want tablets". |
| F2 | "help at work" was read as **emotional regulation** ("workplace stresses" → `care:emotional-regulation`) | the lexicon | "stress" was a cue for emotional regulation. The cue fired on the word, not on what was asked for. |
| F3 | "ADHD coaching" and "minimal reassessment" were read as an **assessment** ask; a person already diagnosed was sent assessors | the lexicon | "ADHD" and "assessment" were cues for `care:adhd-assessment` wherever they appeared; negation and "already diagnosed" were patched case by case (`suppressedByDesireNegation`, `REASSESSMENT_SPARED`, `ADHD_HELP`), each patch a new special case. |
| F4 | "Exercise based" was read as non-medication; "Someone to help find practical strategies" as non-medication | the lexicon | the same as F1: an alternative to medication was inferred from words that never mention medication. |
| F5 | The model reader read a `never` key in one request of seventy, and a different one each run | the votes | three reads of gpt-5-nano, a key kept when every read gave it, then checked by three more calls. Three small samples voted is still a coin: the P4 gate failed at 1.4%, then 2.6%, then passed at 0.0% with no change in the prompt between two of the runs. |
| F6 | The reader returned **keys, not words**: "From your words" showed a key or a lexicon phrase, never what the person said | the schema | the model was asked for a list of tag ids. It had nowhere to put the evidence, so nothing could check it, and nothing could show it. |
| F7 | A short request was **not read by the model at all** ("An adult ADHD assessment, telehealth, not rushed" → `read_source: lexicon`) | `src/finder/read-policy.ts` | a rule skipped the model for requests of ten words or fewer that the lexicon had heard, to save a call. The lexicon's misreads (F1 to F4) went out unchecked on exactly the short requests people type most. |
| F8 | "Yes, I want someone from my culture" → the app did not ask **which** culture (10:53) | the voice plan | a regex accepted any reply of three words or more as "a culture named"; and the transcriber heard "ja ta pi grejda" for a yes. Fixed in O264 (a form per answer, asked which when a yes names none), and verified on the 02:19 call: "Which culture or language?" → "Indian". |
| F9 | "Yeah, that'd be great. Actually no, it doesn't matter" → the request still asked for lived experience (02:34) | the voice plan | `compose` took any yes to a question; a later no to the same question did not take it back. Fixed today: the answer a question was left at is the one that counts (`settledOn`). |
| F10 | "as a new mother and also going back to uni" → no follow-up question about either | the voice plan | "as a new mother" did not match "as a mother", and "going back to uni" did not match "at uni". Fixed today; the part of life named first is asked about. |
| F11 | The system itself: 10,503 lines of matching code and 7,743 of tests for a reader that produced F1 to F6; a five-phase eval ladder whose baselines had to be re-pinned after every lexicon edit | the design | every failure was met with a mechanism (a cue, a suppressor, a register of refused cues, a register of known false positives, a separation metric, a declaration-state report), and each mechanism protected the last one. The corpus pins were written to what the lexicon hears, so L0's recall was 100% by construction and the ladder gated the model against the lexicon's own mistakes. |

The pattern under F1 to F6: **a phrase lexicon reads words, not asks**, and a model asked for bare
tags cannot be held to anything. The pattern under F11: fixing the lexicon's misreads one phrase at
a time grows the lexicon and never ends.

## 2. What the research found

Three families of open-source work solve this shape of problem simply.

1. **Grounded extraction: every tag quotes its evidence.** `google/langextract` (Apache-2.0) extracts
   structured entities from clinical and other text with one rule that makes it trustworthy: every
   extraction carries the exact source span it came from, and an extraction that cannot be mapped to a
   span is not an extraction. `567-labs/instructor`'s "exact citations" example does the same in a
   Pydantic validator: a fact whose quote is not a substring of the source is rejected at parse time.
   The same idea, older, is the evidence-span requirement of clinical NLP shared tasks. The lesson:
   ask the model *where in the text it saw it*, then check that mechanically.
2. **Structured voice flows: the app asks, the model hears.** `pipecat-ai/pipecat-flows` and Daily's
   writing on it: a voice agent that must collect known fields is a state machine of fixed questions
   with a function-call per answer, not a free conversation. The model fills a form; the code decides
   what to ask next. ADHD.ME's voice finder was moved to this in O263/O264 (`src/voice/plan.ts` holds
   the questions and recorded clips; the model answers a `heard` form per answer).
3. **Simple scoring: hard filters, then a weighted sum with a breakdown.** `jmadilia/care-match` and
   `ShawnYS-codemtl/nursing-mentorship-matcher` (`calculate_match_score → (score, breakdown)`) rank a
   roster with a handful of weighted booleans and return the per-criterion breakdown beside the score,
   which is what makes a rank explainable. Neither has a tiered comparator or a manner dimension. This
   is the direction for the ranker (§6, decision 2).

Nothing found reads care needs from free text with a phrase lexicon and votes over small models.

## 3. What the system is now

One call, one rule.

```
request text ──► gpt-5-mini, one call, strict JSON ──► [{tag, quote}]
                                                            │
                                    quote must be a substring of the request (case-folded)
                                    tag must be one of the 27 care and preference tags
                                                            │
                                                            ▼
                                       needs, each with the person's words ──► ranker ──► "From your words: …"
```

- `src/lib/matching/llm-read.ts` (189 lines): the 27 tags with one meaning line each, 20 examples
  in words the corpus does not use, a strict schema `{needs: [{tag, quote}], unlisted}`, `grounded()`
  (a tag whose quote is not in the text is dropped and counted), and the lexicon as the fallback for a
  failed call, marked `source: "lexicon"`. Languages are read by name, deterministically. No votes, no
  checks, no manner traits.
- `app/api/finder/read/route.ts`: `POST {text}` → `{needs: [{key, quote}], source, unlisted}`. Every
  non-empty request is read; `read-policy.ts` is gone. Caching, rate limit, daily cap and key pause
  are as before.
- `app/finder-read.ts`: builds the ranker's needs with `needForKey(key, quote)`, so "From your words"
  shows the quote.
- `src/lib/matching/eval/run.ts` (187 lines): `pnpm match:eval` reads every corpus request (dry: the
  cassettes, then each entry's pins; `--live`: the model), scores recall, aspires, precision, never,
  per tag and per class, ranks on two rosters, and writes one report with every fault and its quote.
  Four gates; no phases, no ladder, no pinned baselines. `--sample N` for a quick look.
- The model default is `gpt-5-mini`, set in one place (`modelOf`). On the same corpus, nano read a
  `never` key in one request of nine, mini in one of twenty-two, and mini's quotes are exact.

## 4. What was measured

Corpus: 709 requests (531 graded corpus sentences plus 178 probes), all read live, flex tier, one
call each, $0.18 a run, $0.00025 a call.

| Run | Prompt | Recall | Aspires | Precision (lower bound) | Never | Strays | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | ef271311e9b2 | 89.5% | 94.1% | 82.3% | 3.6% | 37 | first read; 37 strays were mostly "don't rush me" → longer appointment and manner asks → trauma-informed |
| 2 | a2d2c96f8107 | 89.3% | 89.3% | 90.7% | 2.7% | 12 | "how they want to be treated is no tag"; meanings tightened |
| 3 | 63ae126f02a4 (final) | **91.8%** | **94.0%** | **90.8%** | 4.5% (5 of 110) | 18 | assessment named without "ADHD" counts; a question asking for a thing asks for it |

For comparison, the voted reader's last pass (prompt c717a332d90e, 2026-09-29) was recall 99.5% and
precision 92.7% **against pins written to the lexicon**, with the lexicon carrying every key and the
model only allowed to remove some. The new reader is scored against the same pins with 49 corpus
entries re-pinned as `aspires` where the model's read was plainly right and the lexicon had never
heard it ("get to the end of a thought" → longer appointment; "for our mob health is a shared thing"
→ cultural background; "coaching before tablets" → executive function).

The five `never` violations that remain, every run, are the same five sentences and are a policy,
not a bug (§6, decision 1): "flat for months, everything is heavy", "flat and hopeless most days",
"everything has felt flat for months" (a state described, no help asked; the corpus's G7 rule says
read nothing), "psychological approaches before anything else" (the founder's rule: non-medication
needs a word about medication), and "do any GPs do the whole thing without a psychiatrist referral"
(a question).

On the 24 requests people actually typed or said into production this week
(`scripts/.tmp-real.mjs`, not committed), the new reader:

- reads "Exercise based" as movement and exercise, not non-medication; "Someone to help find
  practical strategies" as executive function, not non-medication; "workplace stresses" as work, not
  emotional regulation (F1, F2, F4);
- reads "I already have a diagnosis and need my ADHD medication continued" as shared care alone,
  every time (F3);
- quotes the person for every tag: `care:cultural-background "understands Indian background"`,
  `pref:longer-appointment "I don't want to feel rushed"` (F6);
- reads the short typed requests the old policy skipped (F7).

## 5. What was deleted

3,937 lines removed, 584 added, in this change.

- `src/lib/matching/llm-read.ts`: three reads, three checks, the vote, `MOST`, `checkInput`, the
  manner vocabulary (from 454 lines to 189).
- `src/finder/read-policy.ts` and its test.
- `src/lib/matching/eval/run.ts`: PHASES P0 to P6, the pass-record chain, flip rate over repeats,
  the cost-per-call and error-rate gates, `mentionsDropped`, `kendallTau`, `flipRate`, `facetScore`.
- `src/matching/declaration-state.ts`, `extractor-quality.ts`, `known-fps.ts`, `refused-cues.ts`,
  `separation-effect.ts`, and the unused slot matcher `match.ts` / `explain.ts`, with their tests and
  their entries in the compliance registers.
- The 12 cassettes now carry the quote schema.

Kept, frozen: the lexicon (`src/matching/needs.ts`, `read.ts`) as the offline fallback and the
level-0 reader, with its tests as regression. No new cue is to be added to it; a misread is fixed
in the model's meaning line.

## 6. Decisions that are the founder's

1. **Described states.** "Flat and hopeless most days" typed into the finder: the corpus's G7 rule
   reads nothing (no help asked); a clinician would hear depression. The model reads it one run in
   two. Default in force: the corpus rule, gated at ≤ 5% so it cannot fail the eval on this alone.
2. **The ranker.** `rankClinicians` still orders by tiers (constraints, then care, then manner, then
   coverage), 1,269 lines, and the manner tier now sees nothing. The research's answer is one weighted
   sum with a breakdown per clinician. Not done in this change; the reader change stands on its own.
3. **Culture the roster mostly shares.** "Caucasian culture" as the answer to "which culture" is
   composed as nothing (O263), so the person's stated answer disappears from the request. Honouring
   it would rank up clinicians who declare cultural-background care, which is the opposite of what
   was asked. Default in force: nothing.
4. **A state as a place.** "In Queensland" resolves to no suburb, so the list is unfiltered by
   distance. Telehealth-first would be the useful fallback for a state or a region.
5. **Latency.** One gpt-5-mini call at low effort is 1 to 3 s on the standard tier; the old policy
   hid this on short requests by not reading them. Every request is now read, behind "Reading what
   you asked".
