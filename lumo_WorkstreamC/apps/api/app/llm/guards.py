"""Output guards applied to every LLM answer before it reaches a user.

1. Number guard  - every number in the answer must already appear in the supplied facts (the model may
                   not calculate, round or invent figures). This is the main protection of the principle
                   "the engine computes numbers, the LLM only explains them".
2. Language guard - the answer must be mostly in the requested script.
3. Content guard  - heuristic block-list for certainty claims and loan recommendations (a safety net,
                   not a proof; the prompt forbids these too).
"""
from __future__ import annotations

import re
from decimal import Decimal
from typing import List, Set

from .text_utils import normalize_digits, numbers_in

_LIST_MARKER = re.compile(r"(?m)^\s*\d+[.)]\s+")


def disallowed_numbers(text: str, allowed: Set[Decimal]) -> List[Decimal]:
    cleaned = _LIST_MARKER.sub("", normalize_digits(text))
    return sorted(n for n in numbers_in(cleaned) if n not in allowed)


def _share(text: str, lo: int, hi: int) -> float:
    letters = [c for c in text if c.isalpha()]
    if not letters:
        return 0.0
    return sum(1 for c in letters if lo <= ord(c) <= hi) / len(letters)


def language_ok(text: str, language: str) -> bool:
    deva, gur = _share(text, 0x0900, 0x097F), _share(text, 0x0A00, 0x0A7F)
    if language == "hi-IN":
        return deva >= 0.5
    if language == "pa-IN":
        return gur >= 0.5
    return deva + gur <= 0.1


_BANNED = [re.compile(p, re.IGNORECASE) for p in (
    r"\bguarantee[ds]?\b", r"\bwill (definitely|certainly|surely)\b", r"\bfor sure\b", r"\b100\s?% (sure|certain)\b",
    r"\b(take|get|apply for|borrow) (a |an )?(loan|credit)\b", r"\bshould (borrow|take a loan)\b",
    r"गारंटी", r"पक्क", r"निश्चित रूप से", r"(ज़रूर|जरूर) होगा", r"(लोन|कर्ज़|कर्ज|उधार) (ले|लो|लीजिए|लें)",
    r"ਗਾਰੰਟੀ", r"ਪੱਕ", r"(ਲੋਨ|ਕਰਜ਼ਾ|ਉਧਾਰ) (ਲਓ|ਲਵੋ|ਲੈ)")]


def banned_phrases(text: str) -> List[str]:
    return [m.group(0) for p in _BANNED for m in [p.search(text)] if m]
