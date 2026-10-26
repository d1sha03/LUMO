"""Scenario runner: baseline + income shocks, all computed from the same unmodified twin.

Shock semantics: window = [start_date, start_date + duration_days - 1] (both inclusive; a 14-day
shock starting 2026-10-19 covers 2026-10-19 .. 2026-11-01). Only *inflow* flows whose category
equals the shock category and whose occurrence date is in the window are multiplied; each affected
occurrence is re-rounded to paise (ROUND_HALF_UP). Nothing else changes. The twin is never mutated.
"""
from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, List, Optional, Sequence, Tuple

from .domain import LOW_CONFIDENCE_THRESHOLD, SCHEMA_VERSION
from .engine import (DayProjection, Driver, ProjectionSummary, compute_drivers, project_cash,
                     summarize)
from .money import D, format_inr, quantize_money
from .scheduler import ScheduledEvent, generate_events
from .validation import (find_baseline, require_valid, validate_scenarios,
                         validate_twin_for_simulation)

ZERO = Decimal("0")


@dataclass(frozen=True)
class ShockEffect:
    window_start: date
    window_end: date
    affected_occurrences: int
    total_adjustment: Decimal   # sum(applied - base); negative = less cash


@dataclass(frozen=True)
class ScenarioResult:
    scenario_id: str
    label: str
    status: str
    timeline: List[DayProjection]
    minimum_balance: Decimal
    minimum_balance_date: date
    shortfall_to_reserve: Decimal
    first_reserve_breach_date: Optional[date]
    first_cash_deficit_date: Optional[date]
    major_drivers: List[Driver]
    notes: List[str]


@dataclass(frozen=True)
class Comparison:
    baseline_scenario_id: str
    most_stressed_scenario_id: str
    change_in_minimum_balance: Decimal
    comparison_basis: str
    worst_shortfall_date: date
    worst_shortfall_to_reserve: Decimal


@dataclass(frozen=True)
class SimulationOutput:
    schema_version: str
    results: List[ScenarioResult]
    comparison: Comparison


COMPARISON_BASIS = (
    "Compares the lowest projected end-of-day cash balance in each scenario over the forecast "
    "horizon (change = most stressed minus baseline). It compares projected cash positions under "
    "stated assumptions; it is not a probability of loss or default.")


def shock_window(shock: Any, as_of: date) -> Tuple[date, date]:
    start = shock.start_date or as_of
    return start, start + timedelta(days=shock.duration_days - 1)


def apply_shock(events: Sequence[ScheduledEvent], category: str, multiplier: Any,
                window_start: date, window_end: date) -> Tuple[List[ScheduledEvent], ShockEffect]:
    """Return new events with the shock applied (inputs untouched) plus a summary of its effect."""
    mult = D(multiplier)
    out: List[ScheduledEvent] = []
    count, total = 0, ZERO
    for e in events:
        if e.direction == "inflow" and e.category == category and window_start <= e.date <= window_end:
            new_amount = quantize_money(e.base_amount * mult)
            delta = new_amount - e.base_amount
            out.append(replace(e, amount=new_amount, shock_delta=delta))
            count += 1
            total += delta
        else:
            out.append(e)
    return out, ShockEffect(window_start, window_end, count, total)


def _fmt_mult(m: Any) -> str:
    return format(D(m).normalize(), "f")


def _build_notes(twin: Any, scenario: Any, horizon: Tuple[date, date], base_events: Sequence[ScheduledEvent],
                 effect: Optional[ShockEffect], summary: ProjectionSummary,
                 drivers: Sequence[Driver]) -> List[str]:
    ws, we = horizon
    profile = twin.profile
    notes = [
        f"Assumes {format_inr(profile.cash_on_hand)} cash on hand at the start of {ws.isoformat()} and a "
        f"minimum reserve of {format_inr(profile.minimum_reserve)}. Expected income is not counted as "
        f"cash until its scheduled date. Horizon: {ws.isoformat()} to {we.isoformat()} "
        f"({profile.forecast_days} days, both ends included).",
        "Every listed cash flow is assumed to happen in full on its scheduled date. Amounts come from "
        "the user's statements or estimates, so this is a projection, not a certainty. Same-day "
        "inflows and outflows are netted; intraday dips are not shown.",
    ]
    if not twin.cash_flows:
        notes.append("No cash flows were supplied, so the balance stays at the opening cash for the whole horizon.")

    used_ids = {e.flow_id for e in base_events}
    low = [f.label for f in twin.cash_flows if f.id in used_ids and f.confidence < LOW_CONFIDENCE_THRESHOLD]
    if low:
        notes.append(f"{len(low)} flow(s) rely on low-confidence extracted values ({', '.join(low)}); "
                     "confirm them with the user. The result is an estimate.")
    late = [f.label for f in twin.cash_flows if f.start_date > we]
    if late:
        notes.append(f"Flow(s) starting after {we.isoformat()} are outside the horizon and not applied: "
                     f"{', '.join(late)}.")

    shock = scenario.income_shock
    if shock is not None and effect is not None:
        if shock.start_date is None:
            notes.append("No shock start date was supplied; the as-of date was used.")
        notes.append(
            f"Scenario assumption: '{shock.category}' inflows are multiplied by {_fmt_mult(shock.multiplier)} "
            f"from {effect.window_start.isoformat()} to {effect.window_end.isoformat()} "
            f"({shock.duration_days} days). {effect.affected_occurrences} scheduled occurrence(s) changed; "
            f"net cash effect {'-' if effect.total_adjustment < 0 else ''}{format_inr(abs(effect.total_adjustment))}.")
        if effect.affected_occurrences == 0:
            notes.append("No inflow in that category falls inside the shock window, so this scenario "
                         "matches the baseline.")
        if effect.window_end > we:
            notes.append("The shock window extends past the end of the forecast horizon; only days inside "
                         "the horizon are modelled.")
        if effect.window_start < ws:
            notes.append("The shock window starts before the as-of date; only days from the as-of date apply.")

    low_text = f"lowest {format_inr(summary.minimum_balance)} on {summary.minimum_balance_date.isoformat()}"
    if summary.status == "within_reserve":
        notes.append(f"Projected closing cash stays at or above the reserve throughout the horizon ({low_text}), "
                     "based on these assumptions.")
    elif summary.status == "reserve_breach":
        notes.append(f"Projected closing cash falls below the reserve ({low_text}; first below on "
                     f"{summary.first_reserve_breach_date.isoformat()}). This depends on the assumptions above, "
                     "is not certain, and does not by itself mean the business is insolvent.")
    else:
        notes.append(f"Projected cash falls below zero ({low_text}; first below zero on "
                     f"{summary.first_cash_deficit_date.isoformat()}). The reserve was first breached on "
                     f"{summary.first_reserve_breach_date.isoformat()}. This depends on the assumptions above, "
                     "is not certain, and does not by itself mean the business is insolvent.")
    if drivers:
        notes.append(f"Drivers are the largest net cash effects of the scheduled flows from {ws.isoformat()} "
                     f"to the lowest-balance date {summary.minimum_balance_date.isoformat()}.")
    return notes


def simulate_scenario(twin: Any, scenario: Any, base_events: Sequence[ScheduledEvent],
                      horizon: Tuple[date, date]) -> ScenarioResult:
    ws, we = horizon
    events: Sequence[ScheduledEvent] = base_events
    effect: Optional[ShockEffect] = None
    if scenario.income_shock is not None:
        s_start, s_end = shock_window(scenario.income_shock, twin.as_of_date)
        events, effect = apply_shock(base_events, scenario.income_shock.category,
                                     scenario.income_shock.multiplier, s_start, s_end)
    days = project_cash(twin.profile.cash_on_hand, twin.profile.minimum_reserve, ws,
                        twin.profile.forecast_days, events)
    summary = summarize(days)
    drivers = compute_drivers(events, summary.minimum_balance_date)
    return ScenarioResult(
        scenario_id=scenario.scenario_id, label=scenario.label, status=summary.status, timeline=days,
        minimum_balance=summary.minimum_balance, minimum_balance_date=summary.minimum_balance_date,
        shortfall_to_reserve=summary.shortfall_to_reserve,
        first_reserve_breach_date=summary.first_reserve_breach_date,
        first_cash_deficit_date=summary.first_cash_deficit_date,
        major_drivers=drivers, notes=_build_notes(twin, scenario, horizon, base_events, effect, summary, drivers))


def simulate(twin: Any, scenarios: Sequence[Any]) -> SimulationOutput:
    """Validate, then run every requested scenario from the same original twin."""
    issues = validate_twin_for_simulation(twin) + validate_scenarios(scenarios)
    require_valid(issues)

    ws = twin.as_of_date
    we = ws + timedelta(days=twin.profile.forecast_days - 1)
    base_events = generate_events(twin.cash_flows, ws, we)   # shared, immutable
    results = [simulate_scenario(twin, s, base_events, (ws, we)) for s in scenarios]

    baseline_spec = find_baseline(scenarios)
    baseline = next(r for r in results if r.scenario_id == baseline_spec.scenario_id)
    stressed = min(enumerate(results), key=lambda p: (p[1].minimum_balance, p[0]))[1]
    comparison = Comparison(
        baseline_scenario_id=baseline.scenario_id,
        most_stressed_scenario_id=stressed.scenario_id,
        change_in_minimum_balance=stressed.minimum_balance - baseline.minimum_balance,
        comparison_basis=COMPARISON_BASIS,
        worst_shortfall_date=stressed.minimum_balance_date,
        worst_shortfall_to_reserve=stressed.shortfall_to_reserve)
    return SimulationOutput(SCHEMA_VERSION, results, comparison)
