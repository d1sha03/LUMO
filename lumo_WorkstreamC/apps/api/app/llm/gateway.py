"""LLM gateway: provider chain -> strict validation -> bounded repair retry -> labelled demo fallback.

* Providers are tried in the configured order. A provider that is not configured is skipped.
* Output must pass the caller's ``validate`` function (schema + number guard + language guard...).
  A rejected answer is sent back once with the reason (small models often fix JSON on a second try).
* Network/HTTP failures move straight to the next provider.
* If nothing validates, the deterministic ``fallback`` runs and the result is labelled
  ``mode="demo"`` / ``provider="fallback"``. The gateway never reports "live" for fallback output.
"""
from __future__ import annotations

import os
from dataclasses import dataclass, field
from typing import Any, Callable, Dict, List, Mapping, Optional, Sequence, TypeVar

from .errors import LLMError, OutputRejected, ProviderCallError, ProviderNotConfigured
from .providers import ChatProvider, Message, bharatgen_from_env, sarvam_from_env
from .text_utils import parse_json_object

T = TypeVar("T")
REGISTRY = {"bharatgen": bharatgen_from_env, "sarvam": sarvam_from_env}
FALLBACK_LABEL = "fallback"


def token_budget(caller_max_tokens: int) -> int:
    """Reasoning models spend most of the budget before the JSON appears.

    LUMO_LLM_MAX_TOKENS raises the floor for every call site at once.
    """
    try:
        floor = int(os.environ.get("LUMO_LLM_MAX_TOKENS", "0"))
    except (TypeError, ValueError):
        floor = 0
    return max(caller_max_tokens, floor)


@dataclass
class Attempt:
    provider: str
    ok: bool
    detail: str


@dataclass
class GatewayResult:
    value: Any
    mode: str                      # "live" | "demo"
    provider: str                  # e.g. "bharatgen:bharatgenai/Param-1-2.9B-Instruct" or "fallback"
    attempts: List[Attempt] = field(default_factory=list)

    def warnings(self) -> List[str]:
        out = [f"{a.provider}: {a.detail}" for a in self.attempts if not a.ok and a.detail != "not configured"]
        if self.mode == "demo":
            if not any(a.detail != "not configured" for a in self.attempts):
                out.insert(0, "No government LLM is configured; deterministic demo mode was used.")
            else:
                out.append("Deterministic demo fallback was used because no LLM answer passed validation.")
        return out


class LLMGateway:
    def __init__(self, providers: Sequence[ChatProvider] = (), max_attempts: int = 2):
        self.providers = list(providers)
        self.max_attempts = max(1, max_attempts)

    def describe(self) -> List[Dict[str, Any]]:
        return [{"provider": p.key, "model": p.model, "configured": p.is_configured(), "backing": p.backing}
                for p in self.providers]

    def any_configured(self) -> bool:
        return any(p.is_configured() for p in self.providers)

    def run_json(self, messages: List[Message], validate: Callable[[Dict[str, Any]], T],
                 fallback: Callable[[], T], *, temperature: float = 0.0, max_tokens: int = 900) -> GatewayResult:
        attempts: List[Attempt] = []
        for provider in self.providers:
            if not provider.is_configured():
                attempts.append(Attempt(provider.label, False, "not configured"))
                continue
            convo = list(messages)
            for n in range(1, self.max_attempts + 1):
                try:
                    raw = provider.chat(convo, temperature=temperature,
                                        max_tokens=token_budget(max_tokens))
                except ProviderNotConfigured:
                    attempts.append(Attempt(provider.label, False, "not configured"))
                    break
                except ProviderCallError as exc:
                    attempts.append(Attempt(provider.label, False, str(exc)))
                    break
                try:
                    value = validate(parse_json_object(raw))
                except OutputRejected as exc:
                    attempts.append(Attempt(provider.label, False, f"answer rejected (try {n}): {exc}"))
                    convo = convo + [
                        {"role": "assistant", "content": raw},
                        {"role": "user", "content": f"That answer was rejected: {exc}. "
                                                    "Reply again with ONLY the corrected JSON object."}]
                    continue
                attempts.append(Attempt(provider.label, True, "ok"))
                return GatewayResult(value, "live", provider.label, attempts)
        return GatewayResult(fallback(), "demo", FALLBACK_LABEL, attempts)


def build_gateway_from_env(env: Optional[Mapping[str, str]] = None) -> LLMGateway:
    """LUMO_LLM_PROVIDERS = ordered, comma-separated subset of: bharatgen, sarvam (default both).
    Anything else (e.g. a non-government provider) is rejected so the hackathon rule cannot be broken by config."""
    env = os.environ if env is None else env
    names = [n.strip().lower() for n in env.get("LUMO_LLM_PROVIDERS", "sarvam").split(",") if n.strip()]
    providers: List[ChatProvider] = []
    for name in names:
        if name in ("demo", "fallback"):
            continue
        if name not in REGISTRY:
            raise ValueError(f"Unsupported LLM provider '{name}'. Only government-backed providers are allowed: "
                             f"{sorted(REGISTRY)}.")
        providers.append(REGISTRY[name](env))
    try:
        attempts = int(env.get("LUMO_LLM_MAX_ATTEMPTS", "2"))
    except ValueError:
        attempts = 2
    return LLMGateway(providers, max_attempts=attempts)
