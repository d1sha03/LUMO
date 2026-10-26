"""
LUMO Workstream E — Pydantic schemas for the Financial Twin.

These models accept informal, incomplete financial data.
Every field is Optional unless explicitly required.
The system degrades gracefully when data is missing.

NOTE: All amounts are in Indian Rupees (₹).
      All time periods default to monthly unless stated.
"""
from __future__ import annotations

from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, model_validator


# ---------------------------------------------------------------------------
# Sub-profiles
# ---------------------------------------------------------------------------

class UserProfile(BaseModel):
    """Who the user is — used for contextualising explanations."""
    language: Literal["en", "hi", "hinglish", "pa"] = "hinglish"
    location: Optional[str] = None
    occupation: Optional[
        Literal[
            "street_vendor", "farmer", "gig_worker", "shg_member",
            "migrant_worker", "nano_entrepreneur", "delivery_worker",
            "driver", "home_worker", "other"
        ]
    ] = None
    name: Optional[str] = None  # used only for demo persona display


class IncomeProfile(BaseModel):
    """Income information — may be daily, weekly, or monthly."""
    daily_average: Optional[float] = Field(default=None, ge=0)
    monthly_average: Optional[float] = Field(default=None, ge=0)
    strong_day: Optional[float] = Field(default=None, ge=0)   # best-day income
    weak_day: Optional[float] = Field(default=None, ge=0)     # worst-day income
    income_frequency: Literal["daily", "weekly", "monthly"] = "daily"
    variability: Optional[float] = Field(
        default=None, ge=0.0, le=1.0,
        description="Fraction of monthly income that varies (0=stable, 1=fully variable)"
    )
    seasonality: Optional[Literal["none", "low", "medium", "high"]] = None

    @model_validator(mode="after")
    def derive_monthly(self) -> "IncomeProfile":
        """If only daily is given, derive monthly; if only monthly, derive daily."""
        if self.daily_average is not None and self.monthly_average is None:
            object.__setattr__(self, "monthly_average", self.daily_average * 26)
        elif self.monthly_average is not None and self.daily_average is None:
            object.__setattr__(self, "daily_average", self.monthly_average / 26)
        return self


class ExpenseProfile(BaseModel):
    """Monthly expense breakdown."""
    essential_monthly: Optional[float] = Field(default=None, ge=0,
        description="Non-negotiable: rent, food, school fees, medicine")
    flexible_monthly: Optional[float] = Field(default=None, ge=0,
        description="Can be reduced under pressure")
    total_monthly: Optional[float] = Field(default=None, ge=0)

    @model_validator(mode="after")
    def derive_total(self) -> "ExpenseProfile":
        if self.total_monthly is None:
            parts = [v for v in [self.essential_monthly, self.flexible_monthly] if v is not None]
            if parts:
                object.__setattr__(self, "total_monthly", sum(parts))
        return self


class DebtRecord(BaseModel):
    """A single debt obligation."""
    label: Optional[str] = None          # e.g. "Microfinance loan", "Moneylender"
    principal: Optional[float] = Field(default=None, ge=0)
    monthly_payment: Optional[float] = Field(default=None, ge=0)
    interest_rate: Optional[float] = Field(
        default=None, ge=0,
        description="Annual interest rate as a decimal, e.g. 0.24 for 24%"
    )
    due_day: Optional[int] = Field(default=None, ge=1, le=31)  # day-of-month payment is due
    lender_type: Optional[Literal["bank", "microfinance", "moneylender", "family", "other"]] = None


class BusinessProfile(BaseModel):
    """For gig workers, vendors, small businesses — costs that reduce gross revenue."""
    gross_daily_revenue: Optional[float] = Field(default=None, ge=0)
    fuel_daily: Optional[float] = Field(default=None, ge=0)
    maintenance_daily: Optional[float] = Field(default=None, ge=0)
    platform_fees_daily: Optional[float] = Field(default=None, ge=0)
    inventory_daily: Optional[float] = Field(default=None, ge=0)
    food_work_daily: Optional[float] = Field(default=None, ge=0)
    other_work_costs_daily: Optional[float] = Field(default=None, ge=0)


class GoalRecord(BaseModel):
    """A savings goal."""
    name: str = Field(min_length=1, max_length=200)
    amount: float = Field(ge=0)
    deadline_months: Optional[int] = Field(default=None, ge=1)
    priority: Optional[Literal["high", "medium", "low"]] = "medium"
    current_savings: Optional[float] = Field(default=None, ge=0)


class AssetProfile(BaseModel):
    """Simple asset information — not used for credit scoring."""
    cash_savings: Optional[float] = Field(default=None, ge=0,
        description="Money already saved for this goal")
    livestock_value: Optional[float] = Field(default=None, ge=0)
    equipment_value: Optional[float] = Field(default=None, ge=0)
    other_assets: Optional[float] = Field(default=None, ge=0)


class RiskProfile(BaseModel):
    """User's stated risk tolerance and upcoming known shocks."""
    risk_appetite: Optional[Literal["low", "medium", "high"]] = "low"
    upcoming_large_expense: Optional[float] = Field(default=None, ge=0)
    upcoming_expense_months: Optional[int] = Field(default=None, ge=0)
    health_concern: bool = False
    seasonal_income_drop_expected: bool = False


# ---------------------------------------------------------------------------
# Master Financial Twin
# ---------------------------------------------------------------------------

class FinancialProfile(BaseModel):
    """
    The complete Financial Twin.
    All sub-profiles are optional; modules degrade gracefully on missing data.
    """
    user: UserProfile = Field(default_factory=UserProfile)
    income: Optional[IncomeProfile] = None
    expenses: Optional[ExpenseProfile] = None
    debts: list[DebtRecord] = Field(default_factory=list)
    business: Optional[BusinessProfile] = None
    goals: list[GoalRecord] = Field(default_factory=list)
    assets: Optional[AssetProfile] = None
    risk: Optional[RiskProfile] = None
    cash_available: Optional[float] = Field(default=None, ge=0,
        description="Current liquid cash on hand")
    source_metadata: dict[str, Any] = Field(default_factory=dict)


# ---------------------------------------------------------------------------
# Request / Response wrappers
# ---------------------------------------------------------------------------

class IntelligenceRequest(BaseModel):
    financial_profile: FinancialProfile


class ShockScenarioRequest(BaseModel):
    financial_profile: FinancialProfile
    income_shock_pct: float = Field(default=0.30, ge=0.0, le=1.0,
        description="Fraction of income lost (0.30 = 30% drop)")
    unexpected_expense: Optional[float] = Field(default=None, ge=0)
    zero_income_days: Optional[int] = Field(default=None, ge=0)


class GoalAnalysisRequest(BaseModel):
    financial_profile: FinancialProfile
    goal_index: int = Field(default=0, ge=0,
        description="Index into financial_profile.goals list")


class ExplainIntelligenceRequest(BaseModel):
    financial_profile: FinancialProfile
    module: Literal[
        "stress", "debt", "shock", "goals", "earnings", "actions", "full"
    ] = "full"
    income_shock_pct: Optional[float] = Field(default=None, ge=0.0, le=1.0)
