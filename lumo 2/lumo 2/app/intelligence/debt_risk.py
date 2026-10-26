"""
LUMO Workstream E — Module 4: Debt Pressure Warning

Evaluates debt burden relative to income and essential expenses.

ETHICAL RULES:
- Never labels a person as "bad borrower" or "risky person".
- Evaluates the FINANCIAL SITUATION, not the person's worth.
- Uses configurable thresholds (not hardcoded universal rules).

Configurable thresholds via environment variables:
  DEBT_WARNING_THRESHOLD   float (default 0.35 — debt/income ratio)
  DEBT_HIGH_THRESHOLD      float (default 0.50 — debt/income ratio)
"""
from __future__ import annotations

from app.intelligence.schemas import FinancialProfile
from app.intelligence import calculator as calc
from app import config

# Configurable thresholds
_WARNING_THRESHOLD = config.env_float("DEBT_WARNING_THRESHOLD", 0.35)
_HIGH_THRESHOLD = config.env_float("DEBT_HIGH_THRESHOLD", 0.50)

DISCLAIMER = (
    "This analysis reflects the financial situation, not a judgement of any person. "
    "Debt obligations vary by lender and context. LUMO does not provide legal or "
    "financial advice. If you are in financial difficulty, consider speaking with "
    "a qualified financial counsellor or a trusted community resource."
)


def analyze(profile: FinancialProfile) -> dict:
    """
    Identify debt pressure based on debt-to-income ratio, income floor,
    and cash buffer under weak income scenarios.
    """
    inc = profile.income
    exp = profile.expenses
    debts = profile.debts

    if not debts:
        return {
            "status": "ok",
            "pressure_level": "none",
            "message": "No debt obligations recorded.",
            "estimated_repayment_burden": 0.0,
            "total_outstanding_debt": 0.0,
            "total_monthly_payment": 0.0,
            "disclaimer": DISCLAIMER,
        }

    monthly_inc = None
    if inc:
        monthly_inc = calc.monthly_income(inc.daily_average, inc.monthly_average,
                                          inc.income_frequency)

    total_monthly_payment = calc.total_monthly_debt_payment(debts)
    total_outstanding = calc.total_outstanding_debt(debts)
    essential = exp.essential_monthly if exp and exp.essential_monthly is not None else None

    # -----------------------------------------------------------------------
    # DTI
    # -----------------------------------------------------------------------
    dti = None
    if monthly_inc and monthly_inc > 0:
        dti = calc.debt_to_income_ratio(total_monthly_payment, monthly_inc)

    # -----------------------------------------------------------------------
    # Income floor — minimum income needed just to cover essential + debt
    # -----------------------------------------------------------------------
    income_floor = (essential or 0) + total_monthly_payment

    # -----------------------------------------------------------------------
    # Weak income scenario
    # -----------------------------------------------------------------------
    weak_monthly = None
    if monthly_inc and inc:
        weak_monthly, _ = calc.income_variability_range(
            monthly=monthly_inc,
            variability=inc.variability,
            strong_day=inc.strong_day,
            weak_day=inc.weak_day,
        )

    weak_shortfall = None
    if weak_monthly is not None and income_floor > 0:
        weak_shortfall = max(0.0, income_floor - weak_monthly)

    # -----------------------------------------------------------------------
    # Driver identification
    # -----------------------------------------------------------------------
    drivers = []

    # Incomplete debt data
    incomplete = [d for d in debts if d.monthly_payment is None]
    if incomplete:
        drivers.append({
            "factor": f"{len(incomplete)} debt record(s) missing repayment amount",
            "impact": "medium",
            "note": "Cannot compute full pressure without complete repayment data."
        })

    unknown_interest = [d for d in debts if d.interest_rate is None]
    if unknown_interest:
        drivers.append({
            "factor": f"{len(unknown_interest)} debt record(s) missing interest rate",
            "impact": "low",
            "note": "Interest rate unknown — total repayment cost is uncertain."
        })

    if dti is not None:
        if dti >= _HIGH_THRESHOLD:
            drivers.append({
                "factor": f"debt repayments are {dti*100:.0f}% of estimated monthly income",
                "impact": "high"
            })
        elif dti >= _WARNING_THRESHOLD:
            drivers.append({
                "factor": f"debt repayments are {dti*100:.0f}% of estimated monthly income",
                "impact": "medium"
            })

    if weak_shortfall and weak_shortfall > 0:
        drivers.append({
            "factor": f"essential expenses + debt would exceed income on weak income days",
            "impact": "high",
            "estimated_weak_shortfall": round(weak_shortfall, 2)
        })

    if inc and inc.variability is not None and inc.variability >= 0.25:
        drivers.append({
            "factor": "high income variability increases debt repayment risk",
            "impact": "medium"
        })

    moneylender_debts = [d for d in debts if d.lender_type == "moneylender"]
    if moneylender_debts:
        drivers.append({
            "factor": f"{len(moneylender_debts)} informal moneylender debt(s) — interest rate may be high",
            "impact": "medium"
        })

    # -----------------------------------------------------------------------
    # Pressure level
    # -----------------------------------------------------------------------
    if dti is None and monthly_inc is None:
        pressure_level = "unknown"
        status_label = "limited_confidence"
        msg = "Debt pressure could not be fully estimated because income data is missing."
    elif dti is not None and dti >= _HIGH_THRESHOLD:
        pressure_level = "high"
        status_label = "warning"
        msg = f"Debt repayments appear to be a high fraction of estimated monthly income ({dti*100:.0f}%)."
    elif dti is not None and dti >= _WARNING_THRESHOLD:
        pressure_level = "moderate"
        status_label = "caution"
        msg = f"Debt repayments are approaching a significant share of estimated monthly income ({dti*100:.0f}%)."
    elif incomplete:
        pressure_level = "uncertain"
        status_label = "limited_confidence"
        msg = "Debt pressure could not be fully estimated because repayment details are incomplete."
    else:
        pressure_level = "low"
        status_label = "ok"
        msg = "Debt repayment burden appears manageable relative to estimated income."

    # -----------------------------------------------------------------------
    # Recommended actions (structural — passed to action_engine too)
    # -----------------------------------------------------------------------
    recommended_actions = []
    if pressure_level in ("high", "moderate"):
        recommended_actions.append("Avoid taking on additional debt obligations at this time.")
        recommended_actions.append("Review repayment due dates to avoid missing a payment.")
        recommended_actions.append(
            "LUMO suggests speaking with a qualified financial counsellor if repayments feel unmanageable."
        )
    if moneylender_debts:
        recommended_actions.append(
            "Explore formal low-interest credit options (PMJDY, SHG credit, MFI) to replace high-cost informal debt."
        )
    if incomplete:
        recommended_actions.append(
            "Record all debt repayment amounts to get a clearer picture of your obligations."
        )

    # -----------------------------------------------------------------------
    # Confidence
    # -----------------------------------------------------------------------
    confidence = calc.build_confidence(
        income_present=monthly_inc is not None,
        debt_complete=not incomplete and not unknown_interest,
        expenses_present=essential is not None,
    )

    return {
        "status": status_label,
        "pressure_level": pressure_level,
        "message": msg,
        "total_outstanding_debt": round(total_outstanding, 2),
        "total_monthly_payment": round(total_monthly_payment, 2),
        "estimated_repayment_burden": round(dti, 4) if dti is not None else None,
        "income_floor": round(income_floor, 2),
        "weak_income_shortfall": round(weak_shortfall, 2) if weak_shortfall is not None else None,
        "debt_warning_threshold": _WARNING_THRESHOLD,
        "debt_high_threshold": _HIGH_THRESHOLD,
        "drivers": drivers,
        "recommended_actions": recommended_actions,
        "confidence": confidence,
        "disclaimer": DISCLAIMER,
    }
