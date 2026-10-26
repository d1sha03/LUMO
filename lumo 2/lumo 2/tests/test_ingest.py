import importlib.util
import json
import sys
from pathlib import Path

import pytest

from app import knowledge

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location("ingest_docs", ROOT / "scripts" / "ingest_docs.py")
ingest = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ingest)

LONG = ("Registration on the e-Shram portal needs an Aadhaar linked mobile number. " * 6).strip()


def run(monkeypatch, *argv):
    monkeypatch.setattr(sys, "argv", ["ingest_docs.py", *argv])
    ingest.main()


def test_ingest_is_idempotent_and_has_metadata(empty_kb, tmp_path, monkeypatch, capsys):
    d = tmp_path / "docs"
    d.mkdir()
    (d / "faq.txt").write_text(LONG)
    (d / "sources.json").write_text(json.dumps({"faq.txt": {
        "source_url": "https://example.test/faq", "source_name": "Test Ministry",
        "title": "Test FAQ", "published": "2025-05-01", "fetched": "2026-10-01"}}))
    run(monkeypatch, str(d))
    first = knowledge.all_chunks()
    run(monkeypatch, str(d))                      # second run must not duplicate
    second = knowledge.all_chunks()
    assert len(first) == len(second) >= 1
    c = second[0]
    assert c["title"] == "Test FAQ" and c["source_url"] == "https://example.test/faq"
    assert c["published"] == "2025-05-01" and c["fetched"] == "2026-10-01" and c["document"] == "faq.txt"
    assert "sources.json" not in {x["document"] for x in second}
    assert "eshram" in c["keywords"]


def test_html_extraction_skips_scripts_and_reads_title(empty_kb, tmp_path, monkeypatch):
    f = tmp_path / "page.html"
    f.write_text("<html><head><title>My Page</title><script>var secret=1;</script></head>"
                 f"<body><nav>MENU</nav><p>{LONG}</p></body></html>")
    run(monkeypatch, str(f))
    chunks = knowledge.all_chunks()
    assert chunks[0]["title"] == "My Page"
    assert "secret" not in chunks[0]["text"] and "MENU" not in chunks[0]["text"]


def test_pdf_pages_are_recorded(empty_kb, tmp_path, monkeypatch):
    pytest.importorskip("pypdf")
    from pypdf import PdfWriter
    # build a 2-page PDF with text using reportlab if present, else skip
    reportlab = pytest.importorskip("reportlab.pdfgen.canvas")
    f = tmp_path / "guide.pdf"
    c = reportlab.Canvas(str(f))
    c.drawString(72, 750, "Page one: " + LONG[:90]); c.drawString(72, 730, LONG[:90]); c.showPage()
    c.drawString(72, 750, "Page two: pension scheme details " + LONG[:50]); c.drawString(72, 730, LONG[:90]); c.showPage()
    c.save()
    run(monkeypatch, str(f))
    assert {ch["page"] for ch in knowledge.all_chunks()} == {1, 2}


def test_empty_extraction_is_reported(empty_kb, tmp_path, monkeypatch, capsys):
    d = tmp_path / "d"
    d.mkdir()
    (d / "good.txt").write_text(LONG)
    (d / "shell.html").write_text("<html><body><script>app()</script></body></html>")
    run(monkeypatch, str(d))
    out = capsys.readouterr().out
    assert "shell.html" in out and "WARNING" in out
    assert {c["document"] for c in knowledge.all_chunks()} == {"good.txt"}


def test_clear_flag(kb, tmp_path, monkeypatch):
    f = tmp_path / "only.txt"
    f.write_text(LONG)
    run(monkeypatch, str(f), "--clear")
    assert {c["document"] for c in knowledge.all_chunks()} == {"only.txt"}


def test_hindi_chunks_flagged(empty_kb, tmp_path, monkeypatch):
    f = tmp_path / "hi.txt"
    f.write_text("ई-श्रम पोर्टल पर असंगठित श्रमिकों का पंजीकरण निःशुल्क है और आधार से जुड़ा मोबाइल नंबर आवश्यक है। " * 4)
    run(monkeypatch, str(f))
    assert knowledge.all_chunks()[0]["language"] == "hi"


def _load(name):
    s = importlib.util.spec_from_file_location(name, ROOT / "scripts" / f"{name}.py")
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    return m


def test_fetch_tries_fallback_urls(tmp_path, monkeypatch):
    import httpx
    fetch = _load("fetch_sources")
    (tmp_path / "sources.json").write_text(json.dumps({"faq.html": {
        "fetch_urls": ["https://bad.test/a", "https://good.test/b"], "source_url": "https://official.test/faq"}}))
    monkeypatch.setattr(fetch, "DOCS", tmp_path)
    monkeypatch.setattr(fetch, "SRC", tmp_path / "sources.json")

    def fake_get(url, **kw):
        if "bad" in url:
            raise httpx.ConnectError("nope")
        return httpx.Response(200, content=b"<html>ok</html>", request=httpx.Request("GET", url))
    monkeypatch.setattr(fetch.httpx, "get", fake_get)
    with pytest.raises(SystemExit) as e:
        fetch.main()
    assert e.value.code == 0
    assert (tmp_path / "faq.html").read_bytes() == b"<html>ok</html>"
    meta = json.loads((tmp_path / "sources.json").read_text())["faq.html"]
    assert meta["downloaded_from"] == "https://good.test/b" and meta["fetched"]


def test_export_finetune_data(kb, llm_on, tmp_path, monkeypatch):
    import asyncio
    from app import sarvam
    export = _load("export_finetune_data")

    async def fake(messages, **kw):
        return '```json\n[{"question": "Is registration free?", "answer": "Yes, per the passage."}, {"bad": 1}]\n```'
    monkeypatch.setattr(sarvam, "chat", fake)
    out = tmp_path / "train.jsonl"
    monkeypatch.setattr(sys, "argv", ["x", "--langs", "en,hi", "--per-chunk", "1", "--min-chars", "100", "--refusals", "2", "--out", str(out)])
    asyncio.run(export.main())
    rows = [json.loads(l) for l in out.read_text(encoding="utf-8").splitlines()]
    assert rows and all(r["meta"]["status"] == "needs_review" for r in rows)
    qa = [r for r in rows if r["meta"].get("type") != "refusal"]
    assert qa and qa[0]["meta"]["passage"] and qa[0]["messages"][1]["content"] == "Is registration free?"
    refusals = [r for r in rows if r["meta"].get("type") == "refusal"]
    assert len(refusals) == 4 and any("eshram.gov.in" in r["messages"][2]["content"] for r in refusals)


def test_parse_pairs_rejects_garbage():
    export = _load("export_finetune_data")
    assert export.parse_pairs("not json") == []
    assert export.parse_pairs('[{"question":"q","answer":"a"}]') == [("q", "a")]
