import copy
from datetime import date
from typing import Any, Optional

from pathlib import Path

from fastapi import FastAPI, HTTPException
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .patch import apply_patch
from .pipeline import ExtractionError, compile_text, finalize
from .schema import SCHEMA_VERSION, llm_json_schema

app = FastAPI(title="LUMO Livelihood Compiler", version=SCHEMA_VERSION)
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

_llm = None  # created lazily so the API boots (and /schema works) without a key


def get_llm():
    global _llm
    if _llm is None:
        from .llm import SarvamExtractor
        _llm = SarvamExtractor()
    return _llm


class ExtractIn(BaseModel):
    text: str
    today: Optional[date] = None


class AnswerIn(BaseModel):
    state: dict
    field_path: str
    value: Any


@app.get("/", include_in_schema=False)
def home():
    return FileResponse(Path(__file__).parent / "static" / "index.html")


@app.get("/health")
def health():
    return {"ok": True, "schema_version": SCHEMA_VERSION}


@app.get("/schema")
def schema():
    return llm_json_schema()


@app.post("/extract")
def extract(inp: ExtractIn):
    if not inp.text.strip():
        raise HTTPException(422, "text is empty")
    try:
        return compile_text(inp.text, inp.today, llm=get_llm())
    except ExtractionError as e:
        raise HTTPException(502, str(e))
    except RuntimeError as e:
        raise HTTPException(503, str(e))


@app.post("/answer")
def answer(inp: AnswerIn):
    st = inp.state
    ext = copy.deepcopy(st["extraction"])
    try:
        apply_patch(ext, inp.field_path, inp.value)
    except (KeyError, IndexError, ValueError, TypeError) as e:
        raise HTTPException(422, f"cannot apply answer: {e}")
    m = st["meta"]
    return finalize(ext, m["normalized_text"], date.fromisoformat(m["today"]), m["original_text"])
