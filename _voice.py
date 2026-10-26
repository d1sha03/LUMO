"""Focused live re-run after the spoken-reserve fix: voice -> STT -> intake -> clarification -> simulate -> recommend."""
import json, pathlib
import httpx

BASE = "http://127.0.0.1:8000"
AS_OF = "2026-10-26"
OUT = pathlib.Path("E:/Downloads/LUMO/_e2e_out")
SCENARIOS = [
    {"scenario_id": "baseline", "label": "Current plan"},
    {"scenario_id": "shock", "label": "Income falls 40 percent for 10 days",
     "income_shock": {"category": "business_sales", "multiplier": 0.6, "duration_days": 10}},
]
R = []


def rec(step, ok, detail=""):
    R.append((step, bool(ok), str(detail)))
    print(f"{'PASS' if ok else 'FAIL'} | {step:34s} | {str(detail)[:230]}", flush=True)


def post(path, **kw):
    return httpx.post(BASE + path, timeout=600, **kw)


def prof(twin, key):
    return (twin.get("profile") or {}).get(key, twin.get(key))


def intake(text, language, existing=None):
    body = {"text": text, "language": language, "as_of_date": AS_OF}
    if existing:
        body["existing_twin"] = existing
    r = post("/api/intake/compile", json=body)
    return (r.json() if r.content else {}), r.status_code


def describe(b):
    t = b.get("draft_twin") or {}
    return (f"mode={b.get('mode')} provider={b.get('provider')} flows={len(t.get('cash_flows') or [])} "
            f"cash={prof(t, 'cash_on_hand')} reserve={prof(t, 'minimum_reserve')} "
            f"questions={len(b.get('questions_required') or [])}")


# ---- voice leg: real Saaras transcript of real Bulbul audio, then the full chain ----
wav = (OUT / "bulbul_hi-IN.wav").read_bytes()
stt = post("/api/stt", files={"file": ("mic.wav", wav, "audio/wav")}, data={"language": "hi-IN"}).json()
transcript = stt.get("transcript") or ""
rec("stt of provider audio", bool(transcript), f"detected={stt.get('language_code')} text={transcript[:90]!r}")
story = transcript + " घर का खर्च 6000 रुपये महीना है, हर महीने 1 तारीख को। मेरे पास 5000 रुपये नकद है और 3000 रुपये बचाना चाहती हूं।"
first, code = intake(story, "hi-IN")
twin = first.get("draft_twin") or {}
asked = [q.get("field") for q in (first.get("questions_required") or [])]
rec("voice -> twin", first.get("mode") == "live" and len(twin.get("cash_flows") or []) > 0,
    f"HTTP {code} {describe(first)} asked={asked} cats={[f.get('category') for f in (twin.get('cash_flows') or [])]}")
if asked:
    second, code2 = intake("घर का खर्च 6000 रुपये हर महीने 1 तारीख को है।", "hi-IN", existing=twin)
    twin = second.get("draft_twin") or twin
    rec("voice clarification round", second.get("mode") == "live", f"HTTP {code2} {describe(second)}")

if twin.get("cash_flows"):
    r = post("/api/finance/simulate", json={"twin": twin, "scenarios": SCENARIOS})
    if r.is_error:
        rec("voice -> simulation", False, f"HTTP {r.status_code} {r.text[:180]}")
    else:
        res = r.json().get("results") or []
        rec("voice -> simulation", len(res) == 2,
            f"min_balance={[x.get('minimum_balance') for x in res]} shortfall={[x.get('shortfall_to_reserve') for x in res]}")
        a = post("/api/intelligence/analyze?explain=true", json={"financial_twin": twin})
        ex = (a.json() or {}).get("explanation") or {} if a.content else {}
        rec("voice -> recommendation", ex.get("source") == "sarvam_llm" and bool(ex.get("explanation")),
            f"source={ex.get('source')} len={len(str(ex.get('explanation') or ''))} text={str(ex.get('explanation'))[:90]!r}")
        sp = post("/api/speech", json={"text": str(ex.get("explanation") or "")[:200], "language": "hi-IN"})
        audio = sp.content or b""
        rec("voice -> TTS reply audio", sp.status_code == 200 and len(audio) > 5000,
            f"HTTP {sp.status_code} bytes={len(audio)} provider={sp.headers.get('x-lumo-tts-provider')}")

# ---- code-mixed stability, three live attempts ----
MIXED = ("मैं लखनऊ में street food stall चलाता हूं। Daily sales लगभग 3200 रुपये होती हैं। "
         "Raw materials पर 1350 रुपये रोज़ लगते हैं। Monthly household खर्च 14000 रुपये है, हर महीने 6 तारीख को। "
         "मेरे पास 9500 रुपये cash है और 4000 रुपये reserve रखना चाहता हूं।")
ok = 0
for i in range(3):
    b, code = intake(MIXED, "hi-IN")
    t = b.get("draft_twin") or {}
    live = b.get("mode") == "live"
    ok += live
    rec(f"code-mixed attempt {i + 1}", live, f"HTTP {code} {describe(b)} "
        f"warnings={json.dumps(b.get('warnings'), ensure_ascii=False)[:200]}")
print(f"\ncode-mixed live {ok}/3", flush=True)
pathlib.Path("E:/Downloads/LUMO/_voice_out.json").write_text(
    json.dumps([{"step": s, "ok": o, "detail": d} for s, o, d in R], ensure_ascii=False, indent=1), encoding="utf-8")
