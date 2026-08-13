# W206 — Year-4 full-system audit (2026-08-12)

Independent review of the whole tree at the close of Year 4, run by `builder-A`. Scope is the W51
method: **the whole tree, not a diff.** The finding below justifies that choice — it lives in W43
code from Year 1 that Year 4 never touched, and it became a live leak because of something Year 3
did somewhere else entirely.

**Reviewer's independence, stated plainly:** most of Q15 and Q16 is my own work, and so is W166,
the unit whose consequence this audit found. Self-review is the weakest form, so the method leans
on **mechanical sweeps** and on hunting **known bug classes** rather than on rereading code I
already believe is correct. The finding did not come from judgement; it came from a sweep for the
class W181 met four firings ago, and it was confirmed by writing the failing test first.

## Verdict

**Year 4 is sound, with one cross-tenant privacy defect found and fixed.** Gate green at HEAD:
176 test files, 2,338 tests, typecheck, build and `audit:gate` clean. No founder gate is
unenforced; all thirteen `SHIPPED_*` registries re-derived from source.

## Finding

### Y4-1 — HIGH: every practice could read every other practice's complaints — FIXED

`app/console/complaints/page.tsx` rendered `getComplaints()` — **the entire store, unfiltered** —
to whichever practice was signed in. `app/console/page.tsx` rendered `openComplaintCount()`, a
count over the same unfiltered store, as *"N open complaints — review now"*.

Complaint records carry a `patientId`. So this was **patient-linked data crossing a tenancy
boundary**, and the banner was also a false call to action: a practice with no complaints of its
own was told to review somebody else's, and clicking through showed them.

**The field existed the whole time.** `Complaint.practiceId` has been on the type since W43. The
writer ignored it — `intakeComplaint` stamped the literal `"prac-console"`, an id no console has
ever minted (`prac-1`, `prac-2`, …) — so every complaint in the store belonged to nobody, and a
scoped read would have returned nothing. The readers were unscoped *because* the writer was.

**Why it is a Year-4 finding about Year-1 code.** Before W166 there was one practice and the
literal was harmless. W166 made two practices real, which converted a dormant modelling gap into
a live leak. That is precisely the causal shape of W181's ops-queue finding, and the audit found
this one by re-running that sweep across every store rather than only where Q16 had touched.

**PRIV-3 had recorded half of it and nobody joined the halves.** W103's finding B2 names
`"prac-console"` in `src/complaints/workflow.ts` as a modelling gap and has sat `available` since
Year 2. What was never written down is what the literal would *do* once multi-practice landed.
A recorded finding is not a closed one, and a finding recorded as a modelling gap does not
announce itself when it becomes a disclosure.

**Fix.** `intakeComplaint` and `submitComplaint` take the practice; the intake action had it in
hand and was dropping it. `complaintsFor(practiceId)` is the scoped read, filtered as the query
rather than afterwards (W123's rule). `openComplaintCount(practiceId)` counts through it.

**Deliberately NOT scoped, and tested as such:** `complaintsForPatient` and
`scrubPatientFromComplaints`. Erasure must reach both sides of every practice a patient has
touched — W106 records that, W103 gave the same reasoning for referrals, and adding a practice
filter to those two is exactly the change that would break erasure silently. A test pins the
direction.

Non-vacuity: unscoping the read fires two tests; restoring the `"prac-console"` literal fires
four, including a Year-1 guardrail test that had been passing on the wrong data all along.

## Confirmed-clean controls

Re-derived from source, not carried forward from the Year-3 audit:

- **Founder gates.** Thirteen `SHIPPED_*` registries. Twelve are empty and pinned empty by their
  own tests. The thirteenth, `src/registers/escalation.ts`, is legitimately non-empty: its
  triggers are operational (a patient replied in free text, a complaint was logged, repeated
  DNA), every one has `conditionCode: null`, and none states advice. No G5 content ships.
- **Frozen clocks.** No source file compares against a hardcoded date. One test did —
  `reviewBy > "2026-08-11"`, so no copy-acceptance could ever expire — found and fixed in W205
  the firing before this one. Credential expiry (`verification.ts`) and the audit gate both take
  the clock.
- **Vacuous assertions.** Swept for always-true numeric assertions across `src/` and `e2e/`. One
  hit, `dna.test.ts:71`, is a legitimate `[0,1]` bounds pair rather than a vacuous check. The
  vacuous assertions this tree found this year were all in units under construction and were
  fixed in the firing that wrote them.
- **Registry completeness.** W102's route census, W106's record classes, W167's fold sites and
  W200's copy surface all check **both** directions and all failed correctly during Q16 when new
  modules landed undeclared — three separate times, which is the evidence that they work.

## Outstanding, carried into Year 5

- **PRIV-3 stays open and its severity has changed.** The literal is gone from the write path,
  but the row's wider claim — that several modules assumed one practice — deserves the same sweep
  applied to `src/audit/store.ts`, which this audit did not reach.
- **The Ahpra advertising review** (Q9 action 5, carried through three dossiers, now open more
  than a year). W207 prices it.
- **G9 remains unratified**, and W204 recorded the consequence: the retention posture that is
  safest while nothing is sent is the wrong posture the instant something is.

## Method

Sweeps run over the whole tree, not the Y4 diff:

- every exported store read checked for a practice argument, and every one without a practice
  argument traced to whether a practice-scoped surface consumes it;
- every `SHIPPED_*` registry re-derived from source and its emptiness re-checked against its own
  test rather than against the previous audit;
- every date literal used in a comparison, in source and in tests;
- always-true assertion patterns across every test file;
- founder-gate enforcement re-derived from the source rather than from `docs/GATE-DOSSIER-*`.

The finding was confirmed by **writing the failing test first** and watching it fail, and the fix
was confirmed non-vacuous by reverting it in two different places and watching the new tests fail
again.
