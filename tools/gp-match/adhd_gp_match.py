"""Match ADHD patients to authorized GPs — Australia's GP-led model (O80, founder-directed).

WHAT THIS IS. A standalone tool: two lists of dictionaries in, a ranked shortlist out.
It models the GP-led pathway ONLY — no psychiatrist referral or input appears anywhere in
the data model, because the pathway being matched is the one where an authorized GP
diagnoses and/or prescribes directly.

HOW IT DECIDES, in the order the steps run:

  Step 1 — HARD FILTERS. Pairs that cannot lawfully or practically proceed are excluded
  before any scoring, each with a NAMED reason (never a silent drop): state mismatch,
  insufficient authorization for the patient's diagnosis status, age outside the GP's
  supported range, full capacity, and a bulk-billed-only ask against a non-bulk-billing GP.

  Step 2 — WEIGHTED SCORING over surviving pairs. Five criteria at the directed weights
  (availability 30%, proximity 25%, cost fit 20%, communication fit 15%, MBS pathway fit
  10%), each normalised to 0–1 by a stated formula BEFORE weighting, so the weights mean
  what they say. The total is the weighted sum of the printed breakdown, exactly.

  Step 3 — OUTPUT. Top 3 GPs per patient: total score, per-criterion breakdown, and a
  plain-language note covering the authorization grounds — why the top match qualifies for
  this patient's pathway, and how many GPs were excluded on state or authorization grounds.

WHAT LIVES WHERE (the structure the spec asked for):
  - ``config.py`` holds everything that changes as regulations move: state rules with
    review dates, MBS item sets, weights, normalisation constants, the location table.
  - ``HARD_FILTERS`` below is an ordered list of (reason, predicate) pairs; adding or
    removing a filter is a list edit, not a rewrite of the matcher.
  - ``CRITERIA`` is the same shape for scoring. ``match_patients_to_gps`` walks both lists
    generically and contains no rule of its own.

REPO LAWS THIS TOOL IS BUILT UNDER (they bind tools too):
  - Synthetic data only (G2). ``patient_ref``/``gp_ref`` are opaque labels; run this on
    made-up fixtures like the demo below.
  - Stated urgency is the patient's own timing preference — a want, never triage (G7).
    ``existing_diagnosis_status`` is likewise the patient's own stated care history, used
    only to route initiation vs continuation; nothing here reads symptoms.
  - No ordering of patients: output is GP-lists-per-patient; patients are never ranked
    against each other.
  - Refusals are named; ties are said out loud; unknown locations score the neutral
    midpoint rather than penalising a GP for a gap in our own table.

Run the demo:   python3 adhd_gp_match.py
Run the tests:  cd tools/gp-match && python3 -m unittest -v
"""

from __future__ import annotations

import math
from typing import Any, Callable

import config

Patient = dict[str, Any]
GP = dict[str, Any]


def _round3(value: float) -> float:
    """Snap to three decimals wherever a score is produced (the repo's O8 rule: two
    mathematically equal totals must compare equal, not differ by float dust)."""
    return round(value * 1000) / 1000


# ═════════════════════════════════════════════════════════════════════════════════════════
# Step 1 — hard filters. Each is (reason, predicate); predicate True means EXCLUDE.
# The list is data so filter policy can change without touching the matcher.
# ═════════════════════════════════════════════════════════════════════════════════════════


def _state_mismatch(patient: Patient, gp: GP) -> bool:
    # WHY: GP ADHD prescribing authorization is granted per jurisdiction, so a GP's
    # authorization is a fact about them IN THEIR STATE. A cross-state pair is refused
    # outright rather than scored low — scoring it would present an unactionable
    # introduction as merely imperfect. The state table in config carries the per-state
    # pathway status and review dates; the filter itself only needs the two state fields.
    return patient["state"] != gp["state"]


def _authorization_insufficient(patient: Patient, gp: GP) -> bool:
    # WHY: the patient's stated diagnosis status decides which authorization level can
    # serve them. Undiagnosed patients need a GP who can INITIATE — diagnose and start
    # treatment — so only 'initiate_and_diagnose' qualifies. Already-diagnosed patients
    # need ongoing prescribing, which either an initiating GP or a 'continuation_only'
    # GP provides. 'not_authorized' never matches anybody: an unauthorized GP is outside
    # this pathway entirely, whatever else fits.
    # THIS IS THE FILTER MOST LIKELY TO NEED UPDATES as states finish rolling out their
    # schemes (e.g. a state might add a supervised-initiation tier); express any new tier
    # by extending the sets below rather than branching in the matcher.
    level = gp["gp_authorization_level"]
    if patient["existing_diagnosis_status"] == "undiagnosed":
        return level not in {"initiate_and_diagnose"}
    return level not in {"initiate_and_diagnose", "continuation_only"}


def _age_outside_range(patient: Patient, gp: GP) -> bool:
    # WHY: a GP's declared age range is a scope-of-practice fact (paediatric vs adult
    # ADHD care differ, and some state schemes authorize adult care only). Inclusive on
    # both ends: a GP supporting [18, 65] serves an 18- and a 65-year-old.
    low, high = gp["age_range_supported"]
    return not (low <= patient["age"] <= high)


def _at_capacity(patient: Patient, gp: GP) -> bool:
    # WHY: an allocation cannot introduce somebody to a full list. (This differs from the
    # product's patient-facing FINDER, which shows closed books with a sentence — that law
    # governs listing a roster, not proposing an introduction.)
    booked, limit = gp["capacity"]["booked"], gp["capacity"]["limit"]
    return limit <= 0 or booked >= limit


def _needs_bulk_billing(patient: Patient, gp: GP) -> bool:
    # WHY: 'bulk_billed_only' is a hard constraint the patient stated, not a preference to
    # trade off — a $40 gap is not a slightly-worse match for somebody who said they can
    # only attend bulk-billed care; it is not an option. Softer funding preferences
    # ('rebate_ok', 'private_pay_ok') skip this filter and let cost_fit price the gap.
    return patient["funding_preference"] == "bulk_billed_only" and not gp["bulk_billing_available"]


HARD_FILTERS: list[tuple[str, Callable[[Patient, GP], bool]]] = [
    ("state_mismatch", _state_mismatch),
    ("authorization_insufficient", _authorization_insufficient),
    ("age_outside_supported_range", _age_outside_range),
    ("at_capacity", _at_capacity),
    ("bulk_billing_required_not_available", _needs_bulk_billing),
]


def hard_filter_reasons(patient: Patient, gp: GP) -> list[str]:
    """Every exclusion reason that applies to this pair; empty means the pair proceeds.
    ALL reasons are collected (not just the first) so the output can say the whole truth
    about why an introduction was refused."""
    return [reason for reason, applies in HARD_FILTERS if applies(patient, gp)]


# ═════════════════════════════════════════════════════════════════════════════════════════
# Step 2 — criteria. Each scorer returns (raw_0_to_1, sentence). Sentences are fixed
# templates interpolating only numbers and declared facts — never the patient's own words.
# ═════════════════════════════════════════════════════════════════════════════════════════


def _score_availability(patient: Patient, gp: GP) -> tuple[float, str]:
    # The TIGHTER of two declared facts: open places as a fraction of the list, and the
    # declared wait against the patient's stated horizon. Reporting the binding constraint
    # is the honest sentence; an undeclared wait binds nothing (never invented), and a
    # 'whenever' patient binds nothing from their side.
    booked, limit = gp["capacity"]["booked"], gp["capacity"]["limit"]
    open_places = limit - booked
    open_fraction = _round3(open_places / limit)

    horizon = config.URGENCY_HORIZON_DAYS[patient["urgency"]]
    wait = gp.get("wait_days")
    horizon_fit = 1.0
    if horizon is not None and wait is not None and wait > horizon:
        horizon_fit = _round3(horizon / wait)

    if horizon_fit < open_fraction:
        return horizon_fit, f"Declared wait is {wait} days against a stated {horizon}-day horizon."
    note = " Typical wait is not declared." if wait is None else ""
    return open_fraction, f"{open_places} of {limit} list places are open.{note}"


def _haversine_km(a: tuple[float, float], b: tuple[float, float]) -> float:
    lat1, lon1, lat2, lon2 = map(math.radians, (*a, *b))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 2 * 6371 * math.asin(min(1.0, math.sqrt(h)))


def _score_proximity(patient: Patient, gp: GP) -> tuple[float, str]:
    # 1 − min(km, cap)/cap over straight-line distance from the config table. A location
    # the table cannot resolve — either side — scores the 0.5 midpoint: an unknown suburb
    # is OUR missing row, and it must neither sink a GP nor lift one.
    here = config.LOCATIONS.get(patient["location"].strip().lower())
    there = config.LOCATIONS.get(gp["location"].strip().lower())
    if here is None or there is None:
        return 0.5, "A location here is not in the location table, so distance is scored at the midpoint."
    km = _haversine_km(here, there)
    raw = _round3(1 - min(km, config.PROXIMITY_CAP_KM) / config.PROXIMITY_CAP_KM)
    return raw, f"About {round(km)} km away, scored against a {round(config.PROXIMITY_CAP_KM)} km range."


def _score_cost_fit(patient: Patient, gp: GP) -> tuple[float, str]:
    # Bulk billing available is a full cost fit for everybody. Otherwise the declared gap
    # estimate scores linearly down to the config cap: $0 gap = 1, cap or beyond = 0.
    # (A 'bulk_billed_only' patient never reaches this scorer with a non-bulk-billing GP —
    # the hard filter refused that pair — so the gradient here only prices pairs the
    # patient said they could afford.)
    if gp["bulk_billing_available"]:
        return 1.0, "Bulk billing is available."
    gap = float(gp["gap_payment_estimate"])
    raw = _round3(max(0.0, 1 - gap / config.GAP_CAP_DOLLARS))
    return raw, f"Estimated gap payment ${gap:.0f}, scored against a ${config.GAP_CAP_DOLLARS:.0f} range."


def _score_communication_fit(patient: Patient, gp: GP) -> tuple[float, str]:
    # Exact declared match or not. A patient who stated no preference cannot be separated
    # on this criterion, so every GP scores alike — said, not silently defaulted.
    preference = patient.get("communication_preference")
    if not preference:
        return 1.0, "No communication preference was stated, so every GP scores alike here."
    if gp["communication_style"] == preference:
        return 1.0, f"Communication style matches the stated preference ({preference})."
    return 0.0, f"Declared style is {gp['communication_style']}; the stated preference was {preference}."


def _score_mbs_fit(patient: Patient, gp: GP) -> tuple[float, str]:
    # The share of the MBS items RELEVANT TO THIS PATIENT'S PATHWAY that the GP routinely
    # bills — initiation leans on long consults and a treatment plan, continuation on
    # reviews and telehealth (the sets live in config with their meanings and a review
    # date). Declared billing behaviour against a config list; nothing invented per GP.
    pathway = (
        "initiate_and_diagnose"
        if patient["existing_diagnosis_status"] == "undiagnosed"
        else "continuation_only"
    )
    relevant = config.MBS_ITEMS["relevant_for"][pathway]
    billed = set(gp["mbs_items_billed"])
    met = sum(1 for item in relevant if item in billed)
    raw = _round3(met / len(relevant))
    return raw, f"Bills {met} of the {len(relevant)} MBS items relevant to this pathway."


CRITERIA: list[tuple[str, Callable[[Patient, GP], tuple[float, str]]]] = [
    ("availability", _score_availability),
    ("proximity", _score_proximity),
    ("cost_fit", _score_cost_fit),
    ("communication_fit", _score_communication_fit),
    ("mbs_fit", _score_mbs_fit),
]


def score_pair(patient: Patient, gp: GP) -> dict[str, Any]:
    """Score one surviving pair. The total is the weighted sum of the printed breakdown,
    exactly — an audit can re-add the breakdown and get the total, with no carve-outs."""
    breakdown = []
    for criterion, scorer in CRITERIA:
        raw, sentence = scorer(patient, gp)
        weight = config.WEIGHTS[criterion]
        breakdown.append(
            {
                "criterion": criterion,
                "weight": weight,
                "raw": raw,
                "weighted": _round3(weight * raw),
                "sentence": sentence,
            }
        )
    return {
        "gp_ref": gp["gp_ref"],
        "total": _round3(sum(item["weighted"] for item in breakdown)),
        "breakdown": breakdown,
    }


# ═════════════════════════════════════════════════════════════════════════════════════════
# Step 3 — the run, and the authorization note.
# ═════════════════════════════════════════════════════════════════════════════════════════

AUTHORIZATION_REASONS = {"state_mismatch", "authorization_insufficient"}


def _authorization_note(patient: Patient, top: dict[str, Any] | None, gps_by_ref: dict[str, GP], excluded: list[dict[str, Any]]) -> str:
    """Plain language on the authorization grounds: why the top match qualifies for this
    patient's pathway, and what was excluded on state/authorization grounds. Composed from
    fixed fragments and declared facts only."""
    status = patient["existing_diagnosis_status"]
    needs = (
        "a GP authorized to initiate and diagnose, because no diagnosis is recorded yet"
        if status == "undiagnosed"
        else "a GP authorized for either initiation or continuation care, because a diagnosis already exists"
    )
    auth_excluded = [e for e in excluded if AUTHORIZATION_REASONS & set(e["reasons"])]
    state_rule = config.STATE_RULES.get(patient["state"])
    context = f" State context ({patient['state']}): {state_rule['note']}" if state_rule else ""

    if top is None:
        return (
            f"No GP could be matched. This patient needs {needs}; "
            f"{len(auth_excluded)} of {len(excluded)} exclusions were on state or authorization grounds.{context}"
        )
    gp = gps_by_ref[top["gp_ref"]]
    level_said = {
        "initiate_and_diagnose": "authorized to initiate and diagnose",
        "continuation_only": "authorized for continuation care",
    }[gp["gp_authorization_level"]]
    excluded_said = (
        f" {len(auth_excluded)} GP(s) were excluded on state or authorization grounds."
        if auth_excluded
        else ""
    )
    return (
        f"Top match {top['gp_ref']} is {level_said} in {gp['state']}, which meets this patient's need for {needs}."
        f"{excluded_said}{context}"
    )


def match_patients_to_gps(patients: list[Patient], gps: list[GP]) -> list[dict[str, Any]]:
    """The whole run. Deterministic and input-order-independent: both lists are ref-sorted
    before any work and ties break on gp_ref — arbitrary on purpose, because a tie-break
    that meant something would be a judgement about who deserves patients more. A tie
    inside the top list, or a cut that falls inside a tie, is SAID rather than rendered
    as a ranking."""
    results = []
    gps_by_ref = {gp["gp_ref"]: gp for gp in gps}
    for patient in sorted(patients, key=lambda p: p["patient_ref"]):
        excluded, scored = [], []
        for gp in sorted(gps, key=lambda g: g["gp_ref"]):
            reasons = hard_filter_reasons(patient, gp)
            if reasons:
                excluded.append({"gp_ref": gp["gp_ref"], "reasons": reasons})
            else:
                scored.append(score_pair(patient, gp))
        scored.sort(key=lambda s: (-s["total"], s["gp_ref"]))

        matches = scored[: config.TOP_N]
        tie_note = None
        if len(scored) > config.TOP_N and scored[config.TOP_N]["total"] == matches[-1]["total"]:
            tie_note = (
                f"The cut at {config.TOP_N} fell inside an exact tie — GPs beyond the list "
                "scored the same as the last shown, so the boundary is not a ranking."
            )
        elif any(m["total"] == matches[i - 1]["total"] for i, m in enumerate(matches) if i > 0):
            tie_note = "Equal totals inside this list are not an order — the tie-break is alphabetical and means nothing."

        results.append(
            {
                "patient_ref": patient["patient_ref"],
                "matches": matches,
                "tie_note": tie_note,
                "excluded": excluded,
                "authorization_note": _authorization_note(
                    patient, matches[0] if matches else None, gps_by_ref, excluded
                ),
            }
        )
    return results


# ═════════════════════════════════════════════════════════════════════════════════════════
# Demo — synthetic fixtures only (G2). Run: python3 adhd_gp_match.py
# ═════════════════════════════════════════════════════════════════════════════════════════

DEMO_PATIENTS: list[Patient] = [
    {
        "patient_ref": "patient-a",
        "location": "Epping",
        "state": "NSW",
        "age": 34,
        "existing_diagnosis_status": "undiagnosed",
        "urgency": "this_month",
        "communication_preference": "structured",
        "funding_preference": "rebate_ok",
    },
    {
        "patient_ref": "patient-b",
        "location": "Footscray",
        "state": "VIC",
        "age": 11,
        "existing_diagnosis_status": "diagnosed",
        "urgency": "this_week",
        "communication_preference": "warm",
        "funding_preference": "bulk_billed_only",
    },
]

DEMO_GPS: list[GP] = [
    {
        "gp_ref": "gp-beecroft",
        "location": "Beecroft",
        "state": "NSW",
        "capacity": {"booked": 6, "limit": 10},
        "gp_authorization_level": "initiate_and_diagnose",
        "age_range_supported": (18, 99),
        "mbs_items_billed": ["23", "36", "44", "2715"],
        "bulk_billing_available": False,
        "gap_payment_estimate": 60,
        "communication_style": "structured",
        "wait_days": 14,
    },
    {
        "gp_ref": "gp-parramatta",
        "location": "Parramatta",
        "state": "NSW",
        "capacity": {"booked": 2, "limit": 8},
        "gp_authorization_level": "continuation_only",
        "age_range_supported": (18, 99),
        "mbs_items_billed": ["23", "36", "91801"],
        "bulk_billing_available": True,
        "gap_payment_estimate": 0,
        "communication_style": "warm",
        "wait_days": 7,
    },
    {
        "gp_ref": "gp-carlton",
        "location": "Carlton",
        "state": "VIC",
        "capacity": {"booked": 1, "limit": 6},
        "gp_authorization_level": "continuation_only",
        "age_range_supported": (6, 17),
        "mbs_items_billed": ["23", "36", "2715", "91801"],
        "bulk_billing_available": True,
        "gap_payment_estimate": 0,
        "communication_style": "warm",
        "wait_days": 5,
    },
    {
        "gp_ref": "gp-frankston",
        "location": "Frankston",
        "state": "VIC",
        "capacity": {"booked": 6, "limit": 6},
        "gp_authorization_level": "initiate_and_diagnose",
        "age_range_supported": (6, 99),
        "mbs_items_billed": ["36", "44", "2715", "2717"],
        "bulk_billing_available": True,
        "gap_payment_estimate": 0,
        "communication_style": "structured",
        "wait_days": 21,
    },
]


def _print_demo() -> None:
    for result in match_patients_to_gps(DEMO_PATIENTS, DEMO_GPS):
        print(f"\n{result['patient_ref']}")
        print(f"  note: {result['authorization_note']}")
        if result["tie_note"]:
            print(f"  tie:  {result['tie_note']}")
        for match in result["matches"]:
            print(f"  {match['gp_ref']}  total {match['total']}")
            for item in match["breakdown"]:
                print(f"    {item['criterion']:<18} raw {item['raw']:<6} × {item['weight']:<5} = {item['weighted']:<6} {item['sentence']}")
        for entry in result["excluded"]:
            print(f"  excluded {entry['gp_ref']}: {', '.join(entry['reasons'])}")


if __name__ == "__main__":
    _print_demo()
