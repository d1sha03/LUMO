"""Structured input validation for the simulation engine.

Unknown essential inputs are never defaulted: they are reported as issues so the frontend
can ask the user for exactly the missing field.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal
from typing import Any, Dict, Iterable, List, Optional, Sequence

from .domain import CATEGORIES, DIRECTIONS, FREQUENCIES, MAX_FORECAST_DAYS


@dataclass(frozen=True)
class ValidationIssue:
    field: str
    code: str
    message: str

    def to_dict(self) -> Dict[str, str]:
        return {"field": self.field, "code": self.code, "message": self.message}


class SimulationInputError(Exception):
    """Raised when inputs are missing or invalid. ``to_dict`` is the HTTP 422 body."""

    def __init__(self, issues: Iterable[ValidationIssue]):
        self.issues: List[ValidationIssue] = list(issues)
        super().__init__("; ".join(f"{i.field}: {i.code}" for i in self.issues))

    def to_dict(self) -> Dict[str, Any]:
        return {
            "error": "validation_error",
            "message": "The simulation cannot run until the listed inputs are provided or corrected.",
            "issues": [i.to_dict() for i in self.issues],
        }


def validate_twin_for_simulation(twin: Any) -> List[ValidationIssue]:
    issues: List[ValidationIssue] = []
    profile = twin.profile

    if profile.cash_on_hand is None:
        issues.append(ValidationIssue(
            "profile.cash_on_hand", "missing_required_input",
            "Cash on hand is unknown. Ask the user how much cash they currently have; "
            "it is not assumed to be zero."))
    elif profile.cash_on_hand < 0:
        issues.append(ValidationIssue("profile.cash_on_hand", "invalid_value",
                                      "Cash on hand cannot be negative."))

    if profile.minimum_reserve is None:
        issues.append(ValidationIssue(
            "profile.minimum_reserve", "missing_required_input",
            "Minimum reserve is unknown. Ask the user how much cash they want to keep in hand; "
            "it is not assumed to be zero."))
    elif profile.minimum_reserve < 0:
        issues.append(ValidationIssue("profile.minimum_reserve", "invalid_value",
                                      "Minimum reserve cannot be negative."))

    if not isinstance(profile.forecast_days, int) or not (1 <= profile.forecast_days <= MAX_FORECAST_DAYS):
        issues.append(ValidationIssue("profile.forecast_days", "invalid_value",
                                      f"forecast_days must be an integer from 1 to {MAX_FORECAST_DAYS}."))

    seen = set()
    for i, flow in enumerate(twin.cash_flows):
        path = f"cash_flows[{i}]"
        if flow.id in seen:
            issues.append(ValidationIssue(f"{path}.id", "duplicate_id",
                                          f"Cash-flow id '{flow.id}' is used more than once."))
        seen.add(flow.id)
        if flow.amount is None or flow.amount < 0:
            issues.append(ValidationIssue(f"{path}.amount", "invalid_value",
                                          "Amount must be a non-negative INR value."))
        if flow.direction not in DIRECTIONS:
            issues.append(ValidationIssue(f"{path}.direction", "invalid_value",
                                          f"direction must be one of {list(DIRECTIONS)}."))
        if flow.category not in CATEGORIES:
            issues.append(ValidationIssue(f"{path}.category", "invalid_value",
                                          f"category must be one of {list(CATEGORIES)}."))
        if flow.frequency not in FREQUENCIES:
            issues.append(ValidationIssue(f"{path}.frequency", "invalid_value",
                                          f"frequency must be one of {list(FREQUENCIES)}."))
    return issues


def find_baseline(scenarios: Sequence[Any]) -> Optional[Any]:
    """The scenario named 'baseline', else the first scenario without an income shock."""
    for s in scenarios:
        if s.scenario_id == "baseline":
            return s
    for s in scenarios:
        if s.income_shock is None:
            return s
    return None


def validate_scenarios(scenarios: Sequence[Any]) -> List[ValidationIssue]:
    issues: List[ValidationIssue] = []
    if not scenarios:
        issues.append(ValidationIssue("scenarios", "empty", "At least one scenario is required."))
        return issues
    seen = set()
    for i, s in enumerate(scenarios):
        if s.scenario_id in seen:
            issues.append(ValidationIssue(f"scenarios[{i}].scenario_id", "duplicate_id",
                                          f"Scenario id '{s.scenario_id}' is used more than once."))
        seen.add(s.scenario_id)
        shock = s.income_shock
        if shock is not None:
            if shock.multiplier is None or Decimal(str(shock.multiplier)) < 0:
                issues.append(ValidationIssue(f"scenarios[{i}].income_shock.multiplier", "invalid_value",
                                              "multiplier must be zero or greater."))
            if not isinstance(shock.duration_days, int) or shock.duration_days < 1:
                issues.append(ValidationIssue(f"scenarios[{i}].income_shock.duration_days", "invalid_value",
                                              "duration_days must be a whole number of at least 1."))
            if shock.category not in CATEGORIES:
                issues.append(ValidationIssue(f"scenarios[{i}].income_shock.category", "invalid_value",
                                              f"category must be one of {list(CATEGORIES)}."))
    if find_baseline(scenarios) is None:
        issues.append(ValidationIssue(
            "scenarios", "missing_baseline",
            "Include a scenario with scenario_id 'baseline' (or one without an income shock) "
            "so the stressed scenarios can be compared with it."))
    return issues


def require_valid(issues: Sequence[ValidationIssue]) -> None:
    if issues:
        raise SimulationInputError(issues)
