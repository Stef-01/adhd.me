# Y2 gate dossier (W90) — G2–G5 readiness

> **FOUNDER ACTION REQUIRED — and the required actions have changed since Q3.** This refreshes
> `docs/GATE-DOSSIER-Q3.md` for what Year 2 built. Every gate below is still **CLOSED**, each
> is still enforced in code rather than by policy, and only the founder opens one. Gate
> definitions are quoted from `docs/FIVE-YEAR-PLAN.md` §4 and are inherited unchanged
> ("never expanded away", plan §6).

The most important change since Q3 is that **G5 stopped being theoretical**. In Q3 it was
"out of Y1 scope". It is now the single thing holding two ledger rows and the only reason
several shipped modules are empty. It also has a live inconsistency in it, recorded below,
which is the founder's to resolve.

## Gate status board

| Gate | Definition (plan §4) | Status | Code-level enforcement |
|---|---|---|---|
| G0 | dedicated repo | **CLEARED** 2026-08-08 | — |
| G1 | real PMS/booking API credentials | CLOSED — built to the gate | `VendorPmsAdapter` constructor refuses live vendor hosts; no live HTTP client exists in `src/pms`; vendor deep links ship disabled per practice |
| G2 | real patient data of any kind | CLOSED — built to the gate | All stores in-memory/synthetic; RLS default-deny schema ready, no live database wired. **New in Y2:** register membership, care gaps and safety flags all hold patient-linked data, and all three are synthetic-only by the same mechanism |
| G3 | live SMS to real patients | CLOSED — built to the gate | `TwilioSmsAdapter` refuses any `twilio.com` endpoint; only the mock adapter is wired. **New in Y2:** W67 adds a second, independent gate — no text sends without that practice's approval of that exact wording |
| G4 | pilot go-live | CLOSED — W40 playbook pre-registers criteria | Downstream of G1–G3 |
| G5 | clinical pathway content sign-off (specialist reviewers engaged) | **CLOSED AND LOAD-BEARING** — see below | W56 catalogue empty; W68 rule set empty; W60 catalogue is placeholders; W69 workspace ships with nothing signed off, enforced by the type system |
| G6 | network/directory public launch (Ahpra advertising review) | CLOSED — **but the tree now contains an unassessed directory** | No enforcement in code. `app/` serves a patient-facing clinician finder at `/` and `/finder`; synthetic clinicians only, no Ahpra review has happened |
| G7 | any feature that could constitute TGA-regulated CDSS | CLOSED — posture holds in the register chain, open question on the finder | Register membership is non-inferential by construction (W55 CHECK + union type, W57 property test). The care-finder matches on a patient's stated care needs, which is the question the founder has not yet ruled on |

## G2 — real patient data

**What changed in Y2.** The register chain introduced three new patient-linked stores:
membership (`RegisterMembership`), care gaps, and safety flags. Each is synthetic-only by the
same mechanism as everything else — in-memory stores, no live database — so G2's posture is
unchanged in kind, only wider in surface.

**One new question the founder should see.** `app/console/interest` (founder commit 3317340)
would hold contact details for people who are **not** patients of a subscribing practice.
That is a different collection to everything else in the tree: APP 5 notice, retention and
erasure all need answering for a population Meherr has no existing relationship with.
Synthetic today, so the exposure is theoretical — but it is not covered by the existing G2
analysis, which assumes practice-held patient records.

**Ready when opened**: W33's export/erasure flows now reach every store including complaints
(W51 fix); suppression survives re-ingest (W51 fix); retention config exists but
`runRetention` is still an uncalled export, which should be wired before G2 opens.

## G3 — live SMS

**What changed in Y2.** Two independent gates now sit in front of a send:

1. The adapter refuses a live endpoint (G3 itself, unchanged).
2. W67 requires that practice's approval of that exact wording, keyed by content hash, and
   `assertSendable` throws rather than returning a boolean a caller can ignore.

Also new: W66 blocks condition context from reaching patient copy, so the Q6 targeting work
cannot leak a register into a message. That is a compliance control, not a gate, but it is
what makes condition-targeted sending safe to contemplate at all.

**Ready when opened**: templates pass the W6 linter at build and send time; opt-out is
terminal and now durable across re-ingest; contact-hour preferences are honoured (W74).

## G5 — clinical pathway content sign-off

This is the gate that matters most in Y2, and it currently contains a contradiction the
founder needs to resolve.

**What is blocked on it, correctly:**

- W56's guideline intervals — the catalogue ships empty; a test pins the emptiness.
- W68's safety rules — the rule set ships empty; a test pins it.
- W60's register catalogue — placeholders that assert nothing clinical; a test pins that no
  real condition or guideline is named.
- SUP-1 and SUP-2 (W89's supervision hooks) — recorded as blocked rows.

In every case the **mechanism** is built and the **content** waits. W69 makes that structural:
unapproved content is unusable, enforced by the type system rather than a runtime check.

**The contradiction.** `app/clinicians` (founder commits 603219f, e083d7a) ships real
clinical guidance today — Rotterdam criteria for PCOS diagnosis, COCP contraindications
against WHO medical eligibility criteria, metformin start/titrate/review guidance, a 2025
trial citation. Meanwhile W56 is blocked, and has held the entire Q5 chain for ~19 hours, for
transcribing *published cycle-of-care intervals* — which is less clinically consequential
than medication titration guidance.

Both positions are defensible. They are not defensible **simultaneously**. Either transcribed
published guidance is G5 content, in which case `/clinicians` needs the same treatment W56
got; or it is not, in which case W56 should be unblocked and its values shipped with their
citations. The mitigations on `/clinicians` are real and deliberate — demo-only disclaimers,
synthetic case summaries, links to primary sources, nothing computed — and they may well be
the reason to rule it out of scope. But that is a ruling, and it has not been made.

**Recommended shape of the ruling** (not a decision, an offer of one): rule on *both at once*,
because they are the same question. If (a) not G5: unblock W56, ship the intervals with
citations, and record why `/clinicians` is also out of scope. If (b) G5: `/clinicians`'s
clinical content moves into W69's workspace and becomes unusable until signed off, which is
exactly what that workspace was built for.

## G6 — directory launch

**Status changed materially in Y2, without a decision.** The root route now serves a
patient-facing clinician finder with named profiles, photos, suburbs, distances and
availability, and `/finder` serves the same component under a demo-labelled route.

- **What holds today**: clinicians are synthetic (no real practitioner is represented); no
  ratings, stars or testimonials anywhere; WCAG AA enforced by the W49 sweep.
- **What does not exist**: any Ahpra advertising review of profile copy, which is what G6
  actually requires; and any compliance linter covering this copy — W6 gates message
  templates, W23 gates the B2B bundle, and neither reaches here.
- **Separately recorded**: `qa/audit-matching-trust/audit.md` lists seven P1 honesty defects
  in this flow (fabricated match reasons, invented travel times, hidden voice substitution,
  unprovenanced capability claims). They are the founder's own audit findings and all remain
  open. They are not G6 blockers, but shipping a directory with them would be worse than the
  gate question.

**G6 is not close to openable, and nothing in the tree pretends otherwise** — but the
prototype's existence should be a deliberate choice rather than a default.

## G7 — TGA CDSS boundary

**Where the posture holds, structurally**: the register chain. Membership admits only
`pms_condition_flag` and `practice_confirmed`; there is no inferential member of the union
and no code path that derives one, and W57's property test asserts that a patient carrying
every symptom-shaped signal (chronic-care marker, active recall, frequent attendance,
upcoming booking) and no condition flag is not a member. W58 types care gaps as
`notAClinicalRecommendation: true` at the literal level, so the disclaimer travels with the
value. W68's rails read flags, never derive them.

**Where the question is open**: the care-finder takes a patient's free-text description of
their care needs and ranks clinicians against it. Nothing diagnoses, assesses urgency, or
advises whether to seek care — so my reading is that it sits inside G7's stated default
("matching keyed to clinician attributes"), because it matches on *clinician* attributes even
though the patient's input mentions their health. But the next obvious iteration — "tell us
your symptoms and we'll find the right doctor" — lands outside it, and the boundary is easier
to rule on now than after that iteration exists.

## What this dossier asks for

Three rulings, in order of how much they unblock:

1. **G5, covering W56 and `/clinicians` together.** Unblocks two ledger rows and resolves a
   live inconsistency.
2. **G7 on the care-finder's matching.** Cheap now, expensive later.
3. **G6 posture on the finder and `/finder`** — prototype-only, or a shipping direction. If
   prototype-only, saying so in the ledger is enough.

Nothing else in Y2 is gate-blocked. Everything else that is unbuilt is simply unbuilt.

## Verification

Dossier complete: every gate G0–G7 has a current status, its code-level enforcement, what
changed in Y2, and — where one is needed — the specific founder action. Cross-checked against
`BUILD-STATE.md` (blocked rows: W56 values, SUP-1, SUP-2) and `docs/COMPLIANCE-DOSSIER.md`
(surface map, zero unmapped). `pnpm verify` green at the time of writing.
