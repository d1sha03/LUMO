"""Money helpers: Decimal arithmetic, one documented rounding rule, INR formatting.

ROUNDING RULE (applies everywhere in the engine)
------------------------------------------------
* All arithmetic uses ``decimal.Decimal`` - never binary floats.
* Every cash event amount is rounded to paise (2 decimal places) with
  ROUND_HALF_UP *when the event is created* (including after a shock multiplier).
  Because every event is already a whole number of paise, daily totals and balances are
  exact sums: ``closing = opening + inflows - outflows`` holds exactly in the output.
* Serialisation: whole-rupee values are emitted as JSON integers, others as 2-dp numbers.
"""
from __future__ import annotations

from decimal import Decimal, ROUND_HALF_UP
from typing import Any, Union

PAISE = Decimal("0.01")


def D(value: Any) -> Decimal:
    """Convert int/str/float/Decimal to Decimal without binary-float artefacts."""
    if isinstance(value, Decimal):
        return value
    return Decimal(str(value))


def quantize_money(value: Any) -> Decimal:
    return D(value).quantize(PAISE, rounding=ROUND_HALF_UP)


def to_number(value: Any) -> Union[int, float]:
    """JSON-ready number: int when whole rupees, otherwise a 2-dp float."""
    q = quantize_money(value)
    if q == q.to_integral_value():
        return int(q)
    return float(q)


def format_inr(value: Any) -> str:
    """Format as rupees with Indian digit grouping, e.g. 1234567.5 -> ₹12,34,567.50."""
    q = quantize_money(value)
    negative = q < 0
    whole, _, frac = f"{abs(q):.2f}".partition(".")
    if len(whole) > 3:
        head, tail = whole[:-3], whole[-3:]
        groups = []
        while len(head) > 2:
            groups.insert(0, head[-2:])
            head = head[:-2]
        if head:
            groups.insert(0, head)
        whole = ",".join(groups + [tail])
    text = whole if frac == "00" else f"{whole}.{frac}"
    return ("-" if negative else "") + "₹" + text
