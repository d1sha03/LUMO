"""Convert engine results to the JSON-ready dicts of the shared API contract.

Fields beyond the shared contract are additive (ignored by strict-contract consumers) and listed in
README.md: timeline[].minimum_reserve/below_reserve/below_zero, results[].first_cash_deficit_date,
major_drivers[] contents, comparison.comparison_basis/worst_shortfall_date/worst_shortfall_to_reserve.
"""
from __future__ import annotations

from typing import Any, Dict, Optional

from .engine import DayProjection, Driver
from .money import to_number
from .scenarios import ScenarioResult, SimulationOutput


def _iso(d: Optional[Any]) -> Optional[str]:
    return d.isoformat() if d is not None else None


def day_to_dict(d: DayProjection) -> Dict[str, Any]:
    return {
        "date": d.date.isoformat(),
        "opening_balance": to_number(d.opening_balance),
        "inflows": to_number(d.inflows),
        "outflows": to_number(d.outflows),
        "closing_balance": to_number(d.closing_balance),
        "reserve_gap": to_number(d.reserve_gap),
        "minimum_reserve": to_number(d.minimum_reserve),
        "below_reserve": d.below_reserve,
        "below_zero": d.below_zero,
    }


def driver_to_dict(d: Driver) -> Dict[str, Any]:
    return {
        "flow_id": d.flow_id, "label": d.label, "category": d.category, "direction": d.direction,
        "occurrences": d.occurrences, "total_amount": to_number(d.total_amount),
        "net_effect": to_number(d.net_effect), "shock_adjustment": to_number(d.shock_adjustment),
        "description": d.description,
    }


def result_to_dict(r: ScenarioResult) -> Dict[str, Any]:
    return {
        "scenario_id": r.scenario_id, "label": r.label, "status": r.status,
        "timeline": [day_to_dict(d) for d in r.timeline],
        "minimum_balance": to_number(r.minimum_balance),
        "minimum_balance_date": _iso(r.minimum_balance_date),
        "shortfall_to_reserve": to_number(r.shortfall_to_reserve),
        "first_reserve_breach_date": _iso(r.first_reserve_breach_date),
        "first_cash_deficit_date": _iso(r.first_cash_deficit_date),
        "major_drivers": [driver_to_dict(d) for d in r.major_drivers],
        "notes": list(r.notes),
    }


def output_to_dict(o: SimulationOutput) -> Dict[str, Any]:
    c = o.comparison
    return {
        "schema_version": o.schema_version,
        "results": [result_to_dict(r) for r in o.results],
        "comparison": {
            "baseline_scenario_id": c.baseline_scenario_id,
            "most_stressed_scenario_id": c.most_stressed_scenario_id,
            "change_in_minimum_balance": to_number(c.change_in_minimum_balance),
            "comparison_basis": c.comparison_basis,
            "worst_shortfall_date": _iso(c.worst_shortfall_date),
            "worst_shortfall_to_reserve": to_number(c.worst_shortfall_to_reserve),
        },
    }
