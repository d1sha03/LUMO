import builtins
import io
import json
import locale

import pytest

from app import config, knowledge
from app.security import limiter


_original_open = builtins.open


def _utf8_text_encoding(encoding=None, errors=None, newline=None):
    return "utf-8" if encoding is None else encoding


def _utf8_preferred_encoding(do_setlocale=True):
    return "UTF-8"


def _utf8_open(file, *args, **kwargs):
    mode = kwargs.get("mode")
    if mode is None and args:
        mode = args[0]
    if "b" not in str(mode or "r") and "encoding" not in kwargs and (len(args) < 3 or args[2] is None):
        kwargs["encoding"] = "utf-8"
    return _original_open(file, *args, **kwargs)


io.text_encoding = _utf8_text_encoding
locale.getpreferredencoding = _utf8_preferred_encoding
builtins.open = _utf8_open

# Synthetic chunks used ONLY for tests. They are not official e-Shram content.
TEST_CHUNKS = [
    {"id": "t-1", "title": "Registration guide", "document": "reg.txt", "chunk": 1, "page": 1,
     "text": "Registration on the eshram portal is free. A worker needs an Aadhaar number, an Aadhaar linked mobile number and a bank account to complete self registration.",
     "source_url": "https://example.test/reg", "source_name": "Test", "keywords": ["registration", "documents"]},
    {"id": "t-2", "title": "Benefits overview", "document": "ben.txt", "chunk": 1, "page": 1,
     "text": "Registered unorganised workers receive an accident insurance benefit and a card carrying a Universal Account Number.",
     "source_url": "https://example.test/ben", "source_name": "Test", "keywords": ["benefit", "insurance"]},
    {"id": "t-3", "title": "Pension scheme", "document": "pen.txt", "chunk": 1, "page": 2,
     "text": "The pension scheme for unorganised workers is voluntary and contributory; the monthly contribution depends on entry age.",
     "source_url": "https://example.test/pen", "source_name": "Test", "keywords": ["pension"]},
    {"id": "t-4", "title": "Helpline", "document": "help.txt", "chunk": 1, "page": 1,
     "text": "For complaints and grievances call the toll free helpline number or visit a common service centre for update and correction of details.",
     "source_url": "https://example.test/help", "source_name": "Test", "keywords": ["helpline"]},
    {"id": "t-5", "title": "Annual statistics", "document": "stat.txt", "chunk": 1, "page": 7,
     "text": "Statistics table of state wise counts reported in the annual report covering many districts and sectors of the economy.",
     "source_url": None, "source_name": "Test", "keywords": []},
    {"id": "t-6", "title": "Agriculture note", "document": "agri.txt", "chunk": 1, "page": 3,
     "text": "Agricultural labour seasonal crop calendar harvest wages across regions and villages.",
     "source_url": None, "source_name": "Test", "keywords": []},
]


@pytest.fixture
def kb(tmp_path, monkeypatch):
    path = tmp_path / "kb.json"
    path.write_text(json.dumps(TEST_CHUNKS, ensure_ascii=False), encoding="utf-8")
    monkeypatch.setattr(knowledge, "KB_PATH", path)
    return path


@pytest.fixture
def empty_kb(tmp_path, monkeypatch):
    path = tmp_path / "kb.json"
    path.write_text("[]", encoding="utf-8")
    monkeypatch.setattr(knowledge, "KB_PATH", path)
    return path


@pytest.fixture
def no_llm(monkeypatch):
    monkeypatch.setattr(config, "LLM_API_KEY", "")


@pytest.fixture
def llm_on(monkeypatch):
    monkeypatch.setattr(config, "LLM_API_KEY", "test-key")
    monkeypatch.setattr(config, "LLM_BASE_URL", "https://api.sarvam.ai/v1")
    monkeypatch.setattr(config, "LLM_MODEL", "sarvam-105b")


@pytest.fixture(autouse=True)
def _no_live_key(monkeypatch):
    """Tests set config.LLM_API_KEY; a real SARVAM_API_KEY from .env must not leak in and make them call the provider."""
    monkeypatch.setattr(config, "SARVAM_API_KEY", "")
    monkeypatch.setattr(config, "LLM_API_KEY", "")


@pytest.fixture(autouse=True)
def _clean(monkeypatch):
    monkeypatch.setattr(config, "API_KEY", "")
    monkeypatch.setattr(config, "RATE_LIMIT_PER_MINUTE", 0)
    limiter.reset()
    yield
    limiter.reset()
