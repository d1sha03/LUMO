"""Pydantic request models for the LLM-backed routes (HTTP boundary only)."""
from __future__ import annotations

from datetime import date
from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field

Language = Literal["hi-IN", "en-IN", "pa-IN"]


class ExplainRequest(BaseModel):
    term_key: str
    context: Dict[str, Any] = Field(default_factory=dict)
    language: Language
    include_audio: bool = False


class IntakeRequest(BaseModel):
    text: str
    language: Language
    as_of_date: date
    existing_twin: Optional[Dict[str, Any]] = None
