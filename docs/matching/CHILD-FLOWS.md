# Two flows for a parent (plan, 2026-09-30)

The living version, with the diagram and the founder's decisions as checkboxes, is the doc
"Two flows for a parent" (claude.ai/code/artifact/57d049b4-9e9d-490a-8b35-d6f6ba7b7872). This file
is its record in the tree, for the code that follows it.

Founder, 2026-09-30: "create comprehensive plan to have a effective flow for someone who is unsure
whether their child has ADHD and is looking for some sort of support but doesnt know what, and
another flow for someone whos kid is having troubles at school (model all likely scenarios) and
wanting specific supports for each scenario".

## Where the app stands today

| What a parent meets today | Measured | What it costs them |
| --- | --- | --- |
| A described child reads as nothing | "our daughter cries over homework every single night" is pinned to read nothing (G7); the model reads child + school one run in two | The parent who describes rather than asks gets the unranked list |
| No child questions | The voice finder asks what is hardest at home, school or with friends only when that part of life is named; never the age, whether a teacher raised it, or a diagnosis | The request lacks the three facts every child pathway turns on |
| The results are a list, not a first step | Names ranked on tags; nothing says what to ask the school, who to see first, what Medicare covers | "Doesn't know what" stays unanswered |

To build on: the 27 tags (`child-adolescent-adhd`, `study-school`, `parenting`, `emotional-regulation`,
`anxiety`, `autism-adhd`, `adhd-assessment`, `executive-function` all apply), one grounded read that
quotes the person, recorded questions, the clarifier, 37 clinicians of whom 7 declare children
(Chantelle Pin, Gisele Fortkamp, Lachlan Avent, Meera Lakhani: psychologists by telehealth; Fiona
Alexander, Debbie Hirte: coaches declaring study; Eliza Keefe: therapy assistant). No paediatrician,
child psychiatrist or speech pathologist; one OT (adults); Dr Anu Saxena holds a Diploma of Child Health.

## The ground (verify each before a sentence of it reaches a screen)

- Diagnosis: "a thorough assessment by an appropriately trained and credentialled clinician" (AADPA
  guideline); in practice a paediatrician or child psychiatrist with parent and teacher rating scales.
- Under 5: parent/family training first, "without the expectation that it will improve functioning
  in other settings". 5 to 17: parent/family training for every family; from 6, stimulants are the
  first medication; changes at school "can help".
- Schools must make reasonable adjustments under the Disability Standards for Education 2005, in
  consultation, with or without a diagnosis (NCCD).
- Medicare: a Mental Health Treatment Plan funds up to 10 psychology sessions a calendar year; a GP
  Chronic Condition Management Plan (from 1 July 2025) funds 5 allied health services a year.
- NSW: trained GPs prescribe ongoing stimulants for people 6+ already diagnosed from 1 September
  2025; GP diagnosis training from March 2026. Other states differ and change.
- Never said by the app: whether it is ADHD, whether medication is the answer, anything about the NDIS.

## Flow 1: "Is it ADHD?"

The child is heard in the first answer ("my son", "our daughter", "year 5", "his teacher"). Three
questions the branch adds, each skipped when the story answered it:

| Turn | The app says | Gives | Skipped when |
| --- | --- | --- | --- |
| 2 | How old are they? | age band: under 5, 5 to 11, 12 to 17 (`age`) | said |
| 3 | What's hardest for them right now? | the trouble in the parent's words (tags) | the first answer named it |
| 4 | Has anyone raised ADHD with you before? | teacher, clinician, nobody, diagnosed (`raised`) | a diagnosis or teacher was mentioned |

Then place or telehealth, anything else. Lived experience skipped for a child (decision).

Three doors, the clarifier's one question ("What would help most right now?") answered by a tap:
"Find out if it's ADHD" (assessment path), "Help at home now" (parenting), "Help at school now"
(Flow 2's scenario question).

| Age band | First steps (the card, 3 lines, ≤ 8 words each) | Who ranks first |
| --- | --- | --- |
| Under 5 | Ask your GP about a parent program · Ask the daycare what they see · Keep a two-week note of hard moments | parenting and child declarers; a GP |
| 5 to 11 | See a GP for a paediatrician referral · Ask the school for a learning support meeting · A parent program while you wait | child-assessing psychologists; GPs with child health |
| 12 to 17 | See a GP for a referral · Ask the school counsellor and year adviser · Study support while you wait | psychologists who assess adolescents; coaches declaring study |

## Flow 2: "Trouble at school"

| # | Scenario | How it sounds | Tags | Who ranks first |
| --- | --- | --- | --- | --- |
| 1 | A teacher raised ADHD; the school wants a report | "his teacher thinks he has ADHD" | adhd-assessment, child, study-school | assessing psychologists; GPs with child health |
| 2 | Disruptive, cannot sit still, suspension talk | "calling out", "a behaviour plan" | child, emotional-regulation, study-school | child psychologists; parenting declarers; OT |
| 3 | Cannot focus or finish; homework fights; loses everything | "homework takes three hours" | executive-function, study-school, child | coaches and OTs declaring study; psychologists |
| 4 | Behind in reading, writing or maths | "two years behind" | study-school (learning difficulties), child | educational and child psychologists; speech pathologist (none listed) |
| 5 | Meltdowns, anxiety, will not go to school | "cries every morning", "refuses to go" | emotional-regulation, anxiety, child | child psychologists; GPs for the plan |
| 6 | Friendships, bullying, lonely | "no friends", "eats lunch alone" | social-connection, child | psychologists; a social skills group |
| 7 | Diagnosed; the school is not adjusting | "they know and nothing has changed" | child, study-school | the treating clinician's letter; psychologists who liaise with schools |
| 8 | Diagnosed; medication wears off at school | "fine till lunch, then gone" | titration, shared-care, child | GP prescribers; paediatric shared care |
| 9 | A transition: starting school, year 7, senior exams | "high school next year" | study-school, executive-function, child | coaches and psychologists declaring study |
| 10 | Sensory and motor: handwriting, noise, uniforms | "can't stand the noise" | autism-adhd (sensory), child | occupational therapists |

Self-harm talk in any scenario: the urgent path the app already has.

| # | Ask the school for | Who to see | At home | Paid for by |
| --- | --- | --- | --- | --- |
| 1 | The teacher's observations in writing, the rating form, a learning support meeting | A GP first, with the school's notes, for a paediatrician referral; a psychologist who assesses children meanwhile | A two-week note; a parent program | GP and paediatrician rebates; Treatment Plan |
| 2 | A behaviour support plan with movement breaks and seating, before any suspension | Paediatrician (assessment); psychologist (behaviour); OT (regulation); parent training first-line | A parent program; unchanging routines | Treatment Plan; Management Plan (OT) |
| 3 | Chunked tasks, written instructions, an agreed homework cap, an end-of-day check-in | Executive-function coach or OT from about 8; paediatrician if undiagnosed | Homework same time, short blocks, one place | Coaches private; OT under the Management Plan |
| 4 | A reading screen and the school's intervention program | Educational psychologist (cognitive and academic assessment); speech pathologist | Ten minutes of reading together daily | Assessments private; speech under the Management Plan |
| 5 | The school counsellor; a return-to-school plan in small steps; a safe person | Psychologist for anxiety via a GP plan; paediatrician if ADHD suspected | Same morning routine; small steps back | Treatment Plan |
| 6 | The wellbeing team; a buddy program; the bullying policy and a written record | Psychologist, or a social skills group | One structured playdate a week | Treatment Plan |
| 7 | A meeting to write a personalised learning plan with adjustments under the Standards; a review date | The treating clinician's letter listing adjustments; a parent advocacy group | Keep the paper trail | The letter is a consult; the plan costs nothing |
| 8 | The school's medication form; hard subjects before lunch | The prescriber for a dose review and longer-acting options | Note when it wears off, for a fortnight | Prescriber consults; PBS |
| 9 | A transition meeting; a one-page profile; exam provisions applied for early | Coach or psychologist for organisation in term one; paediatrician review | A visual timetable; a week-three check-in | Coaches private; Treatment Plan |
| 10 | Typing instead of handwriting, seating, headphones, uniform flexibility | An occupational therapist | A fidget and headphones at homework | Management Plan |

The card says the first line of each column, in the app's own words about steps, never about the child.

## What the product changes

1. The reader's child mode (`src/lib/matching/llm-read.ts`): a described difficulty is an ask when
   the request is about a child; two examples; the child corpus sentences re-pinned; a
   `learning-difficulties` tag if chosen.
2. The voice plan's child branch (`src/voice/plan.ts`): three recorded sentences, the child heard
   from the first answer, `age` and `raised` in the form, `compose` writing them in the parent's
   words, lived experience skipped for a child.
3. First steps above the list (`src/finder/first-steps.ts`, `results-stage.tsx`): a pure function
   from (child, age band, raised, tags) to a scenario, ten scenarios with three lines each and a
   "more" sheet; nothing when no scenario fits.
4. The three doors in the clarifier (`src/matching/clarify.ts`).
5. The roster: `paediatrician`, `speech-pathologist`, `educational-psychologist` in the professions
   vocabulary; recruit one of each, a child OT, a second Sydney child psychologist; ask the four
   child psychologists which scenarios they take.
6. The data: eight child personas in `scripts/voice-eval.mjs`, thirty corpus sentences, the numbers
   in every commit, each persona replayed on production before the flows are called done.

## Word budgets

"How old are they?" 4 · "What's hardest for them right now?" 6 · "Has anyone raised ADHD with you
before?" 7 · the door question and its three taps 19 (in the sheet) · the card ≤ 24 + a 2-word
heading, the results screen ≤ 60 with it (34 today; the chips row drops to three when the card
shows) · the "more" sheet ≤ 60 on its own.

## Build order

1. Personas and pins (½ day, $0): the personas fail today, on record.
2. The reader's child mode (½ day, ~$0.40): `pnpm match:eval --live` passes; every child sentence reads child + its scenario's tags.
3. The voice branch (1 day, ~$0.20): 12 of 12 personas; Priya's call four questions, Dan's three.
4. First steps and the doors (1½ days, $0): every results screen ≤ 60 words with the card; the e2e walks Priya and Dan to their cards.
5. Production and the roster (½ day, then outreach): each persona replayed on production with real audio; the record shows the card's scenario beside each search.

## Decisions (defaults the build takes unless told otherwise)

- A described child is an ask (children only; adults keep G7). Default: yes.
- A `learning-difficulties` tag. Default: add it.
- Skip lived experience for a child. Default: skip.
- Ask about cost. Default: no; the Medicare line lives in the sheet.
- School-ask lines as the app's own words about steps, no scripts or letters. Default: steps only.
- Paediatricians: add the profession now and recruit. Default: yes.
- Where the flows start: the finder as it is, no "For your child" button. Default: the finder.
- The NDIS: not mentioned. Default: not mentioned.
- Under-fives: the same questions; the card's first line is a parent program. Default: yes.

## Sources

AADPA guideline executive summary and parent/family training pages; NCCD "what's reasonable" and
"consulting on adjustments"; APS Medicare FAQs and a PHN note on Better Access; Services Australia
on the GP Chronic Condition Management Plan; the NSW Government release on GP diagnosis and the NSW
ACI FAQ. Links in the living doc. To verify: each state's rules, fees and waits by region, school
terms by state, free parent programs, exam provisions.
