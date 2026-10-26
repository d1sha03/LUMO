from app.textutil import normalize_text, tokens
from app.knowledge import retrieve


def top(q, **kw):
    hits = retrieve(q, **kw)
    return hits[0]["id"] if hits else None


def test_eshram_spelling_variants_normalise():
    for v in ["e-Shram", "eshram", "E Shram", "e_shram", "ई-श्रम", "ई श्रम", "ईश्रम", "e-shram"]:
        assert "eshram" in tokens(v), v


def test_aadhaar_variants():
    for v in ["aadhar", "Aadhaar", "adhar", "आधार"]:
        assert "aadhaar" in tokens(v)


def test_nukta_and_chandrabindu_folded():
    assert normalize_text("ज़रूरी") == normalize_text("जरूरी")
    assert normalize_text("माँ") == normalize_text("मां")


def test_english_query(kb):
    assert top("Which documents are needed for registration?") == "t-1"


def test_hinglish_query(kb):
    assert top("e-Shram registration ke liye kaun se documents chahiye?") == "t-1"
    assert top("eshram card ke fayde") == "t-2"


def test_hindi_query_against_english_docs(kb):
    assert top("ई-श्रम पर रजिस्ट्रेशन के लिए कौन से दस्तावेज़ चाहिए?") == "t-1"
    assert top("ई श्रम कार्ड के लाभ क्या हैं?") == "t-2"
    assert top("पेंशन योजना क्या है") == "t-3"
    assert top("हेल्पलाइन नंबर और शिकायत") == "t-4"


def test_extra_query_from_translation(kb):
    assert top("कोई सवाल", extra_queries=["pension scheme contribution"]) == "t-3"


def test_out_of_scope_returns_nothing(kb):
    assert retrieve("What is the capital of France?") == []
    assert retrieve("   ") == []


def test_empty_kb(empty_kb):
    assert retrieve("registration") == []


def test_tiny_corpus_still_answers(tmp_path, monkeypatch):
    import json
    from app import knowledge
    p = tmp_path / "one.json"
    p.write_text(json.dumps([{"id": "x", "title": "guide", "document": "g.txt", "chunk": 1,
                              "text": "Registration is free. A worker needs an Aadhaar linked mobile number and a bank account.",
                              "keywords": []}]))
    monkeypatch.setattr(knowledge, "KB_PATH", p)
    assert knowledge.retrieve("ई-श्रम रजिस्ट्रेशन के लिए कौन से दस्तावेज़ चाहिए?")
    assert knowledge.retrieve("Is registration free?")
    assert knowledge.retrieve("What is the capital of France?") == []
