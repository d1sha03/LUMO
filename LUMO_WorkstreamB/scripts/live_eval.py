"""Run cases.json against the REAL Sarvam API and print metrics.  Usage: python -m scripts.live_eval"""
import json
import re
import sys
from datetime import date
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from lumo_compiler.llm import SarvamExtractor  # noqa: E402
from lumo_compiler.pipeline import compile_text  # noqa: E402
from lumo_compiler.validate import iter_facts  # noqa: E402


def get(d, path):
    for t in re.findall(r"\[\d+\]|[^.\[\]]+", path):
        d = d[int(t[1:-1])] if t.startswith("[") else d[t]
    return d


def main():
    cases = json.loads((Path(__file__).parents[1] / "cases" / "cases.json").read_text())
    llm, rows = SarvamExtractor(), []
    for c in cases:
        r = {"id": c["id"], "fail": []}
        try:
            st = compile_text(c["text"], date.fromisoformat(c["today"]), llm=llm)
        except Exception as e:  # schema-invalid output after retries
            r["fail"].append(f"schema/call error: {e}")
            rows.append(r)
            continue
        ext, asked = st["extraction"], [q["field_path"] for q in st["questions"]]
        for p, want in c.get("expect_values", {}).items():
            try:
                ok = get(ext, p) == want
            except (IndexError, KeyError):
                ok = False
            if not ok:
                r["fail"].append(f"value {p} != {want}")
        for p, want in c.get("expect_fields", {}).items():
            try:
                ok = get(ext, p) == want
            except (IndexError, KeyError):
                ok = False
            if not ok:
                r["fail"].append(f"field {p} != {want}")
        for p in c.get("must_ask", []):
            if p not in asked:
                r["fail"].append(f"should have asked {p}")
        for p in c.get("must_not_ask", []):
            if p in asked:
                r["fail"].append(f"should NOT ask {p}")
        if c.get("expect_no_numbers") and any(f["value"] is not None for _, f in iter_facts(ext)):
            r["fail"].append("FALSE ASSUMPTION: invented a number")
        r["warnings"] = [w["code"] for w in st["warnings"]]
        rows.append(r)
    for r in rows:
        print(("PASS " if not r["fail"] else "FAIL ") + r["id"], r["fail"], r.get("warnings", ""))
    print(f"\n{sum(not r['fail'] for r in rows)}/{len(rows)} cases passed")


if __name__ == "__main__":
    main()
