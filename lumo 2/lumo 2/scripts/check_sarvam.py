"""Run this once with your real key to confirm Sarvam works end to end.

  python scripts/check_sarvam.py
"""
import asyncio
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from app import config, sarvam  # noqa: E402
from app.rag import answer_from_knowledge  # noqa: E402
from app.knowledge import summary  # noqa: E402


async def main():
    print(f"endpoint : {config.LLM_BASE_URL}\nmodel    : {config.LLM_MODEL}\nkey set  : {bool(config.LLM_API_KEY)}")
    if not sarvam.configured():
        raise SystemExit("\nSet LLM_API_KEY in .env first.")
    try:
        print("\n[1] basic call ->", await sarvam.chat([{"role": "user", "content": "Reply with the single word: ready"}],
                                                       temperature=0, max_tokens=600, timeout=60))
    except sarvam.LLMError as e:
        raise SystemExit(f"\n[1] FAILED: {e}")
    kb = summary()
    print(f"\n[2] knowledge base: {kb['chunks_loaded']} chunks in {len(kb['documents'])} documents")
    if not kb["chunks_loaded"]:
        raise SystemExit("    Empty. Run scripts/fetch_sources.py and scripts/ingest_docs.py documents/ first.")
    for lang, q in [("en", "Who can register on e-Shram?"), ("hi", "ई-श्रम कार्ड के लिए कौन से दस्तावेज़ चाहिए?"),
                    ("hinglish", "E-Shram card ke benefits kya hain?")]:
        r = await answer_from_knowledge(q, lang)
        print(f"\n[{lang}] {q}\n  mode={r['mode']} sources={len(r['sources'])} llm_error={r.get('llm_error')}\n  {r['answer'][:500]}")


asyncio.run(main())
