import json
import unittest
from pathlib import Path

from ..scenarios import apply_shock, simulate
from ..scheduler import generate_events
from ..serialize import output_to_dict
from .helpers import (baseline, closings, d, flow, make_twin, shock, twin_from_json, vendor_twin)

EXAMPLES = Path(__file__).resolve().parent.parent / "examples"


class SalesShock(unittest.TestCase):
    """Vendor: +200/day baseline. 30% sales shock for 14 days from 10-19 => -100/day, then +200/day.
    Stressed closing k (k<=14) = 2000-100k ; k>14 = 600+200(k-14). Baseline closing = 2000+200k."""

    def setUp(self):
        self.out = simulate(vendor_twin(), [baseline(), shock("sales_drop_30", "0.7", 14, "2026-10-19")])
        self.base, self.stress = self.out.results

    def test_baseline(self):
        self.assertEqual(closings(self.base), [2000 + 200 * k for k in range(1, 21)])
        self.assertEqual(self.base.status, "within_reserve")
        self.assertEqual(self.base.minimum_balance, 2200)
        self.assertEqual(self.base.minimum_balance_date, d("2026-10-19"))

    def test_stressed_timeline_and_window_is_inclusive_14_days(self):
        c = closings(self.stress)
        self.assertEqual(c[:14], [2000 - 100 * k for k in range(1, 15)])
        self.assertEqual(c[14:], [600 + 200 * (k - 14) for k in range(15, 21)])
        self.assertEqual(self.stress.timeline[13].date, d("2026-11-01"))   # last shocked day
        self.assertEqual(self.stress.timeline[13].inflows, 700)
        self.assertEqual(self.stress.timeline[14].inflows, 1000)           # 11-02 unshocked

    def test_radar_outputs(self):
        s = self.stress
        self.assertEqual(s.status, "reserve_breach")
        self.assertEqual(s.minimum_balance, 600)
        self.assertEqual(s.minimum_balance_date, d("2026-11-01"))
        self.assertEqual(s.shortfall_to_reserve, 400)
        self.assertEqual(s.first_reserve_breach_date, d("2026-10-29"))   # k=11 -> 900 (k=10 -> 1000 equals reserve)
        self.assertEqual(s.timeline[9].closing_balance, 1000)
        self.assertFalse(s.timeline[9].below_reserve)
        self.assertEqual(s.timeline[10].reserve_gap, 100)
        self.assertEqual(s.timeline[14].reserve_gap, 200)
        self.assertEqual(s.timeline[15].reserve_gap, 0)

    def test_comparison(self):
        c = self.out.comparison
        self.assertEqual(c.baseline_scenario_id, "baseline")
        self.assertEqual(c.most_stressed_scenario_id, "sales_drop_30")
        self.assertEqual(c.change_in_minimum_balance, 600 - 2200)
        self.assertEqual(c.worst_shortfall_date, d("2026-11-01"))
        self.assertEqual(c.worst_shortfall_to_reserve, 400)

    def test_drivers_from_actual_flows(self):
        dr = self.stress.major_drivers
        self.assertEqual([x.flow_id for x in dr], ["sales", "stock", "home"])
        self.assertEqual([x.net_effect for x in dr], [9800, -8400, -2800])
        self.assertEqual(dr[0].occurrences, 14)
        self.assertEqual(dr[0].shock_adjustment, -4200)
        self.assertEqual(dr[1].shock_adjustment, 0)
        self.assertEqual(2000 + sum(x.net_effect for x in dr), 600)   # drivers reconcile to the minimum
        self.assertIn("income shock", dr[0].description)
        self.assertNotIn("medical", " ".join(x.description for x in dr).lower())

    def test_baseline_unaffected_by_presence_of_stress_scenario(self):
        alone = simulate(vendor_twin(), [baseline()]).results[0]
        self.assertEqual(alone.timeline, self.base.timeline)

    def test_notes_describe_assumption(self):
        joined = " ".join(self.stress.notes)
        self.assertIn("0.7", joined)
        self.assertIn("2026-10-19 to 2026-11-01", joined)
        self.assertIn("not certain", joined)


class ShockBoundaries(unittest.TestCase):
    def test_1000_becomes_700(self):
        ev = generate_events([flow("s", "inflow", "business_sales", 1000, "once", "2026-10-20")], d("2026-10-19"), d("2026-10-25"))
        new, eff = apply_shock(ev, "business_sales", "0.7", d("2026-10-19"), d("2026-10-25"))
        self.assertEqual(new[0].amount, 700)
        self.assertEqual(ev[0].amount, 1000)           # input untouched
        self.assertEqual(eff.total_adjustment, -300)

    def test_events_outside_window_and_other_categories_untouched(self):
        flows = [flow("sales", "inflow", "business_sales", 1000),
                 flow("tip", "inflow", "other", 400, "once", "2026-10-20"),
                 flow("loan", "outflow", "debt_repayment", 500, "once", "2026-10-22"),
                 flow("stock", "outflow", "business_stock_cost", 300, "once", "2026-10-21")]
        twin = make_twin(10000, 0, flows, days=6)
        # window = 10-21 and 10-22 only
        r = simulate(twin, [baseline(), shock("s", "0.7", 2, "2026-10-21")]).results[1]
        self.assertEqual([p.inflows for p in r.timeline], [1000, 1400, 700, 700, 1000, 1000])
        self.assertEqual([p.outflows for p in r.timeline], [0, 0, 300, 500, 0, 0])   # outflows never shocked

    def test_shock_does_not_apply_to_outflows_of_same_category_name(self):
        twin = make_twin(1000, 0, [flow("x", "outflow", "business_sales", 100, "once", "2026-10-19")], days=2)
        r = simulate(twin, [baseline(), shock("s", "0.7", 2)]).results[1]
        self.assertEqual(r.timeline[0].outflows, 100)
        self.assertTrue(any("No inflow in that category" in n for n in r.notes))

    def test_shock_rounding_half_up(self):
        twin = make_twin(0, 0, [flow("s", "inflow", "business_sales", "10.05", "once", "2026-10-19")], days=1)
        r = simulate(twin, [baseline(), shock("s", "0.5", 1)]).results[1]
        self.assertEqual(str(r.timeline[0].inflows), "5.03")

    def test_shock_default_start_is_as_of_and_noted(self):
        r = simulate(vendor_twin(), [baseline(), shock("s", "0.7", 1)]).results[1]
        self.assertEqual(r.timeline[0].inflows, 700)
        self.assertEqual(r.timeline[1].inflows, 1000)
        self.assertTrue(any("as-of date was used" in n for n in r.notes))

    def test_shock_extending_past_horizon_noted(self):
        r = simulate(make_twin(1000, 0, [flow("s", "inflow", "business_sales", 100)], days=3),
                     [baseline(), shock("s", "0.5", 10)]).results[1]
        self.assertTrue(any("extends past the end" in n for n in r.notes))

    def test_comparison_ties_resolve_to_first_scenario(self):
        twin = make_twin(1000, 0, [], days=3)
        out = simulate(twin, [baseline(), shock("noop", "0.5", 2)])
        self.assertEqual(out.comparison.most_stressed_scenario_id, "baseline")
        self.assertEqual(out.comparison.change_in_minimum_balance, 0)

    def test_multiple_scenarios_all_returned_in_order(self):
        out = simulate(vendor_twin(), [baseline(), shock("a", "0.9", 5), shock("b", "0.5", 5)])
        self.assertEqual([r.scenario_id for r in out.results], ["baseline", "a", "b"])
        self.assertEqual(out.comparison.most_stressed_scenario_id, "b")


class Serialization(unittest.TestCase):
    def test_contract_keys_and_json_safe(self):
        out = output_to_dict(simulate(vendor_twin(), [baseline(), shock("s", "0.7", 14)]))
        json.dumps(out)
        self.assertEqual(out["schema_version"], "1.0")
        r = out["results"][0]
        for k in ("scenario_id", "label", "status", "timeline", "minimum_balance", "minimum_balance_date",
                  "shortfall_to_reserve", "first_reserve_breach_date", "major_drivers", "notes"):
            self.assertIn(k, r)
        for k in ("date", "opening_balance", "inflows", "outflows", "closing_balance", "reserve_gap"):
            self.assertIn(k, r["timeline"][0])
        for k in ("baseline_scenario_id", "most_stressed_scenario_id", "change_in_minimum_balance"):
            self.assertIn(k, out["comparison"])
        self.assertIsInstance(r["minimum_balance"], int)
        self.assertIsNone(r["first_reserve_breach_date"])
        self.assertEqual(r["timeline"][0]["date"], "2026-10-19")


class GoldenExample(unittest.TestCase):
    """The documented example request must still produce exactly the documented response."""

    def test_example_matches_engine_output(self):
        req = json.loads((EXAMPLES / "simulate_request.json").read_text(encoding="utf-8"))
        expected = json.loads((EXAMPLES / "simulate_response.json").read_text(encoding="utf-8"))
        twin, scenarios = twin_from_json(req)
        self.assertEqual(output_to_dict(simulate(twin, scenarios)), expected)


if __name__ == "__main__":
    unittest.main()
