"""Thin Sarvam wrapper. The only file that talks to the network."""
import os
import time

from .prompts import build_messages
from .schema import llm_json_schema


class SarvamExtractor:
    """Callable: (text_norm, today_iso, feedback=None) -> raw JSON string."""

    def __init__(self, model: str | None = None, api_key: str | None = None, max_retries: int = 3):
        from dotenv import load_dotenv
        from sarvamai import SarvamAI  # lazy import so tests run without the SDK

        load_dotenv()
        key = api_key or os.environ.get("SARVAM_API_KEY")
        if not key:
            raise RuntimeError("Set SARVAM_API_KEY (backend only, never in the frontend).")
        self.client = SarvamAI(api_subscription_key=key)
        self.model = model or os.environ.get("SARVAM_MODEL", "sarvam-105b")
        self.max_retries = max_retries

    def _call(self, messages, strict_schema: bool):
        rf = (
            {"type": "json_schema",
             "json_schema": {"name": "livelihood_extraction", "strict": True, "schema": llm_json_schema()}}
            if strict_schema else {"type": "json_object"}
        )
        return self.client.chat.completions(
            model=self.model,
            messages=messages,
            response_format=rf,
            temperature=0.1,
            max_tokens=4096,
            reasoning_effort=None,  # thinking off: faster, and reasoning tokens would eat max_tokens
        )

    def __call__(self, text_norm: str, today_iso: str, feedback: str | None = None) -> str:
        messages = build_messages(text_norm, today_iso, feedback)
        strict = True
        last = None
        for attempt in range(self.max_retries + 1):
            try:
                resp = self._call(messages, strict)
                choice = resp.choices[0]
                if choice.finish_reason == "length" or not choice.message.content:
                    raise RuntimeError("Sarvam returned no content (finish_reason=length?)")
                return choice.message.content
            except Exception as e:  # SDK raises ApiError subclasses with .status_code
                last = e
                code = getattr(e, "status_code", None)
                if code in (429, 500, 502, 503, 504):
                    time.sleep(2 ** attempt)
                    continue
                if code in (400, 422) and strict:
                    strict = False  # fall back to json_object; Pydantic still enforces the schema
                    continue
                if code in (401, 403):
                    raise RuntimeError("Sarvam rejected the API key (401/403). Check SARVAM_API_KEY in .env.") from e
                raise RuntimeError(f"Sarvam call failed: {e}") from e
        raise RuntimeError(f"Sarvam call failed after retries: {last}")
