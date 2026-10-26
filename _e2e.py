"""LUMO live E2E verification — real Sarvam STT/LLM/TTS calls through the running FastAPI app."""
import json, pathlib
import httpx

BASE = "http://127.0.0.1:8000"
OUT = pathlib.Path("E:/Downloads/LUMO/_e2e_out"); OUT.mkdir(exist_ok=True)
AS_OF = "2026-10-26"
R = []


def rec(step, ok, detail=""):
    R.append((step, bool(ok), str(detail)))
    print(f"{'PASS' if ok else 'FAIL'} | {step:36s} | {str(detail)[:240]}", flush=True)


def post(path, **kw):
    return httpx.post(BASE + path, timeout=600, **kw)


def prof(twin, key):
    return (twin.get("profile") or {}).get(key, twin.get(key))


NARR = {
    "hi-IN": ("मैं लखनऊ में सब्ज़ी बेचती हूं। रोज़ लगभग 800 रुपये कमाती हूं। हर रोज़ 500 रुपये माल पर लगते हैं। "
              "घर का खर्च 6000 रुपये महीना है और हर महीने 1 तारीख को देना है। मेरे पास 5000 रुपये नकद है और "
              "3000 रुपये बचाकर रखना चाहती हूं। अगले महीने 15 तारीख को बेटी की फीस 4000 रुपये जमा करनी है।"),
    "en-IN": ("I run a kiryana shop in Lucknow. Daily sales average 7800 rupees. Restocking costs 5300 rupees every day. "
              "Household essentials are 12000 rupees a month, payable on the 5th. I have 42000 rupees cash and want to "
              "keep 15000 as reserve. My business loan instalment is 5200 rupees monthly on the 10th."),
    "pa-IN": ("ਮੈਂ ਅੰਮ੍ਰਿਤਸਰ ਵਿੱਚ ਚਾਹ ਦੀ ਦੁਕਾਨ ਚਲਾਉਂਦਾ ਹਾਂ। ਰੋਜ਼ ਦੀ ਕਮਾਈ 1200 ਰੁਪਏ ਹੈ। ਰੋਜ਼ 700 ਰੁਪਏ ਸਾਮਾਨ ਉੱਤੇ ਲੱਗਦੇ ਹਨ। "
              "ਘਰ ਦਾ ਖਰਚ 6000 ਰੁਪਏ ਮਹੀਨਾ ਹੈ ਅਤੇ ਹਰ ਮਹੀਨੇ 1 ਤਾਰੀਖ਼ ਨੂੰ ਦੇਣਾ ਹੈ। ਮੇਰੇ ਕੋਲ 9000 ਰੁਪਏ ਨਕਦ ਹੈ ਅਤੇ "
              "3000 ਰੁਪਏ ਸੰਭਾਲਣਾ ਚਾਹੁੰਦਾ ਹਾਂ।"),
    # Hindi/English code-mixed, sent under the hi-IN contract locale
    "hi-IN-mixed|hi-IN": ("मैं लखनऊ में street food stall चलाता हूं। Daily sales लगभग 3200 रुपये होती हैं। "
                    "Raw materials पर 1350 रुपये रोज़ लगते हैं। Monthly household खर्च 14000 रुपये है, हर महीने 6 तारीख को। "
                    "मेरे पास 9500 रुपये cash है और 4000 रुपये reserve रखना चाहता हूं।"),
}
# Second statement that answers the clarifications the first pass asked for (the UI does the same
# by re-submitting with existing_twin, so unknown values stay unknown until the person confirms them).
ANSWER = {
    "hi-IN": "आपका सही है - घर का खर्च 6000 रुपये हर महीने 1 तारीख को देना है।",
    "en-IN": "To confirm: household essentials 12000 rupees are paid on the 5th of each month.",
    "pa-IN": ("ਪੁਸ਼ਟੀ ਕਰਦਾ ਹਾਂ: ਘਰ ਦਾ ਖਰਚ 6000 ਰੁਪਏ ਹਰ ਮਹੀਨੇ 1 ਤਾਰੀਖ਼ ਨੂੰ ਦੇਣਾ ਹੈ ਅਤੇ ਮੈਂ 3000 ਰੁਪਏ "
              "ਸੁਰੱਖਿਆ ਲਈ ਵੱਖ ਰੱਖਣਾ ਚਾਹੁੰਦਾ ਹਾਂ।"),
    "hi-IN-mixed": "Confirm करता हूं - household खर्च 14000 रुपये हर महीने 6 तारीख को देना है।",
}
PERSONAS = {
    "Small Farmer": ("I am a small wheat and vegetable farmer near Barabanki. During the selling season I receive about "
                     "12000 rupees from crop sales each week. Farm seed, fertilizer and irrigation cost about 9000 rupees a "
                     "month, paid on the 8th. Household needs about 13500 rupees a month, paid on the 3rd. I have 18000 "
                     "rupees cash and want to keep 7000 untouched. I owe an informal lender about 38000 rupees, the "
                     "instalment is 5000 rupees monthly paid on the 28th."),
    "Kiryana Shop Owner": NARR["en-IN"],
    "Street Food Vendor": ("I sell snacks from a street-food stall in Lucknow. Sales are usually around 3200 rupees a day. "
                           "Raw materials cost about 1350 rupees daily and stall fees plus transport cost 420 rupees daily. "
                           "Household essentials are around 14000 rupees a month on the 6th. Stall-cover repair costs 2800 "
                           "rupees once on the 29th. I have 9500 rupees cash and try to keep 4000 aside."),
}

SCENARIOS = [
    {"scenario_id": "baseline", "label": "Current plan"},
    {"scenario_id": "shock", "label": "Income falls 40 percent for 10 days",
     "income_shock": {"category": "business_sales", "multiplier": 0.6, "duration_days": 10}},
]


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
            f"goals={len(t.get('goals') or [])} questions={len(b.get('questions_required') or [])}")


twins = {}
# ---- 1-3, 5: typed Hindi / English / Punjabi + code-mixed through real Sarvam-105B, then the
#      clarification round the UI would run, then the deterministic simulation + recommendation ----
for key, text in NARR.items():
    label, language = key.split("|") if "|" in key else (key, key)
    first, code = intake(text, language)
    twin = first.get("draft_twin") or {}
    asked = [q.get("field") for q in (first.get("questions_required") or [])]
    rec(f"intake typed {label}", first.get("mode") == "live", f"HTTP {code} {describe(first)} asked={asked}")
    twins[label] = twin
    if asked:
        second, code2 = intake(ANSWER[label], language, existing=twin)
        merged = second.get("draft_twin") or twin
        still = [q.get("field") for q in (second.get("questions_required") or [])]
        grew = len(merged.get("cash_flows") or []) >= len(twin.get("cash_flows") or [])
        rec(f"clarification answer {label}", second.get("mode") == "live" and grew,
            f"HTTP {code2} {describe(second)} still_asked={still}")
        twins[label] = merged

    t = twins[label]
    if not t.get("cash_flows"):
        rec(f"simulate {label}", False, "twin has no dated cash flows")
    else:
        r = post("/api/finance/simulate", json={"twin": t, "scenarios": SCENARIOS})
        if r.is_error:
            rec(f"simulate {label}", False, f"HTTP {r.status_code} {r.text[:200]}")
        else:
            s = r.json()
            res = s.get("results") or []
            lows = [x.get("minimum_balance") for x in res]
            rec(f"simulate {label}", len(res) == 2 and all(v is not None for v in lows),
                f"scenarios={len(res)} labels={[x.get('label') for x in res]} min_balance={lows} "
                f"shortfall={[x.get('shortfall_to_reserve') for x in res]}")

    if not t.get("cash_flows"):
        rec(f"recommendation {label}", False, "no twin to analyse")
        continue
    r = post("/api/intelligence/analyze?explain=true", json={"financial_twin": t})
    if r.is_error:
        rec(f"recommendation {label}", False, f"HTTP {r.status_code} {r.text[:200]}")
        continue
    b = r.json()
    ex = b.get("explanation") or {}
    text_ = str(ex.get("explanation") or "")
    actions = b.get("actions") or []
    rec(f"recommendation {label}", ex.get("source") == "sarvam_llm" and bool(text_),
        f"source={ex.get('source')} llm_error={str(ex.get('llm_error'))[:80]!r} "
        f"actions={len(actions) if isinstance(actions, list) else 'n/a'} text={text_[:120]!r}")

# ---- 4, 10: real speech round-trip (provider audio -> Saaras v4) for hi/pa/en + auto-detect ----
WAVS, TTS_PROVIDER = {}, {}
for code, text in (("hi-IN", "नमस्ते, मेरी रोज़ की कमाई आठ सौ रुपये है और माल पर पाँच सौ रुपये लगते हैं."),
                   ("pa-IN", "ਸਤ ਸ੍ਰੀ ਅਕਾਲ। ਮੈਂ ਅੰਮ੍ਰਿਤਸਰ ਵਿੱਚ ਚਾਹ ਦੀ ਦੁਕਾਨ ਚਲਾਉਂਦਾ ਹਾਂ।"),
                   ("en-IN", "Hello, my daily income is eight hundred rupees and stock costs five hundred.")):
    s = post("/api/speech", json={"text": text, "language": code.split("-")[0]})
    if s.is_error or not s.headers.get("content-type", "").startswith("audio/"):
        rec(f"generate probe speech {code}", False, f"HTTP {s.status_code} {s.text[:120]}")
        continue
    WAVS[code] = s.content
    TTS_PROVIDER[code] = s.headers.get("x-lumo-tts-provider")
    r = post("/api/stt", files={"file": ("mic.webm", s.content, "audio/wav")}, data={"language": code})
    b = r.json() if not r.is_error else {}
    ok = not r.is_error and bool(b.get("transcript"))
    rec(f"STT saaras:v4 {code}", ok, f"HTTP {r.status_code} model={b.get('model')} detected={b.get('language_code')} "
                                    f"transcript={str(b.get('transcript'))[:90]!r}")

if WAVS.get("hi-IN"):
    r = post("/api/stt", files={"file": ("mic.webm", WAVS["hi-IN"], "audio/wav")}, data={"language": "unknown"})
    b = r.json() if not r.is_error else {}
    rec("STT auto-detect (language unknown)", bool(b.get("transcript")),
        f"HTTP {r.status_code} detected={b.get('language_code')} text={str(b.get('transcript'))[:70]!r}")

# full voice leg: transcript -> real intake -> twin
if WAVS.get("hi-IN"):
    tr = post("/api/stt", files={"file": ("mic.webm", WAVS["hi-IN"], "audio/wav")},
              data={"language": "hi-IN"}).json().get("transcript", "")
    story = tr + " घर का खर्च 6000 रुपये महीना है, हर महीने 1 तारीख को। मेरे पास 5000 रुपये नकद है और 3000 रुपये बचाना चाहती हूं।"
    b, code = intake(story, "hi-IN")
    t = b.get("draft_twin") or {}
    rec("VOICE -> STT -> LLM -> Twin", b.get("mode") == "live" and len(t.get("cash_flows") or []) > 0,
        f"HTTP {code} {describe(b)} flows={[f.get('category') for f in (t.get('cash_flows') or [])]}")
    if t.get("cash_flows"):
        sim = post("/api/finance/simulate", json={"twin": t, "scenarios": SCENARIOS})
        if sim.is_error:
            rec("VOICE -> ... -> simulation", False, f"HTTP {sim.status_code} {sim.text[:160]}")
        else:
            res = sim.json().get("results") or []
            rec("VOICE -> ... -> simulation", len(res) == 2,
                f"min_balance={[x.get('minimum_balance') for x in res]}")

# honesty: corrupt audio must NOT return a fabricated transcript
r = post("/api/stt", files={"file": ("mic.webm", b"definitely-not-audio", "audio/webm")}, data={"language": "hi-IN"})
body = r.json() if r.content else {}
rec("STT failure stays an error (no fake transcript)", r.status_code >= 400 and not body.get("transcript"),
    f"HTTP {r.status_code} status={body.get('status')} transcript={body.get('transcript')!r}")

# ---- 9: Bulbul TTS audio actually produced ----
for code in ("hi-IN", "en-IN", "pa-IN"):
    if code in WAVS:
        (OUT / f"bulbul_{code}.wav").write_bytes(WAVS[code])
        rec(f"TTS bulbul:v4-flash {code}", len(WAVS[code]) > 5000 and TTS_PROVIDER[code] == "sarvam_tts",
            f"bytes={len(WAVS[code])} rip={WAVS[code][:4]} provider={TTS_PROVIDER[code]}")

# ---- 11: three personas, same live pipeline, must differ ----
sig, expl = {}, {}
for name, text in PERSONAS.items():
    b, code = intake(text, "en-IN")
    t = b.get("draft_twin") or {}
    if b.get("mode") != "live" or not t.get("cash_flows"):
        rec(f"persona {name}", False, f"HTTP {code} {describe(b)}")
        continue
    sim = post("/api/finance/simulate", json={"twin": t, "scenarios": SCENARIOS})
    if sim.is_error:
        rec(f"persona {name}", False, f"simulate HTTP {sim.status_code} {sim.text[:160]}")
        continue
    res = sim.json().get("results") or []
    ana = post("/api/intelligence/analyze?explain=true", json={"financial_twin": t})
    ab = ana.json() if ana.content else {}
    explanation = str(((ab.get("explanation") or {}).get("text")
                       or (ab.get("explanation") or {}).get("explanation") or ""))
    expl[name] = explanation
    lows = [x.get("minimum_balance") for x in res]
    sig[name] = {"flows": len(t["cash_flows"]), "cash": prof(t, "cash_on_hand"), "lows": lows}
    rec(f"persona {name} live", len(res) == 2 and bool(explanation),
        f"flows={len(t['cash_flows'])} cash={prof(t, 'cash_on_hand')} cats={[f.get('category') for f in t['cash_flows']]} "
        f"min_balance={lows} expl_source={(ab.get('explanation') or {}).get('source')} len={len(explanation)}")

if len(sig) > 1:
    vals = {k: (v["cash"], v["flows"], tuple(v["lows"] or [])) for k, v in sig.items()}
    distinct = len(set(vals.values())) == len(vals)
    rec("personas produce DIFFERENT twins+simulations", distinct,
        f"fingerprints={ {k: (v[0], v[1], v[2]) for k, v in vals.items()} }")
if len(expl) > 1:
    rec("personas produce DIFFERENT recommendations", len(set(expl.values())) == len(expl),
        f"distinct={len(set(expl.values()))} of {len(expl)}")

# ---- 10: BHASHINI adapter live attempt. Must be real translation OR an explicit unavailable status ----
h = post("/api/v1/translate", json={"text": "I save money for school fees.", "source_language": "en",
                                   "target_language": "hi"})
hb = h.json() if h.content else {}
honest = (hb.get("translated") is True and hb.get("provider") == "bhashini") or (
    hb.get("translated") is False and hb.get("status") == "unavailable" and hb.get("text") == "I save money for school fees.")
rec("BHASHINI translate (real or honest error)", h.status_code == 200 and honest,
    f"HTTP {h.status_code} provider={hb.get('provider')} status={hb.get('status')} "
    f"translated={hb.get('translated')} msg={str(hb.get('message'))[:90]}")
rec("BHASHINI live inference", hb.get("provider") == "bhashini",
    f"provider={hb.get('provider')} status={hb.get('status')} (see _bhashini_probe.py for the HTTP evidence)")

print("\n===== providers/health =====")
print(json.dumps(httpx.get(BASE + "/api/providers/health", timeout=120).json(), ensure_ascii=False, indent=1)[:1600])

print("\n===== SUMMARY =====")
print(f"PASS {sum(1 for _, ok, _ in R if ok)}  FAIL {sum(1 for _, ok, _ in R if not ok)}")
for step, ok, detail in R:
    if not ok:
        print("  FAILED:", step, "->", detail[:220])
json.dump([{"step": s, "ok": ok, "detail": d} for s, ok, d in R],
          open(OUT / "results.json", "w", encoding="utf-8"), ensure_ascii=False, indent=1)
