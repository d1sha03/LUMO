# LUMO Workstream B: Livelihood Compiler (Sarvam-only)

Hinglish text -> normalise numbers -> Sarvam LLM (strict JSON schema) -> Pydantic + rule validation
-> clarifying questions. The LLM only extracts; numbers, dates and questions are decided in code.

## Quick start (Windows)
1. Unzip. Double-click `setup.bat` (installs everything, opens `.env` for your Sarvam key).
2. Double-click `run.bat` (opens the demo page in your browser).
3. `test.bat` runs the offline tests and the live Sarvam evaluation.

## Run manually
    pip install -r requirements.txt
    cp .env.example .env        # put SARVAM_API_KEY in it (backend only)
    pytest -q                   # offline tests, no key needed
    python -m scripts.live_eval # real Sarvam run on cases/cases.json
    uvicorn lumo_compiler.api:app --reload

## API contract (share with Workstreams A, C, E)
- GET  /schema   JSON schema the LLM output must match
- POST /extract  {text, today?} -> state {extraction, warnings, questions, meta}
- POST /answer   {state, field_path, value} -> new state  (also used for user corrections)
  A question with answer_type "narrative" is answered by calling /extract again with the extra text appended.

## Files
schema.py (contract) | normalize.py | dates.py | prompts.py | llm.py (only network file)
validate.py | ambiguity.py | patch.py | pipeline.py | api.py
