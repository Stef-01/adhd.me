# The matching pipeline, read closely (O78, founder-directed, 2026-08-20)

The founder's ask: "continue optimising the matching algorithm with a thorough code audit."
Method is O70's worked example applied to matching: read every module in the pipeline end to
end (`read.ts`, `needs.ts`, `match.ts`, the ranking half of `clinicians.ts`, `tie-quality.ts`,
`corpus.ts`), probe every suspected defect class against the live reader, fix what the reading
finds in the same unit, and record what was deliberately NOT done with reasons — a refusal
without a written reason gets re-litigated forever.

Every claim below was probed, not eyeballed; the probe sentences now live in the corpus or in
`reach.test.ts §O78`, so none of this report can go stale silently.

## Fixed in this unit

### 1. Suppression was per-CUE when every rule meant it per-OCCURRENCE (recall)

`findCue` returned only the first occurrence of a cue, so any suppression — O40/O72 negation,
O76 hedge, O77 on-behalf — of that first occurrence killed the cue for the whole text:

- "I don't want titration. **but titration support is exactly what I came for**" → read as nothing
- "not bulk billing at my old clinic. **bulk billing is essential now**" → nothing
- "if that makes sense is all I ever say, but truly **I need help to make sense of this**" → nothing

Every suppression rule's own documentation promises clause-local scope; the first-occurrence
return silently widened all of them to sentence-global. Fix: `findCue` takes a start index and
`readNeeds` retries past a refused span. Occurrence-local refusals (negation, hedge, on-behalf,
words claimed by another facet) retry; sentence-global refusals (the O45 collapse pair test,
which already reads the whole raw stream; an already-seen facet) end the search. **The standing
405-entry corpus was behaviour-identical under the fix — zero pin movement** — which is the
strongest available evidence it widens recall only where the old behaviour was accidental.

### 2. `unservedAsks` was the last reader of the global roster

Every other entry point takes an injectable roster (the O8 review's rule: score the roster the
reader is looking at); `unservedAsks` read the module-level `clinicians`, so a caller ranking a
custom roster reported the global roster's gaps beside it. Now `unservedAsks(query, roster?)`,
defaulting unchanged for the one production caller.

## Found, named, and deliberately left for their own units

Each is recorded as corpus data (`never` for today's truth, `aspires` for the gap), so the
promotion gate forces the retag in the same commit its fix lands — the O68→O72/O76/O77 loop.

### 3. Desire-negation over-scope swallows the NEXT ask in the same clause — FIXED BY O81 (2026-08-20)

> Landed as designed below: `desireNegationEnds` + `suppressedByDesireNegation` in read.ts,
> readNeeds restructured to collect candidates first and bind each trigger to its nearest
> following span (manner spends the trigger without being suppressed, so a care ask behind a
> manner object is no longer swallowed either). Both waiting aspirations promoted and
> retagged in the same commit; every §O40/§O72/§O78 pin held; the rest of the corpus was
> behaviour-identical.

"I don't want a woman GP, **bulk billing matters more**" reads as nothing: the O40 trigger's
3-token lead reaches past `woman gp` and suppresses `bulk billing` too. The same over-scope is
why "no interest in the dose, **I want the diagnosis question answered**" has sat in the
aspiration list since O68 — it was never a lexicon gap.

**The honest fix is consume-once scope** — a desire negation spends itself on the nearest
following ask — **not a shorter lead**: shortening to 1 would break "don't want anyone touching
the dose", a real refusal with two inserted content words. Consume-once needs cross-cue
coordination (the negation must know which matched span is nearest), which is a readNeeds
architecture change too large to ride along in an audit unit.

### 4. Reported refusal reads as the reader's own refusal — FIXED BY O83 (2026-08-20)

> Landed as sketched: `reportedRefusal` in read.ts — a reporting verb ({said, told}, earned
> set) directly before the bare negator vetoes the O72 suppression, with the raw-stream
> subject walk keeping the reader's OWN reported "no" refusing ("I said no", "I have said
> no"). The waiting aspiration promoted and the verb set's demonstrating sentences pinned
> in the same commit.

"**they said no to titration** and I want it anyway" → nothing: the O72 bare-not adjacency
fires although the refuser is somebody else. O40/O72 both read complaints as wants everywhere
else ("my GP won't do titration" reaches); this bare-not-after-reporting-verb shape is the one
gap in that posture. Candidate rule: a reporting verb ("said", "told") directly before the
negator marks reported speech and stands the suppression down.

### 5. A presence phrasing the cue set cannot hear — CLOSED BY O84 (2026-08-20), half fixed and half refused

> The audit's sketch ("a verb-agnostic pair, or 'sit in the room' as its own cue") was
> built and MEASURED into refusal, both halves: [sit, room] hears "I hate sitting in
> waiting rooms" through the insertion gap, and the collapsed "room with me" (O45 pair
> [room, with]) hears "I need to be in the room with someone" — a face-to-face ask, caught
> in-build by O77's own never pin. The discriminating word is "me", a stopword no pair can
> carry; the sit-phrase stays a standing aspiration (the O65 pattern) until a raw-run
> mechanism earns its way in. What precision allowed instead: "support person" landed as a
> cue, with the leak surface pinned silent in corpus and §O84 so the refusal is executable.

"she will **sit in the room** with me" reaches nothing: O25 re-authored "in the room with me"
to "come into the room" (collapse discipline), and the sit-shape went unheard with the wall
that O25 was killing. A verb-agnostic pair, or "sit in the room" as its own cue, closes it —
cue design work, i.e. an O22-loop lexicon unit, not a rule.

## Verified sound, with the probe that says so

- **W213 unity holds on adversarial input**: on a mixed negation+hedge+compound sentence,
  `scoreAgainst` equals the sum of `matchEvidence` weights to the thousandth for all three
  clinicians — the per-item-rounding law doing its job.
- **Roster-permutation order**: `rankClinicians` output order changes under roster reversal
  ONLY within exact score-and-capacity ties, which `properties.test.ts` pins at band level on
  purpose — within-band order is explicitly not a ranking, the UI says so (`topTieNote`), and
  pinning it would claim the thing the product refuses to claim. Not a defect; recorded so the
  next auditor doesn't re-flag it.
- **The negation/claim interplay** ("I don't want titration, the dose is fine" suppresses both
  titration cues; "…my dose needs adjusting though" in a NEW clause reaches) behaves per design.

## Optimisations considered and refused, with reasons

- **Precomputing the content→raw index map once per `readNeeds`** (it is walked per matched
  cue by the hedge and on-behalf rules): measured cost of the whole read is **0.049 ms per
  call** on a realistic compound sentence (2,000-call mean, this container). Matched cues per
  query are single digits; the map walk is O(sentence). Complexity spent on a twentieth of a
  millisecond is complexity wasted — refused until a profile says otherwise.
- **Caching `needsFor` across `rankBands`/`matchQuality`/`topTieNote`** (each recomputes it):
  same arithmetic, roster of three, pure functions. A cache adds an invalidation surface to
  save microseconds; the purity is worth more. Revisit only if the roster reaches a size where
  a profile shows it.
- **First-token cue index** (skip cues whose first stem is absent): same verdict — |CUES| ≈
  180 over ≤400 tokens is already inside the O55 wall-clock bound with two orders of magnitude
  to spare.
- **Maximum matching for `matchSlots`**: already argued and priced (`match.oracle.test.ts`
  measures the greedy's distance from optimal); the audit re-read the argument and it stands.
- **Porter stemmer**: O50's law stands — every INFLECTIONS entry needs a demonstrating
  sentence; Porter's conflations fire facets beside named clinicians.

## The retry's own cost, bounded

The retry only triggers on a suppressed occurrence, so the worst case needs adversarial
negator-cue repetition; the O55 caps (400 content / 1,200 raw tokens) bound it at O(n²) per
present cue and the fuzz suite's wall-clock assertion holds unchanged. Measured end-to-end
read cost after the fix: 0.049 ms/call (unchanged at probe precision).
