import json
import re
from pathlib import Path

PATH = Path(__file__).parent / "data" / "glossary.json"
_WORD = r"[A-Za-z0-9\u0900-\u097F]"
_cache = None


def all_terms():
    global _cache
    if _cache is None:
        with PATH.open(encoding="utf-8") as f:
            _cache = json.load(f)
    return _cache


def find_term(question: str):
    """Longest whole-word alias match across ALL terms.

    (Fixes: 'premium' no longer matches the alias 'emi', and
    'seasonal income' beats the shorter alias 'income'.)
    """
    q = question.casefold()
    for term in all_terms():
        if term.get("id", "").casefold() == q.strip():
            return term
    best, best_len = None, 0
    for term in all_terms():
        for alias in term.get("aliases", []):
            a = alias.casefold().strip()
            if len(a) <= best_len or not a:
                continue
            if re.search(rf"(?<!{_WORD}){re.escape(a)}(?!{_WORD})", q):
                best, best_len = term, len(a)
    return best
