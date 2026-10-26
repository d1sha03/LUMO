"""Savings-goal calculator (pure; deliberately NOT exposed as an API endpoint).

Question answered: "If I put X aside every <period>, how far toward my goal do I get, and what
happens to my cash, under baseline / strong / weak income?"

Money allocation (no double counting)
-------------------------------------
Money allocated to savings LEAVES spendable cash and is counted once, as saved money:
    ending_cash = starting_cash + inflows - essential_outflows - other_outflows - allocated_to_savings
    projected_saved = current_saved + allocated_to_savings
Existing ``savings_goal`` outflows already in the twin are excluded from the projection by default
(the proposed schedule replaces them) so the same rupee is not saved twice.

Feasibility
-----------
* ``essentials_infeasible``: with only inflows and flows marked essential, cash goes below zero in
  this income scenario. No saving amount is suggested.
* Otherwise the exact largest constant contribution that keeps every closing balance at or above
  the reserve is computed (``max_affordable_amount``). A suggestion is made only if the amount
  needed to reach the goal fits inside it.
Income assumptions are explicit: ``business_sales`` inflows are multiplied for the whole period.
"""
from __future__ import annotations

from collections import Counter
from dataclasses import dataclass, field
from datetime import date, timedelta
from decimal import Decimal, ROUND_CEILING, ROUND_DOWN
from typing import Any, List, Optional, Sequence

from .domain import FREQUENCIES, MAX_GOAL_HORIZON_DAYS
from .engine import ZERO, project_cash, summarize
from .money import D, format_inr, quantize_money
from .scenarios import apply_shock
from .scheduler import ScheduledEvent, generate_events, occurrence_dates
from .validation import ValidationIssue, require_valid, validate_twin_for_simulation

SALES_CATEGORY = "business_sales"
WHOLE = Decimal("1")


@dataclass(frozen=True)
class IncomeAssumption:
    scenario_id: str
    label: str
    sales_multiplier: Decimal


DEFAULT_INCOME_ASSUMPTIONS = (
    IncomeAssumption("baseline", "Baseline income (sales as stated)", Decimal("1")),
    IncomeAssumption("strong_income", "Strong income (business sales +20%)", Decimal("1.2")),
    IncomeAssumption("weak_income", "Weak income (business sales -20%)", Decimal("0.8")),
)


@dataclass(frozen=True)
class Allocation:
    starting_cash: Decimal
    inflows: Decimal
    essential_outflows: Decimal
    other_outflows: Decimal
    allocated_to_savings: Decimal
    ending_cash: Decimal


@dataclass(frozen=True)
class GoalScenarioEstimate:
    scenario_id: str
    label: str
    sales_multiplier: Decimal
    feasibility: str   # within_reserve | reserve_breach | cash_deficit | essentials_infeasible
    allocation: Allocation
    projected_saved: Decimal
    shortfall_to_goal: Decimal
    proposed_reaches_goal: bool
    minimum_balance: Decimal
    minimum_balance_date: date
    max_affordable_amount: Optional[Decimal]
    required_amount: Optional[Decimal]
    suggested_amount: Optional[Decimal]
    goal_fundable: bool
    notes: List[str] = field(default_factory=list)


@dataclass(frozen=True)
class GoalEstimate:
    goal_id: str
    label: str
    target_amount: Decimal
    target_date: date
    current_saved: Decimal
    horizon_days: int
    contribution_frequency: str
    contribution_count: int
    proposed_amount: Decimal
    scenarios: List[GoalScenarioEstimate]
    notes: List[str]


def _whole(value: Decimal, rounding) -> Decimal:
    return value.quantize(WHOLE, rounding=rounding)


def estimate_goal_progress(twin: Any, goal: Any, *, contribution_frequency: str = "weekly",
                           proposed_amount: Optional[Any] = None,
                           contribution_start: Optional[date] = None,
                           assumptions: Sequence[IncomeAssumption] = DEFAULT_INCOME_ASSUMPTIONS,
                           exclude_existing_savings_flows: bool = True) -> GoalEstimate:
    issues: List[ValidationIssue] = validate_twin_for_simulation(twin)
    ws, we = twin.as_of_date, goal.target_date
    horizon_days = (we - ws).days + 1
    if we < ws:
        issues.append(ValidationIssue("goal.target_date", "in_past", "Goal target date is before the as-of date."))
    elif horizon_days > MAX_GOAL_HORIZON_DAYS:
        issues.append(ValidationIssue("goal.target_date", "horizon_too_long",
                                      f"Goal horizon is limited to {MAX_GOAL_HORIZON_DAYS} days."))
    if contribution_frequency not in FREQUENCIES:
        issues.append(ValidationIssue("contribution_frequency", "invalid_value",
                                      f"Must be one of {list(FREQUENCIES)}."))
    proposed = D(proposed_amount) if proposed_amount is not None else ZERO
    if proposed < 0:
        issues.append(ValidationIssue("proposed_amount", "invalid_value", "Proposed amount cannot be negative."))
    require_valid(issues)

    cash, reserve = twin.profile.cash_on_hand, twin.profile.minimum_reserve
    current_saved = D(goal.current_saved) if goal.current_saved is not None else ZERO
    target = D(goal.target_amount)

    flows = list(twin.cash_flows)
    excluded: List[str] = []
    if exclude_existing_savings_flows:
        excluded = [f.label for f in flows if f.category == "savings_goal" and f.direction == "outflow"]
        flows = [f for f in flows if not (f.category == "savings_goal" and f.direction == "outflow")]

    base_events = generate_events(flows, ws, we)
    contrib_dates = occurrence_dates(contribution_start or ws, contribution_frequency, ws, we)
    n_total = len(contrib_dates)
    per_day = Counter(contrib_dates)
    amount_q = quantize_money(proposed)
    savings_events = [
        ScheduledEvent(date=d, flow_id="proposed_saving", label=f"Saving toward {goal.label}",
                       category="savings_goal", direction="outflow", amount=amount_q,
                       base_amount=amount_q, essential=False, order=10_000)
        for d in contrib_dates] if amount_q > 0 else []

    remaining = max(ZERO, target - current_saved)
    required: Optional[Decimal]
    if remaining == 0:
        required = ZERO
    elif n_total == 0:
        required = None
    else:
        required = _whole(remaining / n_total, ROUND_CEILING)

    results: List[GoalScenarioEstimate] = []
    for a in assumptions:
        events, _ = apply_shock(base_events, SALES_CATEGORY, a.sales_multiplier, ws, we)
        notes = [f"Income assumption: '{SALES_CATEGORY}' inflows x {format(D(a.sales_multiplier).normalize(), 'f')} "
                 f"for the whole period {ws.isoformat()} to {we.isoformat()}."]

        # 1. essentials-only feasibility
        ess_events = [e for e in events if e.direction == "inflow" or e.essential]
        ess_days = project_cash(cash, reserve, ws, horizon_days, ess_events)
        essentials_infeasible = any(d.below_zero for d in ess_days)

        # 2. exact largest constant contribution that keeps every close >= reserve
        nosave_days = project_cash(cash, reserve, ws, horizon_days, events)
        max_aff: Optional[Decimal] = None
        if n_total > 0:
            n_so_far, min_cap = 0, None
            for d in nosave_days:
                n_so_far += per_day.get(d.date, 0)
                if n_so_far:
                    cap = (d.closing_balance - reserve) / n_so_far
                    min_cap = cap if min_cap is None else min(min_cap, cap)
            max_aff = max(ZERO, _whole(min_cap, ROUND_DOWN)) if min_cap is not None else None

        # 3. suggestion
        suggested: Optional[Decimal] = None
        if essentials_infeasible:
            notes.append("Essential known outflows alone push cash below zero under this income assumption, "
                         "so no saving amount is suggested.")
        elif required is None:
            notes.append("No contribution date falls inside the goal period, so no amount can be suggested.")
        elif max_aff is not None and required <= max_aff:
            suggested = required
        elif max_aff is not None:
            notes.append(f"Reaching the goal needs {format_inr(required)} per contribution, but at most "
                         f"{format_inr(max_aff)} can be set aside while keeping cash at or above the reserve.")

        # 4. projection with the proposed saving
        full = sorted(events + savings_events, key=lambda e: (e.date, e.order))
        days = project_cash(cash, reserve, ws, horizon_days, full)
        s = summarize(days)
        inflows = sum((e.amount for e in full if e.direction == "inflow"), ZERO)
        ess_out = sum((e.amount for e in full if e.direction == "outflow" and e.category != "savings_goal"
                       and e.essential), ZERO)
        oth_out = sum((e.amount for e in full if e.direction == "outflow" and e.category != "savings_goal"
                       and not e.essential), ZERO)
        saved_now = sum((e.amount for e in full if e.category == "savings_goal"), ZERO)
        alloc = Allocation(quantize_money(cash), inflows, ess_out, oth_out, saved_now, days[-1].closing_balance)
        projected_saved = current_saved + saved_now
        if amount_q == 0:
            notes.append("No proposed amount was supplied; the allocation shows cash without any saving.")

        results.append(GoalScenarioEstimate(
            scenario_id=a.scenario_id, label=a.label, sales_multiplier=D(a.sales_multiplier),
            feasibility="essentials_infeasible" if essentials_infeasible else s.status,
            allocation=alloc, projected_saved=projected_saved,
            shortfall_to_goal=max(ZERO, target - projected_saved),
            proposed_reaches_goal=projected_saved >= target,
            minimum_balance=s.minimum_balance, minimum_balance_date=s.minimum_balance_date,
            max_affordable_amount=max_aff, required_amount=required, suggested_amount=suggested,
            goal_fundable=suggested is not None, notes=notes))

    top = ["These are projections under stated income assumptions, not predictions or financial advice.",
           "Money allocated to savings leaves spendable cash and is counted once, as saved money."]
    if excluded:
        top.append("Existing savings_goal outflow(s) were excluded to avoid counting the same saving twice: "
                   + ", ".join(excluded) + ".")
    return GoalEstimate(goal.id, goal.label, quantize_money(target), goal.target_date,
                        quantize_money(current_saved), horizon_days, contribution_frequency, n_total,
                        amount_q, results, top)
