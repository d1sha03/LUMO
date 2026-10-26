"""POST /api/finance/simulate. Register with ``register_finance(app)`` from the common entry point."""
from __future__ import annotations

from typing import Any, Dict, List

from fastapi import APIRouter, FastAPI, Request
from fastapi.exception_handlers import request_validation_exception_handler
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse

from .scenarios import simulate
from .schemas import SimulateRequest
from .serialize import output_to_dict
from .validation import SimulationInputError

STRUCTURED_PREFIXES = ("/api/finance", "/api/explain", "/api/intake")

router = APIRouter(tags=["finance"])


@router.post("/api/finance/simulate")
def simulate_endpoint(request: SimulateRequest):
    try:
        output = simulate(request.twin, request.scenarios)
    except SimulationInputError as exc:
        return JSONResponse(status_code=422, content=exc.to_dict())
    return output_to_dict(output)


async def structured_validation_handler(request: Request, exc: RequestValidationError):
    """Same {error, message, issues[]} body for malformed finance requests; other routes keep FastAPI's default."""
    if not request.url.path.startswith(STRUCTURED_PREFIXES):
        return await request_validation_exception_handler(request, exc)
    issues: List[Dict[str, Any]] = []
    for err in exc.errors():
        loc = [str(p) for p in err.get("loc", ()) if p != "body"]
        issues.append({
            "field": ".".join(loc),
            "code": "missing_required_input" if err.get("type") == "missing" else "invalid_value",
            "message": str(err.get("msg", "Invalid value")),
        })
    return JSONResponse(status_code=422, content={
        "error": "validation_error",
        "message": "The request could not be read. Fix the listed fields and try again.",
        "issues": issues})


def register_finance(app: FastAPI) -> None:
    app.include_router(router)
    app.add_exception_handler(RequestValidationError, structured_validation_handler)
