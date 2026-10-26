import unittest

from ..domain import ScenarioSpec
from ..scenarios import simulate
from ..validation import SimulationInputError
from .helpers import baseline, flow, make_twin, shock


def issues_for(twin, scenarios=None):
    with_err = None
    try:
        simulate(twin, [baseline()] if scenarios is None else scenarios)
    except SimulationInputError as e:
        with_err = e
    return with_err


class Validation(unittest.TestCase):
    def test_missing_opening_cash(self):
        e = issues_for(make_twin(None, 1000, []))
        self.assertEqual([(i.field, i.code) for i in e.issues], [("profile.cash_on_hand", "missing_required_input")])

    def test_missing_minimum_reserve(self):
        e = issues_for(make_twin(1000, None, []))
        self.assertEqual([(i.field, i.code) for i in e.issues], [("profile.minimum_reserve", "missing_required_input")])

    def test_both_missing_reported_together_never_defaulted_to_zero(self):
        e = issues_for(make_twin(None, None, [flow("s", "inflow", "business_sales", 100)]))
        self.assertEqual({i.field for i in e.issues}, {"profile.cash_on_hand", "profile.minimum_reserve"})
        body = e.to_dict()
        self.assertEqual(body["error"], "validation_error")
        self.assertEqual(len(body["issues"]), 2)
        self.assertIn("not assumed to be zero", body["issues"][0]["message"])

    def test_zero_is_a_valid_known_value(self):
        self.assertIsNone(issues_for(make_twin(0, 0, [])))

    def test_invalid_forecast_days(self):
        self.assertEqual(issues_for(make_twin(1, 1, [], days=0)).issues[0].field, "profile.forecast_days")
        self.assertEqual(issues_for(make_twin(1, 1, [], days=91)).issues[0].field, "profile.forecast_days")

    def test_negative_cash_and_duplicate_flow_ids(self):
        e = issues_for(make_twin(-5, 0, [flow("a", "inflow", "other", 1), flow("a", "inflow", "other", 1)]))
        self.assertEqual({i.code for i in e.issues}, {"invalid_value", "duplicate_id"})

    def test_scenario_problems(self):
        t = make_twin(1, 1, [])
        self.assertEqual(issues_for(t, []).issues[0].code, "empty")
        self.assertEqual(issues_for(t, [baseline(), baseline()]).issues[0].code, "duplicate_id")
        self.assertEqual(issues_for(t, [shock("only_shock", "0.7", 5)]).issues[0].code, "missing_baseline")
        self.assertEqual(issues_for(t, [baseline(), shock("neg", "-1", 5)]).issues[0].field,
                         "scenarios[1].income_shock.multiplier")
        self.assertEqual(issues_for(t, [baseline(), shock("zero", "0.5", 0)]).issues[0].field,
                         "scenarios[1].income_shock.duration_days")

    def test_baseline_can_be_first_scenario_without_shock_under_other_id(self):
        out = simulate(make_twin(1, 0, []), [ScenarioSpec("expected", "Expected"), shock("s", "0.5", 1)])
        self.assertEqual(out.comparison.baseline_scenario_id, "expected")


if __name__ == "__main__":
    unittest.main()
