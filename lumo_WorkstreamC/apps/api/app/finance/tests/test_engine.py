"""Known-answer tests for the projection engine and Stress Radar. All data is synthetic.
Expected values are hand-computed in the comments. 'Exact' = arithmetic on stated inputs; the inputs
themselves are estimates, so real-world outcomes can differ."""
import copy
import unittest

from ..scenarios import simulate
from .helpers import baseline, closings, d, flow, make_twin


def run(twin):
    return simulate(twin, [baseline()]).results[0]


class KnownAnswers(unittest.TestCase):
    def test_cash_above_reserve_no_obligations(self):
        r = run(make_twin(5000, 2000, [], days=5))
        self.assertEqual(closings(r), [5000] * 5)
        self.assertEqual(r.status, "within_reserve")
        self.assertEqual(r.minimum_balance, 5000)
        self.assertEqual(r.minimum_balance_date, d("2026-10-19"))
        self.assertEqual(r.shortfall_to_reserve, 0)
        self.assertIsNone(r.first_reserve_breach_date)
        self.assertEqual(r.major_drivers, [])
        self.assertEqual(len(r.timeline), 5)
        self.assertEqual(r.timeline[-1].date, d("2026-10-23"))

    def test_one_time_essential_payment_stays_within_reserve(self):
        # 3000 - 1500 on 10-21 -> 1500 >= reserve 1000
        r = run(make_twin(3000, 1000, [flow("rent", "outflow", "household_essential", 1500, "once", "2026-10-21",
                                            essential=True)], days=5))
        self.assertEqual(closings(r), [3000, 3000, 1500, 1500, 1500])
        self.assertEqual(r.status, "within_reserve")
        self.assertEqual(r.minimum_balance_date, d("2026-10-21"))   # earliest day wins ties

    def test_one_time_payment_breaching_reserve(self):
        # 3000 - 2500 -> 500 < 1000: gap 500
        r = run(make_twin(3000, 1000, [flow("fee", "outflow", "household_essential", 2500, "once", "2026-10-21",
                                            essential=True)], days=5))
        self.assertEqual(r.status, "reserve_breach")
        self.assertEqual(r.first_reserve_breach_date, d("2026-10-21"))
        self.assertEqual(r.timeline[2].reserve_gap, 500)
        self.assertEqual(r.shortfall_to_reserve, 500)
        self.assertEqual(r.minimum_balance, 500)

    def test_daily_sales_and_daily_stock(self):
        r = run(make_twin(1000, 500, [flow("s", "inflow", "business_sales", 1500),
                                      flow("c", "outflow", "business_stock_cost", 900, essential=True)], days=4))
        self.assertEqual(closings(r), [1600, 2200, 2800, 3400])
        for p in r.timeline:
            self.assertEqual(p.inflows, 1500)
            self.assertEqual(p.outflows, 900)
        self.assertEqual(r.minimum_balance, 1600)

    def test_equation_and_opening_chain_hold_every_day(self):
        r = run(make_twin(1234, 500, [flow("s", "inflow", "business_sales", "333.33"),
                                      flow("c", "outflow", "business_stock_cost", "400.10")], days=12))
        for i, p in enumerate(r.timeline):
            self.assertEqual(p.closing_balance, p.opening_balance + p.inflows - p.outflows)
            self.assertEqual(p.reserve_gap, max(0, p.minimum_reserve - p.closing_balance))
            if i:
                self.assertEqual(p.opening_balance, r.timeline[i - 1].closing_balance)
        self.assertEqual(r.timeline[0].opening_balance, 1234)

    def test_monthly_repayment_and_closing_exactly_at_reserve_is_not_a_breach(self):
        # repay 2000 on 25th: 10-25 -> 3000; 11-25 -> 1000 == reserve 1000 (strict < needed for breach)
        rep = flow("loan", "outflow", "debt_repayment", 2000, "monthly", "2026-10-25", essential=True)
        r = run(make_twin(5000, 1000, [rep], days=40))
        self.assertEqual(r.timeline[5].closing_balance, 5000)       # 10-24
        self.assertEqual(r.timeline[6].closing_balance, 3000)       # 10-25
        self.assertEqual(r.timeline[-1].date, d("2026-11-27"))
        self.assertEqual(r.timeline[-1].closing_balance, 1000)
        self.assertEqual(r.status, "within_reserve")
        self.assertEqual(r.shortfall_to_reserve, 0)

    def test_monthly_repayment_ten_days_only_one_occurrence(self):
        rep = flow("loan", "outflow", "debt_repayment", 2000, "monthly", "2026-10-25", essential=True)
        r = run(make_twin(5000, 1000, [rep], days=10))
        self.assertEqual(sum(p.outflows for p in r.timeline), 2000)

    def test_supplier_payment_breaches_reserve(self):
        r = run(make_twin(4000, 2000, [flow("sup", "outflow", "supplier_payment", 2500, "once", "2026-10-22")], days=7))
        self.assertEqual(r.status, "reserve_breach")
        self.assertEqual(r.first_reserve_breach_date, d("2026-10-22"))
        self.assertEqual(r.minimum_balance, 1500)
        self.assertEqual(r.shortfall_to_reserve, 500)
        self.assertEqual(r.major_drivers[0].flow_id, "sup")
        self.assertEqual(r.major_drivers[0].net_effect, -2500)

    def test_negative_balance_is_cash_deficit(self):
        # 1000 -> 1000, then -800 on 10-20. reserve 500 -> gap 1300
        r = run(make_twin(1000, 500, [flow("big", "outflow", "supplier_payment", 1800, "once", "2026-10-20")], days=3))
        self.assertEqual(closings(r), [1000, -800, -800])
        self.assertEqual(r.status, "cash_deficit")
        self.assertEqual(r.timeline[1].reserve_gap, 1300)
        self.assertTrue(r.timeline[1].below_zero)
        self.assertEqual(r.shortfall_to_reserve, 1300)
        self.assertEqual(r.first_cash_deficit_date, d("2026-10-20"))

    def test_deficit_does_not_hide_earlier_reserve_breach(self):
        # 2000 -1500 (10-20) = 500 < reserve 1000; -800 (10-22) = -300
        r = run(make_twin(2000, 1000, [flow("a", "outflow", "other", 1500, "once", "2026-10-20"),
                                       flow("b", "outflow", "other", 800, "once", "2026-10-22")], days=5))
        self.assertEqual(closings(r), [2000, 500, 500, -300, -300])
        self.assertEqual(r.status, "cash_deficit")
        self.assertEqual(r.first_reserve_breach_date, d("2026-10-20"))
        self.assertEqual(r.first_cash_deficit_date, d("2026-10-22"))
        self.assertTrue(any("first breached on 2026-10-20" in n for n in r.notes))

    def test_event_on_first_day_of_horizon(self):
        r = run(make_twin(3000, 500, [flow("x", "outflow", "other", 700, "once", "2026-10-19")], days=2))
        self.assertEqual(r.timeline[0].opening_balance, 3000)
        self.assertEqual(r.timeline[0].outflows, 700)
        self.assertEqual(r.timeline[0].closing_balance, 2300)

    def test_event_on_last_day_included_and_day_after_excluded(self):
        r = run(make_twin(1000, 0, [flow("last", "outflow", "other", 100, "once", "2026-10-23"),
                                    flow("after", "outflow", "other", 999, "once", "2026-10-24")], days=5))
        self.assertEqual(r.timeline[-1].outflows, 100)
        self.assertEqual(r.timeline[-1].closing_balance, 900)

    def test_empty_cash_flow_list(self):
        r = run(make_twin(1500, 2000, [], days=3))
        self.assertEqual(closings(r), [1500] * 3)
        self.assertEqual(r.status, "reserve_breach")
        self.assertEqual(r.first_reserve_breach_date, d("2026-10-19"))
        self.assertEqual(r.shortfall_to_reserve, 500)
        self.assertTrue(any("No cash flows" in n for n in r.notes))

    def test_zero_cash_zero_reserve_is_within_reserve(self):
        self.assertEqual(run(make_twin(0, 0, [], days=2)).status, "within_reserve")

    def test_notes_flag_low_confidence_and_uncertainty(self):
        r = run(make_twin(1000, 500, [flow("s", "inflow", "business_sales", 100, label="Guessed sales",
                                           confidence=0.4)], days=2))
        self.assertTrue(any("low-confidence" in n and "Guessed sales" in n for n in r.notes))
        r2 = run(make_twin(100, 500, [], days=2))
        self.assertTrue(any("not certain" in n and "insolvent" in n for n in r2.notes))

    def test_flow_starting_after_horizon_is_noted_not_applied(self):
        r = run(make_twin(1000, 0, [flow("later", "outflow", "other", 500, "once", "2026-12-01", label="Later bill")],
                          days=5))
        self.assertEqual(closings(r), [1000] * 5)
        self.assertTrue(any("Later bill" in n for n in r.notes))

    def test_twin_is_not_mutated(self):
        twin = make_twin(2000, 1000, [flow("s", "inflow", "business_sales", 1000)], days=5)
        snapshot = copy.deepcopy(twin)
        from .helpers import shock
        simulate(twin, [baseline(), shock("s30", "0.7", 3)])
        self.assertEqual(twin, snapshot)


if __name__ == "__main__":
    unittest.main()
