"""Redact obvious personal identifiers before text is logged or sent to an LLM."""
import re

AADHAAR = re.compile(r"(?<!\d)\d{4}[\s-]?\d{4}[\s-]?\d{4}(?!\d)")
PHONE = re.compile(r"(?<!\d)(?:\+?91[\s-]?)?[6-9]\d{9}(?!\d)")
EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def redact(text: str) -> str:
    text = EMAIL.sub("[email]", text)
    text = AADHAAR.sub("[id-number]", text)
    text = PHONE.sub("[phone]", text)
    return text
