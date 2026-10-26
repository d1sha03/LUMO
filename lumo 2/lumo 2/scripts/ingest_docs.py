"""Load official PDF / TXT / MD / HTML / JSON documents into the local knowledge base.

Usage:
  python scripts/ingest_docs.py documents/                 # everything in the folder
  python scripts/ingest_docs.py documents/faq.pdf --source-url https://... --published 2025-01-01
  python scripts/ingest_docs.py documents/ --clear         # wipe KB first, then ingest

Per-file metadata (source_url, source_name, title, published, keywords) is read from
documents/sources.json when present; command-line flags apply to files that have no entry.
Re-running is safe: chunks of a document are REPLACED, never duplicated.
"""
import argparse
import datetime
import hashlib
import json
import re
import sys
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.knowledge import replace_documents, clear_all  # noqa: E402
from app.textutil import tokens, has_devanagari  # noqa: E402

SUPPORTED = {".pdf", ".txt", ".md", ".html", ".htm", ".json"}
SKIP_NAMES = {"sources.json", "sources.example.json", "readme.md"}


class _Text(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "nav", "footer"}
    BLOCK = {"p", "div", "li", "br", "tr", "h1", "h2", "h3", "h4", "h5", "h6", "section", "article", "table"}

    def __init__(self):
        super().__init__()
        self.parts, self.title, self._skip, self._in_title = [], "", 0, False

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self._skip += 1
        elif tag == "title":
            self._in_title = True
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_endtag(self, tag):
        if tag in self.SKIP and self._skip:
            self._skip -= 1
        elif tag == "title":
            self._in_title = False
        elif tag in self.BLOCK:
            self.parts.append("\n")

    def handle_data(self, data):
        if self._in_title:
            self.title += data
        elif not self._skip:
            self.parts.append(data)


def _flatten_json(obj, prefix=""):
    if isinstance(obj, dict):
        for k, v in obj.items():
            yield from _flatten_json(v, f"{prefix}{k}: " if not isinstance(v, (dict, list)) else f"{prefix}{k} / ")
    elif isinstance(obj, list):
        for v in obj:
            yield from _flatten_json(v, prefix)
    elif obj not in (None, ""):
        yield f"{prefix}{obj}"


def read_pages(path: Path):
    """Return (detected_title, [(page_number_or_None, text), ...])."""
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        try:
            from pypdf import PdfReader
        except ImportError:
            raise RuntimeError("PDF ingestion needs pypdf. Run: pip install pypdf")
        reader = PdfReader(str(path))
        meta_title = (getattr(reader.metadata, "title", None) or "").strip() if reader.metadata else ""
        return meta_title or None, [(i + 1, p.extract_text() or "") for i, p in enumerate(reader.pages)]
    raw = path.read_text(encoding="utf-8", errors="ignore")
    if suffix in (".html", ".htm"):
        p = _Text()
        p.feed(raw)
        return (p.title.strip() or None), [(None, "".join(p.parts))]
    if suffix == ".json":
        try:
            return None, [(None, "\n".join(_flatten_json(json.loads(raw))))]
        except json.JSONDecodeError:
            return None, [(None, raw)]
    return None, [(None, raw)]


def chunk_text(text, size=1200, overlap=180):
    text = re.sub(r"[ \t\r\f\v]+", " ", text)
    text = re.sub(r"\n\s*\n+", "\n", text).replace("\n", " ").strip()
    chunks, start = [], 0
    while start < len(text):
        end = min(len(text), start + size)
        if end < len(text):
            boundary = max(text.rfind(". ", start + size // 2, end), text.rfind("। ", start + size // 2, end))
            if boundary > start:
                end = boundary + 1
        part = text[start:end].strip()
        if len(part) > 60:
            chunks.append(part)
        if end >= len(text):
            break
        start = max(start + 1, end - overlap)
    return chunks


def auto_keywords(text, n=8):
    counts = Counter(t for t in tokens(text) if len(t) > 3 and not t.isdigit())
    return [w for w, _ in counts.most_common(n)]


def load_sidecar(target: Path, explicit):
    candidates = [Path(explicit)] if explicit else [
        (target if target.is_dir() else target.parent) / "sources.json"]
    for c in candidates:
        if c.exists():
            try:
                data = json.loads(c.read_text(encoding="utf-8"))
                return data if isinstance(data, dict) else {}
            except json.JSONDecodeError as e:
                raise SystemExit(f"{c} is not valid JSON: {e}")
    return {}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("path", help="File or directory of official source documents")
    ap.add_argument("--source-url", default="", help="Official URL for files without a sources.json entry")
    ap.add_argument("--source-name", default="e-Shram / official government source")
    ap.add_argument("--published", default="", help="Publication/last-updated date of the document (YYYY-MM-DD)")
    ap.add_argument("--keywords", default="", help="Comma-separated extra keywords for these files")
    ap.add_argument("--sources-file", default="", help="Path to a sources.json (default: <folder>/sources.json)")
    ap.add_argument("--clear", action="store_true", help="Delete everything in the knowledge base first")
    args = ap.parse_args()

    target = Path(args.path)
    if not target.exists():
        raise SystemExit(f"Path not found: {target}")
    files = [target] if target.is_file() else sorted(
        p for p in target.rglob("*")
        if p.suffix.lower() in SUPPORTED and p.name.lower() not in SKIP_NAMES and not p.name.startswith("."))
    if not files:
        raise SystemExit("No supported documents found (pdf, txt, md, html, json).")
    sidecar = load_sidecar(target, args.sources_file)
    if args.clear:
        clear_all()
        print("Cleared existing knowledge base.")

    total, problems = 0, []
    for path in files:
        meta = sidecar.get(path.name, {})
        try:
            detected_title, pages = read_pages(path)
        except Exception as e:
            problems.append(f"{path.name}: could not read ({e})")
            continue
        full_text = " ".join(t for _, t in pages)
        if len(full_text.strip()) < 80:
            problems.append(f"{path.name}: almost no text extracted "
                            "(scanned PDF needs OCR, or the web page is JavaScript-rendered; save it as PDF/text instead)")
            continue
        title = meta.get("title") or detected_title or path.stem.replace("_", " ").replace("-", " ")
        extra_kw = [k.strip() for k in (meta.get("keywords") or args.keywords.split(",")) if isinstance(k, str) and k.strip()]
        keywords = list(dict.fromkeys(extra_kw + auto_keywords(full_text)))
        fetched = meta.get("fetched") or datetime.date.fromtimestamp(path.stat().st_mtime).isoformat()
        seen, records = set(), []
        for page_no, text in pages:
            for part in chunk_text(text):
                h = hashlib.sha1(part.encode("utf-8")).hexdigest()
                if h in seen:
                    continue
                seen.add(h)
                n = len(records) + 1
                records.append({
                    "id": f"{path.stem}-{n}", "title": title, "text": part,
                    "source_url": meta.get("source_url") or args.source_url or None,
                    "source_name": meta.get("source_name") or args.source_name,
                    "document": path.name, "page": page_no, "chunk": n,
                    "published": meta.get("published") or args.published or None,
                    "fetched": fetched, "language": "hi" if has_devanagari(part) else "en",
                    "keywords": keywords,
                })
        replace_documents(records)
        total += len(records)
        print(f"  {path.name}: {len(records)} chunks  (title: {title[:60]!r})")

    print(f"\nIngested {total} chunks from {len(files) - len(problems)} file(s).")
    for p in problems:
        print("  WARNING:", p)
    if total == 0:
        raise SystemExit("Nothing was ingested.")
    print("Next: open app/data/knowledge_base.json and spot-check text, then run scripts/eval_retrieval.py")


if __name__ == "__main__":
    main()
