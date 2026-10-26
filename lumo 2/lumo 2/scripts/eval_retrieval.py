"""Measure retrieval quality on tests/eval_questions.json (no LLM needed).

  python scripts/eval_retrieval.py
Edit tests/eval_questions.json: add your own questions and words that a correct
passage should contain (expect_any), or "expect_none": true for out-of-scope questions.
"""
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app.knowledge import retrieve, all_chunks  # noqa: E402

if not all_chunks():
    raise SystemExit("Knowledge base is empty - ingest documents first.")
qs = json.loads((Path(__file__).resolve().parents[1] / "tests" / "eval_questions.json").read_text(encoding="utf-8"))
passed = 0
for item in qs:
    hits = retrieve(item["q"])
    blob = " ".join(h["text"].lower() for h in hits)
    ok = (not hits) if item.get("expect_none") else any(w.lower() in blob for w in item.get("expect_any", [])) and bool(hits)
    passed += ok
    top = f'{hits[0]["document"]} p{hits[0].get("page")} score={hits[0]["retrieval_score"]}' if hits else "no results"
    print(f'{"PASS" if ok else "FAIL"}  {item["q"]}\n      top: {top}')
print(f"\n{passed}/{len(qs)} passed")
