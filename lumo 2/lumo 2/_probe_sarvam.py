"""Scratch live probe: verify Sarvam LLM / TTS / STT and discover real request+response shapes."""
import asyncio, json, os, sys, wave
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")

import httpx

KEY = os.environ["SARVAM_API_KEY"]
H = {"api-subscription-key": KEY}
HJ = {**H, "Content-Type": "application/json"}
TIMEOUT = 90.0


def show(label, ok, detail):
    print(f"{'PASS' if ok else 'FAIL'} | {label} | {detail}")


async def probe_llm(client):
    for model in ("sarvam-105b", "sarvam-30b", "sarvam-m"):
        try:
            r = await client.post("https://api.sarvam.ai/v1/chat/completions", headers=HJ, json={
                "model": model,
                "messages": [{"role": "user", "content": "Reply with exactly the word: ready"}],
                "max_tokens": 600, "temperature": 0,
            })
            if r.is_error:
                show(f"LLM {model}", False, f"HTTP {r.status_code} {r.text[:200]}")
                continue
            d = r.json()
            c = (d.get("choices") or [{}])[0]
            msg = c.get("message") or {}
            show("LLM " + model, True,
                 f"content={json.dumps(msg.get('content'), ensure_ascii=False)[:120]!r} "
                 f"finish={c.get('finish_reason')} reasoning={'yes' if msg.get('reasoning_content') else 'no'} "
                 f"keys={sorted(d.keys())}")
        except Exception as e:
            show("LLM " + model, False, f"{type(e).__name__}: {e}")


async def probe_tts(client):
    for model in ("bulbul:v4-flash", "bulbul:v2", "bulbul:v1"):
        speakers = {"bulbul:v4-flash": ["shubh_enhi_ads", "shubh_hi_ads", "anand_pa_conversation", "manogna"],
                    "bulbul:v2": ["manogna", "vinayak"], "bulbul:v1": ["anushka"]}[model]
        for spk in speakers:
            try:
                r = await client.post("https://api.sarvam.ai/text-to-speech", headers=HJ, json={
                    "inputs": ["namaste, aap kaise hain?"], "language_code": "hi-IN",
                    "speaker": spk, "model": model,
                })
                if r.is_error:
                    show(f"TTS {model}/{spk}", False, f"HTTP {r.status_code} {r.text[:180]}")
                    continue
                d = r.json()
                aud = d.get("audios") or []
                show(f"TTS {model}/{spk}", bool(aud),
                     f"top_keys={sorted(d.keys())} n_audios={len(aud)} "
                     f"b64len={len(aud[0]) if aud else 0} splice={d.get('splice')!r}")
                if aud:
                    return d
            except Exception as e:
                show(f"TTS {model}/{spk}", False, f"{type(e).__name__}: {e}")
    return None


async def probe_tts_single_field(client):
    """main.py currently sends {text,...} not {inputs:[...]}; check which shape the API accepts."""
    r = await client.post("https://api.sarvam.ai/text-to-speech", headers=HJ, json={
        "text": "namaste", "language_code": "hi-IN", "model": "bulbul:v4-flash",
        "speaker": "shubh_hi_ads", "output_audio_codec": "wav", "speech_sample_rate": 22050,
    })
    show("TTS single-field shape", not r.is_error, f"HTTP {r.status_code} {r.text[:200]}")


async def probe_stt(client, wav_path):
    raw = Path(wav_path).read_bytes()
    for model in ("saaras:v4", "saaras:v3"):
        for extra in ({}, {"timestamps": True}):
            try:
                files = {"file": ("probe.wav", raw, "audio/wav")}
                data = {"model": model, "language_code": "auto", **extra}
                r = await client.post("https://api.sarvam.ai/speech-to-text", headers=H, files=files, data=data)
                if r.is_error:
                    show(f"STT {model} {extra}", False, f"HTTP {r.status_code} {r.text[:200]}")
                    continue
                d = r.json()
                show(f"STT {model} {extra}", True,
                     f"keys={sorted(d.keys())} transcript={json.dumps(d.get('transcript'), ensure_ascii=False)[:100]!r} "
                     f"lang={d.get('language_code')!r}")
            except Exception as e:
                show(f"STT {model} {extra}", False, f"{type(e).__name__}: {e}")


async def probe_bhashini(client):
    uid = os.environ.get("BHASHINI_USER_ID", "")
    key = os.environ.get("BHASHINI_API_KEY", "")
    pid = os.environ.get("BHASHINI_PIPELINE_ID", "")
    url = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
    payload = {"pipelineTasks": [{"taskType": "translation",
                                  "config": {"language": {"sourceLanguage": "en", "targetLanguage": "hi"}}}],
               "pipelineRequestConfig": {"pipelineId": pid}}
    r = await client.post(url, headers={"userID": uid, "ulcaApiKey": key,
                                        "Content-Type": "application/json"}, json=payload)
    show("BHASHINI pipeline config", not r.is_error,
         f"HTTP {r.status_code} {'keys=' + str(sorted(r.json().keys())) if not r.is_error else r.text[:300]}")
    if not r.is_error:
        d = r.json()
        ep = d.get("pipelineInferenceAPIEndPoint") or {}
        print("   callbackUrl:", ep.get("callbackUrl"))
        print("   authKeyName:", (ep.get("inferenceApiKey") or {}).get("name"))
        for t in d.get("pipelineResponseConfig", []):
            print("   task:", t.get("taskType"), "langs:",
                  [(o.get("language"), o.get("serviceId")) for o in t.get("config", [])][:4])


async def main():
    async with httpx.AsyncClient(timeout=TIMEOUT, follow_redirects=True) as client:
        await probe_llm(client)
        tts = await probe_tts(client)
        await probe_tts_single_field(client)
        await probe_bhashini(client)
        if tts and tts.get("audios"):
            import base64
            wav = Path(__file__).resolve().parent / "_probe_hindi.wav"
            wav.write_bytes(base64.b64decode(tts["audios"][0]))
            print(f"   saved {wav} ({wav.stat().st_size} bytes)")
            await probe_stt(client, wav)
        else:
            print("SKIP STT: no TTS audio to feed it")


asyncio.run(main())
