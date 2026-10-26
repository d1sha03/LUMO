"""Scratch probe 4: find the BHASHINI inference endpoint and run a real translate + tts call."""
import asyncio, base64, json, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")
import httpx

AK = os.environ["BHASHINI_API_KEY"]
UID = os.environ["BHASHINI_USER_ID"]
PID = os.environ.get("BHASHINI_PIPELINE_ID", "")
CFG = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
HDRS = lambda: {"Authorization": f"Bearer {AK}", "Content-Type": "application/json"}
HDRS2 = lambda: {"Authorization": f"Bearer {AK}", "Content-Type": "application/json",
                 "userID": UID, "ulcaApiKey": AK}
CANDIDATES = [
    "https://bhashini-api.ecounts.in/pipeline/v1/inference",
    "https://pipeline.bhasini.gov.in/pipeline/v1/inference",
    "https://pipeline.bhashini.gov.in/pipeline/v1/inference",
    "https://bhashini.vaniqa4ai.in/api/v1/inference/pipeline",
    "https://ulca-inference.meity.gov.in/pipeline/v1/inference",
    "https://pipeline.iframe.translators.stream/v1/inference",
]
TRANSLATE_PAYLOAD = {
    "pipelineTasks": [{"taskType": "translation",
                       "config": {"language": {"sourceLanguage": "en", "targetLanguage": "hi"},
                                  "serviceId": "ai4bharat/indictrans-v2-all-gpu--t4"}}],
    "inputData": {"input": [{"source": "I save money for my daughter's school fees."}]},
}


async def main():
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as c:
        r = await c.post(CFG, headers=HDRS(), json={
            "pipelineTasks": [{"taskType": "translation",
                               "config": {"language": {"sourceLanguage": "en", "targetLanguage": "hi"}}}],
            "pipelineRequestConfig": {"pipelineId": PID}})
        print("config top keys:", sorted(r.json().keys()))
        print("full config text:", r.text[:600], "\n")

        for url in CANDIDATES:
            for tag, hdrs in (("bearer-only", HDRS()), ("bearer+ulca", HDRS2())):
                try:
                    rr = await c.post(url, headers=hdrs(), json=TRANSLATE_PAYLOAD)
                    ok = not rr.is_error
                    print(f"{'PASS' if ok else 'FAIL'} | {tag} | {url} -> HTTP {rr.status_code} "
                          f"{rr.text[:220]}", flush=True)
                    if ok:
                        print("\n>>> WORKING ENDPOINT:", url)
                        return url
                except Exception as e:
                    print(f"ERR  | {tag} | {url} -> {type(e).__name__}: {str(e)[:110]}", flush=True)
    return None


found = asyncio.run(main())

if found:
    async def tts_call():
        async with httpx.AsyncClient(timeout=90, follow_redirects=True) as c:
            p = {"pipelineTasks": [{"taskType": "tts", "config": {
                "language": {"sourceLanguage": "hi"},
                "serviceId": "ai4bharat/indic-tts-coqui-indo_aryan-gpu--t4",
                "audioFormat": "wav", "encoding": "base64", "samplingRate": 22050}}],
                "inputData": {"input": [{"source": "नमस्ते, आप कैसे हैं?"}]}}
            r = await c.post(found, headers=HDRS(), json=p)
            print("\nTTS HTTP", r.status_code, r.text[:300])
    asyncio.run(tts_call())
