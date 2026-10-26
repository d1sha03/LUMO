# LUMO Financial Engine (`apps/api/app/finance/`)

Deterministic cash-flow projection, Financial Stress Radar, income-shock scenarios and a savings-goal
calculator. **No LLM, no network, no randomness.** The numerical core is standard-library Python
(`Decimal`, `datetime.date`); only `schemas.py` / `router.py` need FastAPI + Pydantic v2.

| File | Role |
|---|---|
| `money.py` | Decimal helpers, the single rounding rule, INR formatting |
| `domain.py` | Plain dataclasses mirroring the FinancialTwin contract (for tests/scripts) |
| `validation.py` | Structured `ValidationIssue` / `SimulationInputError` (HTTP 422 body) |
| `scheduler.py` | Recurring `CashFlow` -> dated events |
| `engine.py` | Daily projection, Radar summary, driver attribution (pure functions) |
| `scenarios.py` | Shock application, baseline/stress runs, comparison; `simulate()` entry point |
| `serialize.py` | Engine results -> contract JSON |
| `goals.py` | Savings-goal calculator (no endpoint; needs Workstream E approval to expose) |
| `schemas.py`, `router.py` | Pydantic request models; `POST /api/finance/simulate`; `register_finance(app)` |
| `tests/`, `examples/` | Known-answer tests; request/response examples (golden-tested) |

The engine reads attributes only, so Pydantic models and the dataclasses are interchangeable.

## Integration

```python
from app.finance.router import register_finance
register_finance(app)          # adds POST /api/finance/simulate and a /api/finance/* 422 handler
```
`register_finance` installs a `RequestValidationError` handler that reshapes errors **only for
`/api/finance*`** and delegates everything else to FastAPI's default. If Workstream E already has a
global handler, merge the two. `app/main.py` here is a stub - discard it.
Replace `schemas.py` with the shared contract models when they exist (field names are identical).

Run tests (from `apps/api`): `python -m unittest discover -s app/finance/tests -t .` or `pytest app/finance/tests`.
HTTP tests need `fastapi pydantic httpx` and are skipped otherwise.

## Semantics (decisions the shared spec left open)

* **Horizon:** `as_of_date` is day 1; the timeline has exactly `forecast_days` entries and includes the final day.
* **Opening cash** is cash available at the start of `as_of_date`. Expected income is never counted as cash before its date.
* **Weekly** flows repeat every 7 days anchored on `start_date`'s weekday. **Monthly** flows use `start_date`'s
  day-of-month, clamped to the month end (31 Jan -> 28 Feb -> 31 Mar; no drift).
* **Occurrences before `as_of_date`** are not replayed; they are assumed already reflected in current cash.
* **Shock window** = `[start_date, start_date + duration_days - 1]`, both inclusive (14 days from 2026-10-19 ends 2026-11-01).
  Only **inflows** of the shock category inside the window are multiplied. Omitted `start_date` defaults to `as_of_date` (noted in the result).
* **Breach** is strict: closing `< reserve`. A balance exactly equal to the reserve is not a breach.
  `cash_deficit` = any closing `< 0`; an earlier reserve breach is still reported in `first_reserve_breach_date`.
* **Ties** for the lowest balance resolve to the earliest date. `most_stressed_scenario_id` ties resolve to the first requested
  scenario (so with identical results it is the baseline and `change_in_minimum_balance` is 0).
* **Baseline** = scenario with id `baseline`, else the first scenario without a shock; none -> 422 `missing_baseline`.
* **`change_in_minimum_balance`** = most-stressed minimum balance minus baseline minimum balance.
* **Rounding:** `Decimal` throughout; each event amount rounded to paise (ROUND_HALF_UP) when created (incl. after a multiplier);
  whole rupees serialise as integers. Daily sums are therefore exact and `closing = opening + inflows - outflows` holds in the JSON.
* **Dates** are pure ISO calendar dates; the engine never calls `now()`/`today()` or converts through UTC.
* **Drivers** = up to 5 scheduled flows with the largest net cash effect from day 1 to the lowest-balance date, with
  occurrence counts, totals and the shock's cash effect. They reconcile: opening cash + sum(all flow effects) = minimum balance.
  No cause is ever inferred beyond the flows supplied.
* `savings_goal` outflows reduce spendable cash in the projection (saving is money that has left the balance).

## Additive fields beyond the shared contract (need Workstream E sign-off)

`timeline[].minimum_reserve`, `timeline[].below_reserve`, `timeline[].below_zero`, `results[].first_cash_deficit_date`,
`major_drivers[]` (object shape above), `comparison.comparison_basis`, `comparison.worst_shortfall_date`,
`comparison.worst_shortfall_to_reserve`. All shared-contract fields are unchanged; extra fields can be ignored.

## Errors (HTTP 422, one shape for all finance validation)

```json
{"error": "validation_error", "message": "...", "issues": [{"field": "profile.cash_on_hand", "code": "missing_required_input", "message": "..."}]}
```
Codes: `missing_required_input`, `invalid_value`, `duplicate_id`, `empty`, `missing_baseline`, (goals) `in_past`, `horizon_too_long`.
Unknown `cash_on_hand` / `minimum_reserve` (`null`) are never replaced by zero; `0` is a valid known value.

## Goal calculator (`goals.estimate_goal_progress`)

Compares baseline / strong (+20% sales) / weak (-20% sales) income (explicit, overridable `IncomeAssumption`s) for a
constant contribution at a chosen cadence up to the goal date. Reports the allocation
(`start + inflows - essential - other - savings = ending cash`), saved total, exact largest affordable contribution,
required contribution, and a suggestion **only** if the required amount is affordable. If essential flows alone push cash
below zero it returns `essentials_infeasible` and no suggestion. Existing `savings_goal` flows are excluded by default to avoid double counting.

## Limitations

* End-of-day balances only; intraday timing (e.g. paying stock before sales arrive) is invisible.
* Flows are treated as certain on their scheduled dates; low-confidence flows (< 0.7 extraction confidence) are flagged in notes
  but not probabilistically modelled. A breach is "possible under these assumptions", never "certain", and never proof of insolvency.
* No holiday/weekend adjustments, interest accrual, penalties or seasonality. Variable income is a single flat amount per occurrence.
* The engine cannot tell whether two flows describe the same money (e.g. net income *and* gross sales); keeping flows distinct is
  the extraction layer's job.
* Debt is modelled only as dated repayment flows; there are no debt-risk thresholds or loan recommendations by design.
