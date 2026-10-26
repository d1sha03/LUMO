"""Fixture builders (synthetic data only) and a JSON loader for the example files."""
from datetime import date
from decimal import Decimal

from ..domain import CashFlow, FinancialTwin, Goal, IncomeShock, Profile, ScenarioSpec
from ..money import D


def d(s):
    return date.fromisoformat(s)


def flow(fid, direction, category, amount, frequency="daily", start="2026-10-19", *,
         label=None, essential=False, confidence=1.0):
    return CashFlow(id=fid, label=label or fid, direction=direction, category=category,
                    amount=D(amount), frequency=frequency, start_date=d(start),
                    confidence=confidence, essential=essential)


def make_twin(cash, reserve, flows=(), *, as_of="2026-10-19", days=30, goals=()):
    return FinancialTwin(
        twin_id="synthetic", as_of_date=d(as_of),
        profile=Profile(cash_on_hand=None if cash is None else D(cash),
                        minimum_reserve=None if reserve is None else D(reserve), forecast_days=days),
        cash_flows=list(flows), goals=list(goals))


def baseline():
    return ScenarioSpec("baseline", "Expected situation")


def shock(sid, multiplier, duration, start=None, category="business_sales"):
    return ScenarioSpec(sid, sid, IncomeShock(category, D(multiplier), duration, d(start) if start else None))


def closings(result):
    return [p.closing_balance for p in result.timeline]


def vendor_twin():
    """Vendor: sales 1000/day, stock 600/day, household 200/day -> +200/day. cash 2000, reserve 1000, 20 days."""
    return make_twin(2000, 1000, [
        flow("sales", "inflow", "business_sales", 1000, label="Daily sales"),
        flow("stock", "outflow", "business_stock_cost", 600, label="Stock purchases", essential=True),
        flow("home", "outflow", "household_essential", 200, label="Household food", essential=True),
    ], days=20)


def twin_from_json(data):
    """Build the domain twin + scenarios from a request dict (used for the golden example test)."""
    t = data["twin"]
    p = t["profile"]
    twin = FinancialTwin(
        twin_id=t["twin_id"], as_of_date=d(t["as_of_date"]), language=t["language"],
        profile=Profile(occupation=p["occupation"],
                        cash_on_hand=None if p["cash_on_hand"] is None else D(p["cash_on_hand"]),
                        minimum_reserve=None if p["minimum_reserve"] is None else D(p["minimum_reserve"]),
                        forecast_days=p["forecast_days"]),
        cash_flows=[CashFlow(id=f["id"], label=f["label"], direction=f["direction"], category=f["category"],
                             amount=D(f["amount"]), frequency=f["frequency"], start_date=d(f["start_date"]),
                             confidence=f["confidence"], source_type=f["source_type"],
                             source_note=f.get("source_note"), essential=f["essential"])
                    for f in t["cash_flows"]])
    scenarios = []
    for s in data["scenarios"]:
        sh = s.get("income_shock")
        scenarios.append(ScenarioSpec(s["scenario_id"], s["label"], None if sh is None else IncomeShock(
            sh["category"], D(sh["multiplier"]), sh["duration_days"], d(sh["start_date"]) if sh.get("start_date") else None)))
    return twin, scenarios
