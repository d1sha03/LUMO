"""Download the official sources listed in documents/sources.json (entries with "fetch_url" or a list "fetch_urls" tried in order).

Run this on your own machine (it needs internet access to the government sites):
  python scripts/fetch_sources.py
  python scripts/ingest_docs.py documents/

It saves each file under the name used as the key in sources.json and stamps the
download date. Government pages that render with JavaScript may download as an
empty shell; ingest_docs.py warns about those, and you should then save the page
as PDF or text by hand and drop it into documents/.
"""
import datetime
import json
import sys
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
DOCS = ROOT / "documents"
SRC = DOCS / "sources.json"
UA = {"User-Agent": "Mozilla/5.0 (LUMO-Samjho document fetcher; contact: your-email@example.com)"}


def main():
    if not SRC.exists():
        raise SystemExit(f"{SRC} not found. Copy documents/sources.example.json to documents/sources.json first.")
    data = json.loads(SRC.read_text(encoding="utf-8"))
    ok = bad = 0
    for name, meta in data.items():
        urls = meta.get("fetch_urls") or ([meta["fetch_url"]] if meta.get("fetch_url") else [])
        if not urls:
            continue
        r, url, last_err = None, None, None
        for candidate in urls:                      # try mirrors/fallbacks in order
            try:
                resp = httpx.get(candidate, headers=UA, timeout=60, follow_redirects=True)
                resp.raise_for_status()
                r, url = resp, candidate
                break
            except Exception as e:
                last_err = f"{type(e).__name__}: {e}"
                print(f"  tried   {candidate} -> {last_err}")
        if r is None:
            print(f"FAILED  {name}  (all {len(urls)} URL(s) failed; last: {last_err})")
            bad += 1
            continue
        ctype = r.headers.get("content-type", "")
        if name.lower().endswith(".pdf") and "pdf" not in ctype.lower() and not r.content.startswith(b"%PDF"):
            print(f"FAILED  {name}: server did not return a PDF ({ctype})")
            bad += 1
            continue
        (DOCS / name).write_bytes(r.content)
        meta["fetched"] = datetime.date.today().isoformat()
        meta.setdefault("source_url", url)
        meta["downloaded_from"] = url
        print(f"saved   {name}  ({len(r.content):,} bytes)")
        ok += 1
    SRC.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
    print(f"\n{ok} downloaded, {bad} failed.")
    sys.exit(1 if bad and not ok else 0)


if __name__ == "__main__":
    main()
