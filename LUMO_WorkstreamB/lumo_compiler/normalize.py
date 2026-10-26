"""Deterministic number normalisation: Devanagari digits, commas, 'dedh hazaar', 'paanch sau', '2k'."""
import re

_DEV = str.maketrans("०१२३४५६७८९", "0123456789")
UNITS = {
    "sau": 100, "सौ": 100,
    "hazaar": 1000, "hazar": 1000, "hajar": 1000, "हजार": 1000, "हज़ार": 1000,
    "lakh": 100000, "lac": 100000, "लाख": 100000,
}
FRAC = {"dedh": 1.5, "डेढ़": 1.5, "डेढ": 1.5, "dhai": 2.5, "dhaai": 2.5, "ढाई": 2.5,
        "sawa": 1.25, "सवा": 1.25}
WORDS = {
    "ek": 1, "एक": 1, "do": 2, "दो": 2, "teen": 3, "तीन": 3, "char": 4, "chaar": 4, "चार": 4,
    "paanch": 5, "panch": 5, "पांच": 5, "पाँच": 5, "chhe": 6, "che": 6, "chah": 6, "छह": 6, "छः": 6,
    "saat": 7, "सात": 7, "aath": 8, "आठ": 8, "nau": 9, "नौ": 9, "das": 10, "दस": 10,
    "bees": 20, "बीस": 20, "tees": 30, "तीस": 30, "chalis": 40, "चालीस": 40, "pachas": 50, "पचास": 50,
}


def _clean(tok: str) -> str:
    return tok.strip(".,;:!?()\"'₹।").lower()


def _fmt(v: float) -> str:
    return str(int(v)) if float(v).is_integer() else str(v)


def _num(tok: str):
    c = _clean(tok)
    if re.fullmatch(r"\d+(\.\d+)?", c):
        return float(c)
    if c in FRAC:
        return FRAC[c]
    if c in WORDS:
        return float(WORDS[c])
    return None


def normalize_text(text: str) -> str:
    t = text.translate(_DEV)
    t = re.sub(r"(?<=\d),(?=\d{2,3}(?!\d))", "", t)  # 1,500 -> 1500
    t = re.sub(r"\b(\d+(?:\.\d+)?)\s?[kK]\b", lambda m: _fmt(float(m.group(1)) * 1000), t)
    out, produced = [], {}  # produced: index -> magnitude of the unit that built it
    for tok in t.split():
        c = _clean(tok)
        if c in UNITS and out:
            n = _num(out[-1])
            if n is not None:
                mag = UNITS[c]
                val = n * mag
                out.pop()
                produced.pop(len(out), None)
                # "2 hazaar 5 sau" -> 2500
                if out and produced.get(len(out) - 1, 0) > mag and _num(out[-1]) is not None:
                    prev_mag = produced.pop(len(out) - 1)
                    val += float(_clean(out.pop()))
                    mag = prev_mag
                out.append(_fmt(val))
                produced[len(out) - 1] = mag
                continue
        out.append(tok)
    return " ".join(out)


def parse_number(value) -> float:
    """Parse a user-typed answer like '1500', 'dedh hazaar', '₹२०००' into a float."""
    if isinstance(value, (int, float)):
        return float(value)
    m = re.search(r"\d+(?:\.\d+)?", normalize_text(str(value)))
    if not m:
        raise ValueError(f"no number found in {value!r}")
    return float(m.group())
