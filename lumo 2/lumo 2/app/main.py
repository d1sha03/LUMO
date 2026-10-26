import base64
import logging
import sys
from pathlib import Path

import httpx
from fastapi import Depends, FastAPI, File, Form, Query, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

# The intake and finance modules are a repository-local namespace package.
_repo_root = str(Path(__file__).resolve().parents[3])
if _repo_root not in sys.path:
    sys.path.insert(0, _repo_root)

from app import config, sarvam
from app.conversation import answer_conversation
from app.intelligence.router import router as intelligence_router
from app.bhashini import BhashiniClient, BhashiniError
from app.glossary import all_terms, find_term
from app.knowledge import summary as kb_summary
from app.llm import simplify_with_llm
from app.rag import answer_from_knowledge
from app.resources import get_resources
from app.schemas import (AskRequest, ExplainRequest, ExplainResponse,
                         SpeechRequest, TranslateRequest)
from app.security import protect
from lumo_WorkstreamC.apps.api.app.finance.router import register_finance
from lumo_WorkstreamC.apps.api.app.llm.router import intake_endpoint

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
log = logging.getLogger("lumo.api")

app = FastAPI(
    title="LUMO Samjho API",
    version="2.0.0",
    description="Financial explanations, e-Shram document Q&A (Sarvam RAG), Hindi translation/TTS and official resource cards.",
)
if config.CORS_ORIGINS:
    app.add_middleware(CORSMiddleware, allow_origins=config.CORS_ORIGINS,
                       allow_methods=["GET", "POST"], allow_headers=["*"])


@app.get("/")
async def root():
    return {"service": "LUMO API", "status": "ok", "health": "/health"}


# Workstream E — Financial Intelligence Engine
app.include_router(intelligence_router)
# Preserve the existing Workstream C endpoints without mounting its duplicate explain route.
app.add_api_route("/api/intake/compile", intake_endpoint, methods=["POST"], tags=["llm"])
app.add_api_route("/api/llm/intake/compile", intake_endpoint, methods=["POST"], tags=["llm"])
register_finance(app)
bhashini = BhashiniClient()

HI_FALLBACK = {
    "emergency_fund": "आपातकालीन निधि वह पैसा है जिसे आप अचानक आने वाले ज़रूरी खर्चों के लिए बचाकर रखते हैं।",
    "interest_rate": "ब्याज दर बताती है कि तय अवधि में ऋण पर कितना ब्याज देना होगा या कुछ बचत पर कितना ब्याज मिलेगा।",
    "savings": "बचत वह पैसा है जो ज़रूरी खर्चों के बाद भविष्य के लिए अलग रखा जाता है।",
}
HINGLISH_FALLBACK = {
    "emergency_fund": "Emergency fund woh paise hain jo aap achanak zaroori kharchon ke liye bachakar rakhte hain.",
    "interest_rate": "Interest rate batata hai ki loan par ek tay samay mein kitna byaaj dena hoga, ya kuch savings par kitna byaaj milega.",
    "savings": "Savings woh paise hain jo zaroori kharchon ke baad future ke liye alag rakhe jaate hain.",
}
ASK_DISCLAIMER = {
    "en": "Based on documents loaded into this app; may be outdated. Confirm eligibility, benefits and procedures on the official e-Shram portal.",
    "hi": "यह जानकारी इस ऐप में लोड किए गए दस्तावेज़ों पर आधारित है और पुरानी हो सकती है। पात्रता, लाभ और प्रक्रिया की पुष्टि आधिकारिक e-Shram पोर्टल पर करें।",
    "hinglish": "Yeh jaankari app mein loaded documents par based hai aur purani ho sakti hai. Eligibility, benefits aur process official e-Shram portal par confirm karein.",
    "pa": "ਇਹ ਜਾਣਕਾਰੀ ਇਸ ਐਪ ਵਿੱਚ ਲੋਡ ਦਸਤਾਵੇਜ਼ਾਂ 'ਤੇ ਅਧਾਰਿਤ ਹੈ ਅਤੇ ਪੁਰਾਣੀ ਹੋ ਸਕਦੀ ਹੈ। ਯੋਗਤਾ, ਲਾਭ ਅਤੇ ਪ੍ਰਕਿਰਿਆ ਦੀ ਪੁਸ਼ਟੀ ਅਧਿਕਾਰਤ e-Shram ਪੋਰਟਲ 'ਤੇ ਕਰੋ।",
}


def choose_fallback(term: dict, language: str, occupation: str | None):
    example = term.get("examples", {}).get(occupation or "")
    if language == "hi":
        text = term.get("hindi_explanation") or HI_FALLBACK.get(term["id"], term["simple_explanation"])
    elif language == "hinglish":
        text = term.get("hinglish_explanation") or HINGLISH_FALLBACK.get(term["id"], term["simple_explanation"])
    elif language == "pa":
        text = term.get("punjabi_explanation") or term["simple_explanation"]
    else:
        text = term["simple_explanation"]
    if example and language == "en":
        text += " Example: " + example
    return text


@app.get("/health")
async def health():
    return {"status": "ok", "service": "lumo-samjho", "version": app.version, "mode": "live",
            "bhashini_credentials_configured": bhashini.ready(),
            "llm_configured": sarvam.configured(),
            "providers": provider_statuses()}


@app.get("/api/providers/health")
async def providers_health():
    """Independent reachability per provider. Never includes credentials."""
    return provider_statuses()


def provider_statuses():
    statuses = sarvam.provider_status()
    statuses["bhashini"] = bhashini.status()
    for name, item in statuses.items():
        item["model"] = {
            "sarvam_stt": config.SARVAM_STT_MODEL,
            "sarvam_llm": config.LLM_MODEL if item["configured"] else None,
            "sarvam_tts": config.SARVAM_TTS_MODEL,
        }.get(name)
    statuses["bhashini"]["model"] = config.BHASHINI_PIPELINE_ID if bhashini.ready() else None
    live = [n for n, s in statuses.items() if s["status"] == "reachable"]
    statuses["summary"] = {
        "reachable_providers": live,
        "reachable_count": len(live),
        "total_providers": len([k for k in statuses if k != "summary"]),
    }
    return statuses


MAX_AUDIO_BYTES = 15 * 1024 * 1024


@app.post("/api/stt", dependencies=[Depends(protect)])
@app.post("/api/v1/stt", dependencies=[Depends(protect)])
async def speech_to_text(file: UploadFile = File(...), language: str = Form("unknown")):
    """Browser microphone audio -> Saaras v4 -> transcript.

    A failed STT call is reported as a provider error. It never returns a
    fabricated or deterministic transcript, because that would make the rest of
    the pipeline look live when nothing was actually heard.
    """
    audio = await file.read()
    if not audio:
        return JSONResponse(status_code=422, content={
            "status": "invalid_audio", "transcript": None,
            "message": "The uploaded audio file is empty.",
        })
    if len(audio) > MAX_AUDIO_BYTES:
        return JSONResponse(status_code=413, content={
            "status": "audio_too_large", "transcript": None,
            "message": f"Audio exceeds the {MAX_AUDIO_BYTES // (1024 * 1024)} MB limit.",
        })
    try:
        return await sarvam.transcribe(
            audio,
            file.filename or "capture.webm",
            file.content_type or "audio/webm",
            language,
        )
    except sarvam.LLMError as exc:
        log.warning("Sarvam STT failed: %s", exc)
        return JSONResponse(status_code=503, content={
            "status": "provider_error", "provider": "sarvam", "model": config.SARVAM_STT_MODEL,
            "transcript": None, "message": str(exc),
        })


@app.get("/api/v1/glossary")
async def glossary(category: str | None = None):
    terms = all_terms()
    if category:
        terms = [t for t in terms if t.get("category") == category]
    return {"items": terms}


@app.post("/api/v1/explain", response_model=ExplainResponse, dependencies=[Depends(protect)])
async def explain(req: ExplainRequest):
    term = find_term(req.prompt)
    if not term:
        msg = {
            "hi": "मैं इस सवाल में वित्तीय शब्द को पहचान नहीं पाया। कृपया सवाल को दूसरे तरीके से लिखें या शब्दावली में से कोई शब्द चुनें।",
            "hinglish": "Main is sawaal mein financial term ko confidently identify nahi kar paaya. Please sawaal ko doosre tareeke se likhein ya glossary se term choose karein.",
            "pa": "ਮੈਂ ਇਸ ਸਵਾਲ ਵਿੱਚ ਵਿੱਤੀ ਸ਼ਬਦ ਦੀ ਪਛਾਣ ਨਹੀਂ ਕਰ ਸਕਿਆ। ਕਿਰਪਾ ਕਰਕੇ ਸਵਾਲ ਨੂੰ ਹੋਰ ਤਰੀਕੇ ਨਾਲ ਲਿਖੋ।",
            "en": "I could not confidently identify the financial term. Please rephrase your question or choose a glossary term.",
        }
        return ExplainResponse(term_id=None, term=None, explanation=msg[req.language],
                               language=req.language, source="safe_fallback")

    fallback = choose_fallback(term, req.language, req.occupation)
    explanation, used_llm = await simplify_with_llm(req.prompt, term, req.occupation, req.language, fallback)
    source = "sarvam_llm" if used_llm else "controlled_glossary"

    # BHASHINI translation only when neither the LLM nor a reviewed Hindi text produced Hindi.
    if req.language == "hi" and not used_llm and not term.get("hindi_explanation"):
        try:
            explanation = await bhashini.translate(fallback, "en", "hi")
            source = "bhashini_translation"
        except Exception:
            explanation = fallback

    audio_bytes = None
    audio_provider = None
    audio_error = None
    if req.audio:
        try:
            audio_bytes, audio_provider = await synthesize_any(explanation, req.language)
        except (sarvam.LLMError, BhashiniError, httpx.HTTPError, ValueError) as exc:
            audio_error = str(exc)

    return ExplainResponse(
        term_id=term["id"], term=term["term"], explanation=explanation, language=req.language,
        audio_available=audio_bytes is not None,
        audio_base64=base64.b64encode(audio_bytes).decode("ascii") if audio_bytes else None,
        audio_provider=audio_provider,
        audio_error=audio_error,
        source=source,
        example=term.get("examples", {}).get(req.occupation or ""),
    )


@app.post("/api/translate", dependencies=[Depends(protect)])
@app.post("/api/v1/translate", dependencies=[Depends(protect)])
async def translate(req: TranslateRequest):
    try:
        text = await bhashini.translate(req.text, req.source_language, req.target_language)
        return {"text": text, "source_language": req.source_language,
                "target_language": req.target_language, "provider": "bhashini",
                "translated": True, "status": "ok"}
    except (BhashiniError, httpx.HTTPError, ValueError) as e:
        log.warning("Bhashini translation unavailable: %s", e)
        return {
            "text": req.text,
            "source_language": req.source_language,
            "target_language": req.target_language,
            "provider": "offline_fallback",
            "translated": False,
            "status": "unavailable",
            "reason": str(e)[:300],
            "message": "Translation is unavailable; the original text is shown.",
        }


TTS_LANGUAGE_TO_CODE = {"en": "en-IN", "hi": "hi-IN", "pa": "pa-IN"}


async def synthesize_any(text: str, language: str):
    """Try Sarvam Bulbul first, then BHASHINI. Returns (audio, provider) or raises BhashiniError/LLMError.

    Raises the last provider error if nothing produced audio - callers surface it,
    they never substitute silence or placeholder bytes.
    """
    attempts = []
    code = TTS_LANGUAGE_TO_CODE.get(language, language)
    try:
        return await sarvam.synthesize(text, code), "sarvam_tts"
    except sarvam.LLMError as exc:
        attempts.append(f"sarvam_tts: {exc}")
    if bhashini.ready():
        try:
            return await bhashini.synthesize(text, language), "bhashini_tts"
        except (BhashiniError, httpx.HTTPError, ValueError) as exc:
            attempts.append(f"bhashini_tts: {exc}")
    else:
        attempts.append("bhashini_tts: not configured")
    raise sarvam.LLMError("; ".join(attempts))


@app.post("/api/speech", dependencies=[Depends(protect)])
@app.post("/api/v1/speech", dependencies=[Depends(protect)])
async def speech(req: SpeechRequest):
    try:
        audio, provider = await synthesize_any(req.text, req.language)
        return Response(content=audio, media_type="audio/wav",
                        headers={"Content-Disposition": 'inline; filename="lumo-speech.wav"',
                                 "X-Lumo-Tts-Provider": provider})
    except (sarvam.LLMError, BhashiniError, httpx.HTTPError, ValueError) as e:
        log.warning("Speech synthesis unavailable: %s", e)
        sarvam._record_provider_result("sarvam_tts", str(e).split(";")[0])
        return JSONResponse(content={
            "audio_available": False,
            "provider": "none",
            "status": "unavailable",
            "detail": str(e),
            "message": "Speech generation is unavailable; use the displayed text.",
        })


@app.post("/api/explain", response_model=ExplainResponse, dependencies=[Depends(protect)])
@app.post("/api/llm/explain", response_model=ExplainResponse, dependencies=[Depends(protect)])
async def explain_v1_alias(req: ExplainRequest):
    return await explain(req)


@app.get("/api/v1/resources")
async def resources(
    occupation: str | None = Query(default=None, max_length=80),
    state: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=5, ge=1, le=20),
):
    return await get_resources(occupation, limit, state)


@app.get("/api/resources")
async def resources_v1_alias(
    occupation: str | None = Query(default=None, max_length=80),
    state: str | None = Query(default=None, max_length=120),
    limit: int = Query(default=5, ge=1, le=20),
):
    return await resources(occupation, state, limit)


@app.post("/api/v1/ask", dependencies=[Depends(protect)])
async def ask_eshram(req: AskRequest):
    """Use the existing document Q&A or contextual conversational path."""
    if req.financial_context is not None:
        financial_profile = req.financial_context.get("financial_profile")
        user = financial_profile.get("user") if isinstance(financial_profile, dict) else {}
        user = user if isinstance(user, dict) else {}
        occupation = req.occupation or user.get("occupation")
        location = user.get("location")
        candidates = (
            await get_resources(occupation, state=location if isinstance(location, str) else None)
        ).get("items", [])
        return await answer_conversation(
            req.question,
            req.language,
            req.financial_context,
            candidates,
            bhashini.translate,
        )
    result = await answer_from_knowledge(req.question.strip(), req.language)
    result["disclaimer"] = ASK_DISCLAIMER[req.language]
    return result


@app.get("/api/v1/knowledge/status")
async def knowledge_status():
    info = kb_summary()
    info.update({
        "ready_for_document_qa": info["chunks_loaded"] > 0,
        "llm_configured": sarvam.configured(),
        "llm_model": config.LLM_MODEL if sarvam.configured() else None,
        "api_key_required": bool(config.API_KEY),
    })
    if info["chunks_loaded"] == 0:
        info["hint"] = "Knowledge base is empty. Run: python scripts/fetch_sources.py && python scripts/ingest_docs.py documents/"
    return info


@app.get("/api/v1/llm/check", dependencies=[Depends(protect)])
@app.get("/api/llm/check", dependencies=[Depends(protect)])
async def llm_check():
    """Makes one tiny Sarvam call so you can confirm key, model and endpoint work."""
    if not sarvam.configured():
        return {"ok": False, "error": "LLM_API_KEY / LLM_MODEL / LLM_BASE_URL not configured"}
    try:
        text = await sarvam.chat([{"role": "user", "content": "Reply with the single word: ready"}],
                                 temperature=0, max_tokens=600, timeout=45)
        return {"ok": True, "model": config.LLM_MODEL, "reply": text[:80]}
    except sarvam.LLMError as e:
        return {"ok": False, "model": config.LLM_MODEL, "error": str(e)}
