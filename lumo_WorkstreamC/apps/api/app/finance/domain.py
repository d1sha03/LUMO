"""Plain-Python domain types for the finance engine.

The engine only reads *attributes* (duck typing), so the Pydantic models in ``schemas.py``
(HTTP boundary) and these dataclasses (tests, scripts, other workstreams) are interchangeable.
Field names and meanings mirror the shared LUMO v1 FinancialTwin contract. All enum-like
fields are plain strings, exactly as in the JSON contract.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from decimal import Decimal
from typing import List, Optional

SCHEMA_VERSION = "1.0"

CATEGORIES = (
    "business_sales", "business_stock_cost", "business_operating_cost",
    "household_essential", "household_discretionary", "debt_repayment",
    "supplier_payment", "savings_goal", "other",
)
DIRECTIONS = ("inflow", "outflow")
FREQUENCIES = ("once", "daily", "weekly", "monthly")

# Flows whose extraction confidence is below this are called out in the notes.
# This is an *extraction-confidence* cut-off for transparency, not a financial risk threshold.
LOW_CONFIDENCE_THRESHOLD = 0.7
MAX_FORECAST_DAYS = 90
MAX_GOAL_HORIZON_DAYS = 366


@dataclass
class CashFlow:
    id: str
    label: str
    direction: str
    category: str
    amount: Decimal
    frequency: str
    start_date: date
    confidence: float = 1.0
    source_type: str = "synthetic_dataset"
    source_note: Optional[str] = None
    essential: bool = False


@dataclass
class Goal:
    id: str
    label: str
    target_amount: Decimal
    target_date: date
    priority: str = "important"
    current_saved: Optional[Decimal] = None


@dataclass
class Profile:
    occupation: str = "street vendor"
    cash_on_hand: Optional[Decimal] = None
    minimum_reserve: Optional[Decimal] = None
    forecast_days: int = 30
    state: Optional[str] = None
    district: Optional[str] = None


@dataclass
class FinancialTwin:
    twin_id: str
    as_of_date: date
    profile: Profile
    cash_flows: List[CashFlow] = field(default_factory=list)
    goals: List[Goal] = field(default_factory=list)
    language: str = "en-IN"
    schema_version: str = SCHEMA_VERSION


@dataclass
class IncomeShock:
    category: str
    multiplier: Decimal
    duration_days: int
    start_date: Optional[date] = None  # defaults to the twin's as_of_date


@dataclass
class ScenarioSpec:
    scenario_id: str
    label: str
    income_shock: Optional[IncomeShock] = None
