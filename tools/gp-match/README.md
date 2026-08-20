# ADHD GP-match tool (O80, founder-directed)

A standalone Python tool that matches ADHD patients to GPs authorized to diagnose and/or
prescribe under Australia's GP-led model — no psychiatrist referral or input in the data
model. Not wired into the product; synthetic fixtures only (founder gate G2).

## Run

```bash
cd tools/gp-match
python3 adhd_gp_match.py        # worked demo: two patients, four GPs
python3 -m unittest -v          # the verify gate (21 tests)
```

No dependencies beyond the standard library.

## What lives where

- **`config.py`** — everything expected to change as regulations move: state-by-state
  GP-led pathway rules (each with a plain-language `note` and a `review_by` date), the
  MBS item sets per pathway, the five weights (pinned to sum to 1), normalisation
  constants, and the location table. **A regulation change is an edit here, never a code
  change.** A test fails if any state rule ships without a note and review date.
- **`adhd_gp_match.py`** — the matcher. `HARD_FILTERS` and `CRITERIA` are ordered lists of
  (name, function) pairs, so filter policy and scoring policy can each change without
  touching `match_patients_to_gps`, which walks both generically.
- **`test_adhd_gp_match.py`** — filters both directions, normalisation bounds, the
  total-equals-breakdown unity, determinism under input permutation, tie honesty, and the
  authorization note's claims.

## How it decides

1. **Hard filters, each with a named reason** (never a silent drop): `state_mismatch`
   (authorization is jurisdiction-specific), `authorization_insufficient` (undiagnosed →
   `initiate_and_diagnose` only; diagnosed → initiate or continuation; `not_authorized`
   never matches), `age_outside_supported_range`, `at_capacity`,
   `bulk_billing_required_not_available` (a stated hard constraint, not a preference).
   All applicable reasons are collected, so the output tells the whole truth per pair.
2. **Weighted scoring** at the directed 30/25/20/15/10 (availability, proximity, cost fit,
   communication fit, MBS pathway fit). Every sub-score is normalised 0–1 by a stated
   formula and carries a one-sentence explanation built from fixed templates; the total
   equals the sum of the printed breakdown exactly.
3. **Top 3 GPs per patient**, deterministic, ties said out loud, plus a plain-language
   authorization note: why the top match qualifies for this patient's pathway, how many
   exclusions were on state/authorization grounds, and the state's rollout context.

## Laws carried over from the tree

Stated urgency is the patient's own timing preference, never triage; diagnosis status is
the patient's stated care history used only to route initiation vs continuation; no
ordering of patients exists anywhere; unknown locations score the neutral midpoint rather
than penalising a GP for a gap in our table; weights are global, never per-GP.
