"""
LUMO Workstream E — Module 7: Sarvam AI Explanation Layer

Receives structured facts from the deterministic financial engine
and generates a natural-language explanation in the user's language.

ARCHITECTURE RULE (enforced in prompt):
  The LLM MUST NOT invent numbers.
  The LLM ONLY explains facts provided to it.
  All numbers in the explanation must come from the structured facts.

SAFETY RULES embedded in every prompt:
  - Never invent numbers, rates, scheme eligibility, or guarantees.
  - Never claim certainty; always explain uncertainty.
  - Do not provide unauthorised financial advice.
  - Do not request OTPs, PINs, passwords, Aadhaar, banking credentials.
  - Explain that calculations come from LUMO's financial engine, not the LLM.
  - Use simple language for a first-time smartphone user.
"""
from __future__ import annotations

import logging
from typing import Optional

from app import sarvam
from app.sarvam import LLMError
from app.pii import redact

log = logging.getLogger("lumo.intelligence.explainer")

_LANG_NAME = {
    "en": "English",
    "hi": "Hindi in Devanagari script",
    "hinglish": "Hinglish (Hindi written in Roman/English letters)",
    "pa": "Punjabi in Gurmukhi script",
}

_MODULE_NAMES = {
    "stress": "Financial Stress Radar",
    "debt": "Debt Pressure Warning",
    "shock": "Income Shock Simulation",
    "goals": "Goal Planning",
    "earnings": "True Earnings",
    "actions": "Action Recommendations",
    "full": "Full Financial Intelligence Report",
}

_SYSTEM_PROMPT = """\
You are LUMO, an empathetic financial assistant for India's informal economy.
You are given structured financial facts computed by LUMO's deterministic financial engine.

YOUR JOB:
1. Explain these facts clearly and compassionately in the requested language.
2. Use simple language — imagine explaining to someone using a smartphone for the first time.
3. Keep the response concise (150-250 words maximum).

STRICT RULES — violating these makes the response unsafe:
- NEVER invent, change, or estimate any numbers. Use ONLY the facts provided.
- NEVER claim certainty — use phrases like "LUMO estimates", "it appears", "based on the information provided".
- NEVER provide authorised financial advice — say "LUMO suggests" not "you must".
- NEVER claim scheme eligibility for any person.
- NEVER request OTPs, PINs, Aadhaar numbers, passwords, or banking credentials.
- NEVER invent government scheme details or interest rates.
- If a number is missing or marked uncertain, say so explicitly.
- Always mention that calculations come from LUMO's financial engine, not from you.
- End with a reminder to verify important decisions with a qualified advisor.

If the facts indicate a difficult situation, be compassionate — acknowledge that irregular income is challenging and that the person is doing their best.
"""


def _build_user_prompt(module: str, facts: dict, language: str, occupation: Optional[str]) -> str:
    lang_name = _LANG_NAME.get(language, language)
    module_name = _MODULE_NAMES.get(module, module)
    occ_str = occupation or "not specified"

    facts_text = _format_facts(facts)

    return (
        f"Language: {lang_name}\n"
        f"User occupation: {occ_str}\n"
        f"Module: {module_name}\n\n"
        f"Structured facts from LUMO's financial engine:\n"
        f"{facts_text}\n\n"
        f"Please explain these findings in {lang_name}. "
        f"Be compassionate and practical. Stay within 200 words. "
        f"Do not add any numbers or facts not listed above."
    )


def _format_facts(facts: dict, depth: int = 0) -> str:
    """Convert a nested dict of facts to a readable string for the prompt."""
    lines = []
    indent = "  " * depth
    for key, value in facts.items():
        if key in ("disclaimer", "status", "confidence"):
            continue  # skip meta-fields
        if isinstance(value, dict):
            lines.append(f"{indent}{key}:")
            lines.append(_format_facts(value, depth + 1))
        elif isinstance(value, list):
            if value:
                lines.append(f"{indent}{key}:")
                for item in value[:5]:  # limit list length in prompt
                    if isinstance(item, dict):
                        item_str = ", ".join(f"{k}: {v}" for k, v in item.items()
                                             if k not in ("tag", "priority"))
                        lines.append(f"{indent}  - {item_str}")
                    else:
                        lines.append(f"{indent}  - {item}")
        elif value is not None and value != "":
            lines.append(f"{indent}{key}: {value}")
    return "\n".join(lines)


async def explain(
    module: str,
    facts: dict,
    language: str = "hinglish",
    occupation: Optional[str] = None,
) -> dict:
    """
    Generate a natural-language explanation of financial intelligence results.

    Returns:
      - explanation: the LLM-generated text (or fallback)
      - language: the language used
      - source: "sarvam_llm" | "fallback"
      - llm_error: error string if LLM failed
    """
    if not sarvam.configured():
        return {
            "explanation": _fallback_explanation(module, facts, language),
            "language": language,
            "source": "fallback_no_api_key",
            "llm_error": "LLM_API_KEY not configured. Set SARVAM_API_KEY to enable natural-language explanations.",
        }

    user_prompt = _build_user_prompt(module, facts, language, occupation)
    # Redact any PII that might have slipped into facts
    user_prompt = redact(user_prompt)

    try:
        text = await sarvam.chat(
            messages=[
                {"role": "system", "content": _SYSTEM_PROMPT},
                {"role": "user", "content": user_prompt},
            ],
            temperature=0.2,
            max_tokens=800,
        )
        return {
            "explanation": text[:3000],
            "language": language,
            "source": "sarvam_llm",
            "llm_error": None,
        }
    except LLMError as e:
        log.warning("intelligence explainer: LLM failed: %s", e)
        return {
            "explanation": _fallback_explanation(module, facts, language),
            "language": language,
            "source": "fallback_llm_error",
            "llm_error": str(e),
        }


def _fallback_explanation(module: str, facts: dict, language: str) -> str:
    """
    Deterministic fallback when the LLM is unavailable.
    Returns key facts as a structured text without any LLM inference.
    """
    module_name = _MODULE_NAMES.get(module, module)

    # Build facts summary
    parts = [f"LUMO {module_name} — Summary:"]

    if module == "stress":
        level = facts.get("level", "unknown")
        score = facts.get("score")
        shortfall = facts.get("potential_shortfall")
        days = facts.get("days_until_pressure")
        if score is not None:
            parts.append(f"Stress level: {level.upper()} ({score}/100)")
        if shortfall and shortfall > 0:
            parts.append(f"Potential shortfall: ₹{shortfall:,.0f}")
        if days is not None:
            parts.append(f"Pressure may arrive in approximately {days} days")

    elif module == "debt":
        pressure = facts.get("pressure_level", "unknown")
        burden = facts.get("estimated_repayment_burden")
        parts.append(f"Debt pressure level: {pressure.upper()}")
        if burden is not None:
            parts.append(f"Repayment burden: approximately {burden*100:.0f}% of income")

    elif module == "shock":
        baseline = facts.get("baseline_income")
        if baseline:
            parts.append(f"Baseline monthly income: ₹{baseline:,.0f}")
        custom = facts.get("custom_scenario", {})
        if custom:
            shortfall = (custom.get("results") or {}).get("shortfall", 0)
            pct = custom.get("income_shock_pct", 0)
            parts.append(f"With {pct*100:.0f}% income drop: shortfall ₹{shortfall:,.0f}")

    elif module == "goals":
        goals = facts.get("goals", [])
        for g in goals[:2]:
            name = g.get("goal_name", "Goal")
            months = g.get("recommended_safe_path", {}).get("estimated_months")
            parts.append(f"{name}: approximately {months} months at typical income")

    elif module == "earnings":
        daily = facts.get("daily", {})
        gross = daily.get("gross")
        net = daily.get("estimated_net")
        if gross and net:
            parts.append(f"Daily gross: ₹{gross:,.0f} | Estimated net: ₹{net:,.0f}")

    elif module == "actions":
        actions = facts.get("actions", [])
        for a in actions[:3]:
            parts.append(f"• {a.get('action', '')}")

    elif module == "full":
        # Pull key highlights
        if "stress_radar" in facts:
            level = facts["stress_radar"].get("level", "unknown")
            parts.append(f"Financial stress: {level}")
        if "debt_warning" in facts:
            dp = facts["debt_warning"].get("pressure_level", "unknown")
            parts.append(f"Debt pressure: {dp}")

    parts.append("\n(Natural-language explanation unavailable — LLM not configured.)")
    return "\n".join(parts)
