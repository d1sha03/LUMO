# Frontend to Workstream E Integration Compatibility Map

## 1. Architectural Model & Source of Truth

```
┌────────────────────────────────────────────────────────┐
│                   Katha Experience                     │
│         (Voice/Text Input & Conversational Flow)       │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│              Living Financial Twin (JSON)              │
│       Contracts: FinancialTwin (Frontend)              │
│       Normalized adapter to: FinancialProfile          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ▼
┌────────────────────────────────────────────────────────┐
│           Workstream E FastAPI Intelligence            │
│         Deterministic Pure Python Calculations         │
│  - Stress Radar (/api/intelligence/stress)             │
│  - Debt Risk (/api/intelligence/debt)                  │
│  - True Earnings (/api/intelligence/earnings)          │
│  - Goal Engine (/api/intelligence/goals)               │
│  - Shock Simulator (/api/intelligence/shock)           │
│  - Master Analyze (/api/intelligence/analyze)          │
└──────────────────────────┬─────────────────────────────┘
                           │
                           ├──────────────────────────────┐
                           ▼                              ▼
┌──────────────────────────────────────┐  ┌──────────────────────────────────┐
│      Sarvam Natural Language         │  │       Interactive Dashboard      │
│     Explanation Layer (Backend)      │  │        Visual Components         │
│   (/api/intelligence/explain)        │  │  - Health, Stress, Debt Cards   │
│   (Samjho Multilingual Modal)        │  │  - Scenario Explorer             │
└──────────────────────────────────────┘  │  - True Earnings Card            │
                                          │  - 3-Way Goal Pathways           │
                                          │  - Constructive LUMO Actions     │
                                          └──────────────────────────────────┘
```

---

## 2. Type Mapping & Contract Translation

| Frontend Domain / Contract Type (`src/types/lumo.ts`) | Backend Pydantic Request Model (`app/intelligence/schemas.py`) | Workstream E Endpoint | Backend Response Model | Target UI Component |
|---|---|---|---|---|
| `FinancialTwin` (or synthesized story profile) | `FinancialProfile` in `IntelligenceRequest` | `POST /api/intelligence/analyze?explain={bool}` | Master analysis dictionary: `stress_radar`, `debt_warning`, `true_earnings`, `goal_analysis`, `income_shock`, `actions`, optional `explanation` | `DashboardExperience.tsx` |
| `FinancialTwin.cash_on_hand`, `cash_flows` | `FinancialProfile` in `IntelligenceRequest` | `POST /api/intelligence/stress` | `{ status, score, level, days_of_cash_runway, monthly_net_cashflow, potential_shortfall, drivers, disclaimer }` | `StressRadarPanel.tsx` & Health summary card |
| `FinancialTwin.cash_flows` (`debt_repayment`), historical debt | `FinancialProfile` in `IntelligenceRequest` | `POST /api/intelligence/debt` | `{ status, debt_pressure_level, debt_to_income_ratio, total_monthly_debt, total_outstanding_debt, income_floor_needed, drivers, disclaimer }` | `DebtPressureCard` in `DashboardExperience.tsx` |
| `FinancialTwin.cash_flows` (`business_sales`, `stock_cost`, `ops`) | `FinancialProfile` in `IntelligenceRequest` | `POST /api/intelligence/earnings` | `{ status, gross_revenue, total_work_costs, estimated_net_earnings, net_margin, is_estimated, disclaimer }` | `TrueEarningsCard` in `DashboardExperience.tsx` |
| `FinancialTwin.goals` (`Goal`) | `GoalAnalysisRequest` or `IntelligenceRequest` | `POST /api/intelligence/goals` / `POST /api/intelligence/goals/all` | `{ status, goals: [ { goal_name, amount, scenarios: { strong, typical, weak }, safe_path } ] }` | `GoalEngineSection` in `DashboardExperience.tsx` |
| `SimulationScenarioInput` (e.g. 10%, 20%, 30%, 50% drop, zero-income days) | `ShockScenarioRequest` | `POST /api/intelligence/shock` | `{ status, baseline, preset_scenarios, custom_scenario, disclaimer }` | `WhatIfPanel.tsx` |
| `ExplainRequest` (term, context, language) | `ExplainIntelligenceRequest` | `POST /api/intelligence/explain` | `{ module, explanation, language, source: "sarvam" \| "fallback" }` | `SamjhoModal.tsx` & Contextual Jargon Sheet |
| Demo Switcher / Initializer | N/A | `GET /api/intelligence/demo` | `{ demo: true, persona: {...}, financial_profile: FinancialProfile }` | `WelcomeScreen.tsx`, Demo Toggle, Header status |

---

## 3. Frontend-to-Backend Normalization Rules

1. **Deterministic One-Way Bridge**:
   - `FinancialTwin` cash flows are categorized into:
     - Inflows with daily frequency → `IncomeProfile.daily_average`, `BusinessProfile.gross_daily_revenue`.
     - Outflows with `category: "debt_repayment"` → `DebtRecord(monthly_payment, ...)`.
     - Outflows with `category: "business_stock_cost"` or `"business_operating_cost"` → `BusinessProfile.inventory_daily` / `other_work_costs_daily`.
     - Outflows with `category: "household_essential"` → `ExpenseProfile.essential_monthly`.
     - Outflows with `category: "household_discretionary"` → `ExpenseProfile.flexible_monthly`.
2. **Never Calculate on Frontend**:
   - The frontend never performs `daily * 30`, never derives stress percentages, never calculates runway days, and never determines goal feasibility. All numbers displayed come from backend responses.
3. **Graceful Offline Fallback**:
   - If the backend is disconnected or returns an error, the frontend activates `DEMO MODE` which serves deterministic results based on the canonical Sita fixture without breaking UI flow.
