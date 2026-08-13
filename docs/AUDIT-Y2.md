# W103 — Year-2 full-system audit (2026-08-10)

Independent review of the whole tree at the close of Year 2, run by `builder-B`. Scope is the
W51 method: **the whole tree, not a diff.** Auditing only the Y2 diff would have missed both
findings below — one lives in W57 code that Y2 never touched, and the other is a property of
how the console has been assembled since W22.

**Reviewer's independence, stated plainly:** roughly half the units under review are my own,
including W95 and W102 written today. Self-review is the weakest form, so the method leans on
mechanical sweeps and on hunting *known bug classes* rather than on rereading code I already
believe is correct. Both findings below came from a sweep, not from judgement.

## Verdict

**Year 2 is sound, with one latent cross-practice defect found and fixed.** Gate green at HEAD:
98 test files, 1098 tests, typecheck, build and `audit:gate` clean; ~20.9k LOC of first-party
source across 32 modules; 34 routes, all mapped. No founder gate is unenforced. Nothing
outstanding blocks G0–G7.

## Findings

### B1 — HIGH at G2, latent today: one practice's derivation could close another's register row — FIXED

`reconcileMemberships` (W57) keyed rows on `patientId::conditionCode`. `RegisterMembership`
carries a `practiceId` — `0004_registers.sql` makes it NOT NULL — and the natural call is
`store = reconcile(store, derived, at)` over whatever the store returns. With `existing`
spanning two practices, any shared patient id collided.

The consequence was **a write, not a stale read.** Practice A's derivation does not contain
practice B's patient, so B's open row took the "basis gone — close" branch and was stamped
`removedAt`. A patient would silently drop off a register belonging to a practice that A cannot
see, and because removal is by design indistinguishable from a legitimate departure, nothing
downstream would flag it.

This is the **fifth instance** of the class W91 documented (W71+W64 found by W65, W74 by W78,
W82 by W91) and the first that mutates another practice's data rather than merely reading it.

**Fix.** Three parts, because the first alone was not enough — proven by writing the regression
test first and watching it still fail:

1. `key()` now includes the practice.
2. `reconcileMemberships` takes an explicit `practiceId`. It is **not** derived from
   `derived[0]` the way W71 derives it from the gaps, because `derived` is empty in exactly the
   case that closes rows — an inferred scope would be unknown at the only moment it matters.
3. Foreign rows are **passed through unchanged**, not dropped. "A foreign record is absent"
   (W91) is the right posture for reads and the wrong one here: with `store = reconcile(store,
   …)`, absent means deleted. Not this call's business is not the same as not there.

Also fixed alongside: `currentMembers(memberships, conditionCode)` had **no parameter to scope
by**, so it could not be called correctly — a footgun with no product caller yet. It now takes
a `practiceId`.

Regression-tested both ways: another practice's row survives untouched, and this practice's own
reconciliation still closes and reopens as before.

### B2 — MEDIUM (process, not a defect): the console cannot represent two practices, so console-side scoping is untested — FILED

`ConsoleState.practice` is a single nullable practice, and the practice id is the hardcoded
literal `"prac-console"` in three places: `src/console/store.ts`, `src/complaints/workflow.ts`
and `src/audit/store.ts`. Consequences:

- `openComplaintCount()` counts every complaint in the store with no practice filter, and
  `tallyOutcomes(records)` takes no practice at all. Both are correct **only** because the store
  can hold one practice.
- Every console-side practice-scoping bug is therefore structurally unobservable. The four
  earlier instances of the B1 class were all found in *domain* code that takes collections
  spanning practices; console code has never been in a position to exhibit the bug, which is
  not the same as being free of it.
- W97 landed multisite tenancy this quarter, so the day this store becomes multi-practice is
  now foreseeable, and on that day all three hardcoded sites become defects simultaneously.

Not fixed here: threading practice identity from the session through the complaints, audit and
console stores is a refactor across three modules and interacts with W97's group model. Filed
as **`PRIV-3`** in `BUILD-STATE.md`, with the trigger condition — *the first store change that
lets `ConsoleState` hold more than one practice must land with the identity threading, in the
same unit.*

## Confirmed-clean controls

Re-verified against the whole tree, not carried forward from W51.

| Control | Evidence |
|---|---|
| G1 live-PMS gate | `VendorPmsAdapter` refuses live vendor hosts; **no HTTP client exists in `src/pms` at all**; instantiated nowhere outside tests |
| G3 live-SMS gate | Exactly **one** `fetch(` in the entire tree, in `TwilioSmsAdapter`, whose constructor throws on any `twilio.com` endpoint; instantiated nowhere outside tests |
| G2 real-patient-data gate | Every store in-memory/synthetic; no live database wired; migrations exist but nothing writes to them |
| G5 clinical-content gate | `usableContent()` branding makes unapproved content unrepresentable; catalogue ships with zero signed-off content; W56 values still blocked |
| G7 no-symptom-triage | Register membership admits only `pms_condition_flag` / `practice_confirmed`; barriers recorded never inferred (export-list test); no ranking of patients by need on any surface |
| Compliance linter | Both `.send()` call sites in the tree are immediately preceded by `renderCompliant()`; W95's leakage nudge renders through the same gate and is asserted byte-identical to the plain invitation |
| Opt-out terminality | `optedOut` is written `true` in ingest and the complaints rail; no path clears it |
| Determinism | `Math.random` appears once — in a comment saying it is banned. Every clock is an injected parameter with a default |
| Authorization in server actions | All 11 `"use server"` files gate inside the action: 8 via `requireSession`/`authorize`, `book/actions.ts` via signed token + rate limit (and cannot write a practice), `demo/actions.ts` via `assertDemoEnabled()`, `interest-actions.ts` public by design + rate-limited (see W102 `PRIV-1` for its export route) |
| Secrets hygiene | Zero hardcoded credentials or tokens in `src`/`app` |
| Type escapes | Zero `as any`, `@ts-ignore` or `@ts-expect-error` in 20.9k lines |
| Code debt | Zero TODO/FIXME/HACK/XXX markers |
| Surface coverage | 34 routes, 34 census lines, checked in both directions by `src/compliance/surfaces.test.ts` (W102) |
| Dependency exposure | `audit:gate` PASS — 0 unaccepted, 2 accepted with rationale |

## Scheduled failures (not defects — dated commitments)

1. **2026-11-09** — both `image-size` acceptances in `src/security/audit-allowlist.ts` expire and
   `audit:gate` starts failing by design. Either upstream has shipped a fix by then or the
   acceptance gets re-argued; neither should happen by silently extending the date.
2. **2026-12-10** — APP 1.7 commences. `PRIV-1` and `PRIV-2` (W102) should close inside that
   window rather than be carried past it.

## Process observations (for the plan owner, not defects)

1. **The practice-scoping class is not converging, and vigilance is not the answer.** Five
   instances, all in first-party code, across four quarters; W91 recommended a mechanical lint
   and filed it, and nobody built it — then B1 turned up in the next audit. The sweep that found
   B1 was four lines of shell (*files containing a `practiceId`-bearing type that iterate a
   collection but never compare a `practiceId`*), which had 19 hits and about a 10% true-positive
   rate. That is noisy for CI but excellent for an audit. **Recommendation: keep it as an audit
   step rather than pretending it can be a lint** — the false-positive rate is a property of the
   heuristic, not of the tooling, and a noisy CI check gets suppressed within a week.
2. **Enumerated coverage lists rot; derived ones do not.** Three lists in this tree have fallen
   behind the routes they cover: the dossier surface map (twice) and the axe sweep (once, found
   by W102 one day after it was declared complete). The dossier's is now derived-and-checked;
   `e2e/a11y.spec.ts` still enumerates by hand and will drift again.
3. **Two vacuous tests have been caught by reading the artefact, never by the suite** (W60's
   wrong-page copy scan, W87's floor above every clinician). Both were caught because someone
   read the output rather than the assertion. The habit that works is the cheap guard —
   `expect(rows.length).toBeGreaterThan(0)` before scanning them — and it is now used in most
   new specs, but there is no check that it is used.
4. **Y2 shipped a lot of structure and no wiring.** W28/W29/W36's send path is still unconnected,
   so W74's contact preferences and W95's outreach plan are both captured and inert. That is the
   correct order given G3, but the gap between "modelled" and "operative" is now large enough
   that the first live quarter will be integration work, not feature work, and Y3's plan should
   say so.
