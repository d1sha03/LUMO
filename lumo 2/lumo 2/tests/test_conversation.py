from fastapi.testclient import TestClient

from app import sarvam
from app.main import app

client = TestClient(app)


def test_contextual_chat_uses_sarvam_and_bhashini_without_calculating(monkeypatch):
    from app import main

    monkeypatch.setattr(sarvam, "configured", lambda: True)
    seen = {}

    async def fake_chat(messages, **kwargs):
        seen["system"] = messages[0]["content"]
        seen["prompt"] = messages[1]["content"]
        return "Review the official scheme portal and protect your fee savings."

    async def fake_resources(*args, **kwargs):
        return {"items": [{
            "id": "candidate",
            "title": "Official programme",
            "official_url": "https://example.gov.in/programme",
            "source_status": "source_unavailable",
            "relevance_confidence": "unassessed",
            "why_relevant": "Occupation directory match only.",
            "eligibility_summary": "Not verified.",
            "benefit_summary": "Not verified.",
            "requirements_to_verify": [],
            "source_name": "Government portal",
            "relevance_basis": "Occupation only.",
            "disclaimer": "Not verified.",
        }]}

    async def fake_translate(text, source, target):
        seen["translation"] = (source, target)
        return "ਸਰਕਾਰੀ ਪੋਰਟਲ ਵੇਖੋ।"

    monkeypatch.setattr(sarvam, "chat", fake_chat)
    monkeypatch.setattr(main, "get_resources", fake_resources)
    monkeypatch.setattr(main.bhashini, "translate", fake_translate)
    response = client.post("/api/v1/ask", json={
        "question": "Mere paas school fees ke liye paise kam pad sakte hain, kya karun?",
        "language": "pa",
        "occupation": "street_vendor",
        "financial_context": {
            "workstream_e": {
                "stress_radar": {"level": "high"},
                "goal_analysis": {"goal": "school fees", "amount": 15000},
            },
        },
    })

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "sarvam_chat"
    assert body["provider"] == "sarvam"
    assert body["language_provider"] == "bhashini"
    assert body["answer"] == "ਸਰਕਾਰੀ ਪੋਰਟਲ ਵੇਖੋ।"
    assert body["scheme_candidates"][0]["source_status"] == "source_unavailable"
    assert "Never calculate or alter financial values" in seen["system"]
    assert '"level": "high"' in seen["prompt"]
    assert seen["translation"] == ("en", "pa")


def test_contextual_chat_falls_back_safely_without_sarvam(monkeypatch):
    from app import main

    monkeypatch.setattr(sarvam, "configured", lambda: False)

    async def no_resources(*args, **kwargs):
        return {"items": []}

    monkeypatch.setattr(main, "get_resources", no_resources)
    response = client.post("/api/v1/ask", json={
        "question": "What should I do about my financial situation?",
        "language": "hi",
        "financial_context": {"cash_available": 0},
    })
    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "safe_offline"
    assert body["provider"] == "safe_offline"
    assert "Sarvam" in body["answer"]
    assert body["sources"] == []


def test_contextual_offline_answer_uses_workstream_results_and_unverified_sources(monkeypatch):
    from app import main

    monkeypatch.setattr(sarvam, "configured", lambda: False)

    async def no_resources(*args, **kwargs):
        return {"items": [{
            "id": "pmsvanidhi",
            "title": "PM SVANidhi",
            "official_url": "https://pmsvanidhi.mohua.gov.in/",
            "source_status": "source_retrieved",
            "match_status": "insufficient_information",
            "verified_facts": [],
        }]}

    async def no_translation(*args, **kwargs):
        raise RuntimeError("Bhashini is not configured")

    monkeypatch.setattr(main, "get_resources", no_resources)
    monkeypatch.setattr(main.bhashini, "translate", no_translation)
    response = client.post("/api/v1/ask", json={
        "question": "Mere paas school fees ke liye paise kam pad sakte hain, kya karun?",
        "language": "hi",
        "financial_context": {
            "financial_profile": {
                "user": {"name": "private-name"},
                "goals": [{"name": "School fees", "current_savings": None}],
            },
            "workstream_e": {
                "stress_radar": {"level": "high", "explanation": "Cash flow is under pressure."},
                "goal_analysis": {"goals": [{
                    "goal_name": "School fees",
                    "goal_amount": 15000,
                    "current_savings": 1000,
                    "recommended_safe_path": {
                        "approach": "Use the weak-income path",
                        "rationale": "The timeline is uncertain.",
                    },
                }]},
                "actions": {"actions": [{"title": "Review upcoming fees", "description": "Check the due date."}]},
            },
        },
    })

    assert response.status_code == 200
    body = response.json()
    assert body["mode"] == "safe_offline"
    assert body["provider"] == "safe_offline"
    assert "Workstream E stress assessment: high" in body["answer"]
    assert "School fees, target ₹15,000" in body["answer"]
    assert "Use the weak-income path" in body["answer"]
    assert "Review upcoming fees" in body["answer"]
    assert "current savings" not in body["answer"]
    assert "योजना की पात्रता" in body["answer"]
    assert "private-name" not in body["answer"]
    assert body["sources"] == [{
        "title": "PM SVANidhi",
        "url": "https://pmsvanidhi.mohua.gov.in/",
        "source_status": "source_retrieved",
        "source_type": "unverified_directory_candidate",
    }]


def test_contextual_chat_provider_failure_uses_deterministic_fallback(monkeypatch):
    from app import main

    monkeypatch.setattr(sarvam, "configured", lambda: True)

    async def failing_chat(*args, **kwargs):
        raise sarvam.LLMError("timeout")

    async def no_resources(*args, **kwargs):
        return {"items": []}

    monkeypatch.setattr(sarvam, "chat", failing_chat)
    monkeypatch.setattr(main, "get_resources", no_resources)
    response = client.post("/api/v1/ask", json={
        "question": "What does my debt pressure look like?",
        "language": "en",
        "financial_context": {
            "workstream_e": {
                "debt_risk": {
                    "pressure_level": "high",
                    "total_monthly_payment": 1500,
                },
            },
        },
    })

    assert response.status_code == 200
    body = response.json()
    assert body["provider"] == "safe_offline"
    assert "debt assessment: high" in body["answer"]
    assert "total monthly payment ₹1,500" in body["answer"]
