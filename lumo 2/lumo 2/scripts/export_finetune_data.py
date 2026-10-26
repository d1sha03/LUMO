"""Build a fine-tuning dataset (JSONL) from the ingested e-Shram documents.

  python scripts/export_finetune_data.py --per-chunk 2 --langs en,hi,hinglish --out finetune/eshram_train.jsonl

Sarvam (the model you call) is generating grounded question/answer pairs from each passage.
EVERY line is written with "status": "needs_review". Do not train on it until a person who knows
e-Shram has checked the answers against the source (the passage is stored in meta.passage).

Use: hand the reviewed file to Sarvam's custom-training team (sarvam.ai/products/model-training)
or to your own LoRA run on open weights. Keep RAG for facts; fine-tuning is for tone, language and
"say you don't know" behaviour - it is a poor way to store rules that change.
"""
import argparse
import asyncio
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app import sarvam  # noqa: E402
from app.knowledge import all_chunks  # noqa: E402
from app.rag import LANG_NAME, NO_ANSWER  # noqa: E402

TRAIN_SYSTEM = ("You are LUMO Samjho. Answer questions about India's e-Shram portal simply, using only verified "
                "official information. If you do not know, say so and point to https://eshram.gov.in/. "
                "Never say a person is eligible or approved.")
OFF_TOPIC = ["What is the capital of France?", "Which cricket team will win this year?",
             "Can you guarantee my loan will be approved?", "Tell me today's gold price.",
             "Will I definitely get money from the government?"]


def parse_pairs(text: str):
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    m = re.search(r"\[.*\]", text, flags=re.S)
    if not m:
        return []
    try:
        data = json.loads(m.group(0))
    except json.JSONDecodeError:
        return []
    return [(d["question"].strip(), d["answer"].strip()) for d in data
            if isinstance(d, dict) and isinstance(d.get("question"), str) and isinstance(d.get("answer"), str)
            and d["question"].strip() and d["answer"].strip()]


def record(q, a, meta):
    return {"messages": [{"role": "system", "content": TRAIN_SYSTEM},
                         {"role": "user", "content": q}, {"role": "assistant", "content": a}],
            "meta": {**meta, "status": "needs_review"}}


async def make_pairs(chunk, lang, n):
    system = (f"From the passage, write {n} different questions a worker might really ask, and answers that are fully "
              f"supported by the passage. Language: {LANG_NAME[lang]}. Answers: simple, under 80 words, no facts that are "
              "not in the passage. Output ONLY a JSON list like "
              '[{"question": "...", "answer": "..."}].')
    text = await sarvam.chat([{"role": "system", "content": system},
                              {"role": "user", "content": chunk["text"]}], temperature=0.3, max_tokens=2500, timeout=120)
    return parse_pairs(text)


async def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--per-chunk", type=int, default=2)
    ap.add_argument("--langs", default="en,hi,hinglish")
    ap.add_argument("--max-chunks", type=int, default=0, help="0 = all chunks")
    ap.add_argument("--min-chars", type=int, default=250)
    ap.add_argument("--refusals", type=int, default=5, help="off-topic 'not in the sources' examples per language")
    ap.add_argument("--out", default="finetune/eshram_train.jsonl")
    args = ap.parse_args()

    if not sarvam.configured():
        raise SystemExit("Set LLM_API_KEY in .env first.")
    langs = [l for l in args.langs.split(",") if l in LANG_NAME]
    chunks = [c for c in all_chunks() if len(c.get("text", "")) >= args.min_chars]
    if args.max_chunks:
        chunks = chunks[:args.max_chunks]
    if not chunks:
        raise SystemExit("No usable chunks. Ingest documents first (scripts/ingest_docs.py).")

    sem = asyncio.Semaphore(3)
    out_rows, failed = [], 0

    async def one(chunk, lang):
        nonlocal failed
        async with sem:
            try:
                pairs = await make_pairs(chunk, lang, args.per_chunk)
            except sarvam.LLMError as e:
                failed += 1
                print(f"  skip {chunk.get('id')} [{lang}]: {e}")
                return
        for q, a in pairs:
            out_rows.append(record(q, a, {
                "chunk_id": chunk.get("id"), "document": chunk.get("document"), "page": chunk.get("page"),
                "source_url": chunk.get("source_url"), "language": lang, "passage": chunk["text"]}))

    await asyncio.gather(*[one(c, l) for c in chunks for l in langs])
    for lang in langs:
        for q in OFF_TOPIC[:args.refusals]:
            out_rows.append(record(q, NO_ANSWER[lang], {"language": lang, "type": "refusal"}))

    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    with out.open("w", encoding="utf-8") as f:
        for row in out_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"\nWrote {len(out_rows)} examples to {out} ({failed} generation calls failed).")
    print("ALL rows are status=needs_review - have an expert check each answer against meta.passage before any training.")


if __name__ == "__main__":
    asyncio.run(main())
