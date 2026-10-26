# LUMO v1.0 Shared Contract Specification

**Project:** LUMO — Bharat's Livelihood Intelligence & Early-Warning System  
**Schema Version:** `1.0`  
**Calendar & Currency Semantics:** Indian Rupees (`INR`, integer/decimal rupees, never paise), ISO-8601 dates (`YYYY-MM-DD`) interpreted in `Asia/Kolkata`.

---

## 1. Core `FinancialTwin` Data Contract

```json
{
  "schema_version": "1.0",
  "twin_id": "twin_vendor_lko_01",
  "as_of_date": "2026-10-19",
  "language": "en-IN",
  "profile": {
    "occupation": "street_vendor",
    "state": "Uttar Pradesh",
    "district": "Lucknow"
  },
  "cash_on_hand": 4200,
  "minimum_reserve": 1500,
  "forecast_days": 30,
  "cash_flows": [],
  "goals": []
}
```

### Rules & Invariants
1. **Explicit Unknowns (`null`):** When `cash_on_hand` or `minimum_reserve` is unknown, keep it `null`. Never silently replace unknown values with `0`.
2. **Distinct Categories:** A `CashFlow` represents a single cash movement category. Keep gross revenue (`business_sales`), stock replenishment (`business_stock_cost`), and operating expenses (`business_operating_cost`) distinct.
3. **Extraction Confidence:** `confidence` (`0` to `1`) is strictly an extraction-confidence estimate from intake, never a probability of payment.
4. **Recurrence Rules:**
   - `once`: Applied only on `start_date` if within `[as_of_date, horizon_end]`.
   - `daily`: Applied on every date `d >= start_date` within the forecast horizon.
   - `weekly`: Applied on every date `d >= start_date` where `(d - start_date) mod 7 == 0`.
   - `monthly`: Applied on `d >= start_date` where the day-of-month matches `min(start_date.day, last_day_of_month(d))`.

---

## 2. REST API Endpoints

### `GET /health`
Returns service readiness and operating mode (`"demo"` or `"live"`).

### `POST /api/intake/compile`
Compiles a natural-language financial narrative (Hindi, Hinglish, Punjabi, or English) into a `draft_twin`, `extracted_facts`, `questions_required`, and `warnings`. Preserves confirmed fields when `existing_twin` is supplied.

### `POST /api/finance/simulate`
Runs deterministic daily cash-flow projection across `forecast_days` for one or more scenarios (such as `baseline` and `sales_drop_30`). Rejects incomplete essential inputs (`cash_on_hand: null` or `minimum_reserve: null`) with HTTP 422 and structured validation details.

### `POST /api/explain`
Returns plain-language explanation and context-tied example for a financial term (`gross_sales`, `net_operating_cash`, `supplier_credit`, `debt_repayment`, `minimum_reserve`, `projected_cash_shortfall`, `income_shock`) in the requested language, with honest audio status (`available`, `unavailable`, or `not_requested`).

### `GET /api/resources`
Returns curated, source-linked official Indian programmes with verification dates and non-approval disclaimers.
