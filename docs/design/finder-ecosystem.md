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

### 4. Six months of silence looked exactly like day one

Her second driver is what happens *while* people wait, and her sharpest point is about the
communication rather than the wait: "breached promises erode trust quickly — if a quoted wait time
passes with no contact, people become angry", and simple, honest, consistent communication builds
trust cheaply. Her recommended cadence for confirming somebody still needs a service, and has not
already found care elsewhere, is roughly **six months, twelve months and two years**.

Opening this app after six months showed exactly what day one showed. Nothing acknowledged that
half a year had gone by — which is the silence she described, rendered.

**Now:** a checkpoint takes the Today card when one is due. It says how long it has been and asks
where they got to: *Still looking* (which records the answer and takes them to the finder, because
that is the useful thing for somebody who says it), *Found someone*, or *Not now*. The clock starts
at onboarding, the first moment the device holds anything about this person.

Three behaviours worth naming, each with a test in `src/model/checkpoint.test.ts`:

- somebody returning after **thirty months** is asked the two-year question **once**, not walked
  through a queue of three;
- **"Found someone" ends the checkpoints for good** — the review exists partly to learn that
  somebody already found care, and asking again after they say so is the opposite of listening;
- **"Not now" skips only its own checkpoint**; the next one still comes.

**Half of her recommendation, and the header of `src/model/checkpoint.ts` says which half.** The
proactive contact — arriving at the promised time whether or not a service can be offered — needs a
channel this product does not have, and that is below. This is the half that can be done honestly
without one: stop pretending no time has passed. It makes no promise about a wait, because the app
holds no waitlist and no place for anybody; it asks.

Measured: `/today` with a checkpoint due is 14 words.

### 5. Nothing separated the pathways before the list

This is the fourth part of her triage layer, and the audit above recorded it as the one still
missing: "asking the two or three questions that actually separate pathways before any list is
shown, is a flow, not a component". Three parts were here — the kinds a search reaches, what each
kind is for, and a cold page that answers rather than asks — and all three help somebody who is
already looking at a list. Her evidence is about the people who never should have been looking at
that list: children left on an autism assessment waitlist for two years when it was never the right
pathway, and her own test of "which GP can diagnose ADHD" that found very little useful.

**Now:** `/first-step`, reachable from the finder's welcome — the screen before any list — and from
the cold `/support`. Two taps:

- **Who is this for?** Me, or a child or teenager. The coarsest fork there is, and the one her
  misrouting evidence is literally about.
- **Where are you up to?** Still finding out, on medication and sorting the dose, or the day-to-day
  is hard.

Six answers, each a kind of professional and the thing to ask them for. Four of the six go through
a GP, and that is the Australian shape rather than a flat table: the GP is the gateway to an adult
assessment in NSW and Queensland and to a paediatric referral everywhere, so the useful thing a
triage can tell most people is WHAT TO ASK FOR when they get there — *"ask for a paediatrician who
assesses ADHD, by name"*, with *"the autism assessment list is a different list"* under it. The two
that do not go through a GP are her second driver: a psychologist, an OT or a coach, without a
referral, because none of it waits on an assessment.

**Two questions, not three, and never ten.** `src/matching/clarify.ts` already states the rule this
obeys — a question earns its place only if the answer changes the answer — and a test asserts both
questions move somebody somewhere, so neither can decay into decoration. §3 above is why the
ceiling is two taps: the version of this page that asks first is the identification problem served
back to the person who has it, and a third question that changes only the wording on the card would
be a toll on exactly the reader who came here because they did not know where to start. For the
same reason the cold `/support`'s "not sure" line now offers the two questions rather than the ten
— the onboarding is still offered on Today, in the tab bar and in the settings sheet.

**It routes, it does not diagnose.** Every row names a kind of professional and a thing to ask for;
nothing decides whether anybody has ADHD. The patient copy linter proved that was not merely an
intention — it rejected three strings on the first run ("prescribes", "diagnosis" twice), and the
table is swept by it in `src/support/pathway.test.ts` before a word reaches the screen.

Measured: 9 words on the first question, 18 on the second, 28 on the answer. Nothing is remembered:
the two answers write one filter into the finder and are gone.

## Not done, and why

These are hers, they are real, and they are not in this change. Each is a piece of work rather than
a gap somebody forgot.

- **The reaching-out half of the check-in engine.** The cadence and the question are now in the
  product (above), but they only arrive when somebody opens the app. A contact that arrives at the
  promised time *whether or not they open it* needs an identity, an address and a server-side record
  of a person, none of which this product has — so that half is a decision about what the product is
  rather than a screen, and it stays the largest item on her list.
- **Wait-time transparency on a provider.** Deliberate, and not an oversight: `src/directory/profile.ts`
  refuses `waitTime` as "a performance claim about a practice, derived from data whose completeness
  the product cannot vouch for". Her point is about communicating a wait honestly, which is
  compatible with that refusal, but publishing a number the tree cannot stand behind is not.
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
