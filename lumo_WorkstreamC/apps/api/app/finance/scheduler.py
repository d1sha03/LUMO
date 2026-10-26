"""Cash-flow schedule generator: recurring CashFlow records -> dated events.

Pure functions on ``datetime.date`` only. The engine never calls ``now()``/``today()`` and never
converts through UTC, so ISO calendar dates (Asia/Kolkata semantics) cannot shift by a day.

Rules
-----
* An occurrence is never produced before ``start_date``.
* Both ends of the window are inclusive (the final horizon day is included).
* weekly  : every 7 days, anchored on ``start_date`` (same weekday as the start date).
* monthly : day-of-month of ``start_date``, clamped to the month's last day (31 Jan -> 28 Feb
            -> 31 Mar; the clamp is recomputed from the original day, never carried forward).
* Occurrences before the window start (before ``as_of_date``) are *not* replayed: they are
  assumed to be already reflected in the user's current cash.
"""
from __future__ import annotations

import calendar
from dataclasses import dataclass
from datetime import date, timedelta
from decimal import Decimal
from typing import Any, Iterable, List

from .money import quantize_money


def add_months_clamped(start: date, months: int) -> date:
    index = start.year * 12 + (start.month - 1) + months
    year, month0 = divmod(index, 12)
    month = month0 + 1
    day = min(start.day, calendar.monthrange(year, month)[1])
    return date(year, month, day)


def occurrence_dates(start: date, frequency: str, window_start: date, window_end: date) -> List[date]:
    if window_end < window_start:
        return []
    if frequency == "once":
        return [start] if window_start <= start <= window_end else []
    if frequency == "daily":
        first = max(start, window_start)
        return [first + timedelta(days=i) for i in range((window_end - first).days + 1)]
    if frequency == "weekly":
        if start >= window_start:
            first = start
        else:
            weeks = -(-(window_start - start).days // 7)  # ceil
            first = start + timedelta(days=7 * weeks)
        out, current = [], first
        while current <= window_end:
            out.append(current)
            current += timedelta(days=7)
        return out
    if frequency == "monthly":
        k = max(0, (window_start.year - start.year) * 12 + (window_start.month - start.month) - 1)
        out = []
        while True:
            current = add_months_clamped(start, k)
            if current > window_end:
                break
            if current >= window_start:
                out.append(current)
            k += 1
        return out
    raise ValueError(f"Unsupported frequency: {frequency!r}")


@dataclass(frozen=True)
class ScheduledEvent:
    date: date
    flow_id: str
    label: str
    category: str
    direction: str          # "inflow" | "outflow"
    amount: Decimal         # amount actually applied (after any shock), rounded to paise
    base_amount: Decimal    # amount before any scenario shock
    essential: bool = False
    shock_delta: Decimal = Decimal("0")   # applied - base (cash effect of a shock; <0 = less cash)
    order: int = 0          # position of the source flow in the twin (stable tie-break)


def generate_events(flows: Iterable[Any], window_start: date, window_end: date) -> List[ScheduledEvent]:
    """Expand flows into dated events inside [window_start, window_end], sorted by date then input order."""
    events: List[ScheduledEvent] = []
    for order, flow in enumerate(flows):
        amount = quantize_money(flow.amount)
        for d in occurrence_dates(flow.start_date, flow.frequency, window_start, window_end):
            events.append(ScheduledEvent(
                date=d, flow_id=flow.id, label=flow.label, category=flow.category,
                direction=flow.direction, amount=amount, base_amount=amount,
                essential=bool(flow.essential), order=order))
    events.sort(key=lambda e: (e.date, e.order))
    return events
