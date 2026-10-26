"""
LUMO Workstream E — Module 1: Financial Stress Radar

Identifies potential upcoming cash-flow pressure.

OUTPUT CONTRACT:
{
  "status": "ok" | "insufficient_data",
  "level": "stable" | "low" | "moderate" | "high" | "critical",
  "score": int (0-100),   # LUMO Financial Stress Indicator — NOT a credit score
  "potential_shortfall": float | null,
  "days_until_pressure": int | null,
  "drivers": [{"factor": str, "impact": "low"|"medium"|"high"}],
  "confidence": {...},
  "explanation_facts": [str],   # plain facts for the LLM to explain
  "disclaimer": str
}

IMPORTANT:
  - All numbers come from deterministic calculator.py functions.
  - The LLM is NOT used here. It only explains the output.
  - The score is called "LUMO Financial Stress Indicator", not "credit score".
  - Every driver is explicitly listed so it can be explained.
"""
from __future__ import annotations

from app.intelligence.schemas import FinancialProfile
from app.intelligence import calculator as calc

DISCLAIMER = (
    "This is the LUMO Financial Stress Indicator — a heuristic based on the "
    "information you provided. It is not a credit score, not a financial rating, "
    "and not an official assessment. It does not represent your worth as a person."
)


def analyze(profile: FinancialProfile) -> dict:
    """
    Compute the LUMO Financial Stress Indicator from the Financial Twin.
    All arithmetic is deterministic. Returns structured JSON.
    """
    inc = profile.income
    exp = profile.expenses
    debts = profile.debts
    goals = profile.goals
    risk = profile.risk

    # -----------------------------------------------------------------------
    # Extract raw values
    # -----------------------------------------------------------------------
    monthly_inc = None
    if inc:
        monthly_inc = calc.monthly_income(inc.daily_average, inc.monthly_average,
                                          inc.income_frequency)

    essential = exp.essential_monthly if exp else None
    flexible = exp.flexible_monthly if exp else None
    total_debt_payment = calc.total_monthly_debt_payment(debts)
    cash = profile.cash_available

    # -----------------------------------------------------------------------
    # Guard: insufficient data
    # -----------------------------------------------------------------------
    if monthly_inc is None and essential is None and not debts:
        return {
            "status": "insufficient_data",
            "message": "Income information is needed to estimate financial stress.",
            "disclaimer": DISCLAIMER,
        }

    # -----------------------------------------------------------------------
    # Core calculations
    # -----------------------------------------------------------------------
    net_cf = calc.monthly_net_cashflow(monthly_inc, essential, flexible, total_debt_payment)
    shortfall = calc.potential_shortfall(monthly_inc, essential, flexible, total_debt_payment)

    # Daily burn = (essential + flexible + debt) / 26
    daily_burn = None
    if essential is not None:
        daily_burn = ((essential or 0) + (flexible or 0) + total_debt_payment) / 26

    days_runway = calc.days_of_cash_runway(cash, daily_burn)

    # Upcoming goal pressure (nearest high-priority goal)
    days_until_goal_pressure = None
    upcoming_goal_amount = None
    for g in sorted(goals, key=lambda g: g.priority or "medium"):
        if g.deadline_months:
            days_until_goal_pressure = g.deadline_months * 30
            upcoming_goal_amount = g.amount
            break

    # -----------------------------------------------------------------------
    # Driver identification
    # -----------------------------------------------------------------------
    drivers = []

    # Income variability driver
    var = inc.variability if inc else None
    if var is not None and var >= 0.30:
        drivers.append({"factor": "high income variability", "impact": "high"})
    elif var is not None and var >= 0.15:
        drivers.append({"factor": "moderate income variability", "impact": "medium"})

    # Debt burden driver
    dti = None
    if monthly_inc and monthly_inc > 0:
        dti = calc.debt_to_income_ratio(total_debt_payment, monthly_inc)
    if dti is not None:
        if dti >= 0.40:
            drivers.append({"factor": "high debt repayment burden", "impact": "high"})
        elif dti >= 0.25:
            drivers.append({"factor": "elevated debt repayment burden", "impact": "medium"})

    # Cash buffer driver
    if cash is not None and daily_burn is not None and daily_burn > 0:
        buffer_days = cash / daily_burn
        if buffer_days < 7:
            drivers.append({"factor": "very low cash buffer (less than 1 week)", "impact": "high"})
        elif buffer_days < 15:
            drivers.append({"factor": "low cash buffer", "impact": "medium"})

    # Shortfall driver
    if shortfall and shortfall > 0:
        if shortfall > (monthly_inc or 1) * 0.20:
            drivers.append({"factor": "significant monthly cash shortfall", "impact": "high"})
        else:
            drivers.append({"factor": "small monthly cash shortfall", "impact": "medium"})

    # Upcoming goal driver
    if upcoming_goal_amount and days_until_goal_pressure:
        months_left = days_until_goal_pressure / 30
        if months_left <= 2:
            drivers.append({"factor": f"imminent goal payment: ₹{upcoming_goal_amount:,.0f}", "impact": "high"})
        elif months_left <= 4:
            drivers.append({"factor": f"upcoming goal payment: ₹{upcoming_goal_amount:,.0f}", "impact": "medium"})

    # Seasonal driver
    if inc and inc.seasonality in ("medium", "high"):
        drivers.append({"factor": "seasonal income fluctuation expected", "impact": "medium"})

    # Upcoming large expense
    if risk and risk.upcoming_large_expense and risk.upcoming_expense_months:
        if risk.upcoming_expense_months <= 2:
            drivers.append({
                "factor": f"large upcoming expense: ₹{risk.upcoming_large_expense:,.0f}",
                "impact": "high"
            })

    # -----------------------------------------------------------------------
    # Score: 0 (no stress) → 100 (maximum stress)
    # LUMO Financial Stress Indicator scoring rules (heuristic, not scientific)
    # -----------------------------------------------------------------------
    score = 0

    # Shortfall component (0-40 points)
    if shortfall is not None and monthly_inc and monthly_inc > 0:
        shortfall_ratio = shortfall / monthly_inc
        score += min(40, int(shortfall_ratio * 100))
    elif shortfall is not None and shortfall > 0:
        score += 30  # unknown income but confirmed shortfall

    # DTI component (0-25 points)
    if dti is not None:
        score += min(25, int(dti * 60))

    # Cash buffer component (0-25 points)
    if days_runway is not None:
        if days_runway < 3:
            score += 25
        elif days_runway < 7:
            score += 20
        elif days_runway < 15:
            score += 12
        elif days_runway < 30:
            score += 6

    # Variability component (0-15 points)
    if var is not None:
        score += min(15, int(var * 40))

    # Goal pressure component (0-5 points)
    if days_until_goal_pressure and days_until_goal_pressure < 90:
        score += 5

    score = min(100, max(0, score))

    # -----------------------------------------------------------------------
    # Level mapping
    # -----------------------------------------------------------------------
    if score <= 15:
        level = "stable"
    elif score <= 30:
        level = "low"
    elif score <= 55:
        level = "moderate"
    elif score <= 75:
        level = "high"
    else:
        level = "critical"

    # days_until_pressure = min of runway and goal deadline
    days_until_pressure = None
    candidates = [x for x in [days_runway, days_until_goal_pressure] if x is not None]
    if candidates:
        days_until_pressure = min(candidates)

    # -----------------------------------------------------------------------
    # Confidence
    # -----------------------------------------------------------------------
    confidence = calc.build_confidence(
        income_present=monthly_inc is not None,
        debt_complete=all(
            d.monthly_payment is not None and d.interest_rate is not None for d in debts
        ) if debts else True,
        expenses_present=essential is not None,
    )

    # -----------------------------------------------------------------------
    # Explanation facts (structured for the LLM to narrate — no arithmetic)
    # -----------------------------------------------------------------------
    explanation_facts = []
    if monthly_inc is not None:
        explanation_facts.append(f"Estimated monthly income: ₹{monthly_inc:,.0f}")
    if net_cf is not None:
        explanation_facts.append(
            f"Estimated monthly net cash flow: ₹{net_cf:,.0f} "
            f"({'surplus' if net_cf >= 0 else 'shortfall'})"
        )
    if shortfall and shortfall > 0:
        explanation_facts.append(f"Potential monthly shortfall: ₹{shortfall:,.0f}")
    if total_debt_payment > 0:
        explanation_facts.append(f"Total monthly debt repayments: ₹{total_debt_payment:,.0f}")
    if days_runway is not None:
        explanation_facts.append(f"Current cash covers approximately {days_runway} days of expenses")
    if dti is not None:
        explanation_facts.append(
            f"Debt repayment is approximately {dti*100:.0f}% of estimated monthly income"
        )
    explanation_facts.append(
        f"LUMO Financial Stress Indicator: {score}/100 ({level})"
    )

    return {
        "status": "ok",
        "level": level,
        "score": score,
        "potential_shortfall": round(shortfall, 2) if shortfall is not None else None,
        "monthly_net_cashflow": round(net_cf, 2) if net_cf is not None else None,
        "days_until_pressure": days_until_pressure,
        "cash_runway_days": days_runway,
        "drivers": drivers,
        "confidence": confidence,
        "explanation_facts": explanation_facts,
        "disclaimer": DISCLAIMER,
    }
