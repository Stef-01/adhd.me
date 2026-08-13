# Year-1 full-system review — second pass (W51 follow-up)

**Relationship to `docs/AUDIT-W51.md`.** Two Year-1 audits ran. The first (that document)
was run by the interactive session after reclaiming W51 from builder-A under the staleness
rule; it swept for the defect classes that matter at the founder gates and found two, both
fixed. This one is builder-A's audit, which had already started when the row was reclaimed
and which finished afterwards. It went wider — six dimensions, adversarial verification of
every serious finding — and it found defects the first pass did not, including two
criticals. Neither audit is redundant: the first asked "what breaks when this meets real
patients?", this one asked "what is wrong with the code as written?". The findings do not
overlap. Both should be read.

Scope: everything built in W1–W50 — the measurement and eligibility engines, the booking
rail, the console and its server actions, the privacy/complaints/ops surfaces, the
compliance linters, and the committed collateral.

Method: a six-dimension fan-out audit (correctness, security/tenancy, privacy, honesty of
reported numbers, simplification, compliance coverage), each finding then handed to an
independent verifier prompted to **refute** it against the code. 44 findings were raised;
12 serious ones were adversarially verified. Nine survived, three were refuted outright,
one was downgraded. The verifiers did real work: they refuted three plausible-sounding
serious claims and cut one "high" to "low" by showing every claimed harm was unreachable.

Everything below was read against the code as it stands. All figures are from the
synthetic sim — no real patient data exists in this tree (founder gate G2).

## Confirmed and fixed this unit

| # | Severity | Where | Finding | Fix |
|---|---|---|---|---|
| 1 | **Critical** | `src/privacy/store.ts` | Patient erasure and the APP-12 export both missed the complaints store: `deletePatientEverywhere` rewrote only the booking-rail dataset, so a raw `patientId` entered at complaint intake survived "delete everywhere" — and `exportForPatient` then rendered "No data held for this identifier" over a record that still held it. | `railDataset()` is now composed with the complaints store on both paths: `exportForPatient` returns the patient's complaints and counts them in `held`; `deletePatientEverywhere` scrubs the patient link from every complaint and reports the count in the deletion record. Pinned by two tests, one of which asserts the raw id appears nowhere in the store's JSON after erasure. |
| 2 | **Critical** | `src/complaints/store.ts` | "No further contact" was reported as applied whenever a non-empty identifier was supplied, regardless of what happened. The invitation match is strict equality on unvalidated free text, so a typo (`pat 1`) closed zero offers, wrote `optOutApplied: true` and a timeline entry reading "no further contact" — while the real patient kept receiving messages. Compounding it, the opt-out was never durable: it flipped today's queued/sent invitations and nothing else, so a later PMS re-ingest would re-invite the patient. | The opt-out now (a) writes a privacy **suppression entry** — the one mechanism that survives re-ingest — keyed by the same one-way `patientRef` erasure uses; (b) reports what it actually did, including the number of offers closed; and (c) records `optOutMatchedPatient` and shows a warning badge on the complaints page when the identifier matched no held record, because the correct response to a typo is to fix it, not to file it as done. |
| 3 | High | `app/console/results/page.tsx` | The practice-facing results page evaluated guardrails with a hardcoded empty complaints list, so the zero-tolerance complaints monitor could never fire there — the page printed "Nothing needs your attention" with a complaint open. The intended contract is stated in `src/complaints/store.ts`: banner and monitor read the same count. | Reads `getComplaints().complaints`. |
| 4 | High | `app/console/usefulness/actions.ts` | `submitUsefulness` checked only for a session, never the `record_usefulness` grant, and `recordOutcome` takes no caller identity at all — so any signed-in email, including a non-member, could write outcome records that feed the clinician-judged-reasonable rate. | Authorizes `record_usefulness` against the practice's memberships before writing; new e2e proves a signed-in non-member is refused. |
| 5 | High | `app/console/complaints/actions.ts`, `page.tsx` | Complaint intake mutates the rail — it applies terminal opt-outs — behind a session check only, and the complaints list (operator-entered, patient-linked data) was readable by any authenticated session. | Both take the lowest grant every member holds (`view_dashboard`), which keeps intake open to front desk while closing it to non-members. Triage/resolve keep `pause_sending`. |
| 6 | High | `src/console/store.ts` | *(Independently found and fixed on main before this landed — recorded because two audits reaching it separately is a signal about the defect, not noise.)* `saveClinicians` reassigned ids positionally on every roster save, so deleting or blanking a row slid every later clinician onto a predecessor's id. The session-config allowlist's cleanup is existence-based, so a migrated id was silently kept — and the practice's "these clinicians participate" choice quietly became a different person. | Fixed on main by the W41 review pass: rows carry an explicit `id`, and `nextClinicianSeq` never reissues a retired one. That fix is better than the name-matching one drafted here (a rename keeps identity), so this audit's version was dropped in favour of it. |
| 7 | High | `src/pilot/casestudy.ts`, `src/pilot/report.ts` | The case study and pilot report labelled the north star "incremental attended appointments per 1,000 **eligible** patients", but `countAttribution`'s denominator is the whole invite arm — and the case study defines "eligibility rules" as the practice's own W4 filter two paragraphs earlier. On the committed golden the mislabel is ~4.6× (≈700 ever-eligible vs 3,254 invite-arm): the printed 61.4 would read ≈285 against the label's own denominator. This is the document that becomes the G4 pilot template. | Relabelled "per 1,000 patients in the messaged group" everywhere (generator, report, golden, and the pinning test), and `docs/PILOT-PLAYBOOK.md` §6 now states the denominator explicitly and says why intention-to-treat holds it fixed. The engine was correct throughout — `docs/ATTRIBUTION.md` has always said "per 1,000 arm patients"; only the labels lied, in the conservative direction. |
| 8 | Medium | `src/complaints/store.ts` | The `patient_opted_out` audit event was attributed to `rail.state.invitations[0].practiceId` — the first invitation in the rail, which is not necessarily the practice acting. | Uses the console practice id, falling back as before. |

## Confirmed, not fixed — recorded with a reason

| Severity | Where | Finding | Why it stands |
|---|---|---|---|
| Low (downgraded from high) | `src/booking/rail.ts:83` | Session-full is judged against `allowedSlotIds`, but the expiry sweep keys on clinician + session date, so a backfill booking that exhausts the freed-slot set expires still-live weekly offers whose own slots remain open. | The mechanism is real and untested, but the verifier refuted every claimed harm: weekly responses run strictly before the backfill path, so no patient ever meets the wrongly-expired invitation; the converse ordering is impossible; booked/attributed/expired totals are identical either way; and the real booking page never passes `allowedSlotIds`. What remains is a latent defect and a false "session filled" audit detail. Fixing it means keying expiry on the booking cohort's allowed set — a change to the rail's core contract, which is not a thing to do inside an audit unit on a defect with no reachable harm. Carried into Y2 as a rail-hardening item. |

## Refuted by verification

Recorded because a future reader will re-raise them:

- **"Attribution reads arms from the current holdout flag, so a mid-window holdout change breaks intention-to-treat."** Refuted — arm assignment is a stable hash, not a mutable flag.
- **"Positional invitation ids collide when a session is re-pooled or a slot re-freed."** Refuted — no path mints a colliding id for a different patient.
- **"Complaint opt-out re-implements `handleStop` instead of calling the single declared STOP path."** Refuted as stated; the durability half of the concern was real and is fixed above (#2).

## Medium/low findings since actioned (2026-08-10)

Three of the recorded findings were fixed once the register work reopened the files they
live in. They are struck from the list below.

| Where | Finding | Fix |
|---|---|---|
| `src/sim/dashboard-data.ts` | The weekly dashboard coerced a null (no-holdout) incremental to `0`, contradicting the attribution law that no holdout means **no claim — "not zero, not an estimate"**. It printed a measured result of exactly no effect where nothing had been measured. | `null` now survives all the way to the render, which required widening the type through `results.ts`, `weekly.ts` and the chart tooltip. All four render "—" and the dashboard tile says "No holdout arm — no claim". Of the 32 recorded findings this was filed lowest, and it was the one that broke the single law the product is built around. |
| `src/engine/pool.ts` | `batchSize` returned a negative number for a non-positive `expectedResponseRate`, and `Math.min` then handed `slice()` a value that invited nearly the whole eligible panel — the safety ceiling inverted into a mass send. | Refuses: a rate that cannot size a batch is a misconfiguration, and sending nothing is the safe answer. A negative ceiling also sends nothing. Pinned across 0, negative, NaN and Infinity. |
| `src/engine/eligibility.ts` | A `futureBookingAt` in the **past** still triggered the `future_booking` exclusion: `daysBetween` goes negative for a stale date, and negative is `<=` the block window. So a patient whose PMS record kept a stale booking date — an appointment that happened, or one cancelled without the field being cleared, both ordinary in PMS data — could **never be contacted again**, silently, with the audit trail recording "future_booking", which was untrue. | Only excludes when the booking is today or later and inside the window; a stale date is treated exactly like no booking at all. **This changed real behaviour**: three committed goldens moved, and two tests that asserted comforting-but-unguaranteed properties had to be corrected — W63's recipient-subset claim (narrowing shrinks the pool, so a fixed batch reaches deeper) and W20's "naive always overstates" claim (the incremental figure is an estimate, and ATTRIBUTION.md says estimates are never clamped). The weekly report's explanatory copy assumed the naive figure was the larger one and now matches the direction actually observed. |
| `src/privacy/store.ts` | `runRetention` was a dead export — no route, action, cron or test called it — while the console displayed the retention policy as though it were in force. | Neither deleted nor quietly left standing: the capability is now real and operator-triggered ("Apply retention now", behind the same stewardship grant as export and erasure), and the page says outright that nothing runs it on a schedule yet. Scheduled enforcement belongs with real persistence; an honest manual control belongs now. A policy a console *displays* and nothing *applies* is a claim, not a setting. |
| `app/demo/actions.ts` | The demo launcher held a hand-maintained list of store resets, and every store added since had to remember to join it. They did not: by Y2 it was missing the rate limiter — so a relaunched demo could silently refuse bookings — plus the register store, the capability graph and the interest store. | Not "add the four missing calls". `src/lib/stores.ts` is now the single registry, and its test reads the source tree and fails if any exported `reset*` is unregistered. Adding a store without registering it breaks the suite at the point the store is added, rather than silently in a demo months later. Nobody was careless here; a list that must be updated from a distance is simply a list that drifts. |
| `app/console/actions.ts`, `app/console/setup/actions.ts` | `Number(formData.get(...))` coerced a missing or blank field to **0**, and 0 is a *legal* value for every eligibility field — so validation could not catch it. A form that omitted `minDaysSinceLastVisit` silently stored "no recency floor", and the practice would start contacting patients it saw yesterday. | `numberField()` treats absent and blank as NaN, which every validator already rejects, so a missing field surfaces as a field error instead of a permissive setting. The onboarding action had guarded `holdoutPercent` this way inline, with a comment naming the exact hazard; the eligibility fields never got it. Extracting it means the next numeric field cannot be added without the guard. |
| `src/spine/spine.ts` | `verifyLog` could not detect tail truncation, contradicting the module's stated "detects deletion or reordering". Investigating it turned up a second, larger gap the audit had not recorded: `verifyLog` checks only sequence numbers, so **modifying an entry's payload in place is undetectable too**. | The claim is now precise about what is and is not proven, and `verifyLogAgainst` takes an external anchor — the only way truncation can become visible, since a self-describing log cannot prove it is complete. Payload modification needs a hash chain, which would change the entry shape and every committed golden, so it is recorded as a Y3 item rather than smuggled into an audit fix. The support runbook's reliance on the spine should be read against the corrected claim. |
| `src/registers/*` (W65) | Eleven Q5 findings including three tenancy leaks, a membership duplication bug and an unverified "invariants held" claim. | See `docs/HARDENING-Q5.md`. |

## Medium/low findings not actioned

32 further findings were raised at medium/low and left in place. They are recorded here
rather than fixed, because W51 is "fix criticals" and each of these is either latent, a
duplication, or a scope question that deserves its own unit. The clusters:

- **Honest-number edges.** `verifyLog` cannot detect tail truncation (interior deletion is
  the only pinned case); `batchSize` returns a negative for a negative expected response
  rate and `slice(0, negative)` then invites nearly the whole panel; the weekly dashboard
  coerces a null (no-holdout) incremental to `0`, contradicting the attribution law that no
  holdout means no claim; the fleet cost envelope divides by the realized response rate
  instead of the one that sizes batches; the final attribution window runs a week past the
  simulated horizon; "Expired on fill" in the sim report actually counts all expirations.
- **Input coercion.** `saveRules`/`saveStepRules` coerce missing or blank numbers to `0`
  via `Number(null)`/`Number("")`, silently storing valid all-zero rules; an invalid
  complaint channel is coerced to `phone` rather than rejected; complaint free text has no
  length bound.
- **Privacy plumbing.** `runRetention` is a dead export — no route, action, or cron calls
  it — while the console displays the retention policy as if it were in force. The
  suppression list is written (now by two paths) but never consulted before contact; it
  will need to be, at the PMS-ingest boundary, before G2. `erasePatient` records a deletion
  for any identifier including unknown ones, and duplicates on repeat.
- **Compliance-lint coverage.** The W6 patient-message linter and W23 B2B copy linter cover
  message templates and the landing bundle. Not covered: the patient-facing booking page,
  console UI copy, the public privacy pages, the demo page, the weekly report, and the
  committed sim/load reports. The sales deck carries an unverified competitor claim in a
  speaker note that sits outside the market-claims guard. This is the single largest
  coverage gap the audit found and it wants a unit of its own — "every user-facing surface
  passes a linter" is a legible goal and the current partial coverage reads as full.
- **Duplication.** The trailing-quarter caps map is built at two send sites plus a
  hard-coded third copy in the invariant checker; the ~20-line invitation-send block is
  duplicated between the weekly and backfill paths; eligibility-config form parsing is
  duplicated verbatim across two actions; the grant-guard helper is triplicated across ops,
  complaints, and privacy actions; the demo reset roster is hand-maintained and
  `resetRateLimits` has already fallen out of it (a relaunched demo can silently refuse
  bookings).

## Verification

`pnpm verify` (typecheck · test · build · audit:gate) green: 446 unit tests across 55 files
— five new regression tests, one pre-existing assertion widened for the new deletion field —
and the W53 dependency gate passes with its two accepted advisories.
`PW_CHROMIUM_PATH=/opt/pw-browsers/chromium pnpm e2e` green, including the new non-member
deny path.

One flake was found and closed while re-verifying: the W49 axe sweep intermittently reported
`document-title` on the booking confirmation page, which has a title pinned. axe reads the
title once, instantaneously, so the confirm action's revalidation swap can be caught
mid-flight. `expectNoViolations` now asserts a non-empty title first — the same requirement
with a retry, so a genuinely title-less page still fails, and fails more legibly. Founder gates unchanged: synthetic data only, no live SMS, no
production credentials, no symptom-based triage, no public directory copy.
