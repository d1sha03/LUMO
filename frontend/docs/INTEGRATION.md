# LUMO 2.0 Integration Guide

## Single API Client (`src/lib/api.ts`)

All frontend communication goes through `src/lib/api.ts`:

- `getHealth()` → `GET ${VITE_API_BASE_URL}/health`
- `compileFinancialStory(payload)` → `POST ${VITE_API_BASE_URL}/api/intake/compile`
- `simulateFinancialScenarios(payload)` → `POST ${VITE_API_BASE_URL}/api/finance/simulate`
- `explainFinancialTerm(payload)` → `POST ${VITE_API_BASE_URL}/api/explain`
- `getOfficialResources(params)` → `GET ${VITE_API_BASE_URL}/api/resources`

## Environment Configuration

Configure the backend base URL via `.env.local`:

```bash
VITE_API_BASE_URL=http://localhost:8000
```

Never place LLM keys or BHASHINI credentials in `VITE_*` variables.

## Connection Modes

The frontend supports two explicit connection modes visible in the header:

1. **Deterministic Demo Mode (`mode: "demo"`):** Uses the in-browser contract-compliant deterministic engine and synthetic fixtures so independent frontend development, automated tests, and offline demonstrations work out of the box.
2. **Live Backend API (`VITE_API_BASE_URL`):** Calls the configured FastAPI backend directly. If the live backend is unreachable or returns an error, LUMO displays an explicit error banner with the HTTP/network message and offers a user-triggered button to switch to Demo Mode or load the canonical demo scenario—never silently fabricating live results.
