"""
LUMO Workstream E — Module 2: Income Shock Simulator

Allows "what-if" scenario analysis for income reductions, temporary
zero-income periods, and unexpected expenses.

All arithmetic is deterministic — no LLM involved in calculations.

OUTPUT CONTRACT per scenario:
{
  "scenario_label": str,
  "income_shock_pct": float,
  "inputs": {
    "baseline_income": float,
    "shocked_income": float,
    "essential_expenses": float,
    "flexible_expenses": float,
    "debt_payments": float,
    "unexpected_expense": float,
    "starting_cash": float,
  },
  "results": {
    "total_obligations": float,
    "ending_cash": float,
    "shortfall": float,
    "days_of_cash_left": int | null,
  },
  "interpretation": str
}
"""
from __future__ import annotations

from typing import Optional
from app.intelligence.schemas import FinancialProfile
from app.intelligence import calculator as calc

_PRESET_SHOCKS = [0.0, 0.10, 0.20, 0.30, 0.50]

DISCLAIMER = (
    "These are illustrative scenarios based on the information you provided. "
    "Actual outcomes depend on many real-world factors not captured here. "
    "LUMO suggests reviewing these scenarios as a planning exercise, not a prediction."
)


def _run_single_scenario(
    baseline_income: float,
    shock_pct: float,
    essential: float,
    flexible: float,
    debt_payments: float,
    unexpected_expense: float,
    starting_cash: float,
    label: str,
) -> dict:
    """
    Core scenario calculation. All values are deterministic.
    Returns a full scenario result dict including the exact inputs used.
    """
    shocked_income = calc.apply_income_shock(baseline_income, shock_pct)
    total_expenses = essential + flexible + debt_payments + unexpected_expense
    net = shocked_income - total_expenses
    ending_cash = starting_cash + net
    shortfall = max(0.0, -net)

    # Days of cash left: how long starting_cash covers daily burn if income = 0
    daily_burn = total_expenses / 26 if total_expenses > 0 else 0
    days_left = int(starting_cash / daily_burn) if daily_burn > 0 else None

    # Interpretation string
    if shock_pct == 0 and shortfall == 0:
        interp = "Baseline looks stable for this month."
    elif net >= 0:
        interp = f"Even with a {shock_pct*100:.0f}% income drop, you may end the month with a small surplus."
    elif shortfall <= baseline_income * 0.10:
        interp = f"A {shock_pct*100:.0f}% income drop creates a small shortfall of ₹{shortfall:,.0f}."
    elif shortfall <= baseline_income * 0.30:
        interp = f"A {shock_pct*100:.0f}% income drop creates a significant shortfall of ₹{shortfall:,.0f}."
    else:
        interp = f"A {shock_pct*100:.0f}% income drop would create a severe shortfall of ₹{shortfall:,.0f}. Essential expenses may not be coverable."

    return {
        "scenario_label": label,
        "income_shock_pct": shock_pct,
        "inputs": {
            "baseline_income": round(baseline_income, 2),
            "shocked_income": round(shocked_income, 2),
            "essential_expenses": round(essential, 2),
            "flexible_expenses": round(flexible, 2),
            "debt_payments": round(debt_payments, 2),
            "unexpected_expense": round(unexpected_expense, 2),
            "starting_cash": round(starting_cash, 2),
        },
        "results": {
            "total_obligations": round(total_expenses, 2),
            "monthly_net": round(net, 2),
            "ending_cash": round(ending_cash, 2),
            "shortfall": round(shortfall, 2),
            "days_of_cash_left": days_left,
        },
        "interpretation": interp,
    }


def simulate_shock(
    profile: FinancialProfile,
    income_shock_pct: float = 0.30,
    unexpected_expense: Optional[float] = None,
    zero_income_days: Optional[int] = None,
) -> dict:
    """
    Run a single custom shock scenario plus the full preset grid.

    Returns:
      - custom_scenario: the specific shock requested
      - preset_grid: standard 0%/10%/20%/30%/50% scenarios for comparison
      - zero_income_scenario: result if zero_income_days is supplied
      - baseline: the no-shock scenario
    """
    inc = profile.income
    exp = profile.expenses
    debts = profile.debts

    monthly_inc = None
    if inc:
        monthly_inc = calc.monthly_income(inc.daily_average, inc.monthly_average,
                                          inc.income_frequency)

    if monthly_inc is None:
        return {
            "status": "insufficient_data",
            "message": "Income information is needed to run income shock simulations.",
            "disclaimer": DISCLAIMER,
        }

    essential = exp.essential_monthly if exp and exp.essential_monthly else 0.0
    flexible = exp.flexible_monthly if exp and exp.flexible_monthly else 0.0
    total_debt = calc.total_monthly_debt_payment(debts)
    cash = profile.cash_available or 0.0
    extra_expense = unexpected_expense or 0.0

    # -----------------------------------------------------------------------
    # Preset grid
    # -----------------------------------------------------------------------
    preset_grid = []
    for pct in _PRESET_SHOCKS:
        label = "Baseline" if pct == 0.0 else f"Income -{int(pct*100)}%"
        preset_grid.append(_run_single_scenario(
            baseline_income=monthly_inc,
            shock_pct=pct,
            essential=essential,
            flexible=flexible,
            debt_payments=total_debt,
            unexpected_expense=extra_expense,
            starting_cash=cash,
            label=label,
        ))

    # -----------------------------------------------------------------------
    # Custom scenario
    # -----------------------------------------------------------------------
    custom = _run_single_scenario(
        baseline_income=monthly_inc,
        shock_pct=income_shock_pct,
        essential=essential,
        flexible=flexible,
        debt_payments=total_debt,
        unexpected_expense=extra_expense,
        starting_cash=cash,
        label=f"Custom: Income -{int(income_shock_pct*100)}%" + (
            f" + ₹{extra_expense:,.0f} unexpected expense" if extra_expense else ""),
    )

    # -----------------------------------------------------------------------
    # Zero income scenario
    # -----------------------------------------------------------------------
    zero_scenario = None
    if zero_income_days is not None and zero_income_days > 0:
        zero_scenario = calc.zero_income_scenario(
            zero_days=zero_income_days,
            monthly_income=monthly_inc,
            essential=essential if essential else None,
            flexible=flexible if flexible else None,
            debt=total_debt,
            cash_available=cash,
        )

    # -----------------------------------------------------------------------
    # Confidence
    # -----------------------------------------------------------------------
    confidence = calc.build_confidence(
        income_present=True,
        debt_complete=all(
            d.monthly_payment is not None for d in debts
        ) if debts else True,
        expenses_present=exp is not None and exp.essential_monthly is not None,
    )

    return {
        "status": "ok",
        "baseline_income": round(monthly_inc, 2),
        "custom_scenario": custom,
        "preset_grid": preset_grid,
        "zero_income_scenario": zero_scenario,
        "confidence": confidence,
        "disclaimer": DISCLAIMER,
    }
