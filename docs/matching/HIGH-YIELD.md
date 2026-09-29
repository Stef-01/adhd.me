# High-yield matching: what the 37 profiles can actually answer

2026-09-29. The founder ran two voice calls on production and found the questions ridiculous and
the vocabulary junk: "rushed" and "explains clearly" describe nothing a person chooses between,
because any competent clinician does both. This is the appraisal of those two calls, an inventory
of what the roster declares and what the profiles say in their own words, and a proposal for a
vocabulary in which every question changes the answer.

## 1. The two calls, appraised

Both were voice, both read by the model, both recorded as searches. Neither transcript was
recorded: the record of a call was refused whole when the interviewer had asked more questions
than its own cap, and the calls that asked the most were exactly these. The parser now keeps a
call within bounds instead of refusing it, the route counts what it refuses on `/api/health`,
and the client sends the call the moment its search is on record. The two transcripts themselves
are gone; the searches, the keys heard and the lists shown are below.

**10:48. "An ADHD assessment for me, telehealth is fine, I don't want to feel rushed, and cost
doesn't matter."** Heard: `adhd-assessment`, `not_rushed`, `telehealth-first`. Shown: Dr Saxena,
Lachlan Avent, Chantelle Pin, Meera Lakhani, Valeria Urrutia. The person opened Dr Saxena and
compared.

- "Not rushed" is declared by 1 of 37 clinicians. As an ask it separates nobody and it decorated
  the list as if it had. It should never have been offered as a question, and it was asked
  ("How would you like a clinician to treat you?").
- "Cost doesn't matter" was an answer to a question the roster cannot use: 1 of 37 lists bulk
  billing, 0 list fees. Asking cost today is asking for words the ranking never turns into a
  different list.
- Two psychologists and an occupational-therapy adjacent profile sat in a list for an
  assessment. Six clinicians declare `adhd-assessment`; thirteen mention assessment in their own
  words. The list was right to lead with the GP and wrong to fill with people who do not assess.

**10:51. "I need an ADHD assessment by telehealth with a woman who speaks Hindi, understands
Indian background, is kind, neuro-affirming, and explains things clearly. Cost doesn't matter."**
Heard: `adhd-assessment`, `woman-gp`, `telehealth-first`, `language:hindi`, `culturally_attuned`,
`attuned`, `sense_making`, `collaborative`. Shown: Meera Lakhani, Dr Saxena, Donna Italiano,
Paula Garrido, Alice Bui. The person opened Dr Saxena, pressed "more" four times, opened the
heard chips three times, and used a filter: the list did not answer and they went looking.

- The high-yield asks were all there and all real on this roster: a woman (12 of 37), Hindi (3),
  Indian background (Dr Anu Saxena, Alice Bui and Lana name a culture in their own words),
  neuro-affirming (5 name it), assessment (6). Four of the eight keys heard were manner
  ("kind", "explains clearly", "makes sense") and each of those is declared by 9 to 14 of 37
  clinicians: noise in the ranking and words on the screen that say nothing.
- Neuro-affirming is not a key at all. Five clinicians say it about themselves and the finder
  cannot hear it.
- "Indian background" was read as `culturally_attuned`, a manner trait 2 clinicians declare; the
  thing asked for was a clinician who shares or knows the background, which the roster holds as
  languages (Hindi 3, Urdu 2) and as free text.

## 2. What the roster declares, and whether it separates

37 profiles: 17 psychologists, 7 ADHD coaches, 3 therapy assistants, 3 physiotherapists, 3 GPs,
1 each occupational therapist, counsellor, neurotherapy practitioner, exercise physiologist.

| Key | Declare (sometimes) | Verdict |
| --- | --- | --- |
| non-medication | 15 (+7) | table stakes for psychologists; separates GPs from the rest only |
| trauma-informed | 8 (+1) | high-yield |
| child-adolescent-adhd | 7 (+4) | high-yield, but the age of the person is the real axis (§3) |
| adhd-assessment | 6 | high-yield |
| autism-adhd | 5 (+3) | high-yield |
| anxiety | 4 (+8) | medium |
| depression | 3 (+6) | medium |
| shared-care | 2 | high-yield for the diagnosed; two prescribers |
| titration | 1 | high-yield, one clinician |
| perinatal | 1 | high-yield, one clinician (seven mention perinatal or women's health) |
| emotional-regulation | 1 (+5) | low |
| substance-history | 1 (+1) | low |
| complex-mental-health | 0 | dead: nobody lists it |
| manner: motivating | 22 | noise, near-universal |
| manner: attuned, non_judgmental | 14, 14 | noise |
| manner: sense_making, collaborative | 9, 9 | noise ("explains clearly") |
| manner: steadying | 5 | low |
| manner: culturally_attuned | 2 | the wrong shape for the ask (§3) |
| manner: not_rushed, structured | 1, 1 | dead as asks |
| woman / man / undeclared | 12 / 5 / 20 | high-yield, and 20 profiles do not say |
| telehealth first | 24 | high-yield the other way: 13 do not |
| accepting new patients | 37 | says nothing; every profile is open |
| bulk billing | 1 | cannot be asked yet |
| longer first appointment | 0 | dead |
| Hindi, Urdu, Portuguese, Mandarin, Shanghainese, Spanish | 3, 2, 2, 1, 1, 1 | decisive when asked |

## 3. What the profiles say that the finder cannot hear

Counted over each clinician's own words (focus, about, experience, what they say about how they
work). None of these is a key today.

| In their own words | Clinicians | Why it matters |
| --- | --- | --- |
| has ADHD themselves | 5 (Alice Bui, Trisha, Chantelle, Lana, Alex) | the founder's example; people ask for it and it changes who they see |
| neuro-affirming | 5 | asked for in call two; the finder heard a manner trait instead |
| autism named | 8 | the AuDHD half of the roster's work |
| eating disorders | 2 | named by two; not a key until more say it (the loose count of nine matched other uses of "eating") |
| NDIS | 6 | a plan is a hard fact about who a person can see |
| sees children / teens / adults | 15 / 16 / 15 | the age of the person, not one child key |
| women's health, perinatal | 4 | one key covers one of them |
| a culture or language named | 7 | "where you are from", held as free text and as languages |
| prescribes | 3 (the GPs) | the only people who can continue medication |
| coaching, skills, strategies | 19 | what most of the roster does all day |
| older adults, LGBTQ+, faith | 1, 0, 0 | not on this roster; do not ask |
| wait time | 0 | nobody says; do not promise |

## 4. The proposal: every question changes the list

The rule: a question is asked only when its answers lead to different first fives on the roster
in front of the person. Manner is never asked; if somebody volunteers "don't rush me" it is
heard and shown as their words, and it moves nothing. Cost is not asked until the profiles can
answer it.

The questions, and the split each makes on this roster:

1. **What would you like help with?** Assessment (6) · medication continued or reviewed (3) ·
   therapy, coaching or skills (19) · a child's care (7). Already asked; the keys behind it gain
   `prescribing` (titration, shared care and continuation as one capability), `coaching-skills`,
   `ndis` (and `eating-disorders` once more than two say it).
2. **Is this for you, or for someone else? How old are they?** Child · teen · adult: 15 / 16 / 15,
   overlapping. Already asked; the roster gains `agesSeen` so an adult never sees a paediatric-only
   profile first and a parent never sees an adults-only one.
3. **Would you like someone who has ADHD themselves?** 5 of 37. New key `lived-experience`,
   read from the profiles' own words and confirmed with each clinician.
4. **Is there a language or a background that matters?** Hindi 3, Urdu 2, Mandarin 1, Portuguese 2,
   Spanish 1; four name a culture. Replaces "understands your background" (a manner trait) with the
   fact of a shared language or a named background. Asked only when the roster holds one.
5. **Would you like a woman, or a man?** 12 / 5, and 20 profiles must declare before this is
   fair to ask. Roster work, not vocabulary work.
6. **Where are you, or would telehealth suit you?** 24 / 13. Already asked and already the
   strongest split; kept.
7. **Is there anything else a clinician should know?** The open door for autism (8),
   neuro-affirming (5), trauma (10), perinatal (4), NDIS (6): read as care keys, each a real split;
   eating disorders (2) waits for more to say it.

Gone from the questions: "How would you like a clinician to treat you?" and "Does anything matter
to you about the clinician?" (the two that produced the noise in both calls). Gone since (founder,
2026-09-29): "Is this for you, or for someone else?", and every manner trait from every screen (O259).

## 5. How it reaches the whole system

- **Vocabulary** (`src/matching/needs.ts`, `src/lib/matching/llm-read.ts`): add `lived-experience`,
  `neuroaffirming` (or fold into `autism-adhd` as "autism and neuro-affirming"), `ndis`,
  `coaching-skills`, `prescribing` (eating disorders when more than two say it); retire `complex-mental-health` from the asked set; stop
  the manner traits from being asked, filtered or counted as evidence, and keep them readable as
  the person's own words only.
- **Roster** (`src/demo/roster*.ts`): `livedExperience`, `agesSeen`, `culturalBackgrounds`,
  `ndis`, `prescribes`, and a declared gender for all 37; each from the clinician's public words,
  then confirmed with them.
- **Interviewer** (`src/voice/interviewer.ts`): the seven questions above, each gated on the split
  it makes; the two manner questions removed; the eval personas re-cut to the new asks.
- **Results, profile, compare, filters**: chips and the why sentence on high-yield keys only;
  filters offer what the roster declares (already the rule) so a filter for "has ADHD themselves"
  appears and one for "not rushed" does not.
- **Ranking**: care before manner already holds; manner leaves the score entirely. The
  access-before-accumulation law (R16) is the founder's call and unchanged here.
- **Evaluation**: the corpus and the probes gain the new keys; the ladder is rerun; the voice eval
  personas ask for lived experience, a language, an age.

## 6. Order of work

1. Record every call. Done 2026-09-29: bounded parser, refusals on health, immediate send.
2. Interviewer: drop the two manner questions; add lived experience and language. Done
   2026-09-29 (O257): the questions are gone, "Would you like someone who has ADHD themselves?" and
   "Is there a language or a background that matters?" stand in their place, and the voice eval
   passes 12 of 12 with a `lived` persona. Gating a question on the split it makes is not built
   yet: the interviewer asks all seven unless the answer is already known.
3. Roster: `livedExperience` and `agesSeen` from the profiles' own words; declare gender for the
   20 who do not. Half done 2026-09-29: `livedExperience` on the three who say it of themselves
   (Trisha, Chantelle, Alex; Lana's "lived experience" names no condition and is left for her to
   say), and gender for the seven whose bios say "he" or "she" of themselves (13 / 11 / 13 now).
   `agesSeen` and the thirteen first-person bios remain, and the founder confirms each.
   The words each profile uses for ages and for the other candidate keys are tabled in
   `qa/matching/ages-seen.md` and `qa/matching/high-yield-declarations.md`.
4. Vocabulary: the new keys in the lexicon and the reader, with corpus and probe pins; manner
   out of evidence and filters. Large; the count pins move and are re-pinned as O256's were.
   Begun 2026-09-29 with `pref:lived-experience`: cues that name the clinician, each demanding its
   full run of words ("a psychologist who has ADHD herself"; "GP … my ADHD" across a gap read as
   one until the run was demanded), the reader's meaning, a filter switch (38 words on the
   filters screen), the clarifier's question, four corpus sentences and two probes.
5. Screens: chips, why, compare, filters follow the vocabulary. Medium.
