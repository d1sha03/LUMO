import json
import re
from datetime import date

from pydantic import ValidationError

from .ambiguity import build_questions
from .normalize import normalize_text
from .schema import SCHEMA_VERSION, Extraction
from .validate import assign_confidence, check_facts, resolve_dates, sanity_checks


class ExtractionError(RuntimeError):
    pass


def parse_json(raw: str) -> dict:
    raw = re.sub(r"^```(?:json)?|```$", "", raw.strip(), flags=re.M).strip()
    return json.loads(raw)


def finalize(ext: dict, text_norm: str, today: date, original_text: str | None = None) -> dict:
    """Deterministic post-processing. Safe to re-run after a user correction."""
    warnings: list = []
    check_facts(ext, text_norm, warnings)
    resolve_dates(ext, today, warnings)
    sanity_checks(ext, warnings)
    assign_confidence(ext)
    questions, remaining = build_questions(ext)
    return {
        "schema_version": SCHEMA_VERSION,
        "meta": {"today": today.isoformat(), "original_text": original_text, "normalized_text": text_norm},
        "extraction": ext,
        "warnings": warnings,
        "questions": questions,
        "pending_questions_count": remaining,
    }


def compile_text(text: str, today: date | None = None, llm=None, max_attempts: int = 2) -> dict:
    today = today or date.today()
    norm = normalize_text(text)
    if llm is None:
        from .llm import SarvamExtractor
        llm = SarvamExtractor()
    err = None
    for _ in range(max_attempts):
        raw = llm(norm, today.isoformat(), feedback=err)
        try:
            ext = Extraction.model_validate(parse_json(raw))
            return finalize(ext.model_dump(), norm, today, text)
        except (ValueError, ValidationError) as e:  # JSONDecodeError and ValidationError are ValueErrors
            err = str(e)[:500]
    raise ExtractionError(f"Model output invalid after {max_attempts} attempts: {err}")
