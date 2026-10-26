"""
LUMO Workstream E — Module 6: Action Engine

Converts deterministic financial intelligence outputs into
specific, non-judgmental, explainable action recommendations.

RULES:
- Actions are SUGGESTIONS, never commands ("LUMO suggests..." not "You must...")
- Actions are specific — vague advice like "save more" is not allowed
- Actions must respect essential expenses (never suggest cutting them)
- Actions are based on the structured outputs of other modules
- This module receives pre-computed analysis; it does NO arithmetic
"""
from __future__ import annotations

from typing import Optional

DISCLAIMER = (
    "These are suggestions from LUMO's financial analysis engine. "
    "They are general in nature and do not constitute financial advice. "
    "Please consult a qualified financial counsellor for personal guidance."
)


def generate_actions(
    stress_result: Optional[dict] = None,
    debt_result: Optional[dict] = None,
    shock_result: Optional[dict] = None,
    goal_result: Optional[dict] = None,
    earnings_result: Optional[dict] = None,
) -> dict:
    """
    Generate a prioritised list of specific action recommendations
    based on the structured outputs of all intelligence modules.
    """
    actions = []

    # -----------------------------------------------------------------------
    # Stress-based actions
    # -----------------------------------------------------------------------
    if stress_result and stress_result.get("status") == "ok":
        level = stress_result.get("level", "stable")
        shortfall = stress_result.get("potential_shortfall") or 0
        days_runway = stress_result.get("cash_runway_days")
        drivers = stress_result.get("drivers", [])

        if level in ("high", "critical"):
            actions.append({
                "priority": 1,
                "category": "cash_flow",
                "action": "LUMO suggests reviewing all flexible spending immediately to identify amounts that could be reduced this month.",
                "reason": f"Financial stress level is {level}. A shortfall of ₹{shortfall:,.0f} may be approaching.",
                "tag": "urgent",
            })

        if days_runway is not None and days_runway < 10:
            actions.append({
                "priority": 1,
                "category": "cash_buffer",
                "action": f"LUMO suggests setting aside at least ₹500-₹1,000 as an immediate cash reserve. Current cash covers only approximately {days_runway} days.",
                "reason": "Very low cash buffer leaves no room for unexpected expenses.",
                "tag": "urgent",
            })

        if level in ("moderate", "high", "critical"):
            for driver in drivers:
                if "income variability" in driver.get("factor", ""):
                    actions.append({
                        "priority": 2,
                        "category": "income_stability",
                        "action": "LUMO suggests building a 'high-earning day' savings habit: on good income days, set aside a small fixed amount before spending.",
                        "reason": "High income variability makes it important to save during good periods.",
                        "tag": "planning",
                    })
                    break

        if shortfall > 0:
            actions.append({
                "priority": 2,
                "category": "cash_flow",
                "action": "LUMO suggests reviewing upcoming payments this month and prioritising essential expenses (food, rent, medicine, school fees) first.",
                "reason": f"A potential shortfall of ₹{shortfall:,.0f} means not all obligations may be coverable.",
                "tag": "planning",
            })

    # -----------------------------------------------------------------------
    # Debt-based actions
    # -----------------------------------------------------------------------
    if debt_result and debt_result.get("status") not in ("insufficient_data",):
        pressure = debt_result.get("pressure_level", "low")
        total_payment = debt_result.get("total_monthly_payment", 0)
        moneylender = any(
            "moneylender" in (d.get("factor") or "") for d in debt_result.get("drivers", [])
        )

        if pressure in ("high", "moderate"):
            actions.append({
                "priority": 1,
                "category": "debt",
                "action": "LUMO suggests avoiding any new borrowing this month until repayment obligations become more manageable.",
                "reason": f"Total debt repayments of ₹{total_payment:,.0f}/month represent a significant share of estimated income.",
                "tag": "urgent",
            })
            actions.append({
                "priority": 2,
                "category": "debt",
                "action": "LUMO suggests noting the due date of each repayment and ensuring that amount is set aside first at the start of the month.",
                "reason": "Missed payments on informal debt may carry penalties or relationship damage.",
                "tag": "planning",
            })

        if moneylender:
            actions.append({
                "priority": 2,
                "category": "debt",
                "action": "LUMO suggests exploring formal low-interest credit options such as SHG group loans, PMJDY, or regulated microfinance institutions to reduce reliance on high-cost informal debt.",
                "reason": "Informal moneylender debt often carries high unregulated interest.",
                "tag": "opportunity",
            })

        if debt_result.get("weak_income_shortfall") and debt_result["weak_income_shortfall"] > 0:
            actions.append({
                "priority": 1,
                "category": "debt",
                "action": "LUMO suggests speaking with a qualified financial counsellor about your repayment situation — especially on weeks with lower income.",
                "reason": f"Debt obligations may be difficult to meet during low-income periods.",
                "tag": "urgent",
            })

    # -----------------------------------------------------------------------
    # Shock-based actions
    # -----------------------------------------------------------------------
    if shock_result and shock_result.get("status") == "ok":
        grid = shock_result.get("preset_grid", [])
        # Find 30% shock
        shock_30 = next((s for s in grid if abs(s["income_shock_pct"] - 0.30) < 0.01), None)
        if shock_30 and shock_30["results"]["shortfall"] > 0:
            shortfall_30 = shock_30["results"]["shortfall"]
            actions.append({
                "priority": 2,
                "category": "resilience",
                "action": f"LUMO suggests building an emergency buffer of at least ₹{shortfall_30:,.0f} to protect against a 30% income drop.",
                "reason": "A 30% income reduction would create a shortfall this month based on current obligations.",
                "tag": "planning",
            })

    # -----------------------------------------------------------------------
    # Goal-based actions
    # -----------------------------------------------------------------------
    if goal_result and goal_result.get("status") == "ok":
        for goal in goal_result.get("goals", []):
            if goal.get("deadline_warning"):
                actions.append({
                    "priority": 2,
                    "category": "goals",
                    "action": f"LUMO suggests reviewing the deadline for '{goal['goal_name']}'. {goal['deadline_warning']}",
                    "reason": "The current saving capacity may not be sufficient to reach this goal by the stated deadline.",
                    "tag": "planning",
                })
            elif goal.get("recommended_safe_path"):
                path = goal["recommended_safe_path"]
                if path.get("monthly_saving") and path["monthly_saving"] > 0:
                    actions.append({
                        "priority": 3,
                        "category": "goals",
                        "action": f"LUMO suggests saving approximately ₹{path['monthly_saving']:,.0f}/month towards '{goal['goal_name']}' — estimated to take {path.get('estimated_months', '?')} months at typical income.",
                        "reason": "This approach protects essential expenses and keeps a buffer.",
                        "tag": "opportunity",
                    })

    # -----------------------------------------------------------------------
    # Earnings-based actions
    # -----------------------------------------------------------------------
    if earnings_result and earnings_result.get("status") == "ok":
        daily = earnings_result.get("daily", {})
        net_margin = daily.get("net_margin", 1.0)
        missing = earnings_result.get("missing_costs", [])

        if net_margin < 0.50:
            total_costs = daily.get("total_work_costs", 0)
            actions.append({
                "priority": 2,
                "category": "earnings",
                "action": f"LUMO suggests reviewing work costs of ₹{total_costs:,.0f}/day to identify any that could be reduced, as they represent more than 50% of gross earnings.",
                "reason": f"Net earnings margin is approximately {net_margin*100:.0f}%, which is low.",
                "tag": "planning",
            })

        if missing:
            actions.append({
                "priority": 3,
                "category": "earnings",
                "action": "LUMO suggests tracking all daily work costs (fuel, food, platform fees, inventory) to get a more accurate picture of your true net earnings.",
                "reason": "Some cost categories were not provided, so net earnings may be overestimated.",
                "tag": "data",
            })

    # -----------------------------------------------------------------------
    # Baseline actions always included
    # -----------------------------------------------------------------------
    actions.append({
        "priority": 4,
        "category": "general",
        "action": "LUMO suggests always prioritising essential expenses: food, rent, school fees, and medicine come first — before discretionary spending or goal savings.",
        "reason": "Essential expenses are the foundation of financial stability.",
        "tag": "principle",
    })

    # Deduplicate and sort by priority
    seen = set()
    unique_actions = []
    for a in sorted(actions, key=lambda x: x["priority"]):
        key = a["action"][:80]
        if key not in seen:
            seen.add(key)
            unique_actions.append(a)

    return {
        "status": "ok",
        "action_count": len(unique_actions),
        "actions": unique_actions,
        "disclaimer": DISCLAIMER,
    }
