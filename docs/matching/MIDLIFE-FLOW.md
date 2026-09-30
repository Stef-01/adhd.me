# A flow for a woman after menopause (plan, 2026-09-30)

The living version, with the diagram and the founder's decisions as checkboxes, is the doc
"A flow for a woman after menopause" (claude.ai/code/artifact/cbc2091d-3a98-47b1-ab9d-0647cb59e271).
This file is its record in the tree, for the code that follows it. Its sibling is CHILD-FLOWS.md;
the two share the first-steps card.

Founder, 2026-09-30: "now plan one for woman working through postmenopause care and cultural nuance".

## Where the app stands

| Part | Today | The gap |
| --- | --- | --- |
| Tags | `womens-health` (hormones, periods, perimenopause or menopause, PMDD, fertility, ADHD in women), `late-diagnosis`, `cultural-background`, `woman-gp`, ten languages, `titration`, `shared-care`, `sleep`, mood tags | "since my periods stopped", "hot flushes", "HRT", "brain fog at 52" are not in the meanings |
| Questions | place, lived experience, own culture, which culture or language | nothing asks first look vs care she has; nothing asks whether a woman matters; nothing hears midlife |
| Culture in code | a named culture asked for in the finder's words; a language is a match; majority culture is nothing; First Peoples by name | no interpreter line, no women's health centre, no community service |
| Roster | women's health 5 (Dr Anu Saxena GP Hindi/Urdu; Samantha Courtney, Gisele Fortkamp, Lana Hiscock, psychologists; Dr Yogesh Kalra GP); cultural background 5; women 13 of 37; languages Hindi, Urdu, Portuguese, Mandarin/Shanghainese, Spanish; prescribers 2 (men) | one woman who prescribes and declares women's health (Sydney, rooms); no woman prescriber by telehealth; no Arabic, Vietnamese, Greek, Cantonese; nobody declaring menopause |

## The ground (verify before a sentence of it reaches a screen)

- Around perimenopause and menopause women with ADHD commonly report worse inattention, emotional
  dysregulation, anxiety and low mood beside hot flushes, broken sleep and brain fog; midlife is when
  many are first assessed; usual medication often works less well (clinical literature; abstracts
  read; the AADPA guideline's public pages say nothing specific on menopause).
- MBS item 695 (from 1 July 2025): a GP menopause and perimenopause health assessment, at least 20
  minutes, once in 12 months, schedule fee $104.55; temporary for two years.
- Mental Health Treatment Plan: up to 10 psychology sessions a calendar year; Chronic Condition
  Management Plan: 5 allied health services.
- Free Interpreting Service (TIS National): GPs, nurse practitioners, approved medical specialists,
  Medicare-rebatable consults, phone at once or booked video; not allied health (psychologists).
- NSW: trained GPs prescribe ongoing stimulants for people 6+ already diagnosed (from 1 Sep 2025),
  train to diagnose from March 2026; other states differ.
- Never said by the app: whether it is menopause or ADHD, whether to take hormone therapy or change
  a dose, anything about her faith or family she did not say.

## The flow

Midlife heard from "menopause", "perimenopause", "since my periods stopped", "hot flushes", "HRT",
"MHT", "brain fog", "at 52", "in my fifties".

| Turn | The app says | Gives | Skipped when |
| --- | --- | --- | --- |
| 2 | Is this a first look at ADHD, or care you already have? | `diagnosed`: no, yes, lapsed | a diagnosis or "my medication" was said |
| 3 | Would you prefer a woman clinician? | `woman_gp` (the `woman-gp` constraint) | "a woman" said either way |
| 4 | Where are you, or would telehealth suit you? | place or telehealth | said |
| 5 | Your own culture? Which culture or language? | culture, language, or nothing | said |
| 6 | Anything else? | cost, a support person, faith, work | never |

Lived experience stays. Three doors (the clarifier, "What would help most right now?"):
"Find out if it's ADHD" · "My medication and hormones" · "Getting through the days".

| Door | First steps (3 lines, ≤ 8 words) | Behind "more" |
| --- | --- | --- |
| Find out | Ask your GP for the menopause health assessment · Ask about an ADHD assessment in the same visit · Bring a list of what changed and when | the 20-minute assessment; an adult ADHD assessment; the Treatment Plan; both can be one GP in NSW |
| Medication and hormones | A dose review with your prescriber · The menopause health assessment with your GP · Ask them to share care | two conversations, one visit; the interpreter line where a language was named |
| Getting through the days | A psychologist or coach who knows midlife ADHD · Sleep raised with the GP, not managed alone · One thing off the list this week | executive-function support; the Treatment Plan; women's health centres |

## Cultural nuance, concretely

Act only on what she said; offer the concrete part; assume nothing.

| # | Situation | The app does | The support |
| --- | --- | --- | --- |
| 1 | "In my family you don't see a doctor about your head" | her words stay; no tag; no question about the family | the menopause assessment as the accepted reason to see a GP; both questions in one visit |
| 2 | She needs a woman | `woman-gp`, a constraint | one woman GP prescriber today; the roster gap |
| 3 | Her language, for herself | language tag; the voice finder translates | free interpreter for GP/specialist; a speaker for a psychologist |
| 4 | Her language, for someone coming with her | a language, not a culture | the interpreter line; "you can ask for a woman interpreter" |
| 5 | A small community | place; telehealth offered | telehealth first; nothing recorded that names the community |
| 6 | Faith and the day (Ramadan, fasting, prayer) | her words for the clinician; no tag; never asked | the prescriber's dose review; the app says nothing about fasting and medication |
| 7 | First Nations woman | culture by its own name; `cultural-background` | an ACCHO women's health check where one is near; a support person welcome |
| 8 | Majority culture asked for | composes nothing (O263) | unchanged list |
| 9 | Migrant, older, new to Medicare | her words stay | the sheet's Medicare lines in plain words; the interpreter is free |
| 10 | Shame, a question unsaid | no extra questions; the typed path | the reveal shows her words back, editable |

Two code changes: a support person in the room as a roster declaration; "a woman" asked by voice
survives the call as a constraint.

## What the product changes

1. Reader meanings: `womens-health` + hot flushes, night sweats, HRT/MHT, since my periods stopped,
   brain fog at midlife; `late-diagnosis` + never assessed, now in her forties or fifties;
   `titration` + medication stopped working since perimenopause. Two examples; no new tag.
2. Voice midlife branch: midlife heard; two recorded sentences; `diagnosed`, `woman_gp` in the form;
   `compose` writes them in her words.
3. First steps: three midlife scenarios in `first-steps.ts` (shared with the parent plan); the sheet
   carries the assessment, the Treatment Plan, the interpreter line (only when a language is named).
4. The three doors in the clarifier.
5. Roster: onboarding ticks "a support person is welcome" and "menopause and perimenopause"; recruit
   a woman prescriber by telehealth, a menopause-trained GP, Arabic, Vietnamese, Greek, Cantonese
   speakers; ask the five women's-health declarers about menopause.
6. Data: six personas (Mei, Fatima, a First Nations woman, a small-community woman, a woman whose
   husband answers for her, a woman asking for someone Australian), each with tags, door, card line
   and what must not appear; twenty corpus sentences; production replays.

## Word budgets

"Is this a first look at ADHD, or care you already have?" 11 · "Would you prefer a woman
clinician?" 6 · door question and taps 19 (sheet) · card ≤ 24 + 2 · interpreter line 9 (sheet) ·
assessment line 12 (sheet) · results screen ≤ 60 with the card.

## Build order

1. Personas and pins (½ day, $0): on record, they fail today.
2. Reader meanings (½ day, ~$0.40): the live eval passes; every midlife sentence reads womens-health with its door's tags.
3. Voice branch (1 day, ~$0.20): 6 of 6 personas; Mei five questions with the culture answer in Mandarin translated; Fatima four, a woman first.
4. Card, doors, roster declarations, production (1 day, then outreach): every results screen ≤ 60 words; Fatima's replay lists Dr Anu Saxena first with "From your words: 'a woman'"; Mei's lists a Mandarin-speaking psychologist and the interpreter line.

## Decisions (defaults the build takes unless told otherwise)

- Ask "Would you prefer a woman clinician?" of every woman at midlife. Default: ask; skip when said.
- Faith and family stay her words: no tag, no question, no card line. Default: yes.
- The interpreter line only when a language is named, only for GPs and specialists. Default: yes.
- "Menopause and perimenopause" as an onboarding declaration, no new tag until three declare it. Default: yes.
- The First Nations line only where an ACCHO is near and the culture was named by her, verified first. Default: yes.
- Majority culture unchanged (O263). Default: yes.
- Telehealth outside a small community: offered, not inferred. Default: offered.
- Hormone therapy never named; the sheet says "management options". Default: yes.

## Sources

MBS item 695 and the MBS factsheet; TIS National's private medical practitioners page; two 2025–26
reviews of ADHD across perimenopause and menopause (abstracts); the Australasian Menopause Society
fact sheets; the AADPA guideline site; the NSW Government reforms release; an Aboriginal women's
menopause study. Links in the living doc.
