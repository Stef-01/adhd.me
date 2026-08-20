"""O80 verify gate: filters refuse by name in both directions, every sub-score is
normalised and sayable, the total equals the printed breakdown, the run is deterministic,
and the authorization note says the true thing.

Run: cd tools/gp-match && python3 -m unittest -v
"""

import unittest

import config
from adhd_gp_match import (
    DEMO_GPS,
    DEMO_PATIENTS,
    hard_filter_reasons,
    match_patients_to_gps,
    score_pair,
)


def patient(**overrides):
    base = {
        "patient_ref": "p",
        "location": "Epping",
        "state": "NSW",
        "age": 30,
        "existing_diagnosis_status": "diagnosed",
        "urgency": "this_month",
        "communication_preference": "structured",
        "funding_preference": "rebate_ok",
    }
    base.update(overrides)
    return base


def gp(**overrides):
    base = {
        "gp_ref": "g",
        "location": "Beecroft",
        "state": "NSW",
        "capacity": {"booked": 2, "limit": 10},
        "gp_authorization_level": "initiate_and_diagnose",
        "age_range_supported": (18, 99),
        "mbs_items_billed": ["36", "44", "2715", "2717", "91801", "92112"],
        "bulk_billing_available": True,
        "gap_payment_estimate": 0,
        "communication_style": "structured",
        "wait_days": 10,
    }
    base.update(overrides)
    return base


class Weights(unittest.TestCase):
    def test_directed_weights_sum_to_one(self):
        self.assertEqual(
            config.WEIGHTS,
            {"availability": 0.30, "proximity": 0.25, "cost_fit": 0.20, "communication_fit": 0.15, "mbs_fit": 0.10},
        )
        self.assertAlmostEqual(sum(config.WEIGHTS.values()), 1.0, places=10)

    def test_every_state_rule_carries_a_note_and_review_date(self):
        # The maintenance law: a rule that changes through 2026 is only as good as its
        # last review, so an entry without a date is an entry nobody will re-check.
        for state, rule in config.STATE_RULES.items():
            self.assertTrue(rule["note"], state)
            self.assertRegex(rule["review_by"], r"^\d{4}-\d{2}-\d{2}$", state)


class HardFilters(unittest.TestCase):
    def test_state_mismatch_refuses(self):
        self.assertIn("state_mismatch", hard_filter_reasons(patient(state="NSW"), gp(state="VIC")))

    def test_undiagnosed_needs_initiation(self):
        p = patient(existing_diagnosis_status="undiagnosed")
        self.assertEqual(hard_filter_reasons(p, gp(gp_authorization_level="initiate_and_diagnose")), [])
        self.assertIn("authorization_insufficient", hard_filter_reasons(p, gp(gp_authorization_level="continuation_only")))
        self.assertIn("authorization_insufficient", hard_filter_reasons(p, gp(gp_authorization_level="not_authorized")))

    def test_diagnosed_matches_either_authorized_level_never_unauthorized(self):
        p = patient(existing_diagnosis_status="diagnosed")
        self.assertEqual(hard_filter_reasons(p, gp(gp_authorization_level="initiate_and_diagnose")), [])
        self.assertEqual(hard_filter_reasons(p, gp(gp_authorization_level="continuation_only")), [])
        self.assertIn("authorization_insufficient", hard_filter_reasons(p, gp(gp_authorization_level="not_authorized")))

    def test_age_range_is_inclusive_on_both_ends(self):
        self.assertEqual(hard_filter_reasons(patient(age=18), gp(age_range_supported=(18, 65))), [])
        self.assertEqual(hard_filter_reasons(patient(age=65), gp(age_range_supported=(18, 65))), [])
        self.assertIn("age_outside_supported_range", hard_filter_reasons(patient(age=17), gp(age_range_supported=(18, 65))))

    def test_full_capacity_refuses(self):
        self.assertIn("at_capacity", hard_filter_reasons(patient(), gp(capacity={"booked": 5, "limit": 5})))

    def test_bulk_billed_only_is_a_hard_constraint_not_a_preference(self):
        p = patient(funding_preference="bulk_billed_only")
        self.assertIn("bulk_billing_required_not_available", hard_filter_reasons(p, gp(bulk_billing_available=False)))
        self.assertEqual(hard_filter_reasons(p, gp(bulk_billing_available=True)), [])
        # Softer funding preferences leave the gap to the cost criterion instead.
        self.assertEqual(hard_filter_reasons(patient(funding_preference="rebate_ok"), gp(bulk_billing_available=False, gap_payment_estimate=60)), [])

    def test_reasons_stack_so_the_output_tells_the_whole_truth(self):
        p = patient(state="QLD", existing_diagnosis_status="undiagnosed", age=10)
        reasons = hard_filter_reasons(p, gp(state="NSW", gp_authorization_level="continuation_only", capacity={"booked": 9, "limit": 9}))
        self.assertEqual(
            reasons,
            ["state_mismatch", "authorization_insufficient", "age_outside_supported_range", "at_capacity"],
        )


class Scoring(unittest.TestCase):
    def test_every_raw_score_is_normalised_and_sayable(self):
        for g in [gp(), gp(bulk_billing_available=False, gap_payment_estimate=90), gp(wait_days=60), gp(location="Nowhereville")]:
            scored = score_pair(patient(), g)
            self.assertEqual(len(scored["breakdown"]), 5)
            for item in scored["breakdown"]:
                self.assertGreaterEqual(item["raw"], 0.0, item["criterion"])
                self.assertLessEqual(item["raw"], 1.0, item["criterion"])
                self.assertGreater(len(item["sentence"]), 10, item["criterion"])

    def test_total_equals_the_printed_breakdown_exactly(self):
        scored = score_pair(patient(), gp(bulk_billing_available=False, gap_payment_estimate=45, wait_days=45))
        self.assertEqual(scored["total"], round(sum(i["weighted"] for i in scored["breakdown"]) * 1000) / 1000)

    def test_availability_reports_the_binding_fact(self):
        # Wait 60 days against a 30-day stated horizon binds harder than 8 open places.
        slow = next(i for i in score_pair(patient(), gp(wait_days=60))["breakdown"] if i["criterion"] == "availability")
        self.assertEqual(slow["raw"], 0.5)
        self.assertIn("60 days", slow["sentence"])
        # 'whenever' binds nothing from the patient's side.
        open_only = next(i for i in score_pair(patient(urgency="whenever"), gp(wait_days=60))["breakdown"] if i["criterion"] == "availability")
        self.assertEqual(open_only["raw"], 0.8)
        self.assertIn("8 of 10", open_only["sentence"])

    def test_unknown_location_scores_the_neutral_midpoint(self):
        item = next(i for i in score_pair(patient(), gp(location="Nowhereville"))["breakdown"] if i["criterion"] == "proximity")
        self.assertEqual(item["raw"], 0.5)

    def test_cost_fit_prices_the_gap_linearly_under_bulk_billing(self):
        bulk = next(i for i in score_pair(patient(), gp())["breakdown"] if i["criterion"] == "cost_fit")
        self.assertEqual(bulk["raw"], 1.0)
        gap = next(i for i in score_pair(patient(), gp(bulk_billing_available=False, gap_payment_estimate=75))["breakdown"] if i["criterion"] == "cost_fit")
        self.assertEqual(gap["raw"], 0.5)  # 1 - 75/150

    def test_mbs_fit_reads_the_pathway_relevant_set(self):
        g = gp(mbs_items_billed=["36", "2715"])
        undiag = next(i for i in score_pair(patient(existing_diagnosis_status="undiagnosed"), g)["breakdown"] if i["criterion"] == "mbs_fit")
        self.assertEqual(undiag["raw"], 0.5)  # 2 of [36, 44, 2715, 2717]
        diag = next(i for i in score_pair(patient(existing_diagnosis_status="diagnosed"), g)["breakdown"] if i["criterion"] == "mbs_fit")
        self.assertEqual(diag["raw"], 0.5)  # 2 of [36, 2715, 91801, 92112]

    def test_unstated_communication_preference_cannot_separate_and_says_so(self):
        item = next(
            i
            for i in score_pair(patient(communication_preference=None), gp(communication_style="warm"))["breakdown"]
            if i["criterion"] == "communication_fit"
        )
        self.assertEqual(item["raw"], 1.0)
        self.assertIn("alike", item["sentence"])


class RankedOutput(unittest.TestCase):
    def test_top_n_best_first_with_named_exclusions(self):
        results = match_patients_to_gps(DEMO_PATIENTS, DEMO_GPS)
        self.assertEqual([r["patient_ref"] for r in results], ["patient-a", "patient-b"])
        for result in results:
            self.assertLessEqual(len(result["matches"]), config.TOP_N)
            totals = [m["total"] for m in result["matches"]]
            self.assertEqual(totals, sorted(totals, reverse=True))
            for entry in result["excluded"]:
                self.assertTrue(entry["reasons"])

    def test_deterministic_under_permutation_of_both_inputs(self):
        a = match_patients_to_gps(DEMO_PATIENTS, DEMO_GPS)
        b = match_patients_to_gps(list(reversed(DEMO_PATIENTS)), list(reversed(DEMO_GPS)))
        self.assertEqual(a, b)

    def test_cut_inside_a_tie_is_said(self):
        clones = [gp(gp_ref=f"gp-{n}") for n in "abcd"]
        [result] = match_patients_to_gps([patient()], clones)
        self.assertEqual([m["gp_ref"] for m in result["matches"]], ["gp-a", "gp-b", "gp-c"])
        self.assertIn("fell inside an exact tie", result["tie_note"])

    def test_authorization_note_says_why_the_top_match_qualifies(self):
        [result] = match_patients_to_gps(
            [patient(existing_diagnosis_status="undiagnosed")],
            [gp(gp_ref="gp-init"), gp(gp_ref="gp-cont", gp_authorization_level="continuation_only")],
        )
        note = result["authorization_note"]
        self.assertIn("authorized to initiate and diagnose", note)
        self.assertIn("no diagnosis is recorded yet", note)
        self.assertIn("1 GP(s) were excluded on state or authorization grounds", note)
        self.assertIn("NSW", note)

    def test_a_patient_every_gp_refuses_gets_the_truth_not_a_guess(self):
        [result] = match_patients_to_gps([patient(state="NT")], DEMO_GPS)
        self.assertEqual(result["matches"], [])
        self.assertEqual(len(result["excluded"]), len(DEMO_GPS))
        self.assertIn("No GP could be matched", result["authorization_note"])


if __name__ == "__main__":
    unittest.main()
