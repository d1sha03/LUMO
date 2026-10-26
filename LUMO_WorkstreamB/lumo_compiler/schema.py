"""Shared contract for Workstream B. Share this file (and /schema) with Workstreams C and E.

Every LLM-facing field is REQUIRED (nullable where unknown) so strict JSON-schema decoding works.
Derived fields (confidence, due_date, ...) are added later by validate.py, never by the LLM.
"""
from typing import List, Literal, Optional

from pydantic import BaseModel, ConfigDict

SCHEMA_VERSION = "0.1"

Status = Literal["stated", "inferred", "ambiguous", "missing"]
Period = Literal["day", "week", "month", "unknown"]
LongPeriod = Literal["day", "week", "month", "year", "unknown"]


class _Strict(BaseModel):
    model_config = ConfigDict(extra="forbid")


class Fact(_Strict):
    value: Optional[float]
    status: Status
    source_span: Optional[str]  # exact words copied from the user's text


class IncomeItem(_Strict):
    kind: Literal["typical", "good_day", "bad_day", "other"]
    amount: Fact
    basis: Literal["gross_sales", "net_after_stock", "unknown"]
    period: Period
    days_per_week: Fact


class ExpenseItem(_Strict):
    category: Literal["stock", "transport", "rent_fee", "fuel", "other"]
    amount: Fact
    period: Literal["day", "week", "month", "one_time", "unknown"]


class DebtItem(_Strict):
    creditor_type: Literal["supplier_credit", "moneylender", "bank_mfi", "family", "other"]
    principal: Fact
    interest_rate_pct: Fact
    interest_period: LongPeriod
    installment: Fact
    due_date_text: Optional[str]  # raw words like "somvaar tak"; resolved in code, never by the LLM


class HouseholdItem(_Strict):
    description: str
    amount: Fact
    period: Literal["day", "week", "month", "one_time", "unknown"]


class GoalItem(_Strict):
    description: str
    target_amount: Fact
    target_date_text: Optional[str]


class Extraction(_Strict):
    cash_on_hand: Fact
    min_reserve: Fact
    income: List[IncomeItem]
    expenses: List[ExpenseItem]
    debts: List[DebtItem]
    household: List[HouseholdItem]
    goals: List[GoalItem]


def _inline(node, defs):
    if isinstance(node, dict):
        if "$ref" in node:
            return _inline(defs[node["$ref"].split("/")[-1]], defs)
        return {k: _inline(v, defs) for k, v in node.items() if k not in ("title", "default", "$defs")}
    if isinstance(node, list):
        return [_inline(x, defs) for x in node]
    return node


def llm_json_schema() -> dict:
    """Self-contained JSON Schema (no $ref) to pass as response_format."""
    s = Extraction.model_json_schema()
    return _inline(s, s.get("$defs", {}))
