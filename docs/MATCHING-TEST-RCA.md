# RCA: how "Kind Hindi speaking and non judgemental" got past the testing (O13)

A production screenshot showed the finder failing a basic query: the banner said "we could not
tell what you are looking for", the count line claimed a ranking anyway, and a card printed
"Hindi-speaking" as evidence for an order that never happened. This is the root-cause analysis
of why the testing that had just been called "thorough" did not catch it. It is written against
the tester, not against the test suite.

## 1. What the screenshot actually shows, separated honestly

The URL in the screenshot (`adhd-lovat.vercel.app`) serves **main**. Three of the four visible
defects — evidence printed but not ranked on (F2), the roster-global verdict (F3), and the
count line contradicting the banner (O11) — were found by the appraisal and fixed on the
still-unmerged PR branch. Testing the preview URL would have shown those repairs.

That is context, not exoneration, because the fourth defect fails **on the branch too**:

> `"non judgemental"` → reaches nothing. In either spelling, hyphenated or not, negated or
> not. The facet is named `non_judgmental`. Its on-screen label is "Non-judgmental". One of
> the two GPs declares it. **The facet's own name was unreadable**, so the branch reads the
> query as Hindi-only: an honest tie instead of the earned order the words asked for.

## 2. Root causes of the testing failure

### RC1 — The edge suite tested the wrong axis and called it thorough
O9 probed the adversarial axis exhaustively: emoji, injection strings, 10k-word essays,
degenerate rosters, determinism, closed-vocabulary echo. All of it asserts the pipeline cannot
be *broken*. None of it asserts the pipeline can *hear* — semantic reach was implicitly
delegated to the pre-existing reach ratchet, whose corpus nobody extended. "Thorough edge
testing of the whole matching pipeline" was read as "hostile inputs", when the commonest edge
of a language system is an ordinary phrasing it has never been pointed at.

### RC2 — Every reach control looked in the same direction
The O7 self-reach pin tests **lexicon → facet** (every authored cue reaches its own facet).
The ratchet corpus tests **corpus → facet** (fixed sentences keep reaching). Nothing tested
**label → facet**: that the words the product itself puts on screen — "Non-judgmental",
"collaborative", "culturally…" — are readable when a person says them back. The cue lists were
verb-phrase-heavy ("won't judge", "judged"), the bespoke stemmer cannot bridge
"judgemental"→"judg" by design, and no control existed to notice the gap.

### RC3 — The screenshot verification was circular
O10's queries were drawn from vocabulary the lexicon already reads ("titration", "Urdu"). They
proved the product ranks what it can read — real and worth proving — but could never expose
what it cannot read. Verification queries chosen by the author of the lexicon inherit the
lexicon's blind spots.

### RC4 — No test used the deployment a user would
Everything ran against the branch; the user ran production. The gap between "fixed" and
"merged" was invisible in every report that said "green".

## 3. The measured extent, and the fix

A 28-probe sweep over plain-name phrasings, written only after the failure, found **11 misses
across 7 of the 8 manner facets**. Fixed by cue additions (adjective and name forms:
judgemental/judgmental, "without judgement", collaborative, methodical, attentive,
"take(s) (me) seriously", culturally): each is the word a person uses, none is a new
per-clinician weight, all inside G7's preference reading. Three additions were considered and
**refused for precision**, with the reasons recorded in the cue lists so they are not
re-litigated: "kind" (one token; fires on "what kind of doctor"), "patient" as an adjective
(this is a health product), "takes their time" (the [take, time] shape W223 removed for firing
on "take time off work").

## 4. Controls now standing

- **Plain-name reach table** (`reach.test.ts`, O13): every manner facet × its natural
  phrasings, including both spellings and the negated forms. A facet whose name stops being
  readable fails by name. Known bound, stated: the table is hand-extended — a facet added
  tomorrow needs its row, and the interview that creates facets is the place that rule lives.
- **The production query, pinned end to end**: reads both halves, verdict `informed`, the
  non_judgmental declarer first.
- **The screenshot spec gains the failing query** so the fix is visible in pixels, from the
  same angle the failure arrived from.

## 5. What this changes about how verification is claimed here

A green suite is evidence about the questions the suite asks. The O9 report said "the pipeline
held at every edge" when it should have said "at every edge I thought to test" — and the edge
that failed was not exotic, it was the product's own label said back in plain English. The
correction is RC2's control plus this rule of thumb, recorded for the next verification pass:
**test from the screen inward** (what a person sees and says), not only from the code outward.
