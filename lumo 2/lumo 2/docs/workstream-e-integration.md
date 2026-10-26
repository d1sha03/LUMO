# Workstream E — Integration Document

## 1. Existing Architecture (discovered by inspection)

### Backend Framework
- **FastAPI** running via `uvicorn`
- Entry point: `app/main.py`
- Python 3.10+ required

### Existing Modules
| File | Purpose |
|---|---|
| `app/main.py` | FastAPI app, all existing routes |
| `app/config.py` | Env-var loader helpers |
| `app/schemas.py` | Pydantic models for existing endpoints |
| `app/sarvam.py` | Async Sarvam chat client with retries |
| `app/bhashini.py` | BhashiniClient — ULCA pipeline |
| `app/llm.py` | Thin LLM wrapper for glossary |
| `app/rag.py` | BM25 RAG over e-Shram documents |
| `app/security.py` | protect() dependency — API-Key + rate limiter |
| `app/pii.py` | PII redaction before logging |

### Existing API Routes
GET /health, GET /api/v1/glossary, POST /api/v1/explain,
POST /api/v1/translate, POST /api/v1/speech, GET /api/v1/resources,
POST /api/v1/ask, GET /api/v1/knowledge/status, GET /api/v1/llm/check

### Reusable Components
- app/sarvam.py chat() -- used by explanation layer
- app/config.py env* helpers -- used for new config values
- app/security.py protect() -- applied to all new endpoints
- app/pii.py redact() -- used in intelligence logging
- app/bhashini.py BhashiniClient -- optional audio

### Integration Points
- New router: app/intelligence/router.py registered in app/main.py
- Same FastAPI app, same Uvicorn server, no new framework
- No new DB -- all calculations are stateless in-memory
- Sarvam reused via existing app.sarvam.chat()

### Files Workstream E Adds
app/intelligence/__init__.py
app/intelligence/schemas.py
app/intelligence/calculator.py
app/intelligence/stress_radar.py
app/intelligence/shock_simulator.py
app/intelligence/goal_engine.py
app/intelligence/debt_risk.py
app/intelligence/true_earnings.py
app/intelligence/action_engine.py
app/intelligence/sarvam_explainer.py
app/intelligence/router.py
app/intelligence/demo_persona.py
tests/test_intelligence.py
docs/workstream-e-integration.md
docs/workstream-e-api.md

### Files Workstream E Modifies
app/main.py -- one line: include_router(intelligence_router)
.env.example -- document new env vars

### Files NOT Touched
app/rag.py, app/knowledge.py, app/glossary.py, app/bhashini.py,
app/schemas.py, all existing tests, app/data/, scripts/
