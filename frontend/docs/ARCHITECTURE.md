# LUMO 2.0 Architecture

## Overview

LUMO (**Bharat's Livelihood Intelligence & Early-Warning System**) compiles fragmented, natural-language financial descriptions into an inspectable, editable `FinancialTwin` contract (`schema_version: "1.0"`) and runs deterministic cash-flow projections and shock simulations.

```
[User Narrative (EN / HI / Hinglish / PA)]
        │
        ▼
POST /api/intake/compile
        │  ├── Extracted Facts (with source quotes & extraction confidence)
        │  ├── Clarification Questions (when sales vs profit or reserves are ambiguous/missing)
        │  └── Draft FinancialTwin (unknowns kept explicitly null)
        ▼
[User Review & Inline Correction]
        │
        ▼
POST /api/finance/simulate
        │  ├── Baseline Scenario ("Expected situation")
        │  └── Stress Scenario ("Sales fall by 30% for 14 days")
        ▼
[Financial Stress Radar & What-If Simulator]
        │  ├── Daily Opening / Inflows / Outflows / Closing / Reserve Gap
        │  ├── Minimum Balance & First Reserve-Breach Date
        │  └── Major Dated Drivers & Scenario Assumptions
        ▼
POST /api/explain (LUMO Samjho)  &  GET /api/resources (Official Resources)
```

## Core Architectural Principles

1. **Deterministic Arithmetic Only:** LLMs are used strictly to extract structured facts and generate plain-language explanations. Every cash balance, reserve gap, minimum balance date, and scenario delta is computed by deterministic calendar math.
2. **Explicit Unknowns (`null`):** Missing `cash_on_hand` or `minimum_reserve` remains `null`. Neither intake nor the frontend ever silently substitutes `0` for an unknown value.
3. **Distinct Cash Flow Categories:** Gross revenue (`business_sales`), stock replenishment (`business_stock_cost`), and operating expenses (`business_operating_cost`) are stored and projected separately.
4. **Honest Fallback & Provenance Labelling:** When operating in deterministic demo mode or using synthetic fixtures, the UI displays a prominent `Demo data` badge and `mode: "demo"`. Audio synthesis reports `status: "unavailable"` when no live TTS audio is returned rather than faking playback.
