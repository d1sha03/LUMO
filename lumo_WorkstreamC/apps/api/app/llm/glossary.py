"""Curated LUMO Samjho glossary + deterministic fallback texts (hi-IN, en-IN, pa-IN).

The English ``definition`` is the single source of truth handed to the LLM, so the model only
re-words vetted meanings; it never decides what a term means.

REVIEW NOTE: the Hindi and Punjabi fallback texts are drafted for clarity and must be reviewed by
native speakers before any real-user deployment.
"""
from __future__ import annotations

from dataclasses import dataclass
from decimal import Decimal, InvalidOperation
from typing import Any, Dict, Mapping, Optional, Tuple

from ..finance.money import format_inr

LANGUAGES = ("hi-IN", "en-IN", "pa-IN")
LANGUAGE_NAMES = {"hi-IN": "Hindi (Devanagari script)", "en-IN": "simple Indian English",
                  "pa-IN": "Punjabi (Gurmukhi script)"}


@dataclass(frozen=True)
class Term:
    key: str
    definition: str


TERMS: Dict[str, Term] = {t.key: t for t in (
    Term("projected_cash_shortfall",
         "A projected cash shortfall means that, using the income and payments the user told us about, their "
         "cash could fall below the minimum reserve they want to keep in hand. It is a possibility based on "
         "assumptions, not a certainty, and not proof that the business is failing."),
    Term("minimum_reserve",
         "The minimum reserve is the amount of cash the user chooses to always keep in hand for emergencies and "
         "daily needs. LUMO warns when projected cash goes below it."),
    Term("cash_deficit",
         "A cash deficit means that, using the figures given, projected cash could fall below zero, i.e. payments "
         "due would be more than the cash available. It depends on assumptions and is not certain."),
    Term("sales_shock",
         "A sales shock is a what-if test: LUMO lowers the expected business sales for some days to see how the "
         "cash would hold up. It does not predict that sales will actually fall."),
)}


def _num(ctx: Mapping[str, Any], key: str) -> Optional[Decimal]:
    v = ctx.get(key)
    if v is None or isinstance(v, bool):
        return None
    try:
        return Decimal(str(v))
    except (InvalidOperation, ValueError):
        return None


def _fmt(d: Optional[Decimal]) -> str:
    return format_inr(d) if d is not None else ""


def _plain(d: Optional[Decimal]) -> str:
    return format(d.normalize(), "f") if d is not None else ""


_EXPLANATION: Dict[str, Dict[str, str]] = {
    "projected_cash_shortfall": {
        "en-IN": "A projected cash shortfall means that, based on the income and payments you told us about, your "
                 "cash could fall below the minimum amount you want to keep in hand. It is a warning, not a "
                 "certainty, because real sales and payments can be different.",
        "hi-IN": "अनुमानित नकदी की कमी का मतलब है कि आपने जो आमदनी और भुगतान बताए हैं, उनके हिसाब से आपके हाथ में "
                 "रखने योग्य न्यूनतम रकम से कम पैसा बच सकता है। यह एक चेतावनी है, तय परिणाम नहीं, क्योंकि असली "
                 "बिक्री और भुगतान अलग हो सकते हैं।",
        "pa-IN": "ਅਨੁਮਾਨਿਤ ਨਕਦੀ ਦੀ ਕਮੀ ਦਾ ਮਤਲਬ ਹੈ ਕਿ ਤੁਹਾਡੇ ਦੱਸੇ ਆਮਦਨ ਅਤੇ ਭੁਗਤਾਨਾਂ ਦੇ ਹਿਸਾਬ ਨਾਲ ਤੁਹਾਡੇ ਕੋਲ "
                 "ਹੱਥ ਵਿੱਚ ਰੱਖਣ ਲਈ ਚੁਣੀ ਘੱਟੋ-ਘੱਟ ਰਕਮ ਤੋਂ ਘੱਟ ਪੈਸੇ ਬਚ ਸਕਦੇ ਹਨ। ਇਹ ਇੱਕ ਚੇਤਾਵਨੀ ਹੈ, ਤੈਅ ਨਤੀਜਾ ਨਹੀਂ, "
                 "ਕਿਉਂਕਿ ਅਸਲ ਵਿਕਰੀ ਅਤੇ ਭੁਗਤਾਨ ਵੱਖਰੇ ਹੋ ਸਕਦੇ ਹਨ।",
    },
    "minimum_reserve": {
        "en-IN": "Your minimum reserve is the amount of cash you choose to always keep in hand for emergencies and "
                 "daily needs. LUMO warns you when projected cash goes below it.",
        "hi-IN": "न्यूनतम रिज़र्व वह रकम है जो आप आपात ज़रूरतों और रोज़ के खर्च के लिए हमेशा हाथ में रखना चाहते हैं। "
                 "अनुमानित नकदी इससे नीचे जाए तो LUMO आपको चेतावनी देता है।",
        "pa-IN": "ਘੱਟੋ-ਘੱਟ ਰਿਜ਼ਰਵ ਉਹ ਰਕਮ ਹੈ ਜੋ ਤੁਸੀਂ ਐਮਰਜੈਂਸੀ ਅਤੇ ਰੋਜ਼ ਦੇ ਖ਼ਰਚਿਆਂ ਲਈ ਹਮੇਸ਼ਾ ਹੱਥ ਵਿੱਚ ਰੱਖਣਾ ਚਾਹੁੰਦੇ ਹੋ। "
                 "ਅਨੁਮਾਨਿਤ ਨਕਦੀ ਇਸ ਤੋਂ ਹੇਠਾਂ ਜਾਵੇ ਤਾਂ LUMO ਤੁਹਾਨੂੰ ਚੇਤਾਵਨੀ ਦਿੰਦਾ ਹੈ।",
    },
    "cash_deficit": {
        "en-IN": "A cash deficit means that, based on the figures given, your projected cash could fall below zero, "
                 "that is, payments due would be more than the cash you have. It depends on the assumptions and is "
                 "not certain.",
        "hi-IN": "नकदी की कमी (कैश डेफ़िसिट) का मतलब है कि दिए गए आँकड़ों के हिसाब से आपकी नकदी शून्य से नीचे जा "
                 "सकती है, यानी देय भुगतान आपके पास के पैसे से ज़्यादा हों। यह मान्यताओं पर निर्भर है और तय नहीं है।",
        "pa-IN": "ਨਕਦੀ ਦੀ ਘਾਟ (ਕੈਸ਼ ਡੈਫ਼ਿਸਿਟ) ਦਾ ਮਤਲਬ ਹੈ ਕਿ ਦਿੱਤੇ ਅੰਕੜਿਆਂ ਦੇ ਹਿਸਾਬ ਨਾਲ ਤੁਹਾਡੀ ਨਕਦੀ ਸਿਫ਼ਰ ਤੋਂ ਹੇਠਾਂ ਜਾ "
                 "ਸਕਦੀ ਹੈ, ਯਾਨੀ ਦੇਣ ਵਾਲੇ ਭੁਗਤਾਨ ਤੁਹਾਡੇ ਕੋਲ ਮੌਜੂਦ ਪੈਸਿਆਂ ਤੋਂ ਵੱਧ ਹੋਣ। ਇਹ ਮੰਨੀਆਂ ਗਈਆਂ ਗੱਲਾਂ 'ਤੇ ਨਿਰਭਰ ਹੈ "
                 "ਅਤੇ ਤੈਅ ਨਹੀਂ।",
    },
    "sales_shock": {
        "en-IN": "A sales shock is a what-if test: LUMO lowers your expected business sales for some days to see how "
                 "your cash would hold up. It does not predict that sales will really fall.",
        "hi-IN": "सेल्स शॉक एक 'अगर ऐसा हुआ तो' परीक्षण है: LUMO कुछ दिनों के लिए आपकी अपेक्षित बिक्री घटाकर देखता है "
                 "कि आपकी नकदी कैसी रहेगी। यह भविष्यवाणी नहीं है कि बिक्री सच में घटेगी।",
        "pa-IN": "ਸੇਲਜ਼ ਸ਼ੌਕ ਇੱਕ 'ਜੇ ਇੰਝ ਹੋਇਆ ਤਾਂ' ਪਰਖ ਹੈ: LUMO ਕੁਝ ਦਿਨਾਂ ਲਈ ਤੁਹਾਡੀ ਉਮੀਦ ਕੀਤੀ ਵਿਕਰੀ ਘਟਾ ਕੇ ਵੇਖਦਾ ਹੈ "
                 "ਕਿ ਤੁਹਾਡੀ ਨਕਦੀ ਕਿਵੇਂ ਰਹੇਗੀ। ਇਹ ਭਵਿੱਖਬਾਣੀ ਨਹੀਂ ਕਿ ਵਿਕਰੀ ਸੱਚਮੁੱਚ ਘਟੇਗੀ।",
    },
}

_GENERIC_EXAMPLE = {
    "en-IN": "Run the stress test to see an example with your own numbers.",
    "hi-IN": "अपने आँकड़ों के साथ उदाहरण देखने के लिए तनाव परीक्षण चलाइए।",
    "pa-IN": "ਆਪਣੇ ਅੰਕੜਿਆਂ ਨਾਲ ਉਦਾਹਰਣ ਵੇਖਣ ਲਈ ਤਣਾਅ ਪਰਖ ਚਲਾਓ।",
}


def _example(term: str, lang: str, ctx: Mapping[str, Any]) -> str:
    date = str(ctx.get("minimum_balance_date") or "")
    status = ctx.get("scenario_status")
    sf, mb = _num(ctx, "shortfall_to_reserve"), _num(ctx, "minimum_balance")
    reserve = _num(ctx, "minimum_reserve")
    pct, days = _num(ctx, "sales_change_percent"), _num(ctx, "shock_duration_days")
    if pct is not None:
        pct = abs(pct)

    if term == "projected_cash_shortfall":
        if status == "within_reserve":
            return {"en-IN": "In this case your cash is expected to stay at or above your reserve, so no shortfall is shown.",
                    "hi-IN": "इस मामले में आपकी नकदी सुरक्षित रकम (रिज़र्व) से ऊपर या बराबर रहने का अनुमान है, इसलिए कोई कमी नहीं दिखती।",
                    "pa-IN": "ਇਸ ਮਾਮਲੇ ਵਿੱਚ ਤੁਹਾਡੀ ਨਕਦੀ ਰਿਜ਼ਰਵ ਰਕਮ ਤੋਂ ਉੱਪਰ ਜਾਂ ਬਰਾਬਰ ਰਹਿਣ ਦਾ ਅਨੁਮਾਨ ਹੈ, ਇਸ ਲਈ ਕੋਈ ਕਮੀ ਨਹੀਂ ਦਿਸਦੀ।"}[lang]
        if status == "reserve_breach" and sf is not None and date:
            x = _fmt(sf)
            return {"en-IN": f"In this case your lowest cash is expected on {date}, and it could be about {x} below your reserve.",
                    "hi-IN": f"इस मामले में सबसे कम नकदी {date} को होने का अनुमान है, और वह आपकी सुरक्षित रकम से लगभग {x} कम हो सकती है।",
                    "pa-IN": f"ਇਸ ਮਾਮਲੇ ਵਿੱਚ ਸਭ ਤੋਂ ਘੱਟ ਨਕਦੀ {date} ਨੂੰ ਹੋਣ ਦਾ ਅਨੁਮਾਨ ਹੈ, ਅਤੇ ਇਹ ਤੁਹਾਡੀ ਰਿਜ਼ਰਵ ਰਕਮ ਤੋਂ ਲਗਭਗ {x} ਘੱਟ ਹੋ ਸਕਦੀ ਹੈ।"}[lang]
        if status == "cash_deficit" and sf is not None and date:
            x = _fmt(sf)
            return {"en-IN": f"In this case your cash could fall below zero around {date}, and it could be {x} below your reserve.",
                    "hi-IN": f"इस मामले में {date} के आसपास आपकी नकदी शून्य से नीचे जा सकती है, और सुरक्षित रकम से {x} कम हो सकती है।",
                    "pa-IN": f"ਇਸ ਮਾਮਲੇ ਵਿੱਚ {date} ਦੇ ਆਸ-ਪਾਸ ਤੁਹਾਡੀ ਨਕਦੀ ਸਿਫ਼ਰ ਤੋਂ ਹੇਠਾਂ ਜਾ ਸਕਦੀ ਹੈ, ਅਤੇ ਰਿਜ਼ਰਵ ਰਕਮ ਤੋਂ {x} ਘੱਟ ਹੋ ਸਕਦੀ ਹੈ।"}[lang]
    elif term == "minimum_reserve" and reserve is not None:
        r = _fmt(reserve)
        return {"en-IN": f"For example, with a reserve of {r}, LUMO warns you whenever projected cash drops below {r}.",
                "hi-IN": f"जैसे, {r} का रिज़र्व हो तो जब भी अनुमानित नकदी {r} से नीचे जाएगी, LUMO चेतावनी देगा।",
                "pa-IN": f"ਜਿਵੇਂ, {r} ਦਾ ਰਿਜ਼ਰਵ ਹੋਵੇ ਤਾਂ ਜਦੋਂ ਵੀ ਅਨੁਮਾਨਿਤ ਨਕਦੀ {r} ਤੋਂ ਹੇਠਾਂ ਜਾਵੇਗੀ, LUMO ਚੇਤਾਵਨੀ ਦੇਵੇਗਾ।"}[lang]
    elif term == "cash_deficit" and mb is not None and date:
        x = _fmt(mb)
        return {"en-IN": f"In this case projected cash could reach {x} on {date}.",
                "hi-IN": f"इस मामले में {date} को अनुमानित नकदी {x} तक जा सकती है।",
                "pa-IN": f"ਇਸ ਮਾਮਲੇ ਵਿੱਚ {date} ਨੂੰ ਅਨੁਮਾਨਿਤ ਨਕਦੀ {x} ਤੱਕ ਜਾ ਸਕਦੀ ਹੈ।"}[lang]
    elif term == "sales_shock" and pct is not None and days is not None:
        p, n = _plain(pct), _plain(days)
        return {"en-IN": f"For example, if sales fall by {p}% for {n} days, LUMO recalculates your cash for those days.",
                "hi-IN": f"जैसे, अगर {n} दिनों तक बिक्री {p}% घटे, तो LUMO उन दिनों की नकदी दोबारा निकालता है।",
                "pa-IN": f"ਜਿਵੇਂ, ਜੇ {n} ਦਿਨਾਂ ਲਈ ਵਿਕਰੀ {p}% ਘਟੇ, ਤਾਂ LUMO ਉਨ੍ਹਾਂ ਦਿਨਾਂ ਦੀ ਨਕਦੀ ਦੁਬਾਰਾ ਕੱਢਦਾ ਹੈ।"}[lang]
    return _GENERIC_EXAMPLE[lang]


def fallback_text(term_key: str, language: str, ctx: Mapping[str, Any]) -> Tuple[str, str]:
    return _EXPLANATION[term_key][language], _example(term_key, language, ctx)
