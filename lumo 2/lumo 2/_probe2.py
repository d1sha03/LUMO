"""Scratch probe 2: STT language codes, TTS speakers per language, BHASHINI auth variants."""
import asyncio, base64, json, os, sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parent))
from dotenv import load_dotenv
load_dotenv(Path(__file__).resolve().parent / ".env")
import httpx

KEY = os.environ["SARVAM_API_KEY"]
H = {"api-subscription-key": KEY}
HJ = {**H, "Content-Type": "application/json"}
UID = os.environ.get("BHASHINI_USER_ID", "")
AK = os.environ.get("BHASHINI_API_KEY", "")
PID = os.environ.get("BHASHINI_PIPELINE_ID", "")
CFG = "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline"
WAV = (Path(__file__).resolve().parent / "_probe_hindi.wav").read_bytes()


def show(l, ok, d):
    print(f"{'PASS' if ok else 'FAIL'} | {l} | {d}", flush=True)


async def stt(client, lang):
    r = await client.post("https://api.sarvam.ai/speech-to-text", headers=H,
                          files={"file": ("probe.wav", WAV, "audio/wav")},
                          data={"model": "saaras:v4", "language_code": lang})
    if r.is_error:
        show(f"STT lang={lang}", False, f"HTTP {r.status_code} {r.text[:160]}")
    else:
        d = r.json()
        show(f"STT lang={lang}", True, f"keys={sorted(d.keys())} transcript={json.dumps(d.get('transcript'), ensure_ascii=False)[:90]} detected={d.get('language_code')!r}")


async def tts(client, lang, spk):
    r = await client.post("https://api.sarvam.ai/text-to-speech", headers=HJ, json={
        "text": "नमस्ते, आप कैसे हैं?" if lang == "hi-IN" else ("Hello, how are you today?" if lang == "en-IN" else "ਸਤ ਸ੍ਰੀ ਅਕਾਲ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?"),
        "language_code": lang, "model": "bulbul:v4-flash", "speaker": spk,
        "output_audio_codec": "wav", "speech_sample_rate": 22050})
    if r.is_error:
        show(f"TTS {lang}/{spk}", False, f"HTTP {r.status_code} {r.text[:160]}")
    else:
        d = r.json()
        aud = d.get("audios") or []
        show(f"TTS {lang}/{spk}", bool(aud), f"bytes={len(base64.b64decode(aud[0])) if aud else 0}")


async def bh(client, label, headers, payload):
    try:
        r = await client.post(CFG, headers=headers, json=payload)
        if r.is_error:
            show("BH " + label, False, f"HTTP {r.status_code} {r.text[:170]}")
        else:
            d = r.json()
            ep = d.get("pipelineInferenceAPIEndPoint") or {}
            tasks = [t.get("taskType") for t in d.get("pipelineResponseConfig", [])]
            show("BH " + label, True, f"callback={ep.get('callbackUrl')} authName={(ep.get('inferenceApiKey') or {}).get('name')} tasks={tasks}")
    except Exception as e:
        show("BH " + label, False, f"{type(e).__name__}: {e}")


async def main():
    async with httpx.AsyncClient(timeout=90, follow_redirects=True) as c:
        for lang in ("hi-IN", "unknown", "en-IN"):
            await stt(c, lang)
        for lang, speakers in (("en-IN", ["shubh_enhi_ads"]), ("hi-IN", ["shubh_hi_ads"]),
                               ("pa-IN", ["anand_pa_conversation"])):
            for s in speakers:
                await tts(c, lang, s)
        base_payload = {"pipelineTasks": [{"taskType": "translation"}],
                        "pipelineRequestConfig": {"pipelineId": PID}}
        lang_payload = {"pipelineTasks": [{"taskType": "translation",
                                           "config": {"language": {"sourceLanguage": "en", "targetLanguage": "hi"}}}],
                        "pipelineRequestConfig": {"pipelineId": PID}}
        await bh(c, "as-configured (no language, userID=UUID ulcaApiKey=long)", {
            "userID": UID, "ulcaApiKey": AK, "Content-Type": "application/json"}, base_payload)
        await bh(c, "SWAPPED userID/apiKey", {
            "userID": AK, "ulcaApiKey": UID, "Content-Type": "application/json"}, base_payload)
        await bh(c, "with language in task config", {
            "userID": UID, "ulcaApiKey": AK, "Content-Type": "application/json"}, lang_payload)
        await bh(c, "Authorization Bearer apiKey only", {
            "Authorization": f"Bearer {AK}", "Content-Type": "application/json"}, lang_payload)


asyncio.run(main())
