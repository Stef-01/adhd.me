# Meherr Pilot Playbook (W40, v1)

The 12-week Continuity Yield pilot, operationalised. Audience: the pilot practice's owner and
practice manager, plus whoever runs the pilot on our side. Everything here assumes founder gates
G1–G4 are cleared for THIS practice only (real PMS credentials, privacy-assessed data access,
live SMS with approved templates, signed pilot agreement). Until those clear, every step below is
rehearsable end-to-end on the synthetic practice (`pnpm test` covers the full loop; the pilot
report generates from sim via `src/pilot/report.ts`).

## 1. Practice selection criteria

- Multisite or ≥6-GP mixed-billing group with strong online-booking adoption
- Measurable unused capacity: ≥15 unfilled or late-cancelled appointments/week (verify from PMS
  export before signing — do not take it on feel)
- Practice owner directly benefits from filled capacity and can approve the pilot in one meeting
- PMS is Best Practice or MedicalDirector; booking rail HotDoc/HealthEngine/AutoMed or own engine

## 2. Roles

| Role | Owner | Time |
|---|---|---|
| Pilot sponsor | Practice owner | 1h/fortnight |
| Operational contact | Practice manager | ~1h/week (console config, complaint intake) |
| Clinical contact | One nominated GP | usefulness audit champion; ~5 min/day |
| Meherr operator | Us | daily guardrail check, weekly report |

## 3. Setup week (week 0)

1. Signed pilot agreement + privacy collection notice updated (patients informed per APP 5).
2. Read-only PMS connection verified; identity/consent mapping spot-checked on 20 records
   (consent flags, usual-GP mapping, future bookings) against the practice's own view.
3. Practice controls configured in the console (eligibility floor, excluded groups, participating
   GPs, protected capacity, contact-frequency cap, quiet hours). Defaults per venture brief;
   every deviation documented.
4. Message template approved IN WRITING by the practice (it already passes the compliance
   linter; the practice approves tone and practice-name rendering).
5. Holdout rate confirmed (default 20%) and randomization seed recorded. **The holdout is
   non-negotiable** — without it the practice cannot know what was incremental, and neither can
   we. If the owner pushes back, show them the naive-vs-incremental contrast in the demo report.
6. Dry run: one full nightly cycle in shadow mode (invitations computed, NOTHING sent), output
   reviewed with the practice manager.

## 4. Weekly operating rhythm (weeks 1–12)

- **Nightly (automated):** eligibility → pool → minimal send → booking sync → event log.
- **Daily (operator, 5 min):** guardrail monitors — opt-out rate, generated-DNA rate, complaint
  intake. Any alert = same-day review; two consecutive alert days = pause sends for that
  clinician/session and tell the sponsor.
- **Daily (clinical contact, ~5 min):** one-tap usefulness audit for attended generated visits.
- **Weekly (operator):** practice report (already automated) walked through with the practice
  manager: incrementality vs holdout, funnel, guardrails, usefulness, revenue estimate.
- **Fortnightly:** sponsor check-in against the success criteria (§6).

## 5. Stop rules (any one triggers immediate pause + sponsor conversation)

- Opt-out rate >2% of invitations sent in any week
- Any complaint alleging clinical framing/urgency in a message
- Generated-DNA rate materially above the practice's organic DNA rate for 2 consecutive weeks
- Clinician usefulness audit: "unnecessary" >20% of audited visits in any fortnight
- Practice requests pause (no questions asked; note the reason)

## 6. Success criteria (pre-registered — decided before week 1, not after week 12)

Primary: **incremental attended appointments per 1,000 patients in the messaged group** (invite
arm minus holdout arm) — target agreed with the practice at signing; the modelling floor from the
venture brief is ~4 incremental attended visits/week practice-wide at breakeven.

The denominator is every patient assigned to the arm (`docs/ATTRIBUTION.md`: "rates are per
1,000 arm patients"), not the smaller set who passed the eligibility rules in a given week —
intention-to-treat holds the denominator fixed so the rate cannot be inflated by narrowing
eligibility mid-pilot. Read against the eligible subset the figure is several times larger;
Meherr reports the conservative one.

Secondary: conversion ≥15% of invitations → booking; ≥60% of generated bookings with the
patient's usual GP; opt-outs <1%/week; clinician-judged-reasonable ≥80%; zero upheld
message-content complaints; practice-manager satisfaction (would they keep it, unprompted).

Explicitly NOT success metrics: raw invitations sent, clicks, naive generated-visit counts
(displacement-blind — the report labels this a contrast figure and so do we, always).

## 7. Week 12 close-out

1. Final pilot report (full 12-week window) + total-episode economics vs the ROI model.
2. Structured debrief: sponsor, practice manager, clinical contact — what was useful, what was
   noise, what they'd change.
3. Decision: convert to annual subscription / extend pilot / stop. If stop: sends cease
   immediately, data export delivered, retention clock starts per the retention policy (W33).
4. De-identified case study drafted (W45 generator) — practice approves before any external use.

## 8. Rehearsal status (synthetic)

Everything in §4's automated lane and the §6 metrics are exercised today against the synthetic
practice: `runSim` → `buildPilotReport` → weekly report render. The pilot introduces real
humans, not new machinery.
