"""Apply a user correction / answer to the extraction by field path, e.g. 'income[0].basis'."""
import re

from .ambiguity import CONFIRM
from .normalize import parse_number
from .validate import USER

ALLOWED = {
    "basis": {"gross_sales", "net_after_stock"},
    "period": {"day", "week", "month"},
    "interest_period": {"day", "week", "month", "year"},
}


def _tokens(path):
    return [int(t[1:-1]) if t.startswith("[") else t for t in re.findall(r"\[\d+\]|[^.\[\]]+", path)]


def apply_patch(ext, path, value):
    toks = _tokens(path)
    if not toks:
        raise ValueError("empty path")
    node = ext
    for t in toks[:-1]:
        node = node[t]
    last = toks[-1]
    target = node[last]
    if isinstance(target, dict) and {"value", "status"} <= target.keys():
        if value == CONFIRM:
            v = target["value"]
        else:
            v = parse_number(value)
        if v is None or v < 0:
            raise ValueError("invalid number")
        node[last] = {"value": v, "status": "stated", "source_span": USER}
        return
    if last in ALLOWED and value not in ALLOWED[last]:
        raise ValueError(f"{last} must be one of {sorted(ALLOWED[last])}")
    if not isinstance(target, (str, type(None))):
        raise ValueError("cannot overwrite a structured field")
    node[last] = value
