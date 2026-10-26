"""Deterministic cash projection, Financial Stress Radar summary and driver attribution.

All functions are pure. Equation per day (exact in Decimal):
    closing_balance = opening_balance + inflows - outflows
    next_opening    = previous closing
    reserve_gap     = max(0, minimum_reserve - closing_balance)
Radar:
    shortfall_to_reserve = max(0, minimum_reserve - minimum_projected_balance)
    status: cash_deficit if any closing < 0; else reserve_breach if any closing < reserve
            (strictly below - a balance exactly equal to the reserve is NOT a breach);
            else within_reserve.
Limitation: only end-of-day balances are tracked. Same-day inflows and outflows are netted, so
an intraday dip below the reserve (or zero) cannot be detected.
"""
from __future__ import annotations

from collections import OrderedDict
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Dict, Iterable, List, Optional, Sequence

from .money import D, format_inr, quantize_money
from .scheduler import ScheduledEvent

ZERO = Decimal("0")
MAX_DRIVERS = 5


@dataclass(frozen=True)
class DayProjection:
    date: date
    opening_balance: Decimal
    inflows: Decimal
    outflows: Decimal
    closing_balance: Decimal
    minimum_reserve: Decimal
    reserve_gap: Decimal
    below_reserve: bool
    below_zero: bool


@dataclass(frozen=True)
class ProjectionSummary:
    status: str
    minimum_balance: Decimal
    minimum_balance_date: date
    shortfall_to_reserve: Decimal
    first_reserve_breach_date: Optional[date]
    first_cash_deficit_date: Optional[date]


@dataclass(frozen=True)
class Driver:
    flow_id: str
    label: str
    category: str
    direction: str
    occurrences: int
    total_amount: Decimal       # sum of applied amounts up to the lowest-balance date
    net_effect: Decimal         # +total for inflows, -total for outflows
    shock_adjustment: Decimal   # cash effect of the scenario shock on this flow (<0 = less cash)
    description: str


def project_cash(opening_cash: Decimal, minimum_reserve: Decimal, start_date: date,
                 horizon_days: int, events: Iterable[ScheduledEvent]) -> List[DayProjection]:
    if horizon_days < 1:
        raise ValueError("horizon_days must be at least 1")
    end_date = start_date + timedelta(days=horizon_days - 1)
    inflow: Dict[date, Decimal] = {}
    outflow: Dict[date, Decimal] = {}
    for e in events:
        if not (start_date <= e.date <= end_date):
            raise ValueError(f"Event {e.flow_id} on {e.date} is outside the horizon")
        bucket = inflow if e.direction == "inflow" else outflow
        bucket[e.date] = bucket.get(e.date, ZERO) + e.amount

    reserve = quantize_money(minimum_reserve)
    balance = quantize_money(opening_cash)
    days: List[DayProjection] = []
    for i in range(horizon_days):
        d = start_date + timedelta(days=i)
        inflows = inflow.get(d, ZERO)
        outflows = outflow.get(d, ZERO)
        closing = balance + inflows - outflows
        days.append(DayProjection(
            date=d, opening_balance=balance, inflows=inflows, outflows=outflows,
            closing_balance=closing, minimum_reserve=reserve,
            reserve_gap=max(ZERO, reserve - closing),
            below_reserve=closing < reserve, below_zero=closing < ZERO))
        balance = closing
    return days


def summarize(days: Sequence[DayProjection]) -> ProjectionSummary:
    if not days:
        raise ValueError("Cannot summarise an empty projection")
    lowest = min(days, key=lambda d: (d.closing_balance, d.date))  # earliest day wins ties
    breach = next((d.date for d in days if d.below_reserve), None)
    deficit = next((d.date for d in days if d.below_zero), None)
    if deficit is not None:
        status = "cash_deficit"
    elif breach is not None:
        status = "reserve_breach"
    else:
        status = "within_reserve"
    return ProjectionSummary(
        status=status,
        minimum_balance=lowest.closing_balance,
        minimum_balance_date=lowest.date,
        shortfall_to_reserve=max(ZERO, days[0].minimum_reserve - lowest.closing_balance),
        first_reserve_breach_date=breach,
        first_cash_deficit_date=deficit)


def compute_drivers(events: Iterable[ScheduledEvent], through_date: date,
                    max_drivers: int = MAX_DRIVERS) -> List[Driver]:
    """Largest net cash effects of the *actually scheduled* flows from the horizon start up to
    ``through_date`` (normally the lowest-balance date). Nothing is inferred beyond the flows."""
    grouped: "OrderedDict[str, List[ScheduledEvent]]" = OrderedDict()
    for e in events:
        if e.date <= through_date:
            grouped.setdefault(e.flow_id, []).append(e)

    drivers: List[Driver] = []
    for flow_id, evs in grouped.items():
        first = evs[0]
        total = sum((e.amount for e in evs), ZERO)
        shock = sum((e.shock_delta for e in evs), ZERO)
        sign = 1 if first.direction == "inflow" else -1
        n = len(evs)
        plural = "" if n == 1 else "s"
        verb = "added to" if first.direction == "inflow" else "taken from"
        text = (f"{first.label}: {n} occurrence{plural} totalling {format_inr(total)} "
                f"{verb} cash up to {through_date.isoformat()}")
        if shock != ZERO:
            word = "reduced" if shock < 0 else "increased"
            text += f" ({word} by {format_inr(abs(shock))} by the scenario's income shock)"
        drivers.append(Driver(flow_id, first.label, first.category, first.direction, n,
                              total, sign * total, shock, text))
    order = {fid: i for i, fid in enumerate(grouped)}
    drivers.sort(key=lambda d: (-abs(d.net_effect), order[d.flow_id]))
    return drivers[:max_drivers]
