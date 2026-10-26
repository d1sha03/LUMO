"""Convert the shared Financial Twin contract into Workstream E's profile schema."""
from __future__ import annotations

from typing import Any, Mapping

from app.intelligence.schemas import (
    BusinessProfile,
    DebtRecord,
    ExpenseProfile,
    FinancialProfile,
    GoalRecord,
    IncomeProfile,
    UserProfile,
)

_OCCUPATIONS = {
    "vegetable vendor": "street_vendor",
    "street vendor": "street_vendor",
    "farmer": "farmer",
    "driver": "driver",
    "delivery worker": "delivery_worker",
}
_LANGUAGES = {"hi-IN": "hi", "en-IN": "en", "pa-IN": "pa"}


def twin_to_financial_profile(twin: Mapping[str, Any]) -> FinancialProfile:
    """Map recorded Twin facts only; unknown financial values remain unknown."""
    twin_profile = twin.get("profile") or {}
    language = _LANGUAGES.get(twin.get("language"), "hinglish")
    occupation = _OCCUPATIONS.get(str(twin_profile.get("occupation", "")).lower(), "other")
    location = ", ".join(
        value for value in (twin_profile.get("district"), twin_profile.get("state")) if value
    ) or None

    monthly_income = 0.0
    has_income = False
    daily_business_sales = 0.0
    has_daily_business_sales = False
    monthly_essential = 0.0
    has_essential = False
    monthly_flexible = 0.0
    has_flexible = False
    monthly_stock = 0.0
    monthly_operations = 0.0
    has_stock = False
    has_operations = False
    debts: list[DebtRecord] = []

    for flow in twin.get("cash_flows", []):
        amount = float(flow["amount"])
        frequency = flow["frequency"]
        monthly_amount = {
            "daily": amount * 26,
            "weekly": amount * 52 / 12,
            "monthly": amount,
        }.get(frequency)
        if monthly_amount is None:
            continue

        category = flow["category"]
        if flow["direction"] == "inflow":
            monthly_income += monthly_amount
            has_income = True
            if category == "business_sales":
                daily_business_sales += amount if frequency == "daily" else monthly_amount / 26
                has_daily_business_sales = True
        elif category == "debt_repayment":
            debts.append(DebtRecord(label=flow.get("label"), monthly_payment=monthly_amount))
        elif category == "business_stock_cost":
            monthly_stock += monthly_amount
            has_stock = True
        elif category == "business_operating_cost":
            monthly_operations += monthly_amount
            has_operations = True
        elif category in ("household_essential", "supplier_payment") or flow.get("essential", False):
            monthly_essential += monthly_amount
            has_essential = True
        else:
            monthly_flexible += monthly_amount
            has_flexible = True

    expenses = None
    if has_essential or has_flexible:
        expenses = ExpenseProfile(
            essential_monthly=monthly_essential if has_essential else None,
            flexible_monthly=monthly_flexible if has_flexible else None,
        )

    business = None
    if has_daily_business_sales or has_stock or has_operations:
        business = BusinessProfile(
            gross_daily_revenue=daily_business_sales if has_daily_business_sales else None,
            inventory_daily=monthly_stock / 26 if has_stock else None,
            other_work_costs_daily=monthly_operations / 26 if has_operations else None,
        )

    goals = [
        GoalRecord(
            name=goal["label"],
            amount=goal["target_amount"],
            deadline_months=_months_between(twin["as_of_date"], goal["target_date"]),
            priority={"essential": "high", "important": "medium", "optional": "low"}.get(
                goal.get("priority"), "medium"
            ),
            current_savings=goal.get("current_saved"),
        )
        for goal in twin.get("goals", [])
    ]
    source_metadata = {
        "cash_flows": [
            {
                "id": flow.get("id"),
                "category": flow.get("category"),
                "source_type": flow.get("source_type"),
                "source_note": flow.get("source_note"),
                "confidence": flow.get("confidence"),
            }
            for flow in twin.get("cash_flows", [])
        ],
        "goals": [
            {
                "id": goal.get("id"),
                "source_type": goal.get("source_type"),
                "source_note": goal.get("source_note"),
                "confidence": goal.get("confidence"),
            }
            for goal in twin.get("goals", [])
        ],
    }

    return FinancialProfile(
        user=UserProfile(
            language=language,
            location=location,
            occupation=occupation,
        ),
        income=IncomeProfile(monthly_average=monthly_income) if has_income else None,
        expenses=expenses,
        debts=debts,
        business=business,
        goals=goals,
        cash_available=twin.get("cash_on_hand", twin_profile.get("cash_on_hand")),
        source_metadata=source_metadata,
    )


def _months_between(start_date: str, target_date: str) -> int | None:
    from datetime import date

    start = date.fromisoformat(start_date)
    target = date.fromisoformat(target_date)
    months = (target.year - start.year) * 12 + target.month - start.month
    if target.day > start.day:
        months += 1
    return months if months >= 1 else None
