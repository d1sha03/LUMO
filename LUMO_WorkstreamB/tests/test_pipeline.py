import copy
import json
from datetime import date

import pytest

from lumo_compiler.patch import apply_patch
from lumo_compiler.pipeline import ExtractionError, compile_text, finalize
from lumo_compiler.prompts import EX1_IN, EX1_OUT, EX2_IN, EX2_OUT, FEWSHOT
from lumo_compiler.schema import Extraction, llm_json_schema

TODAY = date(2026, 10, 20)


def fake(out):
    return lambda text, today, feedback=None: json.dumps(out)


def test_fewshot_examples_are_schema_valid():
    for _, o in FEWSHOT:
        Extraction.model_validate(o)


def test_schema_has_no_refs():
    assert "$ref" not in json.dumps(llm_json_schema())


def test_fewshot_pass_span_check():
    for text, o in FEWSHOT:
        st = compile_text(text, TODAY, llm=fake(o))
        assert not [w for w in st["warnings"] if w["code"] == "unsupported_value"]


def test_ambiguous_income_asks_basis_then_resolves():
    st = compile_text(EX1_IN, TODAY, llm=fake(EX1_OUT))
    assert any(q["field_path"] == "income[0].basis" for q in st["questions"])
    ext = copy.deepcopy(st["extraction"])
    apply_patch(ext, "income[0].basis", "net_after_stock")
    st2 = finalize(ext, st["meta"]["normalized_text"], TODAY)
    assert not any(q["field_path"] == "income[0].basis" for q in st2["questions"])


def test_hallucinated_number_is_dropped():
    bad = copy.deepcopy(EX1_OUT)
    bad["cash_on_hand"] = {"value": 9999, "status": "stated", "source_span": "cash 9999"}
    st = compile_text(EX1_IN, TODAY, llm=fake(bad))
    assert st["extraction"]["cash_on_hand"]["value"] is None
    assert any(w["code"] == "unsupported_value" for w in st["warnings"])


def test_span_number_mismatch_is_dropped():
    bad = copy.deepcopy(EX1_OUT)
    bad["cash_on_hand"] = {"value": 900, "status": "stated", "source_span": "cash 800"}
    st = compile_text(EX1_IN, TODAY, llm=fake(bad))
    assert st["extraction"]["cash_on_hand"]["value"] is None


def test_interest_period_asked_and_due_date_resolved():
    st = compile_text(EX2_IN, TODAY, llm=fake(EX2_OUT))
    assert st["extraction"]["debts"][0]["due_date"] == "2026-10-26"
    paths = [q["field_path"] for q in st["questions"]]
    assert "debts[1].interest_period" in paths


def test_suspicious_income_triggers_confirm():
    text = "Main roz 150000 kamata hoon. Abhi cash 800 hai."
    bad = copy.deepcopy(EX1_OUT)
    bad["income"][0]["amount"] = {"value": 150000, "status": "stated", "source_span": "roz 150000"}
    st = compile_text(text, TODAY, llm=fake(bad))
    assert any(w["code"] == "suspicious_value" for w in st["warnings"])
    assert any(q["id"] == "income_confirm:0" for q in st["questions"] + [])


def test_retry_on_invalid_json():
    calls = []

    def flaky(text, today, feedback=None):
        calls.append(feedback)
        return "not json" if len(calls) == 1 else json.dumps(EX1_OUT)

    st = compile_text(EX1_IN, TODAY, llm=flaky)
    assert len(calls) == 2 and calls[1]
    assert st["extraction"]["cash_on_hand"]["value"] == 800


def test_gives_up_after_attempts():
    with pytest.raises(ExtractionError):
        compile_text(EX1_IN, TODAY, llm=lambda *a, **k: "nope")


def test_patch_validation():
    st = compile_text(EX1_IN, TODAY, llm=fake(EX1_OUT))
    ext = copy.deepcopy(st["extraction"])
    with pytest.raises(ValueError):
        apply_patch(ext, "income[0].basis", "banana")
    apply_patch(ext, "cash_on_hand", "dedh hazaar")
    assert ext["cash_on_hand"]["value"] == 1500


def test_api_roundtrip(monkeypatch):
    from fastapi.testclient import TestClient

    import lumo_compiler.api as api
    monkeypatch.setattr(api, "get_llm", lambda: fake(EX1_OUT))
    c = TestClient(api.app)
    r = c.post("/extract", json={"text": EX1_IN, "today": "2026-10-20"}).json()
    r2 = c.post("/answer", json={"state": r, "field_path": "income[0].basis", "value": "gross_sales"}).json()
    assert r2["extraction"]["income"][0]["basis"] == "gross_sales"
    assert c.get("/schema").status_code == 200
