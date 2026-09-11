# The finder as an ecosystem: against Charmaine Bernie's findings

Market-validation call, 11 September 2026: Krish Ganesh with Charmaine Bernie, occupational
therapist and researcher in autism and ADHD service access and wait-list experience, PhD supervised
by two co-authors of the Australian ADHD clinical guidelines. Her notes are the source for
everything below; the founder's direction on reading them was "make the finder ecosystem visually
look more effective and make sure it works to help connect multidisciplinary care needs, make sure
these key features have been implemented".

This file is the audit and what it changed. Findings are hers; the verdicts are measured against
this tree at the build of 2026-09-11.

## Her two core drivers

1. **Identification and navigation** — "helping people work out what they actually need and how to
   access it". People land on the wrong waitlist for years: children misrouted onto autism
   assessment lists for two years when it was never the right pathway. She tested "which GP can
   diagnose ADHD" herself and found very little useful, even with AI tools — direct validation of
   the product's core problem.
2. **Support in the interim** — while waiting, support does not have to be clinical therapy:
   knowledge-sharing, coaching, self-paced education, asynchronous programs.

## What was already here

| Her action point | In the tree | Where |
|---|---|---|
| Interim, non-clinical support while waiting | **Yes**, and it is most of the product: twenty bean runs, the Chaos Run, Leo, nineteen strategy modules, the toolkit, a quiet moment | `app/play/`, `src/learn/runs.ts`, `src/lives/` |
| Free / low-cost interim evidence-based tools | **Yes** — everything above is free and device-local | — |
| Non-medication alternatives weighted, not medication-only | **Yes** in the vocabulary: eleven professions including psychologist, counsellor, occupational therapist, ADHD coach, exercise physiologist and a university support service, each with what it is for | `src/support/professions.ts` |
| Allied-health matching during wait times ("a wonderful project") | **Yes** — problem fit reorders allied providers on the person's top need, and scope stays a hard filter | `src/support/problem-fit.ts` |
| Crisis pathways exist at all | **Partly**: nine safety rules with Lifeline, Beyond Blue and 000, but reachable ONLY by writing a reflection that tripped one | `src/model/safety.ts` |
| Practical, everyday framing over abstract goal-setting | **Yes** in the games and modules ("get through the lecture, the tutorial, the assignment" is the shape of the university-adhd expertise tag and the run content) | `src/learn/runs.ts`, `src/support/professions.ts` |

## What was missing, and what this change did

### 1. Crisis signposting was reactive, not always-visible

Her word for always-visible signposting was **non-negotiable**, given comorbidity rates and the
elevated youth mental-health and suicide risk in the 16–25 cohort this product is for. The app had
the numbers and reached them the wrong way round: a person had to write something that matched a
regular expression before the app would show them Lifeline.

**Now:** `/urgent` — 000, Lifeline, Kids Helpline and Beyond Blue, each a row that dials, reachable
from the header of every patient screen. It asks nothing, reads nothing and records nothing. The
services are one register (`URGENT_SERVICES` in `src/model/safety.ts`) beside the rules that quote
the same numbers, so the two cannot drift. The header link is an accent pill, not a red banner: it
has to be found by somebody not looking for it without being a permanent alarm over their app.

### 2. The finder showed one list, not an ecosystem

This is her first driver, and the finder was answering a different question. A search returned one
undifferentiated column — on the measured example, four GPs and one psychiatrist — with the
profession printed small on the rows that were not GPs. A person could not see that a psychologist,
a counsellor and an occupational therapist were all in the answer, so they could not choose between
them, which is the choice the whole wrong-waitlist problem turns on.

**Now:** a band of the kinds of care the search actually reaches sits above the list, as a
segmented selector rather than a second row of filter pills (the strip above it is preferences —
bulk billing, telehealth — and two identical pill rows read as one long list of filters). Each kind
narrows the list to it; picking it again clears it. Measured: a search for an adult assessment
offers GPs (22), psychologists (2) and counsellors (2); picking psychologists takes the list from
five rows to two, and the heading changes from "All listed providers" to "Listed psychologists",
because a heading over a filtered list has to say what the list is.

Nothing is invented. The professions are the roster's own, the order is the person's words first
(`professionsMentioned`) and then how many of each the search found, and the counts are taken
before the profession filter is applied so no kind on the band is a dead end.

The band costs three words on a screen that measured exactly 60 against the tree's 60-word ceiling.
The founder's call was to raise this one screen's ceiling to 72 rather than delete the navigation:
see `CEILING` in `scripts/text-budget-lib.mjs`, which records the reasoning and keeps every other
screen at 60.

### 3. The page that says "start from the problem" asked for a questionnaire first

The finder's welcome screen offers **"Start from the problem"**, which is this product's whole
thesis and her first driver in four words. It led to `/support`, which renders a ranked walk —
the problem, what may help, what to try, when another person helps, which professions and why,
each with `typicallyFor` and `whenToExplore` and a link into the finder narrowed to it. Good, and
gated: it renders only once the personal model has derived a need, which means only after the ten
onboarding questions.

Everybody else — every first-time reader, which is everybody at the moment that link is most
useful — saw: *"Nothing to walk from yet. Answer the ten questions and the path fills in."* A
questionnaire, in answer to "I do not know what I need". That is her identification problem served
back to the person who has it.

**Now:** with nothing known, the page is the kinds of help themselves. Six rows, each a name and
what it is for in three or four words, each opening the finder narrowed to that kind; the
remaining five are one tap away. The ten questions are still offered and still produce the better,
ranked version — they are an offer now rather than a toll.

It claims no order, because it has not earned one (the taste sheet's honesty gate): the ranked
version says "In order of fit for this problem", this one says what each kind is for and nothing
about which is yours. The short lines live in the register beside the long ones
(`inAWord` in `src/support/professions.ts`), each the compressed first clause of the
`typicallyFor` above it rather than a new claim, and swept by the same patient-copy lint.

Measured: `/support` went from 25 words of a dead end to 39 words of an answer — under the
40-word target, not merely the ceiling.

## Not done, and why

These are hers, they are real, and they are not in this change. Each is a piece of work rather than
a gap somebody forgot.

- **A communications / check-in engine** (her cadence: 6 months, 12 months, 2 years; a proactive
  contact at the promised time whether or not a service can be offered yet; "breached promises
  erode trust quickly"). This product holds no account and sends no message to a patient — there is
  no identity, no address and no server-side record of a person — so the engine is not a screen but
  a decision about what the product is. It is the single largest item on her list.
- **Wait-time transparency on a provider.** Deliberate, and not an oversight: `src/directory/profile.ts`
  refuses `waitTime` as "a performance claim about a practice, derived from data whose completeness
  the product cannot vouch for". Her point is about communicating a wait honestly, which is
  compatible with that refusal, but publishing a number the tree cannot stand behind is not.
- **A triage layer at intake** that routes to the right list the first time. Three of its four
  parts are now here — the kinds a search reaches, what each kind is for, and a cold page that
  answers rather than asks — but the fourth, asking the two or three questions that actually
  separate pathways before any list is shown, is a flow, not a component.
- **Narrowing the whole product's language to 16–25.** Her strongest recommendation, and the one
  with the widest blast radius: every screen's copy, the onboarding, the games' framing. Worth doing
  deliberately rather than as a side effect of a design pass.
- **Weighting psychology and coaching above medication in the ranking.** The professions exist and
  problem fit already reorders allied providers; changing the ranking's weights is a matching-engine
  change with its own oracle tests (`src/matching/`), not a UI one.

## Verification

| Check | Result |
|---|---|
| Unit suite | 4,016 passed, 267 files |
| e2e `finder-flow` (16 tests, the flow this change touches) | 16 passed |
| Axe, WCAG 2.1 AA, on the surfaces this change added: `/urgent` at 390 and 1280, the results band at 390, the band with a kind picked | clean — after one finding it caught and this change fixed: `role="group"` on the band's `<ul>` overrode the list semantics and left three `<li>` with no list parent |
| Sideways scroll at 320, 360, 390, 430, 768 and 1024, on `/`, `/today` and `/urgent` | none — after one finding it caught: the urgent pill made the header 30px too wide at 320px, so below 360px the header keeps Urgent help and drops "Help & answers", which the settings sheet already carries |
| Text budget, 32 app screens | 0 over; median 30; `/support` 39 and `/urgent` 37, both under the 40-word target; the finder's results 63 against its raised ceiling of 72 |
| e2e `finder-flow`, `app-shell` after the cold support path | 36 passed |
| The header at 320, 360, 390, 430, 480, 768, 1024 and 1280 | no sideways scroll, urgent help present at every width, "Help & answers" from 480 up — it wrapped onto two lines inside a 75px header at 360 and 390, and the gear beside it opens the same `/faq` |

Captures for this change are in `qa/` per the review procedure; the games' own captures stay
uncommitted (`qa/games/` is ignored).
