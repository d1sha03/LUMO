"""Government-backed LLM provider adapters (stdlib HTTP, no extra dependencies).

Only government-backed / government-selected Indian models are registered here:

* BharatGen (Param family) - government-funded under DST's NM-ICPS with IndiaAI Mission compute.
  Open weights on Hugging Face (``bharatgenai/Param-1-2.9B-Instruct``, MIT per its model card).
  No confirmed public hosted API: point ``BHARATGEN_BASE_URL`` at your own vLLM/OpenAI-compatible
  server (``vllm serve bharatgenai/Param-1-2.9B-Instruct --trust-remote-code``).
* Sarvam - selected by the Government of India under the IndiaAI Mission to build the sovereign LLM;
  hosted OpenAI-style API (``sarvam-105b``; Apache-2.0 weights).

Secrets come from the environment and are never placed in error messages or logs.
"""
from __future__ import annotations

import json
import socket
import urllib.error
import urllib.request
from typing import Any, Dict, List, Mapping, Optional

from .errors import ProviderCallError, ProviderNotConfigured
from .text_utils import strip_reasoning

Message = Dict[str, str]


class ChatProvider:
    key: str = "base"
    display: str = "base"
    backing: str = ""
    model: str = ""

    def is_configured(self) -> bool:  # pragma: no cover - interface
        raise NotImplementedError

    def chat(self, messages: List[Message], *, temperature: float = 0.0, max_tokens: int = 900) -> str:  # pragma: no cover
        raise NotImplementedError

    @property
    def label(self) -> str:
        return f"{self.key}:{self.model}"


class OpenAICompatibleProvider(ChatProvider):
    def __init__(self, *, key: str, display: str, backing: str, base_url: str, model: str,
                 api_key: str = "", requires_key: bool = False, auth_header: str = "Authorization",
                 auth_scheme: str = "Bearer", timeout: float = 30.0, json_mode: bool = False,
                 extra_body: Optional[Mapping[str, Any]] = None):
        self.key, self.display, self.backing, self.model = key, display, backing, model
        self._base_url = (base_url or "").strip().rstrip("/")
        self._api_key = (api_key or "").strip()
        self._requires_key = requires_key
        self._auth_header, self._auth_scheme = auth_header, auth_scheme
        self._timeout = timeout
        self._json_mode = json_mode
        self._extra = dict(extra_body or {})

    def is_configured(self) -> bool:
        if not self._base_url.startswith(("http://", "https://")) or not self.model:
            return False
        return bool(self._api_key) or not self._requires_key

    def chat(self, messages: List[Message], *, temperature: float = 0.0, max_tokens: int = 900) -> str:
        if not self.is_configured():
            raise ProviderNotConfigured(f"{self.display} is not configured")
        body: Dict[str, Any] = {"model": self.model, "messages": messages,
                                "temperature": temperature, "max_tokens": max_tokens, **self._extra}
        if self._json_mode:
            body["response_format"] = {"type": "json_object"}
        headers = {"Content-Type": "application/json", "Accept": "application/json"}
        if self._api_key:
            headers[self._auth_header] = f"{self._auth_scheme} {self._api_key}".strip()
        request = urllib.request.Request(f"{self._base_url}/chat/completions",
                                         data=json.dumps(body).encode("utf-8"), headers=headers, method="POST")
        try:
            with urllib.request.urlopen(request, timeout=self._timeout) as response:
                payload = response.read()
        except urllib.error.HTTPError as exc:
            raise ProviderCallError(f"{self.display}: HTTP {exc.code}") from None
        except (urllib.error.URLError, socket.timeout, TimeoutError, ConnectionError, OSError) as exc:
            reason = "timed out" if isinstance(exc, (socket.timeout, TimeoutError)) or "timed out" in str(exc) \
                else "connection failed"
            raise ProviderCallError(f"{self.display}: {reason}") from None
        try:
            data = json.loads(payload.decode("utf-8"))
            choice = data["choices"][0]
            content = choice["message"]["content"]
        except (ValueError, KeyError, IndexError, TypeError):
            raise ProviderCallError(f"{self.display}: unexpected response format") from None
        if choice.get("finish_reason") == "length":
            raise ProviderCallError(f"{self.display}: answer was cut off (raise max_tokens)")
        if not isinstance(content, str) or not strip_reasoning(content):
            raise ProviderCallError(f"{self.display}: empty answer")
        return content


def _flag(env: Mapping[str, str], name: str) -> bool:
    return env.get(name, "").strip().lower() in ("1", "true", "yes", "on")


def _timeout(env: Mapping[str, str]) -> float:
    try:
        # sarvam-105b reasons before it answers; 30s frequently cut it off.
        return float(env.get("LUMO_LLM_TIMEOUT_SECONDS", "90"))
    except ValueError:
        return 90.0


def bharatgen_from_env(env: Mapping[str, str]) -> ChatProvider:
    return OpenAICompatibleProvider(
        key="bharatgen", display="BharatGen Param",
        backing="Government-funded (DST NM-ICPS, IndiaAI Mission compute)",
        base_url=env.get("BHARATGEN_BASE_URL", ""),
        model=env.get("BHARATGEN_MODEL", "bharatgenai/Param-1-2.9B-Instruct"),
        api_key=env.get("BHARATGEN_API_KEY", ""), requires_key=False,
        timeout=_timeout(env), json_mode=_flag(env, "BHARATGEN_JSON_MODE"))


def _chat_base(env: Mapping[str, str]) -> str:
    """Resolve the OpenAI-compatible chat root.

    SARVAM_BASE_URL is the API *root* (STT/TTS hang off it directly), so it must
    not be used as the chat base without its /v1 segment - that yields HTTP 404.
    """
    explicit = (env.get("SARVAM_CHAT_BASE_URL") or "").strip()
    if explicit:
        return explicit
    llm = (env.get("LLM_BASE_URL") or "").strip()
    if llm:
        return llm
    root = (env.get("SARVAM_BASE_URL") or "https://api.sarvam.ai").strip().rstrip("/")
    return root if root.endswith("/v1") else f"{root}/v1"


def sarvam_from_env(env: Mapping[str, str]) -> ChatProvider:
    return OpenAICompatibleProvider(
        key="sarvam", display="Sarvam",
        backing="Selected by the Government of India under the IndiaAI Mission (sovereign LLM)",
        base_url=_chat_base(env),
        # sarvam-30b is deprecated by the provider and returns HTTP 400.
        model=env.get("SARVAM_MODEL", env.get("LLM_MODEL", "sarvam-105b")),
        api_key=env.get("SARVAM_API_KEY", env.get("LLM_API_KEY", "")), requires_key=True,
        auth_header=env.get("SARVAM_AUTH_HEADER", "api-subscription-key"), auth_scheme="",
        timeout=_timeout(env), json_mode=_flag(env, "SARVAM_JSON_MODE"))
