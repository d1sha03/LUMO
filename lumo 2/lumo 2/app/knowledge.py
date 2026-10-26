"""Local retrieval layer (BM25) over chunks in the knowledge-base JSON file.

Chunks are created by scripts/ingest_docs.py. Retrieval handles spelling
variants (e-Shram/eshram/ई-श्रम), Hindi/Hinglish query expansion, and
optional extra English queries (e.g. an LLM translation of the question).
"""
import json
import math
import os
import tempfile
from collections import Counter
from pathlib import Path

from app import config
from app.textutil import tokens, expand_tokens

KB_PATH = Path(config.KB_PATH)
_K1, _B = 1.5, 0.75
_cache = {"key": None, "chunks": [], "index": None}


def _read_chunks():
    if not KB_PATH.exists():
        return []
    try:
        data = json.loads(KB_PATH.read_text(encoding="utf-8"))
        return [c for c in data if isinstance(c, dict) and c.get("text")]
    except (OSError, json.JSONDecodeError):
        return []


def _stat_key():
    try:
        st = KB_PATH.stat()
        return (str(KB_PATH), st.st_mtime_ns, st.st_size)
    except OSError:
        return (str(KB_PATH), None, None)


def _build_index(chunks):
    docs, df = [], Counter()
    for c in chunks:
        kw = " ".join(c.get("keywords", []))
        title = c.get("title", "")
        toks = tokens(title) * 3 + tokens(kw) * 3 + tokens(c.get("text", ""))
        tf = Counter(toks)
        docs.append((tf, len(toks)))
        df.update(tf.keys())
    n = len(docs)
    avg = (sum(length for _, length in docs) / n) if n else 0
    return {"docs": docs, "df": df, "n": n, "avg": avg or 1}


def _load():
    key = _stat_key()
    if _cache["key"] != key:
        chunks = _read_chunks()
        _cache.update(key=key, chunks=chunks, index=_build_index(chunks))
    return _cache["chunks"], _cache["index"]


def all_chunks():
    return list(_load()[0])


def retrieve(question: str, limit: int | None = None, extra_queries=None, min_score: float | None = None):
    limit = limit or config.RETRIEVAL_LIMIT
    min_score = config.RETRIEVAL_MIN_SCORE if min_score is None else min_score
    chunks, idx = _load()
    if not chunks:
        return []

    weights = Counter()
    base = tokens(question)
    for t in base:
        weights[t] += 1.0
    for extra in (extra_queries or []):
        for t in tokens(extra):
            weights[t] = max(weights[t], 1.0)
    for t in expand_tokens(list(weights)):
        if t not in weights:
            weights[t] = 0.6
    if not weights:
        return []

    scored = []
    n, avg = idx["n"], idx["avg"]
    # BM25 scores are small on tiny corpora, so scale the threshold up to 20 chunks.
    min_score = min_score * min(1.0, n / 20)
    for chunk, (tf, length) in zip(chunks, idx["docs"]):
        score = 0.0
        for term, w in weights.items():
            f = tf.get(term)
            if not f:
                continue
            df = idx["df"][term]
            idf = math.log(1 + (n - df + 0.5) / (df + 0.5))
            score += w * idf * (f * (_K1 + 1)) / (f + _K1 * (1 - _B + _B * length / avg))
        if score >= min_score:
            scored.append((score, chunk))
    scored.sort(key=lambda x: x[0], reverse=True)
    return [dict(c, retrieval_score=round(s, 2)) for s, c in scored[:limit]]


def write_chunks(chunks):
    KB_PATH.parent.mkdir(parents=True, exist_ok=True)
    fd, tmp = tempfile.mkstemp(dir=str(KB_PATH.parent), suffix=".tmp")
    try:
        with os.fdopen(fd, "w", encoding="utf-8") as f:
            json.dump(chunks, f, ensure_ascii=False, indent=1)
        os.replace(tmp, KB_PATH)
    finally:
        if os.path.exists(tmp):
            os.unlink(tmp)


def replace_documents(new_chunks):
    """Insert chunks; any existing chunks from the same document are replaced
    (so re-running ingestion never creates duplicates)."""
    names = {c.get("document") for c in new_chunks}
    kept = [c for c in _read_chunks() if c.get("document") not in names]
    write_chunks(kept + new_chunks)
    return len(new_chunks)


def add_document_chunks(chunks):  # backwards-compatible name
    return replace_documents(chunks)


def clear_all():
    write_chunks([])


def summary():
    chunks = _read_chunks()
    docs = {}
    for c in chunks:
        d = docs.setdefault(c.get("document", "?"), {
            "document": c.get("document"), "title": c.get("title"), "chunks": 0,
            "source_url": c.get("source_url"), "published": c.get("published"),
            "fetched": c.get("fetched"),
        })
        d["chunks"] += 1
    return {"chunks_loaded": len(chunks), "documents": sorted(docs.values(), key=lambda d: d["document"] or "")}
