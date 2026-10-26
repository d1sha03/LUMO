from datetime import date

import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


def test_health():
    r = client.get("/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_root_and_development_cors():
    assert client.get("/").json()["status"] == "ok"
    preflight = client.options(
        "/api/intelligence/analyze",
        headers={
            "Origin": "http://localhost:5173",
            "Access-Control-Request-Method": "POST",
        },
    )
    assert preflight.status_code == 200
    assert preflight.headers["access-control-allow-origin"] == "http://localhost:5173"


def test_narrative_intake_flows_into_workstream_e():
    narrative = (
        "Main Lucknow mein sabzi bechti hoon. Kabhi 1200 rupaye milte hain, kabhi 600. "
        "Ghar ka kharcha lagbhag 9000 hai aur har mahine 1500 ka loan dena padta hai. "
        "Mujhe teen mahine mein bachchon ki fees ke liye 15000 rupaye chahiye."
    )
    intake = client.post("/api/intake/compile", json={
        "text": narrative,
        "language": "hi-IN",
        "as_of_date": "2026-10-19",
    })
    assert intake.status_code == 200
    twin = intake.json()["draft_twin"]
    assert twin["goals"][0]["target_amount"] == 15000
    assert twin["goals"][0]["target_date"] == "2027-01-19"
    assert twin["cash_flows"] == []

    analysis = client.post("/api/intelligence/analyze", json={"financial_twin": twin})
    assert analysis.status_code == 200
    body = analysis.json()
    assert body["status"] == "ok"
    assert body["financial_profile"]["income"] is None
    assert body["financial_profile"]["expenses"] is None
    assert body["financial_profile"]["debts"] == []
    assert body["financial_profile"]["goals"][0]["amount"] == 15000
    assert body["stress_radar"]["status"]
    assert body["income_shock"]["status"]
    assert body["debt_warning"]["status"]
    assert body["goal_analysis"]["status"] == "insufficient_data"
    assert "Income information is needed" in body["goal_analysis"]["message"]
    assert body["true_earnings"]["status"]
    assert isinstance(body["actions"]["actions"], list)


def test_intake_clarification_reaches_workstream_e_and_returns_frontend_contract(no_llm, monkeypatch):
    from lumo_WorkstreamC.apps.api.app.llm import router as intake_router
    from lumo_WorkstreamC.apps.api.app.llm.gateway import LLMGateway

    monkeypatch.setattr(intake_router, "_gateway", LLMGateway())
    as_of = date.today().isoformat()
    initial_story = (
        "Main Lucknow mein sabzi bechti hoon. Kabhi 1200 rupaye milte hain, kabhi 600. "
        "Ghar ka kharcha lagbhag 9000 hai aur har mahine 1500 ka loan dena padta hai. "
        "Mujhe teen mahine mein bachchon ki fees ke liye 15000 rupaye chahiye."
    )
    initial = client.post("/api/intake/compile", json={
        "text": initial_story,
        "language": "hi-IN",
        "as_of_date": as_of,
    })
    assert initial.status_code == 200
    first_twin = initial.json()["draft_twin"]
    assert first_twin["goals"][0]["target_amount"] == 15000
    assert first_twin["cash_flows"] == []

    clarification = (
        "Meri roz ki ausat bikri 900 rupaye hai. Ghar ka kharcha har mahine 9000 rupaye 5 tareekh ko hota hai. "
        "Loan ki 1500 rupaye ki kist har mahine 10 tareekh ko deni hoti hai."
    )
    follow_up = client.post("/api/intake/compile", json={
        "text": clarification,
        "language": "hi-IN",
        "as_of_date": as_of,
        "existing_twin": first_twin,
    })
    assert follow_up.status_code == 200
    twin = follow_up.json()["draft_twin"]

    analysis = client.post(
        "/api/intelligence/analyze?explain=true",
        json={"financial_twin": twin},
    )
    assert analysis.status_code == 200
    body = analysis.json()
    profile = body["financial_profile"]
    assert profile["income"]["monthly_average"] == 900 * 26
    assert profile["expenses"]["essential_monthly"] == 9000
    assert profile["debts"][0]["monthly_payment"] == 1500
    assert profile["goals"][0]["amount"] == 15000
    assert profile["source_metadata"]["cash_flows"]
    assert body["stress_radar"]["status"]
    assert body["income_shock"]["preset_grid"]
    assert body["debt_warning"]["pressure_level"]
    assert body["goal_analysis"]["goals"]
    assert body["true_earnings"]["status"]
    assert isinstance(body["actions"]["actions"], list)
    assert body["explanation"]["source"] == "fallback_no_api_key"
    assert body["explanation"]["explanation"]


def test_bhashini_aliases_return_truthful_offline_fallback(monkeypatch):
    from app.bhashini import BhashiniError
    from app.main import bhashini

    async def unavailable(*args, **kwargs):
        raise BhashiniError("credentials are not configured")

    monkeypatch.setattr(bhashini, "translate", unavailable)
    monkeypatch.setattr(bhashini, "synthesize", unavailable)

    translation = client.post("/api/translate", json={
        "text": "Namaste", "source_language": "hi", "target_language": "en",
    })
    assert translation.status_code == 200
    assert translation.json()["translated"] is False
    assert translation.json()["provider"] == "offline_fallback"
    assert translation.json()["text"] == "Namaste"

    punjabi_translation = client.post("/api/translate", json={
        "text": "Namaste", "source_language": "en", "target_language": "pa",
    })
    assert punjabi_translation.status_code == 200
    assert punjabi_translation.json()["translated"] is False

    speech = client.post("/api/speech", json={"text": "Namaste", "language": "hi"})
    assert speech.status_code == 200
    assert speech.json()["audio_available"] is False
    punjabi_speech = client.post("/api/speech", json={"text": "Sat sri akal", "language": "pa"})
    assert punjabi_speech.status_code == 200
    assert punjabi_speech.json()["audio_available"] is False


def test_bhashini_does_not_fall_back_to_a_different_language_service(monkeypatch):
    import asyncio
    from app.bhashini import BhashiniClient, BhashiniError
    import app.bhashini as bhashini_module

    class FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "pipelineInferenceAPIEndPoint": {
                    "callbackUrl": "https://example.invalid/inference",
                    "inferenceApiKey": {"name": "key", "value": "hidden-test-value"},
                },
                "pipelineResponseConfig": [{
                    "taskType": "translation",
                    "config": [{
                        "language": {"sourceLanguage": "en", "targetLanguage": "hi"},
                        "serviceId": "hindi-only",
                    }],
                }],
            }

    class FakeClient:
        def __init__(self, **kwargs):
            pass

        async def __aenter__(self):
            return self

        async def __aexit__(self, *args):
            return None

        async def post(self, *args, **kwargs):
            return FakeResponse()

    monkeypatch.setattr(bhashini_module.httpx, "AsyncClient", FakeClient)
    client_instance = BhashiniClient()
    client_instance.user_id = "configured-user"
    client_instance.api_key = "configured-key"
    with pytest.raises(BhashiniError, match="matching"):
        asyncio.run(client_instance._configure("translation", "en", "pa"))


def test_llm_route_family_aliases():
    assert client.get("/api/llm/check").status_code == 200
    assert client.get("/api/v1/llm/check").status_code == 200


def test_glossary_has_terms():
    r = client.get("/api/v1/glossary")
    assert r.status_code == 200
    assert len(r.json()["items"]) >= 15


def test_explain_emergency_fund_hinglish(no_llm):
    r = client.post("/api/v1/explain", json={
        "question": "Emergency fund kya hota hai?", "language": "hinglish",
        "occupation": "street_vendor", "audio": False})
    assert r.status_code == 200
    body = r.json()
    assert body["term_id"] == "emergency_fund"
    assert body["explanation"] and body["source"] == "controlled_glossary"
    assert body["audio_available"] is False


@pytest.mark.parametrize(
    "term",
    [
        "projected_cash_shortfall",
        "debt_pressure",
        "cash_runway",
        "income_variability",
        "monthly_loan_payment",
        "true_earnings",
        "gross_sales",
        "net_operating_cash",
        "supplier_credit",
        "income_shock",
        "minimum_reserve",
    ],
)
@pytest.mark.parametrize("language", ["en", "hi", "pa"])
def test_samjho_term_contract_and_localized_fallback(term, language, no_llm):
    response = client.post("/api/explain", json={"term": term, "language": language})
    assert response.status_code == 200
    body = response.json()
    assert body["term_id"] == term
    assert body["language"] == language
    assert body["explanation"]
    assert body["source"] == "controlled_glossary"
    assert "audio_available" in body


def test_explain_accepts_the_legacy_frontend_payload(no_llm):
    response = client.post("/api/explain", json={
        "term_key": "projected_cash_shortfall",
        "context": {"shortfall_to_reserve": 500},
        "language": "hi-IN",
        "include_audio": False,
    })
    assert response.status_code == 200
    assert response.json()["term_id"] == "projected_cash_shortfall"
    assert response.json()["language"] == "hi"


def test_samjho_falls_back_when_sarvam_fails(monkeypatch, llm_on):
    from app import sarvam
    from app.sarvam import LLMError

    async def unavailable(*args, **kwargs):
        raise LLMError("provider outage")

    monkeypatch.setattr(sarvam, "chat", unavailable)
    response = client.post("/api/explain", json={
        "term": "projected_cash_shortfall",
        "language": "hi",
    })
    assert response.status_code == 200
    assert response.json()["source"] == "controlled_glossary"
    assert response.json()["explanation"]


def test_unknown_term_has_text_fallback():
    r = client.post("/api/v1/explain", json={"question": "Explain a concept that is not in this glossary", "language": "hi"})
    assert r.status_code == 200 and r.json()["explanation"]


def test_resources_filter(monkeypatch):
    from app import resources as resource_module

    async def retrieved(*args, **kwargs):
        return {
            "source_status": "source_retrieved",
            "source_page_title": "Official programme portal",
            "source_excerpt": "Official portal preview",
            "source_checked_at": "2026-05-15T00:00:00+00:00",
            "retrieved_content_kind": "html_page_metadata",
        }

    monkeypatch.setattr(resource_module, "_retrieve_source", retrieved)
    r = client.get("/api/v1/resources?occupation=vegetable%20vendor&state=Uttar%20Pradesh")
    assert r.status_code == 200
    items = r.json()["items"]
    assert items and all("official_url" in x for x in items)
    assert all(x["source_status"] == "source_retrieved" for x in items)
    assert all(x["source_checked_at"] == "2026-05-15T00:00:00+00:00" for x in items)
    assert all(x["verified_facts"] == [] for x in items)
    assert all(x["eligibility"]["verified"] is False for x in items)
    assert all(x["benefits"]["financial_benefit"] is None for x in items)
    assert all(x["match_status"] == "insufficient_information" for x in items)
    assert all(x["profile_context"]["occupation"] == "vegetable vendor" for x in items)
    assert all(x["profile_context"]["state_or_location"] == "Uttar Pradesh" for x in items)
    assert all("associates vegetable vendor with street_vendor" in x["match_reasons"][0] for x in items)
    assert all("have been extracted or verified" in x["eligibility_summary"] for x in items)
    unmatched = client.get("/api/resources?occupation=unknown_occupation")
    assert unmatched.status_code == 200
    assert unmatched.json()["items"]
    assert all(x["relevance_confidence"] == "unassessed" for x in unmatched.json()["items"])
    assert all(x["match_status"] == "not_supported_by_evidence" for x in unmatched.json()["items"])


def test_resource_url_allowlist_requires_https_and_exact_government_domain():
    from app.resources import _is_official_url

    assert _is_official_url("https://www.eshram.gov.in/")
    assert not _is_official_url("http://www.eshram.gov.in/")
    assert not _is_official_url("https://eshram.gov.in.attacker.example/")
    assert not _is_official_url("https://attacker.example/?next=eshram.gov.in")


def test_glossary_matching_is_whole_word_and_longest():
    # 'premium' contains 'emi'; 'seasonal income' contains 'income'
    assert client.post("/api/v1/explain", json={"question": "insurance premium kya hai", "language": "en"}).json()["term_id"] == "insurance_premium"
    assert client.post("/api/v1/explain", json={"question": "seasonal income kya hota hai", "language": "en"}).json()["term_id"] == "seasonal_income"
    assert client.post("/api/v1/explain", json={"question": "what is EMI", "language": "en"}).json()["term_id"] == "emi"


def test_explain_uses_llm_when_available(llm_on, monkeypatch):
    from app import sarvam

    async def fake(messages, **kw):
        assert "Requested language: Hindi" in messages[1]["content"]
        assert "\\n" not in messages[1]["content"]          # real newlines, not literal backslash-n
        return "सरल व्याख्या"
    monkeypatch.setattr(sarvam, "chat", fake)
    body = client.post("/api/v1/explain", json={"question": "emergency fund", "language": "hi"}).json()
    assert body["source"] == "sarvam_llm" and body["explanation"] == "सरल व्याख्या"


def test_explain_llm_failure_falls_back(llm_on, monkeypatch):
    from app import sarvam

    async def boom(messages, **kw):
        raise sarvam.LLMError("down")
    monkeypatch.setattr(sarvam, "chat", boom)
    body = client.post("/api/v1/explain", json={"question": "emergency fund", "language": "en"}).json()
    assert body["source"] == "controlled_glossary"


def test_ask_validation():
    assert client.post("/api/v1/ask", json={"question": "x", "language": "hi"}).status_code == 422
    assert client.post("/api/v1/ask", json={"question": "hello there", "language": "fr"}).status_code == 422
    assert client.post("/api/v1/ask", json={"question": "a" * 2001}).status_code == 422


def test_api_key_enforced(monkeypatch, kb, no_llm):
    from app import config
    monkeypatch.setattr(config, "API_KEY", "secret")
    q = {"question": "registration documents", "language": "en"}
    assert client.post("/api/v1/ask", json=q).status_code == 401
    assert client.post("/api/v1/ask", json=q, headers={"X-API-Key": "wrong"}).status_code == 401
    assert client.post("/api/v1/ask", json=q, headers={"X-API-Key": "secret"}).status_code == 200
    assert client.get("/health").status_code == 200          # public


def test_rate_limit(monkeypatch, kb, no_llm):
    from app import config
    monkeypatch.setattr(config, "RATE_LIMIT_PER_MINUTE", 3)
    q = {"question": "registration documents", "language": "en"}
    codes = [client.post("/api/v1/ask", json=q).status_code for _ in range(5)]
    assert codes[:3] == [200, 200, 200] and codes[3:] == [429, 429]


def test_status_and_llm_check(kb, llm_on, monkeypatch):
    from app import sarvam
    st = client.get("/api/v1/knowledge/status").json()
    assert st["chunks_loaded"] == 6 and st["ready_for_document_qa"] and st["llm_configured"]

    async def ok(messages, **kw):
        return "ready"
    monkeypatch.setattr(sarvam, "chat", ok)
    assert client.get("/api/v1/llm/check").json()["ok"] is True

    async def bad(messages, **kw):
        raise sarvam.LLMError("rejected the API key (HTTP 401)")
    monkeypatch.setattr(sarvam, "chat", bad)
    res = client.get("/api/v1/llm/check").json()
    assert res["ok"] is False and "401" in res["error"]


def test_empty_status_has_hint(empty_kb):
    st = client.get("/api/v1/knowledge/status").json()
    assert st["ready_for_document_qa"] is False and "hint" in st
