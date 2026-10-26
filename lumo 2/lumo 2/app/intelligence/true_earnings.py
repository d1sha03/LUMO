"""
LUMO Workstream E — Module 5: True Earnings Engine

For gig workers, delivery drivers, street vendors, and small business owners.
Calculates net earnings by subtracting direct work-related costs from gross revenue.

OUTPUT is always clearly labelled ESTIMATED.
"""
from __future__ import annotations

from app.intelligence.schemas import FinancialProfile
from app.intelligence import calculator as calc

DISCLAIMER = (
    "True Earnings is an ESTIMATE based on costs you provided. "
    "It does not account for taxes, depreciation, or costs not listed here. "
    "LUMO recommends tracking actual daily costs for a more accurate picture."
)


def analyze(profile: FinancialProfile) -> dict:
    """
    Calculate estimated net earnings from gross revenue minus work costs.
    Uses BusinessProfile if present; falls back to IncomeProfile.
    """
    biz = profile.business
    inc = profile.income

    # -----------------------------------------------------------------------
    # Determine gross revenue
    # -----------------------------------------------------------------------
    gross = None
    source = None

    if biz and biz.gross_daily_revenue is not None:
        gross = biz.gross_daily_revenue
        source = "business_profile"
    elif inc and inc.daily_average is not None:
        gross = inc.daily_average
        source = "income_profile (gross revenue assumed = daily income)"

    if gross is None:
        return {
            "status": "insufficient_data",
            "message": "A gross revenue or daily income figure is needed to calculate true earnings.",
            "disclaimer": DISCLAIMER,
        }

    # -----------------------------------------------------------------------
    # Extract costs
    # -----------------------------------------------------------------------
    fuel = biz.fuel_daily if biz and biz.fuel_daily is not None else 0.0
    maintenance = biz.maintenance_daily if biz and biz.maintenance_daily is not None else 0.0
    platform_fees = biz.platform_fees_daily if biz and biz.platform_fees_daily is not None else 0.0
    inventory = biz.inventory_daily if biz and biz.inventory_daily is not None else 0.0
    food_work = biz.food_work_daily if biz and biz.food_work_daily is not None else 0.0
    other = biz.other_work_costs_daily if biz and biz.other_work_costs_daily is not None else 0.0

    # -----------------------------------------------------------------------
    # Deterministic calculation
    # -----------------------------------------------------------------------
    daily_result = calc.net_earnings(
        gross=gross,
        fuel=fuel,
        maintenance=maintenance,
        platform_fees=platform_fees,
        inventory=inventory,
        food_work=food_work,
        other=other,
    )

    # Monthly projections (26 working days)
    monthly_gross = gross * 26
    monthly_costs = daily_result["total_work_costs"] * 26
    monthly_net = daily_result["estimated_net"] * 26

    # Missing cost tracking
    missing_costs = []
    if biz is None:
        missing_costs.append("no business profile — only income average available")
    else:
        for field, label in [
            ("fuel_daily", "fuel"),
            ("maintenance_daily", "maintenance"),
            ("platform_fees_daily", "platform fees"),
            ("inventory_daily", "inventory"),
        ]:
            if getattr(biz, field) is None:
                missing_costs.append(f"{label} not provided (assumed ₹0)")

    confidence = calc.build_confidence(
        income_present=gross is not None,
        debt_complete=True,
        expenses_present=biz is not None,
    )
    if missing_costs:
        confidence["drivers"].extend(missing_costs)
        if len(confidence["drivers"]) > 2:
            confidence["overall"] = "low"
        elif len(confidence["drivers"]) > 0:
            confidence["overall"] = "moderate"

    return {
        "status": "ok",
        "revenue_source": source,
        "daily": daily_result,
        "monthly_projection": {
            "gross": round(monthly_gross, 2),
            "total_work_costs": round(monthly_costs, 2),
            "estimated_net": round(monthly_net, 2),
            "net_margin": daily_result["net_margin"],
            "note": "ESTIMATED — based on 26 working days per month",
        },
        "missing_costs": missing_costs,
        "confidence": confidence,
        "disclaimer": DISCLAIMER,
    }
