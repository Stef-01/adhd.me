# W256 — Five-year full-system audit (2026-08-21)

Review of the whole tree at the close of Year 5, run by `loop-0821a`. Scope is the W51 method:
**the whole tree, not a diff.** Every figure below comes from a command run during this unit. None
is carried from `AUDIT-Y4.md`, and where a Y4 number and a Y5 number differ, the difference is
recorded rather than the newer number quietly replacing the older.

**Reviewer's independence, stated plainly, and it is worse than any previous audit's.** W206 could
say "most of Q15 and Q16 is my own work". I built **eight of the units this audit covers, today**,
in the hours immediately before running it — W246, W247, W248, W250, W252, W253, W254, W255 — and
I wrote or extended several of the registers the rest of the tree relies on. This is the weakest
form of review there is: rereading code I believe is correct because I wrote it an hour ago, and
belief is precisely what an audit must not run on.

Stating that is the minimum. The method has to compensate for it, so:

- every claim is a **command run in this session**, with its output, not a recollection;
- the search is for **known bug classes**, not for code that looks wrong to its own author;
- the one real finding was **reproduced by a failing test written before the fix** — W206's
  discipline, because a finding a test has not reproduced is a hypothesis about code somebody read;
- where a sweep's own measurement turned out to be wrong, **the correction is in this document**
  rather than silently improved — Y5-2 records two of mine, and the register I wrote for it and
  then abandoned because it was producing false positives I would have had to tune away.

## Verdict

**Year 5 is sound, with one cross-tenant defect found and fixed, and one class of silent control
failure found, demonstrated and fixed in four places.**

Gate at HEAD: **252 test files, 4,039 tests**, typecheck, build and `audit:gate` clean (2 accepted
advisories, 0 unaccepted). 248 source modules, 53 e2e specs. Ledger: 238 done, 16 blocked, 4
available. No founder gate is unenforced.

(These are HEAD *after* this unit's own fixes and guards, which added a test file and three tests.
Before them: 251 files, 4,036 tests. Stated because an audit's gate figure that silently includes
the audit's own additions is a number nobody can reconcile.)

---

## Findings

### Y5-1 — MEDIUM: the results page's complaint monitor counted every practice — FIXED

`app/console/results/page.tsx` computed its guardrail alerts from:

```ts
metricsFromSim(runSim(DEFAULT_SIM_CONFIG), getComplaints().complaints)
```

`getComplaints().complaints` is **the entire store**. `metricsFromSim` counts the open ones, and
`evaluateGuardrails` turns that count into an alert rendered to whichever practice is signed in.
The page resolved no practice at all — no `requirePractice`, no `activePracticeFor`, no practice id
anywhere in the file.

**This is Y4-1's shape in a third place.** Y4-1 was the complaints page rendering the whole store,
and the console home rendering an unfiltered open count as *"N open complaints — review now"*. W206
fixed both of those. It did not reach this page — which is exactly how Y4-1 itself survived from
Year 1, and exactly what W206's own row predicted when it noted `src/audit/store.ts` carried the
same assumption and "this audit did not reach it".

**What is and is not disclosed, because the severity turns on it.** No complaint row is rendered
here, so unlike Y4-1 nothing patient-linked reaches the screen. What crosses the tenancy boundary
is the **existence and count of another practice's open complaints** — and the consequence W206
named for the console home applies unchanged: a practice with none of its own is shown a guardrail
alert about somebody else's, which is a false call to action on a monitor that is supposed to be
that practice's own.

Reproduced before it was fixed (`src/guardrails/y5-1.test.ts`):

```
Alice's practice: 0 complaints.  Bob's practice: 1 open complaint.
page's expression      → openComplaints: 1  → complaints alert RAISED on Alice's screen
scoped to Alice        → openComplaints: 0  → no alert
```

**Fix.** `requirePractice()` and `complaintsFor(record.practice.id)` — filtered as the query rather
than afterwards, W123's rule, the same fix W206 applied to the other two pages. Three regression
tests, one of which reads the page's own source so the call site cannot be reverted quietly.
Seeded: reintroducing the old expression fails the suite.

### Y5-2 — MEDIUM: four source-scan guards passed on an empty string — FIXED

Sixteen files in this tree scan their own source, stripping comments first so a rule is not matched
by the sentence describing it. **Four of the sixteen never checked that the stripper left anything
behind.**

That is a control which can stop controlling in silence. Demonstrated, not asserted — replacing
`src/verticals/model.test.ts`'s stripper with one that returns the empty string:

```
all 21 tests in the file: PASS
```

The guard that goes vacuous there is not a minor one. W157's ledger row describes it as
load-bearing for the G5 boundary: *"a test reads model.ts's own SOURCE and fails if it contains the
vocabulary of sign-off"*. Empty in, everything passes, nothing says so.

**Fix.** All four now assert the stripped source still contains code they know is there
(`src/verticals/model.test.ts`, `src/engine/arm-stability.test.ts`, `src/matching/explain.test.ts`,
`src/quality/landing-motion.test.ts`). Re-running the same demonstration against the fixed
`model.test.ts` now fails correctly.

(Sixteen is itself a re-measurement: my first sweep for stripping files found twelve, with a
narrower pattern. The four it missed were all already checked, so the finding's size did not move —
but the denominator did, and it is the corrected one here.)

**Two corrections to this finding, recorded rather than tidied away.** My first sweep reported
*seven* files without the check; re-measuring found four, because the detector matched a fixed list
of phrasings and three files said the same thing in words it did not know. Then a broader detector
flagged four MORE — and all four of those were fine too: `interop/fhir.test.ts` checks with
`toContain("export function appointmentToFhir")` and no message at all, `capacity/coupling.test.ts`
checks a **counter** (`walked > 200`) rather than the stripped text, and two modules assert
non-vacuity from their companion test files. **Both wrong numbers were mine**, and an audit that
reports an unverified figure is doing the thing it exists to prevent.

**And there is no general control here, deliberately.** The obvious move after fixing four cases is
a register: discover every file that scans stripped source, require each to check its stripper. I
wrote it; it produced the four false positives above, because it matched assertion **messages** —
a proxy, and every proxy this session has been wrong in the direction its author was not facing
(W200, W106, W167). The next move would have been to widen the pattern until it went green, which
is **tuning a regex until it agrees with me**, and a register tuned that way reports coverage it
does not have.

**The real fix is a different shape and is named rather than left as "somebody should".** Detecting
the check is wrong; one shared helper that strips and **throws when it strips everything** makes the
failure impossible instead of detectable. W254's `codeOf` is already that helper, in one file.
Consolidating the other implementations onto it is a unit with a dozen call sites and a helper whose
own test proves it throws. `src/quality/stripper-vacuity.test.ts` guards the four fixes, records the
abandoned register and pins the reference to `codeOf` so it survives an edit.

---

## Sweeps re-run from source

Every one of these is a command run in this session. The Y4 column is what `AUDIT-Y4.md` recorded;
it is here for comparison, not as evidence.

| Sweep | Y4 | Y5 (re-derived) | Note |
|---|---|---|---|
| `SHIPPED_*` registries | 13 | **22** | The tree grew nine: interop (4), capacity (2), platform (1), credentials, outcomes. |
| …empty and pinned | 12 | **21** | |
| …legitimately non-empty | 1 | **1** | `SHIPPED_TRIGGERS` in `src/registers/escalation.ts`. Re-read, not carried: four triggers, **every `conditionCode` null**, all routing to the usual GP. Operational only. |
| Frozen clocks in source | 0 | **0** | 17 hardcoded dates found; all are `at:` fields on fixture records, demo rosters and regression corpora. None is a clock being read. |
| Store reads with no practice in the signature | — | **3** | All correct: two are test resets; `complaintsForPatient` is **deliberately** unscoped, and W206 says why — erasure must reach every practice a patient has touched, and adding a filter there is the change that would break erasure silently. |
| App surfaces (census, run now) | — | **62** (47 pages, 15 routes) | |
| Route handlers reachable in production | — | **15, all gated** | 13 `/api/mock/*` routes call `assertMockRoutesEnabled` and 404 outside a build that opts in; `/api/interest/export` checks `verifySession` **and** `isAdhdMeStaff`, gated at the route as well as the page because a route handler is independently invocable (W13). |
| Constant-on-both-sides assertions | 0 | **4, all legitimate** | Each is a compile-time test: the real assertion is a `@ts-expect-error` that fails `tsc` with TS2578 if the call starts typechecking. `expect(true).toBe(true)` exists so vitest sees an assertion. Noted below. |

---

## The pattern this session found three times, and what it implies

W246, W247 and W252 each found the same defect in a different register, and none of the three was
looking for it:

- **W200** (operator copy) enforces that every module appears — and never that every string a
  declared module exports is declared. A new sentence goes unlinted until somebody lists it. 111
  undeclared string-bearing exports measured; most are data, so the rule itself would be wrong.
- **W106** (record classes) finds a class by scanning for `globalThis as {` — a **proxy** for
  holding data. `src/interop/disclosure-ledger.ts` holds no store while being the module whose
  entire subject is what left this tree about a named patient. Undeclared through its own unit and
  four after it.
- **W167** (fold sites) matches `.reduce(`, `.at(-1)` and `[x.length - 1]`. A `Map` accumulated in
  a `for` loop and emitted through a sort is a fold and matches none of them. 20 modules
  group-then-emit, 16 undeclared.

**Every register checks the direction its author was facing.** That is the finding, and it is worth
more than any of the three individually: the next register will have a direction too, and the
question to ask while writing it is which one it is not checking.

Two of the three were **left open deliberately**, with their size measured, because the repairs
want opposite treatment and neither is a passing job:

- W200's needs per-export classification (copy vs data) — a rule with 111 exceptions is weaker than
  the prose it would replace, so the rule as stated is wrong.
- W167's rule is **right** — all 16 genuinely need dispositions, each requiring somebody to
  establish that a sort is total. It is the sixteen pieces of analysis that make it a unit.

A recorded finding is not a closed one (W210, and PRIV-3's two-year history). These two are
recorded **in the registers themselves**, where the next reader of each meets them, not in a
document nobody re-reads.

### And I looked for a fourth

The obvious candidate was W102's surface census, whose compliance sweep filters `kind === "page"`
and therefore never reads the 15 route handlers. That is defensible for a **copy** sweep — a JSON
route serves no public copy — so the real question was whether those routes leak. They do not: all
15 are gated, checked above. Recording the negative result, because "I looked and found nothing" and
"I did not look" are the two things this session keeps proving are different.

---

## Observations, not findings

**The `expect(true).toBe(true)` convention is correct and illegible.** Four compile-time tests end
this way; the assertion that matters is the `@ts-expect-error` above it. A vacuity sweep flags all
four every time, and a reader who does not know the idiom reads them as dead assertions. A one-line
comment convention at each site would end that permanently. Not changed here: an audit unit
rewriting four files across four lanes for legibility is scope it did not claim.

**Seven source scans in this session's work fired on the sentence explaining their own rule** —
W228, W230, W236, W247's W106 detector, twice in W254, and once more in W256's own Y5-1 regression
guard, which quotes the defective expression in order to explain the fix. Y5-2 found sixteen
independent implementations of the stripper that fixes it, differing in what they remove. The
recurrence is not that comments are tricky. **A guard written against raw source punishes
documenting the thing it guards**, so stripping should be the default rather than the repair, and
the stripper should be one shared checked helper rather than twelve. That consolidation is a unit,
not an audit edit — and Y5-2 above is the argument for why it must be a helper rather than a
register.

**Name collisions across lanes are becoming a class.** W254 found `ScopeRefusal` exported from both
`scope.ts` and `scopes.ts` meaning different things, and this audit's registry sweep found
`SHIPPED_BINDINGS`, `SHIPPED_DISCLOSURES` and `SHIPPED_TRIGGERS` each declared in two lanes. The
registry cases are harmless today — nothing imports both — and they are the same shape as the one
that was not.

---

## Founder gates

No gate is unenforced. 16 blocked rows, each naming its gate: **G5** ×6, **G10** ×2, **G6** ×2,
**G8** ×2, **G9** ×2, **G3** ×1.

**Seven decisions remain outstanding**, unchanged by this audit and none of them blocking it:

1. Dr Anusha Saxena's relationship to ADHD.ME (`src/demo/roster.ts`)
2. Saif Tareen's photo, role and remit
3. `"prescriber"` on Dr Anusha's profile
4. `"mental health"` on her profile
5. The disclosure-ledger posture (`DISCLOSURE_PAYLOAD_POSTURE`, one line, both consequences written
   beside it)
6. **G10** ratification, priced in `docs/GATE-DOSSIER-Q19.md`
7. **The second care area** — W248 and W249 are titled with the pre-reorientation domain while
   W186's row states they hold autism. Raised by W248; the plan banner was corrected from three
   affected units to five, and the care area itself was **not** picked by the loop.

One thing worth flagging that no gate covers: **a credential for this product's own API**. G1
covers PMS and booking credentials; W254 ships the scope model with no minting path and an empty
grant registry, and says outright that no named gate protects it. When an integrator is to hold a
credential, that ruling and the minting path arrive together.
