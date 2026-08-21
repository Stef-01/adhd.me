# Matching: the next twelve months (O20)

**Goal (founder, 2026-08-18):** a year-long refinement plan that makes matching much more
powerful and robust, learning from established open-source work, with continued refinement of
how visibly a doctor's fit is explained.

**Where it starts from.** The overhaul (O1–O17, merged) left one pipeline: `needsFor` reads a
request into a closed vocabulary; rarity discounts, stated-importance lifts and declaration
factors weight it; ranking, explanation, quality verdict and console audit all read the same
evidence; ties are said out loud; clarifiers ask only questions that reorder the roster.
Standing constraints that no quarter may bend: explainability floor (W213 — every point of
score sayable in closed vocabulary), no per-clinician hand weights, no symptom-based triage
(TGA boundary, Q17 dossier), synthetic data until the founder gates lift, and honesty about
non-rankings.

## Q1 (Sep–Nov 2026): reach and evidence — make the reader hear more, provably

1. **Reach corpus at scale. TARGET REACHED — 500 entries, O87 (2026-08-20).** *Tranche six
   added the SPOKEN register (the finder has voice input — filler, run-ons, self-correction
   all read cleanly), the medication-shortage and moved-cities continuation asks, question
   forms round two, and walked the O81/O83 rules in the wild. 18 floors rose; tie-quality
   repinned 327/204/28/95 (~62% separation holding). The tranche's harvest is THREE new
   KNOWN FALSE POSITIVES pinned with retag demands: "without MY script" (deprivation) fires
   non-medication — the fix reads the raw determiner; "the phone menu hung up" fires
   telehealth through the [the, phone] pair — **FIXED by O94 (2026-08-20), which is also
   the unit where O84's refused raw-RUN mechanism earned its way in (two cases is the
   bar): an opt-in RUN_DEMANDED set makes "over the phone" and the resurrected "in the
   room with me" find their full contiguous runs, killing the phone-menu leak, keeping
   the genuine phone ask, and promoting O84's standing sit-in-the-room aspiration exactly
   as its comment predicted. O87's false-positive harvest is now FULLY CLOSED
   (O91+O92+O94)** — previously described as: O84's [the, room] lesson living undiscovered
   in an older cue; and "without a psychiatrist referral" — **FIXED by O91
   (2026-08-20): the pin's analysis measured TRUE over the 500-entry corpus ("without" was
   excluded to protect a cue-initial-negator sentence the check never touches); "without"
   joined BARE_NEGATORS with a double-negative guard ("can't … without X" keeps the want),
   the pin retagged, shared-care floor moved by sanctioned reclassification.** The standing gap list (~60
   aspirations) is the lexicon's work queue; growth continues opportunistically but the
   CI-gate deliverable is DONE. **O103 (2026-08-20) worked the top of that queue**: measured
   across the aspiration list, `care:non-medication` was the loudest gap on record at ELEVEN
   unheard phrasings, and the cause was REGISTER — every existing cue heard a refusal
   ("without medication", "not a script") while the corpus had collected two registers
   nobody had cued: SEQUENCE (the ask is about ORDER, not refusal — "strategies first,
   tablets later", "medication as a last resort") and ALTERNATIVE (the ask names the other
   thing — "psychological approaches", "what works besides medication"). Nine cues in, EIGHT
   of the eleven promoted in the closing commit, floor 9→17, and all eight newly-heard
   requests SEPARATE — tie-quality 331/181/52/98 → 339/189/52/98, separation 54.7%→55.8%.
   Four further cues were refused ON MEASUREMENT rather than on judgement: `findCue` matches
   across intervening words, so "non drug" fires on "a non stimulant drug", "more than a
   prescription" on "talk more about my prescription", "before any script" on "before my
   script ran out", "another way" on "explain it another way" — three of the four would have
   labelled a medication ask as its opposite. The three aspirations those cues would have
   served stay standing with the measurement as their reason, and the refused sentences are
   pinned in reach.test.ts §O103 so a later author learns what re-adding them costs.* Earlier: 401 entries after O75's tranche five (2026-08-20):
   the registers real traffic arrives in — question forms, on-behalf bookings (partner or
   parent typing for the person), life-stage context and hedged polite asks — 18 floors
   raised on the measured run, tie-quality repinned 274/170/23/81. Tranche five's harvest is
   two new KNOWN FALSE POSITIVES pinned as today's truth in the O68 pattern: the hedge idiom
   "if that makes sense" fires sense_making — **retagged by O76 (2026-08-20), the pattern's
   second full run: `withinHedge` in read.ts reads the raw stream O45-style, maps the cue
   span across, and suppresses only a cue wholly inside the idiom, so "help me make sense of
   thirty years, if that makes sense" keeps reaching; the idiom set is one earned entry,
   O50's law** — and the on-behalf register collides with the family-presence cues —
   **retagged by O77 (2026-08-20), the pattern's third run: `onBehalfBefore` in read.ts
   reads the governor off the raw stream ("for" / "behalf of" directly before the family
   reference, O72's adjacency lesson), suppresses only the culturally_attuned reading, and
   the child facet is exempt BY DESIGN because on-behalf IS that facet's register ("this is
   for my teenager")**. **O78 (2026-08-20, founder-directed audit): the whole pipeline read
   closely — docs/MATCHING-AUDIT-O78.md is the record. Fixed: suppression was accidentally
   sentence-global (findCue returned only the first occurrence, so a clause-one refusal or
   hedge silenced a clause-two ask; now per-occurrence with retry, behaviour-identical over
   the standing 405 entries), and unservedAsks was the last reader of the global roster.
   Named for their own units, carried as corpus gap data: desire-negation over-scope —
   **FIXED by O81 (2026-08-20): consume-once scope, a trigger binds only its nearest
   following ask, manner spends it without being suppressed; both waiting aspirations
   promoted ("…woman GP, bulk billing matters more" and the dose/diagnosis sentence that
   had looked like a lexicon gap since O68), floors and tie-quality moved with them** —
   reported refusal — **FIXED by O83 (2026-08-20): {said, told} directly before the bare
   negator vetoes the O72 suppression; the raw-stream subject walk keeps "I said no" (and
   "I have said no") refusing; aspiration promoted, verbs earned with pinned sentences** —
   and the sit-in-the-room presence phrasing — **CLOSED by O84 (2026-08-20), half fixed
   and half refused: both candidate cues measured into leaks ([sit, room] hears waiting
   rooms; "room with me"'s [room, with] pair hears "with someone" — O77's own pin caught
   it in-build), so the sit-phrase stays a standing aspiration with the reason written
   (the O65 pattern) and "support person" landed as the register's cuable phrasing,
   floors and tie-quality moved. The O78 audit queue is now EMPTY.**
   Refused with written reasons: micro-caching, cue indexing (0.049 ms/call measured),
   Porter, maximum matching.** Earlier: 311
   entries after O68's tranche four (compounds +
   discipline registers, 2026-08-19); every floor rose again (woman-gp 4→10, bulk-billing
   6→12, telehealth 6→11, trauma 6→8). Tranche four also pinned the corpus's first KNOWN
   FALSE POSITIVE as today's truth: bare "not" before a cue does not negate ("not bulk
   billing, I am happy to pay for time" reaches bulk-billing) — O40 covers desire phrases
   only, by design; the pin made the bare-not unit retag it deliberately — **which O72 did,
   2026-08-19**: `bareNegatorBefore` ({no, not} only, adjacency only, manner exempt, cue-own
   negators untouched) plus the `softenedNotJust` raw-stream veto its building surfaced (the
   additive "not just X" idiom must never read as refusal). Founding pin retagged, floors
   and tie-quality moved with the run in the same commit. Target ~500 stands; tie-quality
   repinned with each move (229/145/18/66 — compounds separate more often than single asks).*
   Extend O13's plain-name sweep into a standing corpus of ~500
   real-shaped requests (synthetic, founder-authored + paraphrase variants). Gate: reach
   percentage per facet tracked in CI; any drop fails the build. This is the matching
   equivalent of a golden-file suite. It must test FALSE positives as hard as misses: first
   seed found while building O22's reach-gap feed — "my rooms are above the pharmacy" reached
   `manner:culturally_attuned` through the cue "in the room with me", which stopword-stripping
   had collapsed to the single token [room]. Fixed in O25 (cue re-authored to keep two content
   tokens; the full set of one-token collapses frozen in reach.test.ts so it can shrink but
   never grow silently). A follow-up probe (O25) showed the rest of the frozen list fires the
   same way — "next door to the chemist" → unhurried via [door]; "the practice name is on the
   sign" → sense-making via [name]; "school on the edge of town" → steadying via [edge] — AND
   why they cannot be reworded one by one: the intended patient sentences strip to the same
   single token ("I can never get a word in" → [never, word]), so precision and recall are
   coupled at the stopword layer. The Q1 deliverable is therefore matcher-level: a collapse-
   aware rule (e.g. one-token cues demand clause-level co-occurrence with another same-facet
   cue, or a kept function-word skeleton) designed against the corpus, not cue whack-a-mole.
   **The rule is DONE — O45, 2026-08-19** (`collapsedCueSatisfied` in read.ts: a collapsed cue
   also needs an adjacent, in-order authored-word pair with stopwords kept, content word
   included, same clause; the three named false positives are pinned dead and every intended
   sentence preserved in reach.test.ts §O45). Building it also caught the corpus propping
   itself up: the cardiac-safety sentence was "reached" only by "what is going on" firing on
   "…not GOING to…", and now reaches honestly through new structured-facet heart cues. The
   REMAINING Q1 item-1 work is the corpus at scale (~500 requests, per-facet reach percentage
   in CI). **The corpus infrastructure and first tranche are DONE — O47, 2026-08-19**
   (`src/matching/corpus.ts`, W231): ~100 requests as data, each pinning what it MUST reach,
   MUST NEVER reach (incl. the G7 rule that symptom descriptions are intentional non-reaches,
   carried as data), or ASPIRES to (the measured gap list — 14 entries, the lexicon's
   to-do list); per-facet heard-counts gated against measured floors, and a met aspiration
   fails the build until promoted in the same commit. Growth to ~500 continues across Q1 in
   the same format; founder-authored entries welcome. **Tranche two DONE — O53, 2026-08-19**:
   ~95 further entries (≈200 total), which caught one real reader defect (the "no medication"
   cue drifting across insertions — fixed with the tight determiner-negator rule in findCue,
   pinned both directions) and two more stemmer warts for the O50 table (kids under the
   length floor; dismissed/dismiss split by trimDouble); floors re-measured across all 25
   facets. **First aspiration sweep DONE — O49,
   2026-08-19**: 16 entries promoted after G7-reviewed cue widening across nine facets
   (want-phrasings only), floors raised in the same commit, one over-loose cue removed after
   the corpus caught it shadowing another facet's cue inside its claimed span. Three attuned
   aspirations stay open deliberately — their phrasings read distress rather than a want, and
   authoring cues for them needs a founder-side judgment call. **The loop's cleanest worked
   example is now O64→O65 (2026-08-19)**: tranche three measured longer-appointment stuck at
   ONE heard phrasing and named it the loudest gap on record; the next unit widened the cue
   set (five two-token cues, plus one deliberate non-cue with its precision reason written
   down), whereupon the promotion gate demanded — and got — every newly-heard aspiration
   retagged and the floor raised 1→6, all in the closing commit.
1b. **FOUNDER QUESTION — SCOPE CORRECTED BY O123 (2026-08-20), and the correction is most of
   the story.** This item was written by O104 about five trauma sentences. Unit after unit then
   deferred to it in passing, until TWENTY-FOUR aspirations across SEVEN facets sat behind a
   question whose written scope was five sentences in one facet. O123 checked every one against
   the vocabulary its own facet already reads, and **most of them were never blocked**:
   `care:complex-mental-health` is cued on "bipolar", "psychosis", "schizophrenia",
   "schizoaffective"; `care:substance-history` on "drinking", "cannabis", "in recovery" — and
   this plan's own worked example of the G7 line is "I drink more than I should" read as a
   want; `care:depression` on "depression", "low mood". A sentence saying "borderline
   personality disorder plus the attention problems" is not a new question for a facet that
   already reads "schizoaffective". Eleven were cued and promoted in O123; two more turned out
   to be O119 PRECISION problems (the waiting-room "panic" phrasings), not G7 ones.
   **The real question is now TEN sentences, and it lives in the data**: `awaitingFounder` on
   the corpus entry, `"experience"` or `"self-state"`, pinned as a list in corpus.test.ts so
   the scope is generated rather than described and a silent promotion fails the build.
   **The question itself, unchanged:** may the matcher be cued on what
   happened to somebody, or on a state they describe in themselves? Five of
   `care:trauma-informed`'s standing aspirations name the
   reader's history rather than their preference — "there is family violence in my past and
   it affects appointments", "an abusive relationship left me jumpy in clinics", "what
   happened to me before makes doctors hard to trust", "childhood was rough and it comes up
   in appointments", "I dissociate when doctors rush me" (that last one a clinical term for a
   symptom). O104 cued the PACE-AND-CONSENT register instead, which names no experience and
   diagnoses nobody, and left these five standing. The precedent is Q1's first sweep, which
   left three attuned aspirations for the same reason. The question is genuinely finely
   balanced and it is not a build-loop call: reading these WOULD serve the reader who wrote
   them — every one of those sentences ends in a statement about appointments, which is a
   care preference by the same logic that lets "I drink more than I should" be read as
   wanting that conversation held safely. Against it: the cues would be experience words, the
   facet would then be reachable by a sentence that is purely history, and G7's boundary is
   the product's most expensive one to be wrong about. FOUNDER: a yes/no, and if yes, whether
   the cues must require the care clause.
   **The other five, added to this question by O123 rather than invented by it**: four
   `care:emotional-regulation` sentences that describe the reader's own state with no
   appointment clause at all ("rejection hits me like a truck", "my temper goes from zero to a
   hundred in seconds", "my moods flip fast and I say things I regret", "crying at work over
   nothing and I want it taken seriously") and one `manner:attuned` sentence of the same shape
   ("I cry in the car after every appointment"). These are the DSM-adjacent half of the
   question, and O119 is the reason they are held separately from the trauma five: it removed
   bare "overwhelmed" from `care:emotional-regulation` for reading a person describing their
   own state, so cueing these would reverse a precision fix that was made deliberately.
   **A note on the discipline, because O123 tested it on itself.** Two cues written during that
   unit were reverted in-build for trying to answer this question sideways: a mood cue fired on
   "my moods flip fast and I say things I regret" (O119's probe caught it), and two attuned
   cues broke §O112's pin, which deliberately leaves "I rehearse what to say and still leave
   unheard" unread. There is a real argument for reversing half of §O112 — the facet already
   reads bare conduct reports like "brushed off" — but filing work under this gate carelessly
   and UNfiling it carelessly are the same error, so the argument is written down for a unit
   that takes it deliberately rather than acted on in passing.

1d. **The precision counterpart, O119 (2026-08-20) — and it is the day's most important
   unit.** A day of recall work (O103–O114, ~60 cues) checked every candidate against a
   sentence that would refuse it. That check has a blind spot it cannot see past: it asks "does
   this cue fire where it should not" against sentences the AUTHOR chose, and a `never` pin
   exists only where somebody thought of the collision. Probing the other direction — which
   corpus entries hear a facet they declare in NO direction — found **32 of 508**. Three cues
   were manufacturing reach and are gone: **"properly"** on `manner:structured` (it fired on
   every sentence containing the adverb; none of them asks for a documented baseline),
   **bare "panic"** on `care:anxiety` (it read "a doctor who won't panic about my drinking", a
   figurative line about the DOCTOR), and **bare "overwhelmed"** on `care:emotional-regulation`
   (it read a person describing their own state — the DSM-text trap the module's header names,
   arriving from the direction nobody was watching). Floors LOWERED with rationale: structured
   17→12, anxiety 17→15, emotional-regulation 12→11. Tie-quality 392/223/61/108 →
   391/214/63/114, separation 56.9%→54.7%, **the largest fall recorded and every point of it
   reach the lexicon had not earned.** The probe now ships as `src/matching/precision.test.ts`,
   so the corpus gates precision in the same way it has always gated recall. It also named a
   CLASS with five worked instances: **every cue assumes the CLINICIAN is the subject**
   ("explains things", "believes me", "my son"), and five sentences put the patient or a
   relative there — the sharpest being "after my son was diagnosed I recognised myself and now
   I want my own assessment", which fires the paediatric facet on an adult's own ask. Pinned as
   today's truth with retag demands; the fix is a subject check, a mechanism unit.

1c. **The aspiration queue, worked 2026-08-20 (O103, O104, O107) with two mechanism fixes it
   surfaced (O105, O106).** Three of the four loudest facets closed: non-medication 9→17
   (SEQUENCE and ALTERNATIVE registers), substance-history 9→16 (the substances the list never
   learned, plus RECOVERY), trauma-informed 9→13 (PACE-AND-CONSENT only — the rest is the
   founder question at 1b). Eighteen aspirations promoted; tie-quality 331/181/52/98 →
   349/197/52/100, separation 54.7%→56.4%, with every promoted request in the non-medication
   and substance sweeps landing SEPARATED. Method, now standard and worth keeping: every
   candidate cue is run against the real matcher on a sentence that means something else
   BEFORE it ships, and the refusals are pinned as those sentences — eight cues were refused
   this way ("non drug" on "a non stimulant drug", "clean" on "a clean bill of health", "ice"
   on "ice packs", "drug use" on "the drug I use works well", and four more), most of which
   would have labelled an ask as its opposite. The sweep also separated, for the first time,
   aspirations that are VOCABULARY gaps from ones BLOCKED by a mechanism: 9 blocked at the
   start of the day, 6 now, and all six remaining are collapse-rule refusals working as O45
   designed them.

2. **Onboarding-driven lexicon growth (O22 loop).** Every doctor interview's "sentences that
   proposed nothing" feed lexicon review — the clinician side discovers patient-side gaps.
3. **Morphology upgrade. DONE — O50, 2026-08-19; COMPARATIVES BRIDGED — O116, 2026-08-20.**
   *O116 found the gap the table had never covered: `stem("longer")` was "longer", so
   `pref:longer-appointment` — the facet whose LABEL is "A longer first appointment" — could
   not hear its own adjective. O65's widening of that same facet could not have found it,
   because every cue that sweep added says "long". Added as named entries in O50's idiom
   (`longer`/`longest` → `long`), never a general -er rule: stripping -er turns "water" into
   "wat" and "other" into "oth", both of which appear in real requests, and the non-vacuity
   pin asserts exactly that. The entry exposed a live collision — "longer appointment" was
   cued by BOTH `manner:unhurried` and `pref:longer-appointment`, invisible while the two
   words were different tokens — resolved by giving the phrase to the facet named after it,
   which is what both affected corpus entries already carried as their aspiration.* The `INFLECTIONS` table in read.ts,
   applied as stem()'s last step so cues, sentences and O45 raw skeletons unify identically.
   Three corpus-named wart families bridged: irregulars (taken/took→take, seen→see), the
   length-guard edge (sees, seeing→see), and e-droppers stranded by ed/es-stripping
   (believ→believe, judg→judge, minut→minute). Deliberately not Porter — every entry needs a
   real sentence in the tests the suffix rules demonstrably cannot bridge; `natural` was
   studied for test cases, not imported. Pinned: stem-equivalence per family + two
   previously-deaf corpus phrasings now reaching ("nobody ever believes me", "quick to
   judge"), non_judgmental floor raised with them.
4. **Negation clauses. DONE — O40, 2026-08-19; SCOPE CORRECTED — O105, 2026-08-20.**
   *O105 fixed the defect O104's aspiration sweep surfaced: a desire-negation whose object
   carries no cue found no ask to consume and floated ACROSS A COMMA to suppress the ask
   behind it, so "I don't want a big clinic, a woman GP in a small practice please" reached
   nothing at all — a want the reader stated, deleted, in the commonest register anybody asks
   in. The rule already refused to cross a CLAUSE_BOUNDARY; commas were never marked as one,
   deliberately and for a good reason (a comma that stopped cue matching would break
   "alternatives, not just medication" AND the clarifier's own `${request}, ${answer}` append).
   So the fix is asymmetric, which is also what is linguistically true: a comma is not a
   boundary for matching a cue, but it does end a negation's scope. `commaBreaksBefore` reports
   comma positions in `tokenise`'s own coordinates; both token streams are unchanged and pinned
   so. Every O40/O81/O72/O83 pin green unchanged; woman-gp 18→19, adhd-assessment 59→60.* `negatedWant` in read.ts, NegEx's convention
   scaled to this reader: explicit desire-negation phrases ("don't want", "not looking for",
   "don't need", "no interest") — never bare negators — with scope forward to the clause
   boundary, applied to care and preference cues only. Manner is exempt BY DESIGN and pinned:
   "I don't want to feel rushed" IS the unhurried ask. Also pinned: "my GP won't do titration"
   (complaint = want) and "never had an assessment" (history ≠ refusal) still reach. Both
   directions in reach.test.ts §O40.

## Q2 (Dec–Feb): robustness — the ranking under adversarial and degenerate input

5. **Property-based testing. DONE — O54, 2026-08-19.** fast-check over the pipeline in
   `src/matching/properties.test.ts` (W232), seeded for reproducibility: determinism,
   totality (garbage never throws, and an empty read never claims an informed order),
   permutation-invariance asserted at BAND level (within-band row order is explicitly not a
   ranking, so pinning it would claim the thing the product refuses to), monotonicity
   (adding a declared care area never lowers that clinician — the property that makes honest
   declaration safe for a GP, holding THROUGH the rarity reweighing), the W213 unity
   (score === sum of printed evidence) and band coherence. Generators compose from the
   lexicon's own vocabulary plus the fillers and negators the O40/O45/O53 rules live among.
6. **Fuzz the reader. DONE — O55, 2026-08-19.** The budget is production code: `tokenise`
   caps at 400 content tokens and the raw stream at 1,200 (constants in read.ts, aligned so
   the O45 skeleton can only confirm what the capped read saw), so a 10k-word paste is read
   as its opening and the worst case is a constant — with the truncation pinned honestly in
   BOTH directions (an ask in the opening heard, an ask planted past the cap not; the O9
   essay pin rewritten with the contract stated). The fuzz lives in the W232 fast-check home:
   emoji, mixed scripts, unicode junk — no throw, deterministic; caps held for every
   generated input; one generous wall-clock bound on the absurd case.
7. **Capacity truthfulness (F5 follow-through). DONE — O56, 2026-08-19.** Declarations now
   carry `capacityDeclaredAt` (the date each went on the record, from the file's own git
   history — never invented for a real person) and `capacityGrade` prices the age with an
   injected clock: fresh-open (≤90 days), stale-open (older or undated), closed. The O4
   tie-break is three-grade — stale still beats closed, no longer beats confirmed — grading
   never scores, never filters, patient copy unchanged. The matching console gained the
   freshness panel: per declaration its grade, date and reconfirm-by nudge; stale rows say
   what lapsed and what to do. `matchAudit` carries the grade so the console sort cannot
   disagree with the finder. Boundaries and tie fixtures pinned with a fixed clock; the
   plan's "demote to sometimes-grade confidence" was adapted — demoting CONFIDENCE would
   touch scores, and the mechanism's law is that capacity orders ties only.
8. **Tie-quality metric. DONE — O62, 2026-08-19, adapted to the real roster.** The size->3
   threshold is unreachable on three GPs, so the definition is relative to roster size and
   survives growth: per corpus run (W231's reaching sentences), each request's top band is
   separated (1), a partial tie, or unseparated (whole roster tied — the "failed to separate"
   case at any roster size). `tieQualityReport` (src/matching/tie-quality.ts, W234) measured
   2026-08-19: 97 separated / 12 partial / 42 unseparated over 151 heard requests, 64%
   separation — pinned in BOTH directions in tie-quality.test.ts (a regression fails; an
   improvement demands the pin move), and rendered on the matching console from the same
   function so panel and gate cannot drift. The 42 is the clarifier's work queue, which is
   what Q3's clarifier-policy item now has a number to move.

## Q3 (Mar–May): the roster grows — matching as a market, not a list

9. **Reciprocity, properly (F9/MATCH-1 heir).** With >5 clinicians, adopt the reciprocal-
   recommender frame dating platforms converged on: a match score is a function of BOTH
   directions — patient-need fit AND clinician-capacity/case-mix fit. Study: RECON
   (reciprocal recommendation literature), and Hinge's published Gale–Shapley "Most
   Compatible" write-ups; our Hopcroft–Karp oracle (O6) already gives the assignment
   upper bound to evaluate against.
10. **Clarifier policy at scale. PREMISE MEASURED AND EARNED — O142 (2026-08-21); the build
    stays blocked on a real roster.** This item asserted "with twenty clinicians the evenness
    sort has real choices". Nobody had checked, and `clarify.ts` carried the same guess in its
    own doc comment. O142 checked it against a SYNTHETIC roster — fixture only, never rendered,
    guarded by a test that fails if it is ever imported from `app/`, and drawing each facet at
    the marginal rate the three real clinicians declare it, so the distribution is derived rather
    than chosen. Both halves came out, and one came out stronger than written: at today's size
    the evenness sort is not "barely" mattering, it is **provably inert** — every splitting facet
    on three clinicians is held by one or two, |1/3-0.5| === |2/3-0.5|, so all sixteen askable
    questions share one evenness value and the sort decides nothing at all. Everything ordering
    the questions today is O33's greedy holder-signature dedup. At scale it wakes up: distinct
    evenness values go 1 → 4 → 7 → 9 across rosters of 3, 8, 20 and 40, and the sixteen questions
    that collapse into just FIVE distinct reorderings at three are all sixteen distinct at twenty.
    That second number is the more useful one — at three, most questions are the same question.
    So the premise is earned and the item is real. What it still cannot have is the comparison it
    asks for: whether information gain beats evenness is a question about a real roster's facet
    CORRELATIONS, and a fixture drawing facets independently models none. The item stays blocked
    on roster growth (G6) — now for a measured reason instead of an assumed one. Numbers pinned
    both directions in `src/matching/scale-fixture.test.ts`; the day the roster grows they fail
    and demand re-measurement. This stays explainable either way: the question shown is still one
    of the fixed prompts.
11. **Semantic assist, behind the explainability floor.** Embedding similarity (MiniLM-class
    sentence-transformers, or pgvector on the existing Supabase stack) as a CANDIDATE
    GENERATOR ONLY: it may suggest which lexicon facets a sentence is near, for the console
    reach-report and clarifier choice — it may never add score. Score without a sayable cue
    stays banned, which is the line between "powerful" and "unexplainable".

## Q4 (Jun–Aug 2027): learning, evaluated honestly

12. **Outcome signal, gated.** Once real bookings exist (post-gate), the only learnable label
    the boundary allows: "did the person contact the practice shown first". No diagnosis, no
    symptom data, no per-patient profile.
13. **Weight fitting inside the sayable structure.** Fit the LEXICON's per-facet weights (the
    same numbers now hand-authored) against that signal — learning-to-rank in the smallest
    possible hypothesis space. Study: LightGBM's LambdaMART for method; but the deliverable is
    ~40 fitted scalars in `needs.ts`, reviewable in a diff, not a model artifact.
14. **Interleaved evaluation.** Compare ranker variants by team-draft interleaving on synthetic
    corpus + (post-gate) live sessions, which detects preference with far fewer sessions than
    A/B. Everything ships behind the verify gate's reach and property suites.
15. **Year-end appraisal.** Re-run the F1–F10 appraisal against the year's state; publish
    MATCHING-APPRAISAL-2027 with the same severity honesty.

## UI refinement & motion, continuously (runs all year)

The founder's standing directive (2026-08-18): every surface a minimalist, modern 2026-grade
piece — no clutter anywhere, things very clear — with motion treated as an innovation track,
not decoration. The product already uses `motion/react` (Framer Motion's successor); the work
is to use it the way the mix hero does: motion that carries MEANING (a value resolving, an
order re-sorting, a proposal arriving) and nothing that merely draws the eye.

- Cadence: at least one UI-refinement unit per week from the hourly build loop, each with a
  before/after capture in `qa/` and a `docs/DESIGN-QA.md` entry. The declutter audit
  (qa/ui-o24/) is the baseline record.
- Motion innovations queued, hardest constraint first (`prefers-reduced-motion` always fully
  honoured — every effect has a static equal): shared-layout transitions between the finder's
  screens (`layoutId` from result row → profile, so the chosen GP visibly *is* the same
  object) — **SHIPPED, O67 (2026-08-19)**: the row's portrait slot and the profile frame
  share a per-clinician layoutId, the portrait's competing enter tween removed, wiring
  pinned in e2e via data-portrait-of, mid-flight morph captured in qa/motion-o67/; the results list re-sorting with `layout` animations when a clarifier answer
  reorders it (the order changing is the product's whole argument — show it) — **SHIPPED,
  O52 (2026-08-19)**; **scroll-linked reveal on the story
  landing, kept within one viewport of intent — SHIPPED and MEASURED, O127 (2026-08-20)**: the
  `Reveal` wrapper and the founders' stagger both gate at the hook (`initial={reduce ? false :
  …}`), which is the taste law's requirement that reduced motion be honoured where the effect is
  decided rather than only in CSS. The guardrail is a number, so it was measured rather than
  eyeballed: 17 elements carry a Y transform at rest; 14 are reveals and every one settles
  within a viewport of the fold at BOTH 390 and 1280 — zero fire early — and the other 3 are the
  continuous parallax wrappers, which correctly never settle. The first probe was wrong and is
  worth recording: it selected `.story-chapter *`, so it counted every plain descendant that had
  never been animated as "revealed early" and reported 24 false findings. Measuring only the
  elements that actually start translated is what made the number mean anything.
  **The match evidence weights drawing in as the score line settles — REFUSED, O127
  (2026-08-20), with the reason kept here rather than dropped from the list.** Patients never
  see a score: W213's explainability floor and the whole no-ranking posture mean the number does
  not exist on any patient surface, and O102 refused even to total a comparison. The only screen
  with a score line is the staff console, where the figures are server-rendered and already
  known before the reader arrives. Animating them would not be "a value resolving" — the lane's
  own name for meaningful motion — it would be decoration wearing that phrase, which is
  precisely what the founder's directive excludes. If a surface ever computes a score in front
  of somebody, the item becomes real again and this note is where to start.
  **The motion queue now has no unmarked item.**
- Guardrails: 44px touch floor (O14), fold discipline (W167 register), no motion on patient
  error paths, and the taste rules recorded in `docs/DESIGN-QA.md` stand in for the
  taste-skill wherever the loop session lacks it.

## Allocation machinery (W236 — founder-directed 2026-08-20, O79)

Beside the finder, not inside it: `src/matching/allocation.ts` scores synthetic patient
requests against declared doctor records — hard filters with named refusal reasons
(insurance not accepted / at capacity / specialty mismatch), then five global criterion
weights (clinical fit .30, availability .25, proximity .20, cost .15, communication .10),
each sub-score normalised 0–1 by a stated formula and carrying a W213 sentence; top three
doctors per patient with ties said out loud. The reconciliations live in the module header
and the census entry: allocation may exclude at-capacity doctors because assignment is not
listing (O4 governs the roster surface); stated urgency is a timing preference, never
triage (G7); no ordering of patients exists anywhere (the ADM notice holds). **The vocabulary wiring is DONE — O132 (2026-08-20)**: `requestFromWords`
builds a `PatientRequest` from the patient's own sentence through `readNeeds`, the same read the
finder uses, so care facets become `statedNeeds` and manner traits become
`communicationPreference`. There is now ONE derivation and it is the finder's — the hand-supplied
fields stay, because a synthetic run legitimately wants to state a vocabulary directly, but when
WORDS are the input they are read the way the product reads them. Pinned as a unity test in both
directions (no facet added, none dropped) plus two boundary pins: the constructor introduces no
reading of its own (an allocator with a second, looser reader would be a second place patients
get interpreted), and urgency is never derived from the words — inferring priority from what
somebody wrote is triage, in the lane whose header promises stated urgency is a timing preference.
**The console rendering is DONE — O133 (2026-08-20)**: `/console/allocation`,
the allocator's first consumer, showing the patient's words, the vocabulary they derive through
the finder's own reader, every criterion's weight and sentence, and every exclusion with its
reason. Both sides synthetic and the page says so — the prescribers too, because the module
scores an ASSIGNMENT and the finder deliberately does not. Its copy is declared where a PAGE's
copy belongs: W102's surface census and a COMPLIANCE-DOSSIER row, not W200's module census,
which the tree pointed out by failing three times until the right register was used.
**The allocation lane's named steps are now all done.**

**O80 (2026-08-20, founder clarification of O79): the standalone Python variant for the
GP-led pathway** — `tools/gp-match/` (`config.py` + `adhd_gp_match.py` + 21-test suite).
Adds the jurisdiction layer the founder specified: state-match and authorization-level
hard filters (undiagnosed → initiate_and_diagnose only; diagnosed → either authorized
level; not_authorized never), age range, capacity, and bulk-billed-only as a hard
constraint; weights 30/25/20/15/10 (availability, proximity, cost, communication, MBS
pathway fit); top-3 with breakdown and a plain-language authorization note carrying the
state's rollout context. State rules and MBS sets live in config with per-entry notes and
review dates — a test refuses an entry without one — because the rules are actively
changing through 2026. FOUNDER MAINTENANCE: re-check each config entry by its review_by
date; the tool's rules are only as current as their last review.

## Refactoring, continuously (runs all year — founder directive 2026-08-19)

Codebases this young rot at the seams that grow fastest. The founder's ask: keep refactoring
as a standing lane, not a someday. The laws, set by O70's speech.ts pass (the worked example):

- **Behaviour-identical, and the module's own pins are the definition of identical** — a
  refactor unit runs the pre-refactor tests UNCHANGED and green before anything else counts.
- **One module per unit.** A refactor that touches two subsystems is two units.
- **RCA comments are load-bearing and move intact.** They are the tree's memory of paid-for
  lessons; a refactor that drops one has deleted documentation, not tidied code.
- **The refactor's own audit is part of the unit**: reading a module that closely usually
  finds one real defect (O70 found the G4 orphaned-stream leak). Fix it in-unit, pinned.

The queue, largest seam first:

1. **app/care-finder.tsx** (~1,200 lines): one component holds seven stages. Split by stage
   into co-located components with the shared state lifted plainly; the e2e suites define
   identical. — DONE (O95): app/finder-stages/, 455-line orchestrator, five e2e suites run
   unchanged; the audit found the auto-cycle interval running side effects inside a state
   updater and moved them to an effect.
2. **app/globals.css** (~6,000 lines): section the file by surface with the banner convention
   the finder sections already use; no selector changes (byte-identical computed styles at
   the default root, the O60 proof pattern). — DONE (O96): a file map at the top naming all
   fifteen regions, banners at the boundaries that lacked them, the finder's stranded
   results block moved home, and three cascade-load-bearing blocks left in place with the
   reason written at the rule. The O60 proof is now machine-checked and reusable:
   `scripts/css-computed-dump.mjs` walks every route and finder stage at both viewports and
   diffs ~110 computed properties per element — validated by probe, then byte-identical
   across all 4,232 rendered elements. Audit finding carried forward as its own unit: two
   `.match-quality` declarations at equal specificity, so the finder's honesty banner
   renders at the /approach rule's size rather than the one O14 chose for it.
3. **src/demo/clinicians.ts** (~900 lines): the roster DATA and the ranking LOGIC share a
   file; split data out so a roster edit can never touch a ranking line. The full matching
   suite defines identical. — DONE (O100): `src/demo/roster.ts` holds the `Clinician` type,
   every entry and the page of real-person law that governs them; clinicians.ts re-exports
   both, so not one of the 26 import sites changed. Filed under W193, the unit that governs
   disclosing a named clinician — which the tree insisted on: the first draft shipped with
   no `// W<n>` header and fired CENSUS-1 in the latent-findings register, on the twelfth
   header-less module, exactly as W210 designed it to.
4. **src/matching/needs.ts**: the CUES pipeline builds in one expression; name its stages.
   — DONE (O101). Four named stages (first-claim dedup, pre-tokenise, drop the unmatchable,
   sort most-specific-first), each with the original prose moved to the stage it is actually
   about, plus a named `Cue` type replacing the inline one that `Candidate` reached for as
   `(typeof CUES)[number]`. The full matching suite green unchanged is the proof.
   **THE REFACTOR LANE'S OPENING QUEUE IS NOW EMPTY** (O95 care-finder, O96 globals.css,
   O100 clinicians.ts, O101 needs.ts). Refactoring continues as the founder directed, but
   from findings rather than from this list — the next entries should be earned by reading,
   the way O96 earned the `.match-quality` collision that became O99.

## Standing debts from the founder's asks (audited 2026-08-18)

Everything asked across this arc that is still outstanding or thinner than the ask deserved,
so the loop cannot lose it. Build-loop units unless marked FOUNDER:

1. **The mix hero doesn't yet keep its promise mechanically — LARGELY CLOSED by O26
   (2026-08-18).** `desiredMixPercent` now rides the application when — and only when — the GP
   actually set it (join-experience.tsx owns the state; the store validates 10–50 step 10 and
   refuses the rest; absent means undeclared, never defaulted). The condition is not captured
   by design: it rotates as an invitation and the GP never chooses one — the form's care areas
   are the chosen work. **CLOSED by O57 (2026-08-19):** `/console/applications` renders every
   received application — ADHD.ME-staff-gated above the read like the interest register, no
   approve control (listing stays a human Ahpra-review act, G6 shut) — and the declared mix
   renders, when and only when the row carries one, as stated preference with the sentence
   unit-pinned (W233). The reader exists; access is one founder staff-grant commit away.
2. **Onboarding interview build-out (O22 items 2–4) — item 2 CLOSED by O30 (2026-08-18).**
   `/console/interview` is the working instrument: editable transcript (i:-prefixed interviewer
   turns are never read), live proposals from both readers, each carrying the doctor's sentence
   and the structured interview's OWN question, and often/sometimes/not-me recorded with the
   interviewer's name into the W226 draft store (`frequency` kept beside the review status).
   Item 3 CLOSED by O36 (2026-08-18): the gap sweep — every facet the transcript has not
   reached, rendered as the structured interview's own question with the same three-state
   record; the count falls as the doctor talks; an unanswered question is recorded nowhere.
   Item 4 CLOSED by O38 (2026-08-18): the reach report — patient-side silent sentences ride
   the W226 save beside `unread`, and the matching console renders the per-onboarding feed
   (latest save per clinician, two silences kept apart because they grow different cue lists).
   **DEBT CLOSED — the O22 loop is now standing infrastructure; what remains is Q1's ongoing
   review of what the feed surfaces, which is the year plan's work, not a debt.**
3. **iPhone speech: field verification.** O18's retry + honest copy + `?debug=1` shipped;
   O46 held the warm-up stream open through the retry; O48 made the once-more a button; and
   **O69 (2026-08-19, founder-directed) closed the last known code-side gap**: the recovery
   tap now starts WARM — a second permission failure carries its live stream (45s window,
   dropped on adoption/settle/cancel/leaving/expiry) so the next tap runs recognition inside
   its own gesture with the audio session already live, the two things WebKit reportedly
   demands at once. FOUNDER: retry on the phone; if the banner still shows, send the
   bracketed `?debug=1` code — with O69 in, a persisting failure points at device settings
   (Siri & Dictation / Safari mic permission / screen-time) rather than at this sequence.
   Build side: keep the raw-code path first-class in any speech change.
4. **Speech is en-AU only — CLOSED by O59 (2026-08-19), picker shape.** `SPEECH_LANGUAGES`
   is a closed, roster-derived list (English plus exactly the languages listed GPs declare —
   Hindi and Urdu today; a test derives the basis so the list cannot outgrow the roster);
   the listening screen offers them in their own script inside the disclosure block, choosing
   one restarts listening in it, and the honesty line ships with the picker: matching reads
   English for now, so spoken words are kept and shown but may not order the list. en-AU
   default and the whole failure ladder unchanged. REMAINING (Q3's reciprocity/lexicon work,
   not a debt): teaching the reader non-English vocabulary, at which point the honesty line
   retires itself.
5. **Privacy policy is still titled "draft".** Deliberate while the product is a demo;
   FOUNDER decision to finalise wording before any real-patient launch (gates plan §4).
6. **Google Analytics is wired but dark.** `NEXT_PUBLIC_GA_ID` is unset in production.
   FOUNDER: set the env var in Vercel when tracking should start; nothing to build.
7. **px→rem migration — CLOSED for type by O60 (2026-08-19).** Every font-size in
   globals.css (344, clamp() bounds included) is its exact rem equal at the browser-default
   root; before/after captures byte-identical at the default root, the enlarged-root payoff
   captured in qa/type-o60/, and a ratchet test pins zero px font sizes AND refuses any
   future `html { font-size }` re-anchoring. Borders/radii/shadows/dimensions/breakpoints
   deliberately stay px — they are not type; reopen only if a low-vision finding names them.
8. **MATCH-1/F9 reciprocity finding** stays open until Q3's reciprocal-matching work closes
   it in the latent-findings register, not just in prose.
9. **Vercel free-tier deploy quota — the claim no longer holds, measured 2026-08-21 (O150).**
   This said the quota "keeps blocking previews/production for hours at a time". Checked against
   the actual deployment list rather than from memory: the twenty most recent deployments are
   ALL `state: READY`, `target: production`, one per unit, from O117 through O150, each landing
   within about two minutes of its push. Not one quota failure among them. The live production
   CSS was then read back and carries O150's rules verbatim
   (`.profile-content section ul{grid-template-columns:1fr…}`), so production is current, not
   stale. The `ignoreCommand` in vercel.json — which skips builds for every ref except `main`,
   so previews do not exist — is what made the quota sufficient, and the batching advice below
   is what kept it that way. KEEP the discipline (one push per verified unit, no pixel-only
   pushes between); DROP the belief that deploys are unreliable, because a stale premise gets
   used to explain away real defects. It nearly did here: when the founder reported the profile
   still looked wrong, "probably a stale deploy" was the comfortable answer and it was false.
   FOUNDER: no action needed unless previews are wanted, which would need the plan upgraded.
10. **Finder desktop composition — CLOSED by O63 (2026-08-19), the shell way D1's revert
    prescribed.** One `--shell-w` token (520px; 640px at ≥820px) drives the shell, the
    ≥600px block and the fixed booking bar's centring, for every stage at once; the
    stage-keyed width list and its 280ms tween are deleted (nothing changes width mid-flow
    any more, so the motion had no meaning left), and the intro stages' seamless borderless
    paper now holds end to end. Phone and 600–819px unchanged; captures in qa/desktop-o63/.
11. **The e2e suite runs nowhere automatically — CLOSED by O98 (2026-08-20).** ci.yml now
    has a second job, `e2e`, beside `verify`: chromium only, the config's own `webServer`
    doing the build, the HTML report and `test-results/` uploaded on failure so a red gate
    is diagnosable from the run that caught it. Separate job on purpose — the suite measures
    8.8 minutes and hanging that off the fast gate would tempt somebody to trim the fast
    gate. Two guards came with it, both about the gate being REAL rather than looking real:
    `forbidOnly` in CI (a stray `test.only` would run one test, report green, and leave the
    compliance sweep guarding nothing) and `trace: retain-on-failure`. The fallback in the
    claim — a `@compliance` subset if the minutes were not there — was not needed at 8.8
    minutes and stays unbuilt rather than speculative. Original statement of the debt:
    `pnpm verify` is typecheck · test · build · audit:gate, and `.github/workflows/ci.yml`
    runs exactly that: nothing runs `pnpm e2e`. The reason is real rather than an oversight —
    the suite drives a production build of its own (`webServer` does `next build && next
    start`, `reuseExistingServer: false`) and takes ~8 minutes — but the consequence is that
    the COMPLIANCE SURFACE SWEEPS have no automatic gate at all. `party-to-care.spec.ts` is
    the one that lints every rendered public and console page for ADHD.ME holding itself out
    as a carer, and O97 found it red on /privacy with nobody watching; the tree's own law is
    "compliance is code", and code with no gate is a comment. The unit: add an e2e job to
    ci.yml (its own job, so a slow browser run never blocks the fast verify job), or, if the
    minutes are not there, split the compliance sweeps into a shorter suite that does run.
    Not merely a debt — a red gate can hide here again tomorrow.
12. **The review skills ARE available — O144 was wrong, corrected by O151 (2026-08-21).**
    O144 filed this as a founder debt, claiming `code-review`, `security-review` and `simplify`
    are absent from the loop container and that law 5's hardening requirement "cannot be met by a
    loop firing". It reached that from `ls .claude/skills/`, which lists only the VENDORED
    skills. The listing was true and the conclusion was false: all three are available to a
    session as skills, and vendoring is one delivery route rather than the only one. O151 ran
    `security-review` and it worked.
    The entry is corrected rather than deleted, because a wrong finding that quietly disappears
    teaches nobody, and this one has a reusable lesson: **a null result from the wrong instrument
    is still a null result.** O144 checked a directory and reported a capability.
    Two practical notes for future firings, both earned by running it: `security-review` needs
    `origin/HEAD`, which is unset in a fresh clone — `git remote set-head origin -a` fixes it —
    and it reviews the current branch against `origin/HEAD`, so on a tree that commits straight
    to `main` it resolves an EMPTY diff and must be pointed at an explicit range instead.
    FOUNDER: no action needed. Vendoring them into `.claude/skills/` would still be worth doing
    so the tooling is legible from the repo, but nothing is blocked.

## Explaining the fit, continuously (runs all year)

- O21 shipped provenance on the profile ("from your words: …"). Next increments, one per
  quarter: (Q1) unmatched asks named per-clinician, not just globally — **DONE, O51
  (2026-08-19)**: `missedAsks` partitions the reader's care/manner asks against the same
  `needsFor` read as the evidence, and the profile says "you also asked for X — not something
  they declare" in W193's declaration framing, capped at two, only beside existing evidence; (Q2) "what would
  change this order" — **DONE, O66 (2026-08-19)**: the TOP clarifier renders on the profile
  as one quiet tappable question in the missed-asks register; tapping appends the answer in
  the reader's own words and returns to results so the O52 animation shows the reorder; a
  question that could not reorder is never rendered (clarifiers() guarantees it); (Q3) side-by-side compare
  of two clinicians' evidence — **DONE, O102 (2026-08-20)**: a `compare` stage reached from
  the profile, rows = the asks the reader made, cells read from `matchEvidence` so the table
  cannot disagree with the ranking it explains; grouped where-they-differ / both / neither,
  the last carrying the listing-gap sentence; partner chosen as the neighbour in the order
  rather than picked, because a chooser is a second decision on the screen that exists to
  make the first one easier; no score, no total, no winner language, pinned by an e2e that
  fails on the words; W193's posture stated once for the whole table; the control hidden
  entirely when the reader's words reached nothing to compare on; (Q4) the same provenance view inside the console so a doctor
  sees exactly what patients are told about them — **DONE, O117 (2026-08-20)**, and **EXTENDED by O126
  (2026-08-20)**, which carried the QUERY-side provenance through as well: `matchAudit` computed
  the reaching phrase for every asked facet and dropped it on the way out, so the console's
  worked match showed "Titration and dose review 28" with no way to learn it came from somebody
  typing "wearing off". Now rendered as "reached by …", beside the patient's "from your words",
  with the two pinned character-identical. O126's claim wrongly described Q4 as still open —
  O117 had closed it — and the correction is recorded in that unit's ledger row.
  Original O117 record:
  `src/matching/provenance.ts` enumerates, per clinician, every label their declarations can put
  in front of a patient, the sentences those labels sit inside, and the not-declared frames —
  all composed by the functions the finder itself calls, with a test asserting the panel and the
  finder cannot disagree. Built from DECLARATIONS rather than a query, so it is complete rather
  than a sample. It exists because W190's correction path is only real if the thing to be
  corrected is legible: a doctor cannot object to a sentence nobody has shown them. Found and
  fixed in the same unit: `/console/matching` had never called `requireSession`, though its own
  header claimed staff-only, and was the single console route answering 200 to anybody.
  **The explaining-the-fit lane is now complete for the year: Q1 O51, Q2 O66, Q3 O102, Q4 O117.**

## The targeting-levels audit (O23)

docs/MATCHING-TARGETING-AUDIT.md judges the matcher against the advertising hierarchy
(demographic → remarketing). Its conclusion shapes this plan: the growth path is stated-
psychographic vocabulary breadth (Q1 corpus, O22 interview loop) and contextual clarifier
policy (Q3) — behavioural, programmatic and remarketing capability are standing refusals,
not backlog.

## What is deliberately NOT in the plan

- **Collaborative filtering / behavioural profiles** — requires per-patient histories the
  privacy posture refuses.
- **LLM-generated match reasons** — W213: reasons compose from the closed set; generation
  reintroduces unverifiable claims on a health surface.
- **Engagement-optimised ranking** (the dating-app Elo lineage) — optimising for time-on-site
  is the opposite of this product's promise; the only fitness function is "reached the right
  door".
