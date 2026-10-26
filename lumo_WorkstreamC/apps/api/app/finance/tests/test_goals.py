import unittest
from decimal import Decimal

from ..domain import Goal
from ..goals import DEFAULT_INCOME_ASSUMPTIONS, estimate_goal_progress
from ..money import D
from ..validation import SimulationInputError
from .helpers import d, flow, make_twin, vendor_twin


def goal(target, by="2026-10-28", saved=None):
    return Goal("g1", "New cart", D(target), d(by), "important", None if saved is None else D(saved))


def by_id(est):
    return {s.scenario_id: s for s in est.scenarios}


class GoalCalculator(unittest.TestCase):
    """Vendor +200/day (baseline), strong +400/day, weak 0/day; cash 2000, reserve 1000; goal by 10-28 (10 days);
    weekly contributions on 10-19 and 10-26 (n=2).
    max affordable per contribution: baseline 1200, strong 1400, weak 500."""

    def test_fundable_goal_baseline_and_strong_but_not_weak(self):
        est = estimate_goal_progress(vendor_twin(), goal(2000), proposed_amount=1000)
        self.assertEqual(est.contribution_count, 2)
        s = by_id(est)
        self.assertEqual([x.max_affordable_amount for x in (s["baseline"], s["strong_income"], s["weak_income"])],
                         [1200, 1400, 500])
        for x in s.values():
            self.assertEqual(x.required_amount, 1000)
        self.assertEqual(s["baseline"].suggested_amount, 1000)
        self.assertTrue(s["strong_income"].goal_fundable)
        self.assertIsNone(s["weak_income"].suggested_amount)
        self.assertFalse(s["weak_income"].goal_fundable)

    def test_allocation_reconciles_and_savings_counted_once(self):
        a = by_id(estimate_goal_progress(vendor_twin(), goal(2000), proposed_amount=1000))["baseline"]
        al = a.allocation
        self.assertEqual((al.starting_cash, al.inflows, al.essential_outflows, al.other_outflows,
                          al.allocated_to_savings, al.ending_cash), (2000, 10000, 8000, 0, 2000, 2000))
        self.assertEqual(al.ending_cash, al.starting_cash + al.inflows - al.essential_outflows
                         - al.other_outflows - al.allocated_to_savings)
        self.assertEqual(a.projected_saved, 2000)
        self.assertEqual(a.shortfall_to_goal, 0)
        self.assertEqual(a.feasibility, "within_reserve")
        self.assertEqual(a.minimum_balance, 1200)

    def test_weak_income_with_same_saving_breaches_reserve_but_not_zero(self):
        w = by_id(estimate_goal_progress(vendor_twin(), goal(2000), proposed_amount=1000))["weak_income"]
        self.assertEqual(w.feasibility, "reserve_breach")
        self.assertEqual(w.minimum_balance, 0)
        self.assertTrue(w.proposed_reaches_goal)       # arithmetically saved 2000 ...
        self.assertFalse(w.goal_fundable)              # ... but not without breaching the reserve

    def test_goal_that_cannot_be_funded(self):
        est = estimate_goal_progress(vendor_twin(), goal(5000), proposed_amount=2500)
        for x in est.scenarios:
            self.assertEqual(x.required_amount, 2500)
            self.assertFalse(x.goal_fundable)
            self.assertIsNone(x.suggested_amount)
        b = by_id(est)["baseline"]
        self.assertEqual(b.max_affordable_amount, 1200)
        self.assertEqual(b.feasibility, "cash_deficit")          # 2200 - 2500 < 0 on day 1
        self.assertTrue(any("at most" in n and "₹1,200" in n for n in b.notes))

    def test_essential_outflows_alone_infeasible_gives_no_suggestion(self):
        twin = make_twin(100, 50, [flow("sales", "inflow", "business_sales", 100),
                                   flow("rent", "outflow", "household_essential", 500, "once", "2026-10-20",
                                        essential=True)], days=10)
        est = estimate_goal_progress(twin, goal(1000, by="2026-10-22"), proposed_amount=100)
        for x in est.scenarios:
            self.assertEqual(x.feasibility, "essentials_infeasible")
            self.assertIsNone(x.suggested_amount)
            self.assertFalse(x.goal_fundable)
            self.assertTrue(any("Essential known outflows" in n for n in x.notes))

    def test_existing_savings_flow_excluded_not_double_counted(self):
        twin = vendor_twin()
        twin.cash_flows.append(flow("old", "outflow", "savings_goal", 300, "weekly", label="Old saving"))
        est = estimate_goal_progress(twin, goal(2000), proposed_amount=1000)
        self.assertEqual(by_id(est)["baseline"].allocation.allocated_to_savings, 2000)
        self.assertEqual(by_id(est)["baseline"].allocation.ending_cash, 2000)
        self.assertTrue(any("Old saving" in n for n in est.notes))

    def test_current_saved_reduces_required_amount(self):
        est = estimate_goal_progress(vendor_twin(), goal(2000, saved=1000), proposed_amount=500)
        b = by_id(est)["baseline"]
        self.assertEqual(b.required_amount, 500)
        self.assertEqual(b.projected_saved, 2000)

    def test_no_proposed_amount_still_analyses(self):
        b = by_id(estimate_goal_progress(vendor_twin(), goal(2000)))["baseline"]
        self.assertEqual(b.allocation.allocated_to_savings, 0)
        self.assertEqual(b.suggested_amount, 1000)
        self.assertTrue(any("No proposed amount" in n for n in b.notes))

    def test_explicit_assumptions_are_reported(self):
        est = estimate_goal_progress(vendor_twin(), goal(2000))
        self.assertEqual([(s.scenario_id, s.sales_multiplier) for s in est.scenarios],
                         [("baseline", Decimal("1")), ("strong_income", Decimal("1.2")), ("weak_income", Decimal("0.8"))])
        self.assertEqual(len(DEFAULT_INCOME_ASSUMPTIONS), 3)
        self.assertTrue(all("Income assumption" in s.notes[0] for s in est.scenarios))

    def test_rejects_bad_inputs(self):
        with self.assertRaises(SimulationInputError) as c:
            estimate_goal_progress(vendor_twin(), goal(100, by="2026-10-01"))
        self.assertEqual(c.exception.issues[0].code, "in_past")
        with self.assertRaises(SimulationInputError):
            estimate_goal_progress(make_twin(None, 100, []), goal(100))
        with self.assertRaises(SimulationInputError) as c:
            estimate_goal_progress(vendor_twin(), goal(100, by="2028-01-01"))
        self.assertEqual(c.exception.issues[0].code, "horizon_too_long")


if __name__ == "__main__":
    unittest.main()
