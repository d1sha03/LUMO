"""Resolve relative due dates in code (never in the LLM)."""
import re
from datetime import date, timedelta
from typing import Optional

from .normalize import normalize_text

WEEKDAYS = {
    "monday": 0, "somvaar": 0, "somwar": 0, "सोमवार": 0,
    "tuesday": 1, "mangalvaar": 1, "mangalwar": 1, "मंगलवार": 1,
    "wednesday": 2, "budhvaar": 2, "budhwar": 2, "बुधवार": 2,
    "thursday": 3, "guruvaar": 3, "guruwar": 3, "brihaspativaar": 3, "veervaar": 3, "गुरुवार": 3, "बृहस्पतिवार": 3,
    "friday": 4, "shukravaar": 4, "shukrawar": 4, "शुक्रवार": 4,
    "saturday": 5, "shanivaar": 5, "shaniwar": 5, "शनिवार": 5,
    "sunday": 6, "ravivaar": 6, "raviwar": 6, "itvaar": 6, "रविवार": 6,
}


def _has(t: str, words) -> bool:
    for w in words:
        if w.isascii():
            if re.search(rf"\b{re.escape(w)}\b", t):
                return True
        elif w in t:
            return True
    return False


def resolve_date_text(text: Optional[str], today: date) -> Optional[date]:
    if not text:
        return None
    t = normalize_text(text).lower()
    m = re.search(r"\b(\d{4})-(\d{2})-(\d{2})\b", t)
    if m:
        try:
            return date(int(m[1]), int(m[2]), int(m[3]))
        except ValueError:
            return None
    m = re.search(r"\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b", t)  # dd/mm[/yy]
    if m:
        d, mo = int(m[1]), int(m[2])
        y = int(m[3]) if m[3] else today.year
        y = y + 2000 if y < 100 else y
        try:
            res = date(y, mo, d)
        except ValueError:
            return None
        if not m[3] and res < today:
            res = date(y + 1, mo, d)
        return res
    if _has(t, ["parso", "परसों", "day after tomorrow"]):
        return today + timedelta(days=2)
    if _has(t, ["kal", "कल", "tomorrow"]):
        return today + timedelta(days=1)
    if _has(t, ["aaj", "आज", "today"]):
        return today
    m = re.search(r"(\d+)\s*(din|days?|दिन)", t)
    if m:
        return today + timedelta(days=int(m[1]))
    for name, idx in WEEKDAYS.items():
        if _has(t, [name]):
            delta = (idx - today.weekday()) % 7 or 7
            return today + timedelta(days=delta)
    if _has(t, ["hafte", "hafta", "हफ्ते", "हफ़्ते", "week", "saptah"]):
        return today + timedelta(days=7)
    return None
