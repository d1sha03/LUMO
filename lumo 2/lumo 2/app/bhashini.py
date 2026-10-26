import base64
import httpx
from app.config import (
    BHASHINI_USER_ID, BHASHINI_API_KEY, BHASHINI_PIPELINE_ID,
    BHASHINI_CONFIG_URL, BHASHINI_INFERENCE_URL, BHASHINI_TIMEOUT_SECONDS
)

class BhashiniError(RuntimeError):
    pass

class BhashiniClient:
    """
    ULCA-style pipeline integration.
    Credentials stay on the server. Pipeline availability/service IDs depend
    on the user's approved account and selected pipeline.
    """
    def __init__(self):
        self.user_id = BHASHINI_USER_ID
        self.api_key = BHASHINI_API_KEY
        self.pipeline_id = BHASHINI_PIPELINE_ID
        self.config_url = BHASHINI_CONFIG_URL
        self.inference_url = BHASHINI_INFERENCE_URL
        self.timeout = BHASHINI_TIMEOUT_SECONDS
        self.last_error = None
        self.last_success = None

    def ready(self):
        return bool(self.user_id and self.api_key and self.pipeline_id)

    def status(self):
        """Independently report configuration and the last observed reachability."""
        return {
            "configured": self.ready(),
            "reachable": True if self.last_success else (False if self.last_error else None),
            "status": (
                "reachable" if self.last_success and not self.last_error
                else "error" if self.last_error and not self.last_success
                else "partially_reachable" if self.last_error
                else "configured" if self.ready()
                else "not_configured"
            ),
            "error": self.last_error,
        }

    def _record(self, ok: bool, error: str | None = None):
        if ok:
            self.last_success = True
        else:
            self.last_error = error

    def _auth_headers(self):
        # The ULCA gateway accepts the legacy userID/ulcaApiKey pair and, for
        # portal-issued keys, a Bearer token. Send both; the API ignores neither.
        return {
            "userID": self.user_id,
            "ulcaApiKey": self.api_key,
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        }

    async def _configure(self, task_type: str, source: str, target: str | None = None):
        if not self.ready():
            raise BhashiniError("BHASHINI credentials are not configured.")
        language = {"sourceLanguage": source}
        if target:
            language["targetLanguage"] = target
        payload = {
            "pipelineTasks": [{"taskType": task_type, "config": {"language": language}}],
            "pipelineRequestConfig": {"pipelineId": self.pipeline_id},
        }
        headers = self._auth_headers()
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(self.config_url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        endpoint = data.get("pipelineInferenceAPIEndPoint") or {}
        callback = endpoint.get("callbackUrl") or endpoint.get("callbackURL") or self.inference_url
        auth = endpoint.get("inferenceApiKey") or {}
        auth_name, auth_value = auth.get("name"), auth.get("value")
        # When the pipeline response omits the per-request key, reuse our own credentials.
        if not auth_name or not auth_value:
            auth_name, auth_value = "ulcaApiKey", self.api_key

        configs = data.get("pipelineResponseConfig", [])
        selected = None
        for task in configs:
            if task.get("taskType") == task_type:
                options = task.get("config", [])
                for option in options:
                    lang = option.get("language", {})
                    if lang.get("sourceLanguage") == source and (
                        target is None or lang.get("targetLanguage") == target
                    ):
                        selected = option
                        break
        if not callback or not auth_name or not auth_value or not selected:
            raise BhashiniError(
                "Could not find a matching BHASHINI endpoint/service ID. "
                "Check pipeline ID, task and language support."
            )
        return callback, {auth_name: auth_value, "Content-Type": "application/json"}, selected

    async def translate(self, text: str, source: str = "en", target: str = "hi") -> str:
        callback, headers, config = await self._configure("translation", source, target)
        payload = {
            "pipelineTasks": [{
                "taskType": "translation",
                "config": {
                    "language": {"sourceLanguage": source, "targetLanguage": target},
                    "serviceId": config["serviceId"],
                },
            }],
            "inputData": {"input": [{"source": text}]},
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(callback, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
        try:
            out = data["pipelineResponse"][0]["output"][0]["target"]
        except (KeyError, IndexError, TypeError):
            raise BhashiniError("Translation response did not contain output text.")
        if not isinstance(out, str) or not out.strip():
            raise BhashiniError("BHASHINI returned an empty translation.")
        self._record(True)
        return out

    async def synthesize(self, text: str, language: str = "hi") -> bytes:
        callback, headers, config = await self._configure("tts", language)
        payload = {
            "pipelineTasks": [{
                "taskType": "tts",
                "config": {
                    "language": {"sourceLanguage": language},
                    "serviceId": config["serviceId"],
                    "audioFormat": "wav",
                    "encoding": "base64",
                    "samplingRate": 22050,
                },
            }],
            "inputData": {"input": [{"source": text}]},
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            r = await client.post(callback, headers=headers, json=payload)
            r.raise_for_status()
            data = r.json()
        try:
            encoded = data["pipelineResponse"][0]["audio"][0]["audioContent"]
            audio = base64.b64decode(encoded)
        except (KeyError, IndexError, TypeError, ValueError):
            raise BhashiniError("TTS response did not contain base64 audio.")
        if not audio:
            raise BhashiniError("BHASHINI returned empty audio.")
        self._record(True)
        return audio
