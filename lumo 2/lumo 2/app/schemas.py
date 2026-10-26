from typing import Any, Literal, Optional
from pydantic import BaseModel, Field, model_validator

Language = Literal["en", "hi", "hinglish", "pa"]
Occupation = Literal[
    "street_vendor", "farmer", "gig_worker",
    "shg_member", "migrant_worker", "nano_entrepreneur"
]


class ExplainRequest(BaseModel):
    term: Optional[str] = Field(default=None, min_length=2, max_length=1000)
    question: Optional[str] = Field(default=None, min_length=2, max_length=1000)
    language: Language = "hinglish"
    occupation: Optional[Occupation] = None
    audio: bool = False
    context: Optional[dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def accept_legacy_frontend_fields(cls, value):
        if not isinstance(value, dict):
            return value
        normalized = dict(value)
        if "term" not in normalized and "term_key" in normalized:
            normalized["term"] = normalized["term_key"]
        if "audio" not in normalized and "include_audio" in normalized:
            normalized["audio"] = normalized["include_audio"]
        normalized["language"] = {
            "en-IN": "en",
            "hi-IN": "hi",
            "pa-IN": "pa",
        }.get(normalized.get("language"), normalized.get("language", "hinglish"))
        return normalized

    @model_validator(mode="after")
    def require_term_or_question(self):
        if not self.term and not self.question:
            raise ValueError("Either term or question is required.")
        return self

    @property
    def prompt(self) -> str:
        return self.question or self.term or ""


class ExplainResponse(BaseModel):
    term_id: Optional[str] = None
    term: Optional[str] = None
    explanation: str
    language: str
    audio_available: bool = False
    audio_base64: Optional[str] = None
    audio_provider: Optional[str] = None
    audio_error: Optional[str] = None
    source: str
    example: Optional[str] = None
    disclaimer: str = (
        "General financial education only. Verify terms and conditions "
        "before making financial decisions."
    )


class AskRequest(BaseModel):
    question: str = Field(min_length=2, max_length=2000)
    language: Language = "hinglish"
    financial_context: Optional[dict[str, Any]] = None
    occupation: Optional[str] = Field(default=None, max_length=80)


class TranslateRequest(BaseModel):
    text: str = Field(min_length=1, max_length=4000)
    source_language: Literal["en", "hi", "pa"] = "en"
    target_language: Literal["en", "hi", "pa"] = "hi"


class SpeechRequest(BaseModel):
    text: str = Field(min_length=1, max_length=3000)
    # en is Sarvam-only; BHASHINI TTS serves hi/pa.
    language: Literal["en", "hi", "pa"] = "hi"

    @model_validator(mode="before")
    @classmethod
    def accept_locale_tags(cls, value):
        if isinstance(value, dict) and value.get("language") in ("en-IN", "hi-IN", "pa-IN"):
            value = dict(value)
            value["language"] = value["language"].split("-")[0]
        return value
