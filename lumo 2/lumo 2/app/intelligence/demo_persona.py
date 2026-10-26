"""
LUMO Workstream E — Demo Persona: Sita

A deterministic synthetic demo persona used to demonstrate the
full Workstream E intelligence pipeline without live user data.

CLEARLY MARKED: this is SYNTHETIC DEMO DATA, not a real person.

Usage:
  GET /api/intelligence/demo  → returns the demo persona profile
  POST /api/intelligence/analyze with the demo profile
"""
from app.intelligence.schemas import (
    FinancialProfile,
    UserProfile,
    IncomeProfile,
    ExpenseProfile,
    DebtRecord,
    GoalRecord,
    AssetProfile,
    RiskProfile,
)

DEMO_LABEL = "SYNTHETIC DEMO DATA — This is not a real person."

SITA_PROFILE = FinancialProfile(
    user=UserProfile(
        name="Sita (Demo)",
        language="hi",
        location="Lucknow, Uttar Pradesh",
        occupation="street_vendor",
    ),
    income=IncomeProfile(
        daily_average=900,
        strong_day=1200,
        weak_day=600,
        income_frequency="daily",
        variability=0.30,
        seasonality="medium",
    ),
    expenses=ExpenseProfile(
        essential_monthly=9000,
        flexible_monthly=2500,
    ),
    debts=[
        DebtRecord(
            label="Microfinance group loan",
            principal=10000,
            monthly_payment=1500,
            interest_rate=None,   # interest rate not known — realistic
            due_day=10,
            lender_type="microfinance",
        )
    ],
    goals=[
        GoalRecord(
            name="School fees",
            amount=15000,
            deadline_months=3,
            priority="high",
            current_savings=0,
        )
    ],
    assets=AssetProfile(
        cash_savings=0,
    ),
    risk=RiskProfile(
        risk_appetite="low",
        upcoming_large_expense=15000,
        upcoming_expense_months=3,
        health_concern=False,
        seasonal_income_drop_expected=True,
    ),
    cash_available=2000,
)


def get_demo_profile() -> dict:
    """Return the demo persona as a dict, clearly labelled as synthetic."""
    return {
        "demo": True,
        "label": DEMO_LABEL,
        "persona": {
            "name": "Sita (Demo)",
            "occupation": "Vegetable vendor",
            "location": "Lucknow",
            "language": "Hindi",
            "summary": (
                "Sita earns approximately ₹900/day on average selling vegetables. "
                "She has strong days (₹1,200) and weak days (₹600). "
                "Her essential monthly expenses are ₹9,000 and she has a microfinance loan "
                "with monthly repayments of ₹1,500. Her 3-month goal is to save ₹15,000 for school fees. "
                "She currently has ₹2,000 in cash."
            ),
        },
        "financial_profile": SITA_PROFILE.model_dump(),
    }
