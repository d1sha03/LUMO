import logging
from app import sarvam
from app.sarvam import LLMError

log = logging.getLogger("lumo.llm")


async def simplify_with_llm(question: str, term: dict, occupation: str | None,
                            language: str, fallback: str):
    """Returns (text, used_llm). Falls back to the reviewed glossary text on any failure."""
    if not sarvam.configured():
        return fallback, False
    system = (
        "You are LUMO Samjho, a careful financial education assistant. "
        "Explain only the supplied concept. Do not invent rates, scheme rules, "
        "eligibility, or guarantees. Use short, plain language. If uncertain, "
        "say what needs checking. Return only the explanation."
    )
    lang_name = {"en": "English", "hi": "Hindi (Devanagari script)",
                 "hinglish": "Hinglish (Hindi in Roman script)", "pa": "Punjabi (Gurmukhi script)"}.get(language, language)
    user = (
        f"Requested language: {lang_name}\nOccupation: {occupation or 'not supplied'}\n"
        f"User question: {question}\nTerm: {term['term']}\n"
        f"Trusted definition: {term['definition']}\n"
        f"Reviewed simple explanation: {fallback}\n"
        f"Relevant example: {term.get('examples', {}).get(occupation or '', '')}\n"
        "Explain this in context. Keep it under 120 words."
    )
    try:
        text = await sarvam.chat(
            [{"role": "system", "content": system}, {"role": "user", "content": user}],
            temperature=0.2,
        )
        return text[:3000], True
    except LLMError as e:
        log.warning("explain: LLM failed, using glossary fallback: %s", e)
        return fallback, False
