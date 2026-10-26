"""Server-side clients for Sarvam chat, speech recognition, and speech synthesis."""
import asyncio
import base64
import binascii
import logging
import re

import httpx

from app import config

log = logging.getLogger("lumo.sarvam")


class LLMError(RuntimeError):
    pass


_provider_status = {
    name: {"reachable": None, "error": None}
    for name in ("sarvam_stt", "sarvam_llm", "sarvam_tts")
}


def api_key() -> str:
    """Resolve the server-side key. LLM_API_KEY is the documented alias of SARVAM_API_KEY."""
    return (config.SARVAM_API_KEY or config.LLM_API_KEY or "").strip()


def configured() -> bool:
    return bool(config.SARVAM_BASE_URL and config.LLM_MODEL and api_key())


def provider_status() -> dict:
    key_present = bool(api_key())
    configured_providers = {
        "sarvam_stt": key_present,
        "sarvam_llm": configured(),
        "sarvam_tts": key_present,
    }
    return {
        name: {
            "configured": configured_providers[name],
            "reachable": _provider_status[name]["reachable"],
            "status": (
                "reachable" if _provider_status[name]["reachable"] is True
                else "error" if _provider_status[name]["error"]
                else "configured" if configured_providers[name]
                else "not_configured"
            ),
            "error": _provider_status[name]["error"],
        }
        for name in configured_providers
    }


def _record_provider_result(name: str, error: str | None = None) -> None:
    _provider_status[name]["reachable"] = error is None
    _provider_status[name]["error"] = error


def _normalize_tag(language: str) -> str:
    """Accept 'hi', 'hi-IN' or 'hi_in' and return a canonical 'xx-IN' tag."""
    parts = re.split(r"[-_]", (language or "").strip())
    if len(parts) == 1:
        return f"{parts[0].lower()}-IN"
    return f"{parts[0].lower()}-{parts[1].upper()}"


def stt_language(language: str | None) -> str:
    """Map the requested language onto a code Saaras v4 accepts.

    Saaras rejects "auto"; its auto-detect value is "unknown", which also
    covers requests for languages we cannot resolve instead of 400ing.
    """
    if not language:
        return "unknown"
    if language.strip().lower() in ("auto", "unknown"):
        return "unknown"
    return config.SARVAM_STT_LANGUAGES.get(_normalize_tag(language).split("-")[0], "unknown")


def tts_language(language: str) -> str:
    """Resolve a Bulbul-capable language code, or raise. Never guess a speaker."""
    tag = _normalize_tag(language)
    if tag not in config.SARVAM_TTS_SPEAKERS:
        tag = config.SARVAM_STT_LANGUAGES.get(tag.split("-")[0], tag)
    if tag not in config.SARVAM_TTS_SPEAKERS:
        supported = ", ".join(sorted(config.SARVAM_TTS_SPEAKERS))
        message = f"Sarvam TTS has no configured speaker for '{language}'. Supported: {supported}."
        _record_provider_result("sarvam_tts", message)
        raise LLMError(message)
    return tag


def clean_output(text) -> str:
    """Strip reasoning traces some models put inside visible content."""
    if not isinstance(text, str):
        return ""
    text = re.sub(r"<think>.*?</think>", "", text, flags=re.S | re.I)
    text = re.sub(r"^.*?</think>", "", text, flags=re.S | re.I)
    text = re.sub(r"<think>.*$", "", text, flags=re.S | re.I)
    return text.strip()


def _chat_url() -> str:
    url = config.LLM_BASE_URL.rstrip("/")
    if not url.endswith("/chat/completions"):
        url += "/chat/completions"
    return url


def _headers(url: str) -> dict:
    key = api_key()
    headers = {"Content-Type": "application/json"}
    if "sarvam.ai" in url and key:
        # Sarvam's documented header; Authorization is sent for OpenAI-compatible gateways.
        headers["api-subscription-key"] = key
        headers["Authorization"] = f"Bearer {key}"
    return headers


def _status_message(service: str, status_code: int) -> str:
    if status_code in (401, 403):
        return (f"Sarvam {service} rejected the API key (HTTP {status_code}). "
                "Check SARVAM_API_KEY.")
    if status_code == 404:
        return f"Sarvam {service} endpoint not found (HTTP 404). Check SARVAM_BASE_URL and model name."
    if status_code == 429:
        return f"Sarvam {service} rate limit reached (HTTP 429)."
    return f"Sarvam {service} returned HTTP {status_code}."


async def chat(messages, *, temperature: float = 0.1, max_tokens: int | None = None,
               timeout: float | None = None) -> str:
    if not configured():
        message = ("SARVAM_API_KEY (or its alias LLM_API_KEY), the Sarvam endpoint and "
                   "LLM_MODEL must all be configured.")
        _record_provider_result("sarvam_llm", message)
        raise LLMError(message)
    url = _chat_url()
    body = {
        "model": config.LLM_MODEL,
        "messages": messages,
        "temperature": temperature,
        # sarvam-105b spends most of the budget reasoning before it writes anything visible, so a
        # caller's small "answer length" request is treated as an output hint with LLM_MAX_TOKENS as floor.
        "max_tokens": max(max_tokens or 0, config.LLM_MAX_TOKENS),
    }
    retries = max(0, config.LLM_RETRIES)
    for attempt in range(retries + 1):
        try:
            async with httpx.AsyncClient(timeout=timeout or config.SARVAM_TIMEOUT_SECONDS) as client:
                response = await client.post(url, headers=_headers(url), json=body)
        except httpx.TimeoutException as exc:
            if attempt < retries:
                await asyncio.sleep(1.5 * (attempt + 1))
                continue
            message = "Sarvam LLM request timed out."
            _record_provider_result("sarvam_llm", message)
            raise LLMError(message) from exc
        except httpx.TransportError as exc:
            if attempt < retries:
                await asyncio.sleep(1.5 * (attempt + 1))
                continue
            message = "Could not connect to Sarvam LLM."
            _record_provider_result("sarvam_llm", message)
            raise LLMError(message) from exc

        if response.status_code in (429, 500, 502, 503, 504) and attempt < retries:
            await asyncio.sleep(1.5 * (attempt + 1))
            continue
        if response.is_error:
            message = _status_message("LLM", response.status_code)
            _record_provider_result("sarvam_llm", message)
            raise LLMError(message)
        try:
            choice = response.json()["choices"][0]
            content = clean_output((choice.get("message") or {}).get("content"))
        except (KeyError, IndexError, ValueError, TypeError, AttributeError) as exc:
            message = f"Sarvam LLM returned an unexpected response shape ({type(exc).__name__})."
            _record_provider_result("sarvam_llm", message)
            raise LLMError(message) from exc
        if not content:
            message = (
                f"Sarvam LLM returned no visible text (finish_reason={choice.get('finish_reason')}); "
                "try increasing LLM_MAX_TOKENS."
            )
            _record_provider_result("sarvam_llm", message)
            raise LLMError(message)
        _record_provider_result("sarvam_llm")
        return content
    raise LLMError("Sarvam LLM call failed.")  # pragma: no cover


async def transcribe(audio: bytes, filename: str, content_type: str, language: str) -> dict:
    if not api_key():
        message = "SARVAM_API_KEY (or alias LLM_API_KEY) is not configured."
        _record_provider_result("sarvam_stt", message)
        raise LLMError(message)
    if not audio:
        message = "No audio bytes were received for transcription."
        _record_provider_result("sarvam_stt", message)
        raise LLMError(message)
    url = f"{config.SARVAM_BASE_URL.rstrip('/')}/speech-to-text"
    requested = stt_language(language)
    try:
        async with httpx.AsyncClient(timeout=config.SARVAM_TIMEOUT_SECONDS) as client:
            response = await client.post(
                url,
                headers={"api-subscription-key": api_key()},
                data={"model": config.SARVAM_STT_MODEL, "language_code": requested},
                files={"file": (filename, audio, content_type or "audio/wav")},
            )
    except httpx.TimeoutException as exc:
        message = "Sarvam STT request timed out."
        _record_provider_result("sarvam_stt", message)
        raise LLMError(message) from exc
    except httpx.TransportError as exc:
        message = "Could not connect to Sarvam STT."
        _record_provider_result("sarvam_stt", message)
        raise LLMError(message) from exc
    if response.is_error:
        message = _status_message("STT", response.status_code)
        _record_provider_result("sarvam_stt", message)
        raise LLMError(message)
    try:
        payload = response.json()
        transcript = payload["transcript"]
        detected_language = payload.get("language_code")
    except (ValueError, KeyError, TypeError) as exc:
        message = "Sarvam STT returned an unexpected response shape."
        _record_provider_result("sarvam_stt", message)
        raise LLMError(message) from exc
    if not isinstance(transcript, str) or not transcript.strip():
        message = "Sarvam STT returned an empty transcript."
        _record_provider_result("sarvam_stt", message)
        raise LLMError(message)
    _record_provider_result("sarvam_stt")
    return {
        "transcript": transcript.strip(),
        "language_code": detected_language if isinstance(detected_language, str) else None,
        "requested_language_code": requested,
        "provider": "sarvam",
        "model": config.SARVAM_STT_MODEL,
        "mode": "live",
    }


async def synthesize(text: str, language: str) -> bytes:
    if not api_key():
        message = "SARVAM_API_KEY (or alias LLM_API_KEY) is not configured."
        _record_provider_result("sarvam_tts", message)
        raise LLMError(message)
    tag = tts_language(language)
    url = f"{config.SARVAM_BASE_URL.rstrip('/')}/text-to-speech"
    body = {
        "text": text,
        "language_code": tag,
        "model": config.SARVAM_TTS_MODEL,
        "speaker": config.SARVAM_TTS_SPEAKERS[tag],
        "output_audio_codec": "wav",
        "speech_sample_rate": 22050,
    }
    try:
        async with httpx.AsyncClient(timeout=config.SARVAM_TIMEOUT_SECONDS) as client:
            response = await client.post(
                url,
                headers={
                    "api-subscription-key": api_key(),
                    "Content-Type": "application/json",
                },
                json=body,
            )
    except httpx.TimeoutException as exc:
        message = "Sarvam TTS request timed out."
        _record_provider_result("sarvam_tts", message)
        raise LLMError(message) from exc
    except httpx.TransportError as exc:
        message = "Could not connect to Sarvam TTS."
        _record_provider_result("sarvam_tts", message)
        raise LLMError(message) from exc
    if response.is_error:
        message = _status_message("TTS", response.status_code)
        _record_provider_result("sarvam_tts", message)
        raise LLMError(message)
    try:
        payload = response.json()
        encoded_audio = payload["audios"][0]
        audio = base64.b64decode(encoded_audio, validate=True)
    except (ValueError, KeyError, IndexError, TypeError, binascii.Error) as exc:
        message = "Sarvam TTS returned invalid or missing base64 audio."
        _record_provider_result("sarvam_tts", message)
        raise LLMError(message) from exc
    if not audio:
        message = "Sarvam TTS returned empty audio."
        _record_provider_result("sarvam_tts", message)
        raise LLMError(message)
    _record_provider_result("sarvam_tts")
    return audio
