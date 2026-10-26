"""
LUMO Workstream E — FastAPI Router

All /api/intelligence/* endpoints.

Architecture:
  Financial Twin (JSON)
    → Validated Pydantic models
    → Deterministic Python calculations (calculator.py + modules)
    → Structured intelligence JSON
    → Sarvam AI (explanation only)
    → Response

The LLM is NEVER used for arithmetic.
All numbers in responses originate from deterministic Python functions.
"""
from __future__ import annotations

import logging
from typing import Any, Optional, Union

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel

from app.security import protect
from app.intelligence.schemas import (
    FinancialProfile,
    IntelligenceRequest,
    ShockScenarioRequest,
    GoalAnalysisRequest,
    ExplainIntelligenceRequest,
)
from app.intelligence.twin_adapter import twin_to_financial_profile
from app.intelligence import (
    stress_radar,
    shock_simulator,
    goal_engine,
    debt_risk,
    true_earnings,
    action_engine,
    sarvam_explainer,
    demo_persona,
)

log = logging.getLogger("lumo.intelligence.router")

router = APIRouter(prefix="/api/intelligence", tags=["Workstream E — Financial Intelligence"])


class TwinIntelligenceRequest(BaseModel):
    financial_twin: dict[str, Any]


# ---------------------------------------------------------------------------
# Health / demo
# ---------------------------------------------------------------------------

@router.get("/demo", summary="Load the Sita demo persona")
async def get_demo():
    """
    Returns the pre-built synthetic demo persona (Sita, vegetable vendor, Lucknow).
    Use this profile with POST /api/intelligence/analyze to see all Workstream E outputs.
    This is SYNTHETIC DEMO DATA — not a real person.
    """
    return demo_persona.get_demo_profile()


# ---------------------------------------------------------------------------
# Individual module endpoints
# ---------------------------------------------------------------------------

@router.post("/stress", summary="Financial Stress Radar", dependencies=[Depends(protect)])
async def stress_endpoint(req: IntelligenceRequest):
    """
    Compute the LUMO Financial Stress Indicator for the provided financial profile.
    Returns a stress level (stable/low/moderate/high/critical), score (0-100),
    potential shortfall, days until pressure, and drivers.

    This is NOT a credit score. All numbers are deterministic Python calculations.
    """
    return stress_radar.analyze(req.financial_profile)


@router.post("/shock", summary="Income Shock Simulator", dependencies=[Depends(protect)])
async def shock_endpoint(req: ShockScenarioRequest):
    """
    Simulate what-if income reduction scenarios.
    Returns a grid of 0%/10%/20%/30%/50% income shock scenarios plus a custom scenario.
    All numbers are deterministic Python calculations — no LLM arithmetic.
    """
    return shock_simulator.simulate_shock(
        profile=req.financial_profile,
        income_shock_pct=req.income_shock_pct,
        unexpected_expense=req.unexpected_expense,
        zero_income_days=req.zero_income_days,
    )


@router.post("/goals", summary="Goal Planning Engine", dependencies=[Depends(protect)])
async def goals_endpoint(req: GoalAnalysisRequest):
    """
    Analyse savings goals with strong/typical/weak income scenarios.
    Never sacrifices essential expenses. Uses income variability, not just average income.
    """
    return goal_engine.analyze_single_goal(req.financial_profile, req.goal_index)


@router.post("/goals/all", summary="All Goals Analysis", dependencies=[Depends(protect)])
async def all_goals_endpoint(req: IntelligenceRequest):
    """Analyse all goals in the financial profile."""
    return goal_engine.analyze_goals(req.financial_profile)


@router.post("/debt", summary="Debt Pressure Warning", dependencies=[Depends(protect)])
async def debt_endpoint(req: IntelligenceRequest):
    """
    Evaluate debt burden relative to income and essential expenses.
    Uses configurable thresholds. Never labels a person — evaluates the financial situation.
    """
    return debt_risk.analyze(req.financial_profile)


@router.post("/earnings", summary="True Earnings Calculator", dependencies=[Depends(protect)])
async def earnings_endpoint(req: IntelligenceRequest):
    """
    Calculate net earnings after subtracting work-related costs from gross revenue.
    Useful for gig workers, drivers, street vendors. Output is clearly labelled ESTIMATED.
    """
    return true_earnings.analyze(req.financial_profile)


@router.post("/explain", summary="Sarvam Natural-Language Explanation", dependencies=[Depends(protect)])
async def explain_endpoint(req: ExplainIntelligenceRequest):
    """
    Generate a natural-language explanation of financial intelligence results.
    Uses Sarvam AI for the text only — all numbers come from deterministic calculations.
    Falls back gracefully if Sarvam is unavailable.
    """
    profile = req.financial_profile
    module = req.module

    # Compute the relevant module output first
    if module == "stress":
        facts = stress_radar.analyze(profile)
    elif module == "debt":
        facts = debt_risk.analyze(profile)
    elif module == "shock":
        shock_pct = req.income_shock_pct or 0.30
        facts = shock_simulator.simulate_shock(profile, income_shock_pct=shock_pct)
    elif module == "goals":
        facts = goal_engine.analyze_goals(profile)
    elif module == "earnings":
        facts = true_earnings.analyze(profile)
    elif module == "actions":
        s = stress_radar.analyze(profile)
        d = debt_risk.analyze(profile)
        facts = action_engine.generate_actions(stress_result=s, debt_result=d)
    else:  # "full"
        facts = await _run_full_analysis(profile)

    return await sarvam_explainer.explain(
        module=module,
        facts=facts,
        language=profile.user.language,
        occupation=profile.user.occupation,
    )


# ---------------------------------------------------------------------------
# Master endpoint
# ---------------------------------------------------------------------------

@router.post("/analyze", summary="Full Intelligence Analysis (master endpoint)", dependencies=[Depends(protect)])
async def analyze_endpoint(
    req: Union[IntelligenceRequest, TwinIntelligenceRequest],
    explain: bool = Query(default=False,
                          description="Set to true to include a Sarvam natural-language explanation"),
):
    """
    Master endpoint: runs all Workstream E modules and returns a complete
    structured intelligence report.

    Architecture:
      Financial Twin → deterministic calculations → structured JSON → [optional Sarvam explanation]

    Set explain=true to include a Sarvam-powered natural-language summary.
    """
    is_twin = isinstance(req, TwinIntelligenceRequest)
    profile = (
        twin_to_financial_profile(req.financial_twin)
        if is_twin
        else req.financial_profile
    )
    result = await _run_full_analysis(profile)
    if is_twin:
        result["financial_profile"] = profile.model_dump(mode="json")

    if explain:
        explanation = await sarvam_explainer.explain(
            module="full",
            facts=result,
            language=profile.user.language,
            occupation=profile.user.occupation,
        )
        result["explanation"] = explanation

    return result


async def _run_full_analysis(profile: FinancialProfile) -> dict:
    """Orchestrate all Workstream E modules. Returns the full structured response."""

    # 1. Stress Radar
    stress_result = stress_radar.analyze(profile)

    # 2. Debt Warning
    debt_result = debt_risk.analyze(profile)

    # 3. Income Shock (default 30% shock for the summary)
    shock_result = shock_simulator.simulate_shock(
        profile=profile,
        income_shock_pct=0.30,
    )

    # 4. Goal Analysis
    goal_result = goal_engine.analyze_goals(profile)

    # 5. True Earnings
    earnings_result = true_earnings.analyze(profile)

    # 6. Actions (uses outputs from all modules)
    actions_result = action_engine.generate_actions(
        stress_result=stress_result,
        debt_result=debt_result,
        shock_result=shock_result,
        goal_result=goal_result,
        earnings_result=earnings_result,
    )

    return {
        "status": "ok",
        "profile_summary": {
            "occupation": profile.user.occupation,
            "location": profile.user.location,
            "language": profile.user.language,
        },
        "stress_radar": stress_result,
        "debt_warning": debt_result,
        "income_shock": shock_result,
        "goal_analysis": goal_result,
        "true_earnings": earnings_result,
        "actions": actions_result,
    }
