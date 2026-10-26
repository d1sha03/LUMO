"""Pydantic request models for the finance routes (HTTP boundary).

These mirror contracts/lumo-v1 (Workstream E owns the canonical contract). The engine reads only
attributes, so when the shared models land they can replace these without touching the engine.
"""
from __future__ import annotations

from datetime import date
from decimal import Decimal
from typing import Annotated, List, Literal, Optional

from pydantic import BaseModel, Field
from pydantic.functional_validators import BeforeValidator


def _to_decimal(value):
    # Go through str() so JSON 0.7 becomes Decimal("0.7"), not a binary-float expansion.
    if isinstance(value, (int, float)) and not isinstance(value, bool):
        return Decimal(str(value))
    return value


Money = Annotated[Decimal, BeforeValidator(_to_decimal), Field(ge=0, le=Decimal("10000000000"))]
Multiplier = Annotated[Decimal, BeforeValidator(_to_decimal), Field(ge=0, le=10)]

Category = Literal[
    "business_sales", "business_stock_cost", "business_operating_cost", "household_essential",
    "household_discretionary", "debt_repayment", "supplier_payment", "savings_goal", "other"]


class CashFlow(BaseModel):
    id: str
    label: str
    direction: Literal["inflow", "outflow"]
    category: Category
    amount: Money
    frequency: Literal["once", "daily", "weekly", "monthly"]
    start_date: date
    confidence: float = Field(ge=0, le=1)
    source_type: Literal["user_statement", "manual_entry", "synthetic_dataset", "official_source"]
    source_note: Optional[str] = None
    essential: bool


class Goal(BaseModel):
    id: str
    label: str
    target_amount: Money
    target_date: date
    priority: Literal["essential", "important", "optional"]
    current_saved: Optional[Money] = None


class Profile(BaseModel):
    occupation: str
    state: Optional[str] = None
    district: Optional[str] = None
    cash_on_hand: Optional[Money] = None        # null = unknown; never defaulted to zero
    minimum_reserve: Optional[Money] = None     # null = unknown; never defaulted to zero
    forecast_days: int = Field(ge=1, le=90)


class FinancialTwin(BaseModel):
    schema_version: Literal["1.0"]
    twin_id: str
    as_of_date: date
    language: Literal["hi-IN", "en-IN", "pa-IN"]
    profile: Profile
    cash_flows: List[CashFlow] = Field(default_factory=list)
    goals: List[Goal] = Field(default_factory=list)


class IncomeShock(BaseModel):
    category: Category
    multiplier: Multiplier
    duration_days: int = Field(ge=1, le=366)
    start_date: Optional[date] = None


class ScenarioSpec(BaseModel):
    scenario_id: str
    label: str
    income_shock: Optional[IncomeShock] = None


class SimulateRequest(BaseModel):
    twin: FinancialTwin
    scenarios: List[ScenarioSpec] = Field(min_length=1)
