# Matching root causes

One entry per root cause (LLM-MATCHING-PLAN.md §13): flaw, entries, layer, cause, the change, the
numbers before and after.

## R1 · F13 at L1 P1, 2026-09-27 · layer: the machine, not the tree

- **Entries:** P1's one request. The call timed out at 20 seconds and nothing was billed.
- **Cause:** `NODE_USE_SYSTEM_CA=1` is set on the founder's Mac through `launchctl`. Node 24 then
  reads the keychain's trust store synchronously at the process's first TLS connection: an
  event-loop probe measured one gap of 38 to 67 seconds, with lookup, connect and handshake all
  after it. curl, Python and Node 20 (which ignores the variable) connect in 1 to 2 seconds.
- **Change:** none in the tree. Live runs on that machine are started with
  `env -u NODE_USE_SYSTEM_CA pnpm match:eval …`.
- **After:** P1 passed at $0.000068 a call.

## R2 · F6 at L1 P3, 2026-09-27 · layer: READ · cause: capability at effort "minimal"

- **Entries:** P3's 59 dev requests (`reports/L1-P3-2026-09-27T13-58-00-301Z.md`). Precision
  17.7%, `never` violations 50%, C4 50%, recall 93.7%. One C10 line read every language.
- **Swap test:** the oracle's gold keys remove every failure, so the read is the layer.
- **Cause:** at "minimal" gpt-5-nano spends no reasoning tokens and fills the lists. Three prompt
  changes at "minimal" moved precision 17.7% → 26.2% → 30.7%; the same prompt at "low" reached
  78.3%. Per §12's stop rule that is a capability verdict, and "low" is the ladder's first rung.
- **Changes, one per run, each on the same 59 (runs tagged `RCA …` in the ledger):**

  | Run | Change | Precision | Recall | C4 | Exactly right |
  | --- | --- | --- | --- | --- | --- |
  | v2, minimal | lists start empty; examples in words the corpus does not use | 26.2% | 71.4% | 16.7% | 61.0% |
  | v3, minimal | every meaning line says "asks for" or "names"; a rule per field | 30.7% | 76.2% | 33.3% | 66.1% |
  | v3, low | effort "low", `max_output_tokens` 1,600 (400 left 16 of 59 incomplete, F1) | 78.3% | 88.9% | 83.3% | 86.4% |
  | + lexicon | a code rule: keep every key the lexicon hears unless the model refused it | 79.8% | 100% | 100% | 93.2% |
  | v4 | a key must rest on words it can point to; words addressed to a clinician are asks | 88.8% | 100% | 100% | 94.9% |
  | v5 | one key per thing described (reverted: a `never` violation) | 77.2% | 98.4% | 83.3% | 86.4% |
  | v6 | `collaborative` no longer says "explained" (it overlapped `sense_making`) | 86.8% | 100% | 100% | 93.2% |
  | v7 | what a past clinician did is story, not an ask | 91.9% | 100% | 100% | 93.2% |

- **After:** v7 at "low" with the lexicon kept passes P0 to P3 (prompt `beaa55762425`): precision
  91.9%, recall 100%, aspires 84.2%, `never` 0%, C4 100%, $0.000147 a call. It was tuned on these
  59, so P4 (all 338 dev requests) and the P5 holdout are the tests that count.
- **Open:** long narratives (C6) still carry most of the extra keys, and several of their extras
  are defensible reads the probes do not pin ("someone who lets me get to the end of a sentence"
  as `attuned`). A label change is the founder's call, not the tuner's.

## R3 · F6 and F10 at L1 P4, 2026-09-28 · layer: READ · cause: tuned on the sample, and one read is noisy

- **Entries:** P4's 338 dev requests (`reports/L1-P4-2026-09-27T14-26-58-954Z.md`): precision 80.9%,
  `never` 5.5%, against 91.9% and 0% on the 59 the prompt was tuned on.
- **Hand check** (by a model of another family, as F19 asks): of about 85 extra keys, 8 are asks the
  corpus does not pin, 15 are borderline and about 55 are wrong. The gap is the read's, not the labels'.
- **Changes, each measured on all 338:**

  | Run | Change | Precision | Never | Kept? |
  | --- | --- | --- | --- | --- |
  | replay | a list longer than half its field is a failed read (seen: all twelve care areas) | 83.4% | 5.5% | yes |
  | v8 | "an ask gates every key" | 78.5% | 9.1% | no |
  | mini | the ladder's next rung, gpt-5-mini at "minimal" | 67.6% | 12.7% | no: the ladder is spent |
  | 3 reads | the same prompt read three times; single reads ranged 80.6% to 83.4% | – | – | – |
  | 3 of 3 | keep a key only when all three reads give it | 92.8% | 3.6% | yes |
  | v10, 3 of 3 | time with the clinician is not punctuality; anxiety named, not inferred; `negated` also takes what is only mentioned | 94.2% | 3.6% | yes |

- **After:** v10 with three reads passes P0 to P3 under prompt `fc7d605b0fd2` (P3: precision 98.8%,
  `never` 0%, C4 100%). Three reads cost about $0.0004 a request and no extra time (they run at once).

## R4 · `never` at L1, 2026-09-28 · layer: the vocabulary and a policy, not the model

- **Entries:** requests every read gets wrong the same way, so voting cannot remove them. The
  formal P4 (`reports/L1-P4-2026-09-27T15-17-56-774Z.md`) met two: punctuality, below, and a
  red-team decoy, "the GP in the ad was a woman" → `pref:woman-gp`. The RCA samples met a third:
  - "flat for months, everything is heavy" → `care:depression`. The corpus forbids reading a
    condition from a state someone describes until the founder's G7 decision. A code rule that
    required an ask before any inferred condition removed it, but cost 13.5 points of `aspires`,
    because the corpus pins some named states as asks ("rejection hits me like a truck"). The line
    is naming, not asking, and it is the founder's to draw. Not adopted.
  - "I need appointments that start on time, waiting destroys me" → `manner:unhurried`. Punctuality
    has no facet, and the model takes the nearest one even when the meaning line excludes it.
- **Decision needed:** G7, and whether punctuality and the other candidates in
  `docs/matching/NEEDS-GAPS.md` §3 become facets. Until then these two are L1's break point (§14).

## R5 · `never` at L1, 2026-09-28 · layer: READ · cause: a decoy every read believes

- **Entries:** the formal P4 of the third pass (`reports/L1-P4-2026-09-27T15-17-56-774Z.md`):
  "the GP in the ad was a woman" → `pref:woman-gp` from every read, and punctuality read as
  `unhurried`. Rules in the read prompt fixed punctuality (v11: an example in words the corpus does
  not use, "a practice that runs on schedule") but not the decoy.
- **Change:** a check. After the reads, the keys they add beyond the lexicon (only those: the lexicon's
  keys are what recall rests on) go to a second question, "does the person ask for each of these for
  themselves?", three times at once; a key goes when most checks say no. Checking every key instead
  took mentions dropped to 87.5% but recall to 86.5% (the corpus pins family wishes and debatable
  lexicon reads as asks), so the check stays on the model's additions.
- **Measured on the saved v11 samples (358 dev):** precision 92.5%, recall 99.4%, aspires 67.6%,
  `never` 0%, C4 94.9%. The check ran for 81 of 358 requests ($0.015); a request the reads add nothing
  to costs nothing more.
- **Formal ladder** (prompt and check hashed together): P0 to P3 pass; P4 on 358 dev requests
  (`reports/L1-P4-2026-09-27T15-58-31-546Z.md`): precision 92.7%, recall 99.4%, aspires 64.9%, C4
  94.9%, `never` 1.6%. The one violation is punctuality ("I need appointments that start on time")
  read as `unhurried` by every read and upheld by the checks. The decoy and the described states did
  not recur. L1's break point is now a single request with no facet to land on (R4).

