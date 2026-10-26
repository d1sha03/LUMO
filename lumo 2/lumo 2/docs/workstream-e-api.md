# LUMO Workstream E — Financial Intelligence Engine API Specification

## 1. Overview & Architectural Principles

Workstream E delivers an indigenous financial intelligence layer tailored to India's informal economy (street vendors, gig workers, small farmers, micro-entrepreneurs).

### Core Architecture Rule: Deterministic Intelligence
1. **Zero LLM Arithmetic**: All calculations (stress score, shortfall, runway, debt ratios, shock impacts, savings timelines, net margins) are computed deterministically in pure Python (`app/intelligence/calculator.py`).
2. **LLM as Explainer Only**: Sarvam AI (`sarvam-2b` or configured chat model) is strictly used as an explanation layer to translate deterministic facts into human, respectful explanations in the user's preferred Indian language.
3. **Graceful Fallback**: If Sarvam AI is unavailable or unconfigured, the engine automatically falls back to deterministic rule-based explanations with zero disruption.
4. **Data Protection & PII**: Personally Identifiable Information (name, phone, Aadhaar, PAN) is never sent to the LLM. Only anonymized financial facts and occupation/location context are passed.
5. **Dignified & Non-Judgmental Tone**: The engine never uses stigmatizing terms like "bad borrower" or "risky person", never issues commands like "You must...", and always preserves essential household expenses.

---

## 2. Authentication & Rate Limiting

All POST endpoints in `/api/intelligence/*` use LUMO's centralized `protect()` security dependency (`app/security.py`):
- Header: `X-API-Key: <configured-key>` (if enabled)
- Rate Limiting: Enforced per client IP

The `GET /api/intelligence/demo` endpoint is open for demo and testing without credentials.

---

## 3. Endpoints Reference

### 3.1 Demo Persona
- **Method & Route**: `GET /api/intelligence/demo`
- **Description**: Returns the pre-configured synthetic profile for **Sita** (a vegetable vendor in Lucknow, UP earning irregular daily income with school fee goal and SHG debt).
- **Request**: No body required.
- **Response**: `FinancialProfile` JSON.

---

### 3.2 Master Analysis Endpoint
- **Method & Route**: `POST /api/intelligence/analyze?explain={true|false}`
- **Description**: Orchestrates all 6 intelligence modules (Stress Radar, Debt Risk, Shock Simulator, Goal Engine, True Earnings, and Action Engine) in a single request.
- **Query Params**:
  - `explain` (bool, default: `false`): If `true`, calls Sarvam AI to attach a localized natural-language explanation.
- **Request Body**:
```json
{
  "financial_profile": {
    "user": {
      "user_id": "usr_sita_01",
      "occupation": "vegetable vendor",
      "location": "Lucknow, Uttar Pradesh",
      "language": "hi"
    },
    "income": {
      "income_frequency": "daily",
      "daily_average": 900.0,
      "variability": 0.30,
      "strong_day": 1200.0,
      "weak_day": 600.0
    },
    "expenses": {
      "essential_monthly": 9000.0,
      "flexible_monthly": 2500.0
    },
    "debts": [
      {
        "source": "SHG loan",
        "principal": 10000.0,
        "monthly_payment": 1500.0,
        "interest_rate_pct": 18.0
      }
    ],
    "goals": [
      {
        "name": "Children school fees",
        "amount": 15000.0,
        "deadline_months": 3,
        "priority": "high"
      }
    ],
    "cash_available": 2000.0
  }
}
```
- **Response Structure**:
```json
{
  "status": "ok",
  "profile_summary": {
    "occupation": "vegetable vendor",
    "location": "Lucknow, Uttar Pradesh",
    "language": "hi"
  },
  "stress_radar": {
    "status": "ok",
    "score": 38,
    "level": "moderate",
    "monthly_net_cashflow": 10400.0,
    "days_of_cash_runway": 4,
    "potential_shortfall": 0.0,
    "drivers": [ ... ],
    "explanation_facts": { ... },
    "disclaimer": "..."
  },
  "debt_warning": {
    "status": "ok",
    "debt_pressure_level": "moderate",
    "debt_to_income_ratio": 0.064,
    "total_monthly_debt": 1500.0,
    "total_outstanding_debt": 10000.0,
    "income_floor_needed": 10500.0,
    "drivers": [ ... ],
    "disclaimer": "..."
  },
  "income_shock": {
    "status": "ok",
    "baseline": { ... },
    "preset_scenarios": [ ... ],
    "custom_scenario": { ... },
    "disclaimer": "..."
  },
  "goal_analysis": {
    "status": "ok",
    "goals": [ ... ],
    "disclaimer": "..."
  },
  "true_earnings": {
    "status": "ok",
    "gross_revenue": 23400.0,
    "total_work_costs": 0.0,
    "estimated_net_earnings": 23400.0,
    "disclaimer": "..."
  },
  "actions": {
    "status": "ok",
    "actions": [
      {
        "action_id": "act_reserve_01",
        "category": "cash_buffer",
        "priority": "high",
        "title": "Set aside small daily reserve",
        "description": "LUMO suggests setting aside ₹100 on strong days...",
        "impact_metric": "Builds 7-day cash buffer",
        "safe_action": true
      }
    ],
    "disclaimer": "..."
  },
  "explanation": {
    "module": "full",
    "explanation": "...",
    "language": "hi",
    "source": "sarvam"
  }
}
```

---

### 3.3 Module-Specific Endpoints

| Endpoint | Method | Input Model | Primary Output |
|---|---|---|---|
| `/api/intelligence/stress` | POST | `IntelligenceRequest` | Stress score (0-100), level (`stable`, `low`, `moderate`, `high`, `critical`), runway, drivers |
| `/api/intelligence/shock` | POST | `ShockScenarioRequest` | 0%, 10%, 20%, 30%, 50% shock impacts, zero-income days breakdown |
| `/api/intelligence/goals` | POST | `GoalAnalysisRequest` | Analysis of a single goal with weak/typical/strong scenarios |
| `/api/intelligence/goals/all` | POST | `IntelligenceRequest` | Scenario projections and safe paths for all goals |
| `/api/intelligence/debt` | POST | `IntelligenceRequest` | Debt-to-income ratio, income floor required, moneylender flags |
| `/api/intelligence/earnings` | POST | `IntelligenceRequest` | Net earnings breakdown (gross revenue - fuel, fees, supplies) |
| `/api/intelligence/explain` | POST | `ExplainIntelligenceRequest` | Multilingual natural-language explanation generated by Sarvam AI |

---

## 4. Schemas Definition

### 4.1 Income Frequency & Profiles
- `income_frequency`: `"daily" | "weekly" | "monthly" | "seasonal"`
- `variability`: Float fraction between `0.0` and `1.0` representing daily or seasonal variance.
- `essential_monthly`: Mandatory household survival costs (food, rent, electricity, medicines, basic school tuition).
- `flexible_monthly`: Non-essential discretionary spending that can be paused during cash flow crunches.

### 4.2 Debt Records
- `source`: `"bank" | "mfi" | "shg" | "moneylender" | "family" | "other"`
- `monthly_payment`: Required monthly installment amount.
- `principal`: Remaining principal amount.
- `interest_rate_pct`: Optional stated annual interest percentage.

---

## 5. Configuration & Environment Variables

Configure these settings in your `.env` file:

```env
# Sarvam AI API Key (reused across LUMO)
SARVAM_API_KEY=your_key_here
LLM_API_KEY=your_key_here

# Debt risk thresholds
DEBT_PRESSURE_THRESHOLD=0.35
DEBT_CRITICAL_THRESHOLD=0.50
```

---

## 6. Testing & Validation

Workstream E includes an independent test suite (`tests/test_intelligence.py`):
```bash
python -m pytest tests/test_intelligence.py -v
```
All 104 tests run in less than 1 second with no live API keys required (external LLM and network interactions are mocked with AsyncMock).
