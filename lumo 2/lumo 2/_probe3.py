"""Scratch probe 3: dump the real BHASHINI pipeline-config response shape under Bearer auth."""
import asyncio, json, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")
import httpx

AK = os.environ["BHASHINI_API_KEY"]
UID = os.environ["BHASHINI_USER_ID"]
PID = os.environ.get("BHASHINI_PIPELINE_ID", "")
CFG = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"


async def q(client, task, src, tgt, label, pid=PID):
    cfg = {"language": {"sourceLanguage": src}}
    if tgt:
        cfg["language"]["targetLanguage"] = tgt
    payload = {"pipelineTasks": [{"taskType": task, "config": cfg}],
               "pipelineRequestConfig": {"pipelineId": pid}}
    r = await client.post(CFG, headers={"Authorization": f"Bearer {AK}",
                                        "Content-Type": "application/json"}, json=payload)
    print(f"\n===== {label}: HTTP {r.status_code} =====", flush=True)
    if r.is_error:
        print(r.text[:400]); return
    d = r.json()
    print("TOP KEYS:", sorted(d.keys()))
    print(json.dumps(d, ensure_ascii=False, indent=1)[:2600])


async def main():
    async with httpx.AsyncClient(timeout=60, follow_redirects=True) as c:
        await q(c, "translation", "en", "hi", "translation en->hi")
        await q(c, "tts", "hi", None, "tts hi")
        await q(c, "transliteration", "en", "hi", "transliteration en->hi")

asyncio.run(main())
