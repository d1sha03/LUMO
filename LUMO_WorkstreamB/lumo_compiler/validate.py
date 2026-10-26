"""Server-side validation. Operates on plain dicts (Extraction.model_dump())."""
import re
from datetime import date

from .dates import resolve_date_text
from .normalize import normalize_text

USER = "user_correction"
CONF = {"stated": 0.9, "inferred": 0.6, "ambiguous": 0.3, "missing": 0.0}
INCOME_RANGE = {"day": (20, 50_000), "week": (100, 350_000), "month": (500, 1_500_000)}


def iter_facts(node, path=""):
    if isinstance(node, dict):
        if {"value", "status", "source_span"} <= node.keys():
            yield path, node
            return
        for k, v in node.items():
            yield from iter_facts(v, f"{path}.{k}" if path else k)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            yield from iter_facts(v, f"{path}[{i}]")


def _squash(s: str) -> str:
    return " ".join(s.lower().split())


def _drop(f, path, code, detail, warnings):
    f["value"], f["status"], f["source_span"] = None, "missing", None
    warnings.append({"code": code, "path": path, "detail": detail})


def check_facts(ext, text_norm, warnings):
    hay = _squash(text_norm)
    for path, f in iter_facts(ext):
        v, st, sp = f["value"], f["status"], f["source_span"]
        if v is None:
            if st in ("stated", "inferred"):
                f["status"] = "missing"
            continue
        if st == "missing":
            _drop(f, path, "contradictory_fact", "value given but status=missing", warnings)
            continue
        if v < 0:
            _drop(f, path, "negative_value", f"{v}", warnings)
            continue
        if sp == USER:
            continue
        if sp is not None and _squash(normalize_text(sp)) not in hay:
            _drop(f, path, "unsupported_value", f"span not found in text: {sp!r}", warnings)
            continue
        if st == "stated":
            if sp is None:
                _drop(f, path, "unsupported_value", "stated without source_span", warnings)
                continue
            nums = [float(n) for n in re.findall(r"\d+(?:\.\d+)?", normalize_text(sp))]
            if not any(abs(n - v) < 0.5 for n in nums):
                _drop(f, path, "unsupported_value", f"{v} not in span {sp!r}", warnings)


def resolve_dates(ext, today: date, warnings):
    for i, d in enumerate(ext["debts"]):
        dt = resolve_date_text(d["due_date_text"], today)
        d["due_date"] = dt.isoformat() if dt else None
        if dt and dt < today:
            warnings.append({"code": "due_date_in_past", "path": f"debts[{i}].due_date", "detail": d["due_date"]})
    for i, g in enumerate(ext["goals"]):
        dt = resolve_date_text(g["target_date_text"], today)
        g["target_date"] = dt.isoformat() if dt else None


def sanity_checks(ext, warnings):
    for i, inc in enumerate(ext["income"]):
        a, rng = inc["amount"], INCOME_RANGE.get(inc["period"])
        if a["value"] is not None and rng and not (rng[0] <= a["value"] <= rng[1]):
            a["status"] = "ambiguous"
            warnings.append({"code": "suspicious_value", "path": f"income[{i}].amount", "detail": str(a["value"])})
    for i, d in enumerate(ext["debts"]):
        p, inst = d["principal"]["value"], d["installment"]["value"]
        if p is not None and inst is not None and inst > p:
            warnings.append({"code": "installment_exceeds_principal", "path": f"debts[{i}]", "detail": f"{inst}>{p}"})


def assign_confidence(ext):
    for _, f in iter_facts(ext):
        f["confidence"] = 1.0 if f["source_span"] == USER else CONF[f["status"]]
