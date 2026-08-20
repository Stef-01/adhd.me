"""Editable configuration for the ADHD GP-match tool (O80).

EVERYTHING IN THIS FILE IS EXPECTED TO CHANGE, and that is why it is a file of its own:
state-by-state GP-led ADHD pathway rules are actively rolling out through 2026 and beyond,
and MBS item numbers get added, retired and re-priced. The core matcher in
``adhd_gp_match.py`` reads this module and contains no rule of its own, so a regulation
change is an edit HERE — with the ``review_by`` date moved and the ``note`` rewritten —
never a code change.

MAINTENANCE LAW (borrowed from the repo's audit-allowlist pattern): every entry that encodes
a changing external rule carries a plain-language ``note`` saying what the rule is believed
to be, and a ``review_by`` date after which it should not be trusted without a re-check.
Nothing in this file is legal advice; it is the founder-maintained record of the rules the
tool currently filters by, and the filter is only as current as its last review.

SYNTHETIC DATA ONLY. Nothing in this tree touches real patient data (founder gate G2); the
tool exists to be exercised with synthetic fixtures like the demo in the main module.
"""

# ── State-by-state GP-led pathway rules ──────────────────────────────────────────────────
#
# WHY THE STATE FILTER EXISTS. ADHD prescribing authority for GPs is granted per
# jurisdiction (state/territory health department schemes), so a GP's authorization is a
# fact about them IN THEIR STATE: a GP authorized under one state's scheme cannot be
# assumed to hold the same authority for a patient under another state's rules. The matcher
# therefore refuses cross-state pairs outright rather than scoring them — an exclusion with
# a named reason, never a silent drop.
#
# ``gp_led_pathway`` values:
#   "available"    — the state has a GP-led pathway operating (GPs can hold authorization).
#   "rolling_out"  — announced/partial; some GPs may hold authorization, coverage uneven.
#   "not_available"— no GP-led pathway; a GP record claiming authorization here should be
#                    treated as a data error and checked by a person.
#
# These statuses feed the plain-language authorization NOTE in the output; the hard filter
# itself works off each GP's own ``gp_authorization_level``, because the GP's recorded
# authorization is the primary datum and the state table is context for the reader.
STATE_RULES = {
    "NSW": {
        "gp_led_pathway": "rolling_out",
        "note": "NSW is rolling out GP-led ADHD care in stages (continuation first, initiation for a trained cohort following).",
        "review_by": "2026-11-30",
    },
    "VIC": {
        "gp_led_pathway": "rolling_out",
        "note": "Victoria has committed to a GP-led pathway; rollout details are still landing.",
        "review_by": "2026-11-30",
    },
    "QLD": {
        "gp_led_pathway": "available",
        "note": "Queensland GPs meeting the training requirement can diagnose and prescribe for ADHD without a psychiatrist.",
        "review_by": "2026-12-31",
    },
    "WA": {
        "gp_led_pathway": "rolling_out",
        "note": "WA has announced GP prescribing for ADHD with a trained-GP cohort.",
        "review_by": "2026-12-31",
    },
    "SA": {
        "gp_led_pathway": "rolling_out",
        "note": "SA pathway status should be re-checked before relying on it.",
        "review_by": "2026-10-31",
    },
    "TAS": {
        "gp_led_pathway": "rolling_out",
        "note": "Tasmania status should be re-checked before relying on it.",
        "review_by": "2026-10-31",
    },
    "ACT": {
        "gp_led_pathway": "rolling_out",
        "note": "ACT status should be re-checked before relying on it.",
        "review_by": "2026-10-31",
    },
    "NT": {
        "gp_led_pathway": "rolling_out",
        "note": "NT status should be re-checked before relying on it.",
        "review_by": "2026-10-31",
    },
}

# ── MBS items relevant to GP-led ADHD care ───────────────────────────────────────────────
#
# WHY MBS FIT IS SCORED AT ALL. Which items a GP routinely bills is an honest, declared
# proxy for whether their practice style fits this work: ADHD assessment and review need
# longer consultations and (often) a mental health treatment plan, and telehealth items
# matter for continuation care. The score is the share of the RELEVANT set for the
# patient's pathway that the GP actually bills — declared data against a config list,
# never a judgement invented per GP.
#
# Item meanings (plain language, for the next editor — re-check against MBS Online at review):
#   "23"    standard consult, under 20 minutes (baseline general practice)
#   "36"    consult 20–40 minutes (the working length for reviews)
#   "44"    consult 40+ minutes (the working length for assessment)
#   "2715"  GP mental health treatment plan (shorter preparation)
#   "2717"  GP mental health treatment plan (longer preparation)
#   "92112" / "91801"  telehealth items (video / phone families; useful for continuation)
MBS_ITEMS = {
    "review_by": "2026-12-31",
    "relevant_for": {
        # An initiation/diagnosis pathway leans on long consults and a treatment plan.
        "initiate_and_diagnose": ["36", "44", "2715", "2717"],
        # Continuation care leans on mid-length reviews, the plan review family and telehealth.
        "continuation_only": ["36", "2715", "91801", "92112"],
    },
}

# ── Scoring weights (Step 2), exactly as directed ────────────────────────────────────────
#
# Coarse and global on purpose: these say "how much this criterion matters relative to the
# others", the same for every GP — never a per-GP tuning knob. They must sum to 1.0 and the
# test suite pins that, so an edit that unbalances them fails loudly instead of silently
# re-scaling everybody's totals.
WEIGHTS = {
    "availability": 0.30,
    "proximity": 0.25,
    "cost_fit": 0.20,
    "communication_fit": 0.15,
    "mbs_fit": 0.10,
}

# How many matches each patient sees.
TOP_N = 3

# ── Normalisation constants ──────────────────────────────────────────────────────────────

# The patient's stated urgency, as a horizon in days. This is the patient's own timing
# preference — a want, never a clinical triage judgement (repo law G7). "whenever" binds
# nothing, so open capacity alone decides availability for those patients.
URGENCY_HORIZON_DAYS = {
    "this_week": 7,
    "this_month": 30,
    "whenever": None,
}

# Distance at which proximity bottoms out. Beyond this, "far" stops getting farther.
PROXIMITY_CAP_KM = 50.0

# Gap payment at which cost fit bottoms out, in dollars. A $0 gap scores 1; this cap or
# beyond scores 0; between is linear. Editable as fee norms move.
GAP_CAP_DOLLARS = 150.0

# ── Locations the tool can resolve ───────────────────────────────────────────────────────
#
# A tiny editable gazetteer (suburb → lat/lon). A location NOT in this table is scored at
# the neutral 0.5 midpoint rather than 0: an unknown location is a gap in THIS table, and
# the matcher must not make a GP pay for our missing row (the repo's rankCliniciansNear
# law, restated for a scored model).
LOCATIONS = {
    # Sydney / NSW
    "beecroft": (-33.7503, 151.0586),
    "epping": (-33.7726, 151.0817),
    "parramatta": (-33.8150, 151.0011),
    "double bay": (-33.8775, 151.2437),
    "penrith": (-33.7511, 150.6942),
    # Melbourne / VIC
    "carlton": (-37.8001, 144.9674),
    "footscray": (-37.7996, 144.8998),
    "frankston": (-38.1420, 145.1226),
    # Brisbane / QLD
    "fortitude valley": (-27.4570, 153.0340),
    "ipswich": (-27.6146, 152.7608),
}
