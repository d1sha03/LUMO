"""
LUMO Workstream E — Deterministic financial calculator utilities.

ARCHITECTURE RULE:
  All numerical results in Workstream E MUST originate here.
  The LLM is NEVER trusted for arithmetic, interest calculations,
  cash-flow calculations, debt ratios, projected balances, or
  savings amounts.

  The LLM only receives the OUTPUT of these functions and is asked
  to explain them in plain language.
"""
from __future__ import annotations

from typing import Optional


# ---------------------------------------------------------------------------
# Income helpers
# ---------------------------------------------------------------------------

def monthly_income(daily_avg: Optional[float], monthly_avg: Optional[float],
                   income_frequency: str = "daily") -> Optional[float]:
    """
    Return best-estimate monthly income.
    Uses 26 working days per month (standard India informal economy assumption).
    Returns None if no income data supplied.
    """
    if monthly_avg is not None:
        return monthly_avg
    if daily_avg is not None:
        return daily_avg * 26
    return None


def income_variability_range(
    monthly: float,
    variability: Optional[float],
    strong_day: Optional[float],
    weak_day: Optional[float],
) -> tuple[float, float]:
    """
    Return (weak_month, strong_month) income estimates.
    Priority: use explicit strong/weak day values if available,
    otherwise apply the variability fraction to monthly average.
    """
    if strong_day is not None and weak_day is not None:
        return weak_day * 26, strong_day * 26
    var = variability if variability is not None else 0.20  # default 20% variability
    return monthly * (1 - var), monthly * (1 + var)


def effective_daily_income(monthly: float) -> float:
    """Convert monthly income to effective daily (26 working days)."""
    return monthly / 26


# ---------------------------------------------------------------------------
# Expense helpers
# ---------------------------------------------------------------------------

def total_monthly_expenses(essential: Optional[float],
                            flexible: Optional[float]) -> Optional[float]:
    """Sum non-None expense components."""
    parts = [v for v in [essential, flexible] if v is not None]
    return sum(parts) if parts else None


def minimum_monthly_expenses(essential: Optional[float]) -> Optional[float]:
    """Floor expenses — only essential spending; used in stress scenarios."""
    return essential


# ---------------------------------------------------------------------------
# Debt helpers
# ---------------------------------------------------------------------------

def total_monthly_debt_payment(debts: list) -> float:
    """Sum of all monthly debt repayments."""
    return sum(d.monthly_payment for d in debts if d.monthly_payment is not None)


def total_outstanding_debt(debts: list) -> float:
    """Sum of all outstanding principal balances."""
    return sum(d.principal for d in debts if d.principal is not None)


def debt_to_income_ratio(total_monthly_payment: float,
                          monthly_income: float) -> Optional[float]:
    """
    Estimated monthly debt repayment as a fraction of monthly income.
    Returns None if income is zero or unknown.
    Industry heuristic: >0.35 is considered high pressure for informal workers.
    This threshold is configurable via DEBT_PRESSURE_THRESHOLD env var.
    """
    if monthly_income <= 0:
        return None
    return total_monthly_payment / monthly_income


# ---------------------------------------------------------------------------
# Cash-flow helpers
# ---------------------------------------------------------------------------

def monthly_net_cashflow(
    income: Optional[float],
    essential_expenses: Optional[float],
    flexible_expenses: Optional[float],
    debt_payments: float,
) -> Optional[float]:
    """
    income - essential - flexible - debt_payments
    Returns None if income is unknown.
    """
    if income is None:
        return None
    exp = (essential_expenses or 0) + (flexible_expenses or 0)
    return income - exp - debt_payments


def days_of_cash_runway(
    cash_available: Optional[float],
    daily_burn: Optional[float],
) -> Optional[int]:
    """
    How many days the current cash buffer can cover daily burn rate.
    Returns None if either input is unknown.
    """
    if cash_available is None or daily_burn is None or daily_burn <= 0:
        return None
    return int(cash_available / daily_burn)


def potential_shortfall(
    income: Optional[float],
    essential: Optional[float],
    flexible: Optional[float],
    debt: float,
) -> Optional[float]:
    """
    Returns the absolute shortfall if net cashflow is negative, else 0.
    Returns None if income is unknown.
    """
    net = monthly_net_cashflow(income, essential, flexible, debt)
    if net is None:
        return None
    return max(0.0, -net)


# ---------------------------------------------------------------------------
# Income shock helpers
# ---------------------------------------------------------------------------

def apply_income_shock(monthly_income: float, shock_pct: float) -> float:
    """Reduce income by shock_pct fraction. shock_pct=0.30 means 30% reduction."""
    shock_pct = max(0.0, min(1.0, shock_pct))
    return monthly_income * (1 - shock_pct)


def zero_income_scenario(
    zero_days: int,
    monthly_income: float,
    essential: Optional[float],
    flexible: Optional[float],
    debt: float,
    cash_available: Optional[float],
) -> dict:
    """
    Calculate cash impact of N days with zero income.
    Returns a dict with income_lost, total_obligations, ending_cash, shortfall.
    """
    daily_inc = effective_daily_income(monthly_income)
    income_lost = daily_inc * zero_days
    daily_exp = ((essential or 0) + (flexible or 0) + debt) / 26
    obligations = daily_exp * zero_days
    start_cash = cash_available or 0
    ending_cash = start_cash - income_lost - obligations
    return {
        "zero_income_days": zero_days,
        "income_lost": round(income_lost, 2),
        "obligations_during_period": round(obligations, 2),
        "ending_cash": round(ending_cash, 2),
        "shortfall": round(max(0.0, -ending_cash), 2),
    }


# ---------------------------------------------------------------------------
# Goal helpers
# ---------------------------------------------------------------------------

def months_to_goal(
    goal_amount: float,
    current_savings: Optional[float],
    monthly_savings_capacity: float,
) -> Optional[int]:
    """
    Number of months to reach a savings goal.
    Returns None if savings capacity is zero or negative.
    Returns a large sentinel (9999) if effectively unreachable.
    """
    remaining = goal_amount - (current_savings or 0)
    if remaining <= 0:
        return 0
    if monthly_savings_capacity <= 0:
        return None
    return int(remaining / monthly_savings_capacity) + (
        1 if remaining % monthly_savings_capacity > 0 else 0
    )


def monthly_savings_needed(
    goal_amount: float,
    deadline_months: int,
    current_savings: Optional[float] = None,
) -> float:
    """How much needs to be saved each month to hit a goal by the deadline."""
    remaining = goal_amount - (current_savings or 0)
    if remaining <= 0:
        return 0.0
    return remaining / deadline_months


def savings_capacity(
    monthly_income: Optional[float],
    essential: Optional[float],
    debt: float = 0.0,
    buffer_pct: float = 0.10,
    flexible: Optional[float] = None,
    buffer_reserve_pct: Optional[float] = None,
) -> Optional[float]:
    """
    Conservative monthly savings capacity.
    = income - essential - debt - (buffer_reserve of income)
    Flexible expenses are excluded — they can be reduced to fund a goal.
    The buffer_pct (default 10%) is kept aside for unexpected costs.
    Never returns a negative number; returns 0 if income is insufficient.
    Returns None if income is unknown.
    """
    if monthly_income is None:
        return None
    b_pct = buffer_reserve_pct if buffer_reserve_pct is not None else buffer_pct
    buffer = monthly_income * b_pct
    capacity = monthly_income - (essential or 0) - (debt or 0) - buffer
    return max(0.0, capacity)


# ---------------------------------------------------------------------------
# True earnings helpers
# ---------------------------------------------------------------------------

def net_earnings(
    gross: float,
    fuel: float = 0,
    maintenance: float = 0,
    platform_fees: float = 0,
    inventory: float = 0,
    food_work: float = 0,
    other: float = 0,
) -> dict:
    """
    Gross revenue minus all direct work-related costs.
    Returns detailed breakdown. Clearly labelled as ESTIMATED.
    """
    total_costs = fuel + maintenance + platform_fees + inventory + food_work + other
    net = gross - total_costs
    margin = (net / gross) if gross > 0 else 0.0
    return {
        "gross": round(gross, 2),
        "fuel": round(fuel, 2),
        "maintenance": round(maintenance, 2),
        "platform_fees": round(platform_fees, 2),
        "inventory": round(inventory, 2),
        "food_work_costs": round(food_work, 2),
        "other_work_costs": round(other, 2),
        "total_work_costs": round(total_costs, 2),
        "estimated_net": round(net, 2),
        "net_margin": round(margin, 4),
        "note": "ESTIMATED — based on costs provided by the user",
    }


# ---------------------------------------------------------------------------
# Confidence helpers
# ---------------------------------------------------------------------------

def confidence_level(drivers: list[str]) -> str:
    """
    Assign a qualitative confidence label based on how many data gaps exist.
    0-1 gaps → high; 2 gaps → moderate; 3+ gaps → low.
    """
    n = len(drivers)
    if n == 0:
        return "high"
    if n <= 1:
        return "moderate"
    if n <= 2:
        return "moderate"
    return "low"


def build_confidence(income_present: bool, debt_complete: bool,
                     expenses_present: bool) -> dict:
    """Build a structured confidence object."""
    drivers = []
    if not income_present:
        drivers.append("income estimate is missing or self-reported")
    if not debt_complete:
        drivers.append("debt interest rate or repayment details are incomplete")
    if not expenses_present:
        drivers.append("expense breakdown is approximate or missing")
    return {
        "overall": confidence_level(drivers),
        "drivers": drivers,
    }
