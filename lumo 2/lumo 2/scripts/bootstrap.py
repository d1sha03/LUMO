"""One command to load e-Shram data and prove the pipeline works.

  python scripts/bootstrap.py

Steps: download official sources -> ingest -> retrieval eval -> live Sarvam check (if key set).
Stops with a clear message if the knowledge base ends up empty.
"""
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
PY = sys.executable


def run(label, *args, allow_fail=False):
    print(f"\n=== {label} ===", flush=True)
    code = subprocess.call([PY, *args], cwd=ROOT)
    if code and not allow_fail:
        raise SystemExit(f"\nStopped at: {label}")
    return code


run("1/4 Download official sources", "scripts/fetch_sources.py", allow_fail=True)
run("2/4 Ingest documents", "scripts/ingest_docs.py", "documents/")
run("3/4 Retrieval quality check", "scripts/eval_retrieval.py", allow_fail=True)
run("4/4 Live Sarvam check", "scripts/check_sarvam.py", allow_fail=True)
print("\nDone. If step 1 or 2 reported empty pages, save those pages as PDF/text into documents/ and re-run.")
