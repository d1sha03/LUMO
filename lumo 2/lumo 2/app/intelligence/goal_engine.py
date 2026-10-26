"""
LUMO Workstream E — Module 3: Goal Planning Engine

Accounts for income variability — does NOT assume monthly salary × months.
Scenarios: strong income / typical income / weak income.

RULES:
- Never encourage sacrificing essential expenses to hit a goal.
- Always show the "safe path" which preserves essential expenses + a buffer.
- Clearly flags if a goal is unreachable by the stated deadline.
"""
from __future__ import annotations

from typing import Optional
from app.intelligence.schemas import FinancialProfile, GoalRecord
from app.intelligence import calculator as calc

DISCLAIMER = (
    "Goal timelines are estimates based on the income and expense information provided. "
    "Essential expenses are always protected. LUMO suggests building goals around "
    "typical income, not your best days."
)

# Fraction of income kept as buffer (not touched for savings)
BUFFER_RESERVE_PCT = 0.10


def _goal_scenario(
    goal_amount: float,
    current_savings: Optional[float],
    monthly_income: float,
    essential: float,
    debt: float,
    income_label: str,
    buffer_pct: float = BUFFER_RESERVE_PCT,
) -> dict:
    """Compute one scenario for a goal given a specific income level."""
    capacity = calc.savings_capacity(monthly_income, essential, debt, buffer_pct=buffer_pct)
    months = calc.months_to_goal(goal_amount, current_savings, capacity or 0.0)

    remaining = goal_amount - (current_savings or 0)
    return {
        "income_label": income_label,
        "monthly_income": round(monthly_income, 2),
        "savings_capacity_per_month": round(capacity or 0.0, 2),
        "months_to_goal": months,
        "remaining_amount": round(remaining, 2),
        "feasible": months is not None and months < 9999,
        "note": "Essential expenses are fully protected in this scenario.",
    }


def analyze_goals(profile: FinancialProfile) -> dict:
    """
    Analyze all goals in the profile and return scenario-based planning.
    """
    if not profile.goals:
        return {
            "status": "no_goals",
            "message": "No goals have been defined in the financial profile.",
            "disclaimer": DISCLAIMER,
        }

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
            "message": "Income information is needed to plan savings goals.",
            "disclaimer": DISCLAIMER,
        }

    essential = exp.essential_monthly if exp and exp.essential_monthly is not None else 0.0
    total_debt = calc.total_monthly_debt_payment(debts)

    # Income scenarios
    weak_monthly, strong_monthly = calc.income_variability_range(
        monthly=monthly_inc,
        variability=inc.variability if inc else None,
        strong_day=inc.strong_day if inc else None,
        weak_day=inc.weak_day if inc else None,
    )
    typical_monthly = monthly_inc

    results = []
    for goal in profile.goals:
        result = _analyze_single_goal(
            goal=goal,
            typical_monthly=typical_monthly,
            weak_monthly=weak_monthly,
            strong_monthly=strong_monthly,
            essential=essential,
            total_debt=total_debt,
        )
        results.append(result)

    confidence = calc.build_confidence(
        income_present=True,
        debt_complete=all(d.monthly_payment is not None for d in debts) if debts else True,
        expenses_present=exp is not None and exp.essential_monthly is not None,
    )

    return {
        "status": "ok",
        "goals": results,
        "confidence": confidence,
        "disclaimer": DISCLAIMER,
    }


def analyze_single_goal(profile: FinancialProfile, goal_index: int = 0) -> dict:
    """
    Analyze a single goal by index.
    """
    if not profile.goals or goal_index >= len(profile.goals):
        return {
            "status": "insufficient_data",
            "message": f"Goal at index {goal_index} not found in profile.",
            "disclaimer": DISCLAIMER,
        }

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
            "message": "Income information is needed to plan savings goals.",
            "disclaimer": DISCLAIMER,
        }

    essential = exp.essential_monthly if exp and exp.essential_monthly is not None else 0.0
    total_debt = calc.total_monthly_debt_payment(debts)

    weak_monthly, strong_monthly = calc.income_variability_range(
        monthly=monthly_inc,
        variability=inc.variability if inc else None,
        strong_day=inc.strong_day if inc else None,
        weak_day=inc.weak_day if inc else None,
    )

    goal = profile.goals[goal_index]
    result = _analyze_single_goal(
        goal=goal,
        typical_monthly=monthly_inc,
        weak_monthly=weak_monthly,
        strong_monthly=strong_monthly,
        essential=essential,
        total_debt=total_debt,
    )

    confidence = calc.build_confidence(
        income_present=True,
        debt_complete=all(d.monthly_payment is not None for d in debts) if debts else True,
        expenses_present=exp is not None and exp.essential_monthly is not None,
    )
    result["confidence"] = confidence
    result["disclaimer"] = DISCLAIMER
    return result


def _analyze_single_goal(
    goal: GoalRecord,
    typical_monthly: float,
    weak_monthly: float,
    strong_monthly: float,
    essential: float,
    total_debt: float,
) -> dict:
    """Internal: compute full scenario analysis for one goal."""
    scenarios = {
        "strong": _goal_scenario(
            goal.amount, goal.current_savings, strong_monthly, essential, total_debt,
            "strong_income", BUFFER_RESERVE_PCT
        ),
        "typical": _goal_scenario(
            goal.amount, goal.current_savings, typical_monthly, essential, total_debt,
            "typical_income", BUFFER_RESERVE_PCT
        ),
        "weak": _goal_scenario(
            goal.amount, goal.current_savings, weak_monthly, essential, total_debt,
            "weak_income", BUFFER_RESERVE_PCT
        ),
    }

    # Deadline feasibility
    deadline_feasible = None
    deadline_warning = None
    if goal.deadline_months:
        needed = calc.monthly_savings_needed(goal.amount, goal.deadline_months, goal.current_savings)
        typical_capacity = scenarios["typical"]["savings_capacity_per_month"]
        deadline_feasible = typical_capacity >= needed
        if not deadline_feasible:
            if needed > 0:
                deficit = needed - typical_capacity
                deadline_warning = (
                    f"Reaching ₹{goal.amount:,.0f} in {goal.deadline_months} months requires "
                    f"saving ₹{needed:,.0f}/month. Typical capacity is ₹{typical_capacity:,.0f}/month — "
                    f"a gap of ₹{deficit:,.0f}/month. Consider extending the deadline."
                )
        else:
            deadline_warning = None

    # Recommended safe path = typical income scenario
    recommended_safe_path = {
        "approach": "Save from typical income",
        "monthly_saving": scenarios["typical"]["savings_capacity_per_month"],
        "estimated_months": scenarios["typical"]["months_to_goal"],
        "rationale": "Uses typical income and protects essential expenses and a 10% cash buffer.",
    }

    return {
        "goal_name": goal.name,
        "goal_amount": goal.amount,
        "current_savings": goal.current_savings or 0.0,
        "remaining_amount": goal.amount - (goal.current_savings or 0),
        "priority": goal.priority,
        "deadline_months": goal.deadline_months,
        "deadline_feasible": deadline_feasible,
        "deadline_warning": deadline_warning,
        "scenarios": scenarios,
        "recommended_safe_path": recommended_safe_path,
    }
