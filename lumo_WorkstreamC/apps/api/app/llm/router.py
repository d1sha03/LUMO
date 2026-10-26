"""POST /api/explain and POST /api/intake/compile (reference implementations of the shared contracts).

Workstream E owns the final routes; ``register_llm(app)`` mounts these so the demo works end to end.
"""
from __future__ import annotations

from typing import Optional

from fastapi import APIRouter, FastAPI
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from ..finance.router import structured_validation_handler
from .errors import InputError
from .explain import explain_term
from .gateway import LLMGateway, build_gateway_from_env
from .intake import compile_intake
from .schemas import ExplainRequest, IntakeRequest

router = APIRouter(tags=["llm"])
_gateway: Optional[LLMGateway] = None


def get_gateway() -> LLMGateway:
    global _gateway
    if _gateway is None:
        _gateway = build_gateway_from_env()
    return _gateway


def set_gateway(gateway: Optional[LLMGateway]) -> None:
    """Tests / integrators can inject a gateway (None resets to the environment-built one)."""
    global _gateway
    _gateway = gateway


@router.post("/api/explain")
def explain_endpoint(request: ExplainRequest):
    try:
        return explain_term(get_gateway(), request.term_key, request.context, request.language, request.include_audio)
    except InputError as exc:
        return JSONResponse(status_code=422, content=exc.to_dict())


@router.post("/api/intake/compile")
def intake_endpoint(request: IntakeRequest):
    try:
        return compile_intake(get_gateway(), text=request.text, language=request.language,
                              as_of_date=request.as_of_date, existing_twin=request.existing_twin)
    except InputError as exc:
        return JSONResponse(status_code=422, content=exc.to_dict())


def register_llm(app: FastAPI) -> None:
    app.include_router(router)
    app.add_exception_handler(RequestValidationError, structured_validation_handler)
