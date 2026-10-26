"""Errors for the LLM layer."""
from __future__ import annotations

from typing import Any, Dict, Iterable, List


class LLMError(Exception):
    """Base class."""


class ProviderNotConfigured(LLMError):
    """The provider has no endpoint/key configured; it is skipped, not an outage."""


class ProviderCallError(LLMError):
    """Network, HTTP, timeout or malformed-response failure. Never contains secrets."""


class OutputRejected(LLMError):
    """The model answered, but the answer failed validation (bad JSON, invented number, wrong language...)."""


class InputError(Exception):
    """Bad request input. ``to_dict`` matches the structured 422 body used by the finance engine."""

    def __init__(self, issues: Iterable[Dict[str, str]]):
        self.issues: List[Dict[str, str]] = list(issues)
        super().__init__("; ".join(f"{i['field']}: {i['code']}" for i in self.issues))

    def to_dict(self) -> Dict[str, Any]:
        return {"error": "validation_error",
                "message": "The request could not be processed. Fix the listed fields and try again.",
                "issues": self.issues}


def issue(field: str, code: str, message: str) -> Dict[str, str]:
    return {"field": field, "code": code, "message": message}
