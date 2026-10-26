import asyncio
import httpx
import pytest
from fastapi.testclient import TestClient

from app import config, sarvam
from app.main import app
from app.pii import redact

client = TestClient(app)


def ask(q, lang="en"):
    return client.post("/api/v1/ask", json={"question": q, "language": lang}).json()


def test_no_documents_is_honest(empty_kb, no_llm):
    for lang in ("en", "hi", "hinglish", "pa"):
        r = ask("Who can register?", lang)
        assert r["mode"] == "no_retrieval" and r["sources"] == [] and "eshram.gov.in" in r["answer"]
        assert r["disclaimer"]


def test_retrieval_only_without_key(kb, no_llm):
    r = ask("registration documents")
    assert r["mode"] == "retrieval_only" and r["sources"][0]["document"] == "reg.txt"
    assert r["sources"][0]["page"] == 1 and r["sources"][0]["source_url"]


def test_sarvam_answer_and_bad_citations_removed(kb, llm_on, monkeypatch):
    seen = {}

    async def fake(messages, **kw):
        seen["system"], seen["user"] = messages[0]["content"], messages[1]["content"]
        return "You need Aadhaar and a bank account [1]. Another point [9]."
    monkeypatch.setattr(sarvam, "chat", fake)
    r = ask("registration documents", "en")
    assert r["mode"] == "sarvam_rag" and "[1]" in r["answer"] and "[9]" not in r["answer"]
    assert "ONLY the numbered source passages" in seen["system"] and "English" in seen["system"]
    assert "[1] Title: Registration guide" in seen["user"]


def test_hindi_question_is_translated_then_answered(kb, llm_on, monkeypatch):
    calls = []

    async def fake(messages, **kw):
        calls.append(messages[0]["content"])
        if "short English search query" in messages[0]["content"]:
            return "pension scheme contribution"
        return "उत्तर [1]"
    monkeypatch.setattr(sarvam, "chat", fake)
    r = ask("इसमें योगदान कितना देना होगा?", "hi")
    assert len(calls) == 2 and r["mode"] == "sarvam_rag"
    assert r["sources"][0]["document"] == "pen.txt"
    assert "Devanagari" in calls[1]


def test_sarvam_failure_is_visible_and_localised(kb, llm_on, monkeypatch):
    async def boom(messages, **kw):
        raise sarvam.LLMError("LLM HTTP 500")
    monkeypatch.setattr(sarvam, "chat", boom)
    r = ask("registration documents", "hinglish")
    assert r["mode"] == "retrieval_fallback" and "500" in r["llm_error"]
    assert "Official documents" in r["answer"] or "official documents" in r["answer"]
    assert r["sources"]


def test_translation_failure_still_uses_dictionary(kb, llm_on, monkeypatch):
    async def boom(messages, **kw):
        raise sarvam.LLMError("timeout")
    monkeypatch.setattr(sarvam, "chat", boom)
    r = ask("ई श्रम कार्ड के लाभ क्या हैं?", "hi")
    assert r["sources"] and r["sources"][0]["document"] == "ben.txt"
    assert r["mode"] == "retrieval_fallback"


def test_pii_never_reaches_llm(kb, llm_on, monkeypatch):
    seen = []

    async def fake(messages, **kw):
        seen.append(messages[-1]["content"])
        return "ok [1]"
    monkeypatch.setattr(sarvam, "chat", fake)
    ask("My Aadhaar 1234 5678 9012 phone 9876543210 registration documents", "en")
    joined = " ".join(seen)
    assert "1234" not in joined and "9876543210" not in joined and "[id-number]" in joined


def test_redact():
    assert redact("call 9876543210 or a@b.com, id 1234-5678-9012") == "call [phone] or [email], id [id-number]"


# ---- low level Sarvam client ----------------------------------------------
def _patch_http(monkeypatch, handler):
    real = httpx.AsyncClient
    monkeypatch.setattr(sarvam.httpx, "AsyncClient",
                        lambda **kw: real(transport=httpx.MockTransport(handler), **{k: v for k, v in kw.items() if k == "timeout"}))

    async def nosleep(_):
        return None
    monkeypatch.setattr(sarvam.asyncio, "sleep", nosleep)


def _resp(content, finish="stop"):
    return httpx.Response(200, json={"choices": [{"message": {"content": content}, "finish_reason": finish}]})


def test_chat_headers_and_think_stripping(llm_on, monkeypatch):
    captured = {}

    def handler(req):
        captured["h"] = req.headers
        captured["body"] = req.content
        return _resp("<think>secret reasoning</think>Final answer")
    _patch_http(monkeypatch, handler)
    out = asyncio.run(sarvam.chat([{"role": "user", "content": "hi"}]))
    assert out == "Final answer"
    assert captured["h"]["authorization"] == "Bearer test-key" and captured["h"]["api-subscription-key"] == "test-key"
    assert b"sarvam-105b" in captured["body"] and b"max_tokens" in captured["body"]


def test_key_not_sent_to_non_sarvam_host(monkeypatch):
    monkeypatch.setattr(config, "LLM_API_KEY", "k")
    monkeypatch.setattr(config, "LLM_BASE_URL", "http://localhost:1234/v1")
    monkeypatch.setattr(config, "LLM_MODEL", "local")
    seen = {}

    def handler(req):
        seen.update(req.headers)
        return _resp("hello")
    _patch_http(monkeypatch, handler)
    asyncio.run(sarvam.chat([{"role": "user", "content": "x"}]))
    assert "api-subscription-key" not in seen


def test_null_content_raises_clear_error(llm_on, monkeypatch):
    _patch_http(monkeypatch, lambda req: _resp(None, "length"))
    with pytest.raises(sarvam.LLMError, match="LLM_MAX_TOKENS"):
        asyncio.run(sarvam.chat([{"role": "user", "content": "x"}]))


def test_truncated_think_is_not_returned(llm_on, monkeypatch):
    _patch_http(monkeypatch, lambda req: _resp("<think>still reasoning and never finished", "length"))
    with pytest.raises(sarvam.LLMError):
        asyncio.run(sarvam.chat([{"role": "user", "content": "x"}]))


def test_auth_error_message(llm_on, monkeypatch):
    _patch_http(monkeypatch, lambda req: httpx.Response(401, json={"error": "no"}))
    with pytest.raises(sarvam.LLMError, match="API key"):
        asyncio.run(sarvam.chat([{"role": "user", "content": "x"}]))


def test_retry_then_success(llm_on, monkeypatch):
    monkeypatch.setattr(config, "LLM_RETRIES", 2)
    state = {"n": 0}

    def handler(req):
        state["n"] += 1
        return httpx.Response(503) if state["n"] < 3 else _resp("finally")
    _patch_http(monkeypatch, handler)
    assert asyncio.run(sarvam.chat([{"role": "user", "content": "x"}])) == "finally" and state["n"] == 3


def test_missing_key_raises(monkeypatch):
    monkeypatch.setattr(config, "LLM_API_KEY", "")
    with pytest.raises(sarvam.LLMError, match="LLM_API_KEY"):
        asyncio.run(sarvam.chat([{"role": "user", "content": "x"}]))
