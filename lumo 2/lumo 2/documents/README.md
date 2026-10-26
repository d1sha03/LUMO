# Source documents

1. `sources.json` lists official pages/PDFs to download (copy of `sources.example.json`). Edit it freely:
   add your own entries, each keyed by the filename to save as.
2. `python scripts/fetch_sources.py` downloads them (run on your own machine / network).
3. `python scripts/ingest_docs.py documents/` turns them into searchable chunks.

You can also drop any official PDF / TXT / MD / HTML / JSON file in this folder by hand and add a
`sources.json` entry for it (so answers cite the right URL, title and date):

```json
"my_file.pdf": {"source_url": "https://...", "source_name": "Ministry of Labour and Employment",
                "title": "Operational guidelines", "published": "2024-03-01"}
```

Never put worker records, Aadhaar numbers or phone numbers in this folder.
Government pages built with JavaScript can download as an empty shell - the ingest script warns
when that happens; save such a page as PDF/text from your browser instead.
