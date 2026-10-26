"""Text helpers shared by the guards, intake and explain tasks (stdlib only)."""
from __future__ import annotations

import json
import re
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Set

from .errors import OutputRejected

# Devanagari U+0966..096F and Gurmukhi U+0A66..0A6F digits -> ASCII
_DIGITS = {chr(base + i): str(i) for base in (0x0966, 0x0A66) for i in range(10)}
_DIGIT_TABLE = str.maketrans(_DIGITS)

_NUMBER = re.compile(r"\d+(?:,\d+)*(?:\.\d+)?")
_SCALED = re.compile(r"(\d+(?:\.\d+)?)\s*(hazaar|hazar|hajar|thousand|k|हज़ार|हजार|lakh|lac|लाख)(?![a-zA-Z])",
                     re.IGNORECASE)
_SCALE = {"hazaar": 1000, "hazar": 1000, "hajar": 1000, "thousand": 1000, "k": 1000, "हज़ार": 1000,
          "हजार": 1000, "lakh": 100000, "lac": 100000, "लाख": 100000}

# Saaras returns spoken numbers as words ("आठ सौ रुपये"), so the "does this amount appear in the
# statement" guard has to read word numbers too - otherwise a real transcript is rejected and the
# whole intake silently drops to the rule-based fallback.
_WORD_UNITS = {
    "zero": 0, "one": 1, "two": 2, "three": 3, "four": 4, "five": 5, "six": 6, "seven": 7, "eight": 8,
    "nine": 9, "ten": 10, "eleven": 11, "twelve": 12, "thirteen": 13, "fourteen": 14, "fifteen": 15,
    "sixteen": 16, "seventeen": 17, "eighteen": 18, "nineteen": 19, "twenty": 20, "thirty": 30,
    "forty": 40, "fifty": 50, "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
    "ek": 1, "do": 2, "don": 2, "tin": 3, "teen": 3, "chaar": 4, "paanch": 5, "panch": 5, "chhe": 6,
    "saat": 7, "aath": 8, "ath": 8, "nau": 9, "das": 10, "dass": 10, "gyarah": 11, "barah": 12,
    "terah": 13, "chaudah": 14, "pandrah": 15, "solah": 16, "satrah": 17, "atharah": 18,
    "unnees": 19, "bees": 20, "pachees": 25, "tis": 30, "tees": 30, "caalees": 40, "chaalis": 40,
    "pachaas": 50, "pachas": 50, "saath": 60, "sattar": 70, "assi": 80, "nabbe": 90,
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4, "पाँच": 5, "पांच": 5, "छह": 6, "छै": 6, "सात": 7, "आठ": 8,
    "नौ": 9, "दस": 10, "ग्यारह": 11, "बारह": 12, "तेरह": 13, "चौदह": 14, "पंद्रह": 15, "पंचदह": 15,
    "सोलह": 16, "सत्रह": 17, "अठारह": 18, "उन्नीस": 19, "बीस": 20, "पच्चीस": 25, "तीस": 30,
    "चालीस": 40, "पचास": 50, "साठ": 60, "सत्तर": 70, "अस्सी": 80, "नब्बे": 90,
    "ਇੱਕ": 1, "ਦੋ": 2, "ਤਿੰਨ": 3, "ਚਾਰ": 4, "ਪੰਜ": 5, "ਛੇ": 6, "ਸਾਤ": 7, "ਅੱਠ": 8, "ਨੌ": 9,
    "ਦਸ": 10, "ਗਿਆਰ੍ਹਾਂ": 11, "ਬਾਰ੍ਹਾਂ": 12, "ਤੇਰ੍ਹਾਂ": 13, "ਚੌਦ੍ਹਾਂ": 14, "ਪੰਦਰਾਂ": 15,
    "ਸੋਲ੍ਹਾਂ": 16, "ਸਤ੍ਰਾਂ": 17, "ਅਠਾਰਾਂ": 18, "ਊਂਨ੍ਹਾਂ": 19, "ਵੀਹ": 20, "ਤੀਹ": 30, "ਚਾਲ੍ਹੀ": 40,
    "ਪੰਜਾਹ": 50, "ਸੱਠ": 60, "ਸੱਤਰ": 70, "ਅੱਸੀ": 80, "ਨੱਬੇ": 90,
}
_WORD_SCALES = {
    "hundred": 100, "saw": 100, "sau": 100, "sata": 100, "सौ": 100, "शत": 100, "ਸੌ": 100,
    "thousand": 1000, "hazaar": 1000, "hazar": 1000, "hajar": 1000, "हज़ार": 1000, "हजार": 1000,
    "ਹਜ਼ਾਰ": 1000, "ਹਜਾਰ": 1000,
    "lakh": 100000, "lac": 100000, "लाख": 100000, "ਲੱਖ": 100000,
    "crore": 10000000, "crood": 10000000, "करोड़": 10000000, "करोड": 10000000, "ਕਰੋੜ": 10000000,
}
_UNIT_ALT = "|".join(sorted((re.escape(u) for u in _WORD_UNITS), key=len, reverse=True))
_SCALE_ALT = "|".join(sorted((re.escape(s) for s in _WORD_SCALES), key=len, reverse=True))
_WORD_NUMBER = re.compile(rf"(?<!\w)({_UNIT_ALT})(?:\s+({_SCALE_ALT}))?(?!\w)", re.IGNORECASE)


def word_numbers(text: str) -> Set[Decimal]:
    """Values of spoken numbers such as 'आठ सौ', 'पाँच सौ' or 'eight hundred'."""
    found: Set[Decimal] = set()
    for match in _WORD_NUMBER.finditer(text):
        unit = _WORD_UNITS.get(match.group(1).casefold())
        if unit is None:
            unit = _WORD_UNITS.get(match.group(1))
        if unit is None:
            continue
        scale_word = match.group(2)
        scale = (_WORD_SCALES.get(scale_word.casefold()) or _WORD_SCALES.get(scale_word)) if scale_word else None
        found.add(Decimal(unit * scale if scale else unit))
    return found


def stated_numbers(text: str) -> Set[Decimal]:
    """Numbers a person may have stated, written as digits OR as spoken words.

    Used by intake to accept a value the speaker said aloud. The answer-side guard
    ``disallowed_numbers`` deliberately keeps to ``numbers_in`` (digits only): ordinary words such as
    "एक"/"one" must not be read as the number 1 in generated text.
    """
    return numbers_in(text) | word_numbers(normalize_digits(text))


def normalize_digits(text: str) -> str:
    return text.translate(_DIGIT_TABLE)


def normalize_text(text: str) -> str:
    """Lower-case, ASCII digits, collapsed whitespace - used for quote matching."""
    return re.sub(r"\s+", " ", normalize_digits(text)).strip().casefold()


def numbers_in(text: str) -> Set[Decimal]:
    """Every number written in ``text`` as digits (Indic digits and 1,23,456 grouping handled).
    'two thousand'-style scaled forms such as '2 hazar' / '1.5 lakh' also add the scaled value."""
    t = normalize_digits(text)
    found: Set[Decimal] = set()
    for m in _NUMBER.finditer(t):
        try:
            found.add(Decimal(m.group(0).replace(",", "")))
        except InvalidOperation:
            continue
    for m in _SCALED.finditer(t):
        try:
            found.add(Decimal(m.group(1)) * _SCALE[m.group(2).lower()])
        except InvalidOperation:
            continue
    return found


def strip_reasoning(raw: str) -> str:
    """Remove <think>...</think> blocks some reasoning models emit. An unclosed block means truncation."""
    cleaned = re.sub(r"<think>.*?</think>", "", raw, flags=re.DOTALL | re.IGNORECASE)
    if re.search(r"<think>", cleaned, re.IGNORECASE):
        return ""
    return cleaned.strip()


def parse_json_object(raw: str) -> Dict[str, Any]:
    text = strip_reasoning(raw)
    fence = re.search(r"```(?:json)?\s*(.*?)```", text, flags=re.DOTALL | re.IGNORECASE)
    if fence:
        text = fence.group(1)
    start, end = text.find("{"), text.rfind("}")
    if start == -1 or end <= start:
        raise OutputRejected("the answer did not contain a JSON object")
    try:
        obj = json.loads(text[start:end + 1])
    except json.JSONDecodeError as exc:
        raise OutputRejected(f"the answer was not valid JSON ({exc.msg})") from None
    if not isinstance(obj, dict):
        raise OutputRejected("the JSON answer must be an object")
    return obj
