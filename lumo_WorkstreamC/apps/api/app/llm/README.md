# LUMO government-LLM layer (`apps/api/app/llm/`)

Adds **government-backed Indian LLMs** to LUMO without letting them touch the numbers.

| Job | Who does it |
|---|---|
| Cash projection, reserve breach, shock, goals, every rupee figure | **Deterministic Python** (`app/finance/`) |
| Narrative (Hindi/Hinglish/English) -> structured facts | **Government LLM**, then strict validation, else rule-based demo fallback |
| LUMO Samjho plain-language explanations (hi/en/pa) | **Government LLM** re-wording a curated glossary, else template fallback |

## Which LLMs and why they count as "government-based"

| Provider key | Model | Government link | How it is reached |
|---|---|---|---|
| `bharatgen` | BharatGen **Param** family (default `bharatgenai/Param-1-2.9B-Instruct`; Param2-17B-MoE also exists) | Government-funded consortium under DST's NM-ICPS; trained with IndiaAI Mission compute; models listed on the government's AIKosh | Open weights on Hugging Face. **Self-host** (vLLM, OpenAI-compatible) and set `BHARATGEN_BASE_URL`. I found no confirmed public hosted API. |
| `sarvam` | `sarvam-105b` (default; `sarvam-30b` is retired by the provider and answers HTTP 400) | Selected by the Government of India under the IndiaAI Mission to build the sovereign LLM; open-weight, trained on IndiaAI compute | Hosted `https://api.sarvam.ai/v1/chat/completions` with an API key. It is a reasoning model, so `LUMO_LLM_MAX_TOKENS` must leave room for the reasoning tokens before the JSON starts. |

BharatGen is the closest match to a "government LLM" (government-funded consortium). Sarvam is a private company the
government selected and funded compute for ("sovereign"). **Ask the hackathon organisers which of these they accept**; the
provider list is configuration, so either/both can be used. Non-government providers are rejected at start-up
(`LUMO_LLM_PROVIDERS=openai` raises an error).

**Verify before the demo** (could not be confirmed from primary docs here):
* Sarvam's header name (`api-subscription-key`), model ids and OpenAI-style path come from a third-party guide dated June 2026,
  not Sarvam's own docs. They are env-configurable (`SARVAM_AUTH_HEADER`, `SARVAM_MODEL`, `SARVAM_BASE_URL`). Sarvam models reason by
  default and reasoning tokens count toward `max_tokens`; truncated answers are treated as failures and fall back.
* `Param-1-2.9B-Instruct` is an early checkpoint (model card: MIT licence). Domain variants such as FinanceParam carry a
  **BharatGen non-commercial licence**: do not use them commercially without checking. The checkpoint ships custom code, so vLLM may need `--trust-remote-code`.
* A 2.9B model follows JSON instructions less reliably than a 30B one. That is why every answer is validated and retried once
  before the deterministic fallback.

## Setup
```bash
# BharatGen, self-hosted (GPU with ~7 GB VRAM is enough for Param-1-2.9B at bf16)
vllm serve bharatgenai/Param-1-2.9B-Instruct --trust-remote-code --port 8000
export BHARATGEN_BASE_URL=http://localhost:8000/v1
# and/or Sarvam
export SARVAM_API_KEY=...        # never in frontend code; copy names from .env.example
export LUMO_LLM_PROVIDERS=bharatgen,sarvam     # order = preference
```
Mount routes: `from app.llm.router import register_llm; register_llm(app)` (reference `/api/explain`, `/api/intake/compile`; Workstream E owns final routes).

## How a request flows (`gateway.py`)
1. Try providers in order; skip unconfigured ones.
2. Parse the JSON reply (code fences and `<think>` blocks tolerated) and **validate** it.
3. Rejected answer -> sent back once with the exact reason. Network/HTTP failure -> next provider.
4. Nothing valid -> deterministic fallback. Response says `mode: "demo"`, `provider: "fallback"` plus `warnings`.
   `mode: "live"` only when a government LLM's answer actually passed validation. `/health` reports `live` only when a provider is *configured*.

## Guards (`guards.py`, `intake.py`)
* **Number guard:** every number in an explanation must appear in the engine-supplied context (Devanagari/Gurmukhi digits, `1,23,456` grouping, "2 hazar", "1.5 lakh" handled). The model cannot calculate, round or invent figures.
* **Extraction guard:** every amount must literally appear in the user's text; every `source_quote` must be a verbatim part of it; a stated date's day must appear in the text; enums and direction/category pairs are checked. Confidence is computed from evidence, never the model's self-report.
* **Language guard:** hi-IN/pa-IN answers must be mostly Devanagari/Gurmukhi; en-IN must not be.
* **Content guard:** heuristic block-list for certainty claims and loan recommendations (a safety net; the prompt forbids them too).
* **Context is data:** `/api/explain` accepts only short plain scalars (no free text), so users cannot inject instructions; the statement is passed as a JSON field and the prompt says to ignore instructions inside it.
* Only a curated glossary (`projected_cash_shortfall`, `minimum_reserve`, `cash_deficit`, `sales_shock`) is explainable; the LLM never defines terms, invents schemes, links or eligibility rules.

## Intake behaviour worth knowing
* Unknown cash/reserve stay `null` and generate questions. `"I earn 1500 per day"` triggers the sales-vs-profit question.
* A flow without a known schedule or date is **not added** to the twin; `q_frequency_*` / `q_start_date_*` is asked instead.
* "EMI/kist" without a stated frequency is assumed **monthly** (flagged in `warnings`, confidence lowered).
* With `existing_twin`: previously confirmed values are kept unless the new text restates them (then updated, with a warning). Matching is by category + direction + frequency.
* Questions are in Hindi for `hi-IN`, otherwise English (marked `en-IN`; no Punjabi question text yet).

## Limitations
* Hindi and Punjabi fallback texts are drafted by the developer and **need native-speaker review**.
* The rule-based fallback is keyword/regex based (English, Hinglish, Devanagari): no number words ("डेढ़ हज़ार"), no multi-item sentences without separators.
* No audio: `include_audio=true` returns `status: "unavailable"` (no TTS adapter wired). Nothing is faked.
* User text is sent to the chosen provider. Sarvam is hosted (data leaves your infrastructure); self-hosted BharatGen keeps it local. Keep data fictional until consent/privacy handling exists.

## Tests
`python -m unittest discover -s app/llm/tests -t .` (from `apps/api`). Uses a real local mock HTTP server to test headers, timeouts, 5xx, bad JSON, truncation, invented numbers and fallbacks. `test_router.py` needs `fastapi pydantic httpx` and is skipped otherwise.
