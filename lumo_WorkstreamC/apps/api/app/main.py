"""STUB application entry point so the finance + LLM routes can run standalone.

Workstream E owns the real entry point: merge ``register_finance(app)`` / ``register_llm(app)`` into it.
"""
from fastapi import FastAPI

from .finance.router import register_finance
from .llm.router import get_gateway, register_llm

app = FastAPI(title="LUMO API (finance engine + government-LLM stub)")


@app.get("/health")
def health():
    gateway = get_gateway()
    # "live" only means a government LLM endpoint is configured; per-response `mode`/`provider` say what was really used.
    return {"status": "ok", "version": "1.0", "mode": "live" if gateway.any_configured() else "demo",
            "llm_providers": gateway.describe()}


register_finance(app)
register_llm(app)
