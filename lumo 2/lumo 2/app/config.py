import os
from pathlib import Path
from dotenv import load_dotenv

load_dotenv()


def env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


def env_float(name: str, default: float) -> float:
    try:
        return float(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def env_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def env_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


# ---- BHASHINI (optional) -------------------------------------------------
BHASHINI_USER_ID = env("BHASHINI_USER_ID")
BHASHINI_API_KEY = env("BHASHINI_API_KEY")
BHASHINI_PIPELINE_ID = env("BHASHINI_PIPELINE_ID", "64392f96daac500b55c543cd")
BHASHINI_CONFIG_URL = env(
    "BHASHINI_CONFIG_URL",
    "https://meity-auth.ulcacontrib.org/ulca/apis/v0/model/getModelsPipeline",
)
# Newer getModelsPipeline responses no longer carry pipelineInferenceAPIEndPoint,
# so the inference host has to be configured explicitly.
BHASHINI_INFERENCE_URL = env(
    "BHASHINI_INFERENCE_URL",
    "https://dhruva-api.bhashini.gov.in/services/inference/pipeline",
)
BHASHINI_TIMEOUT_SECONDS = env_float("BHASHINI_TIMEOUT_SECONDS", 20)

# ---- Sarvam / OpenAI-compatible chat endpoint ----------------------------
# SARVAM_API_KEY is accepted as an alias of LLM_API_KEY.
SARVAM_BASE_URL = env("SARVAM_BASE_URL", env("LLM_BASE_URL", "https://api.sarvam.ai"))
SARVAM_API_KEY = env("SARVAM_API_KEY") or env("LLM_API_KEY")
LLM_BASE_URL = env("LLM_BASE_URL", "https://api.sarvam.ai/v1")
LLM_API_KEY = SARVAM_API_KEY
LLM_MODEL = env("SARVAM_LLM_MODEL", env("LLM_MODEL", "sarvam-105b"))
SARVAM_STT_MODEL = env("SARVAM_STT_MODEL", "saaras:v4")
SARVAM_TTS_MODEL = env("SARVAM_TTS_MODEL", "bulbul:v4-flash")
SARVAM_TIMEOUT_SECONDS = env_float("SARVAM_TIMEOUT_SECONDS", 90)
# Saaras v4 rejects "auto"; the explicit auto-detect value is "unknown".
SARVAM_STT_LANGUAGES = {
    "en": "en-IN", "hi": "hi-IN", "pa": "pa-IN", "ta": "ta-IN",
    "bn": "bn-IN", "mr": "mr-IN", "gu": "gu-IN", "kn": "kn-IN",
    "ml": "ml-IN", "od": "od-IN", "te": "te-IN", "ur": "ur-IN",
}
# Bulbul v4 speakers verified against the live API per language.
SARVAM_TTS_SPEAKERS = {
    "en-IN": env("SARVAM_TTS_SPEAKER_EN", "shubh_enhi_ads"),
    "hi-IN": env("SARVAM_TTS_SPEAKER_HI", "shubh_hi_ads"),
    "pa-IN": env("SARVAM_TTS_SPEAKER_PA", "anand_pa_conversation"),
}
LLM_TIMEOUT_SECONDS = env_float("LLM_TIMEOUT_SECONDS", 90)
LLM_MAX_TOKENS = env_int("LLM_MAX_TOKENS", 12000)  # sarvam-105b can spend 8k+ tokens reasoning before the JSON starts
LLM_RETRIES = env_int("LLM_RETRIES", 2)

# ---- Knowledge base / retrieval ------------------------------------------
KB_PATH = env("KB_PATH") or str(Path(__file__).parent / "data" / "knowledge_base.json")
RETRIEVAL_MIN_SCORE = env_float("RETRIEVAL_MIN_SCORE", 1.0)
RETRIEVAL_LIMIT = env_int("RETRIEVAL_LIMIT", 5)

# ---- API protection -------------------------------------------------------
API_KEY = env("API_KEY")                       # if set, clients must send X-API-Key
RATE_LIMIT_PER_MINUTE = env_int("RATE_LIMIT_PER_MINUTE", 30)  # 0 disables
TRUST_PROXY = env_bool("TRUST_PROXY", False)   # honour X-Forwarded-For
APP_ENV = env("APP_ENV", "development").strip().lower()
DEFAULT_CORS_ORIGINS = (
    "" if APP_ENV in ("prod", "production")
    else "http://localhost:5173,http://127.0.0.1:5173"
)
CORS_ORIGINS = [o.strip() for o in env("CORS_ORIGINS", DEFAULT_CORS_ORIGINS).split(",") if o.strip()]
