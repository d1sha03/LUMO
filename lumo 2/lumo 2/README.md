# LUMO Samjho — grounded e-Shram Q&A and contextual financial chat

FastAPI backend with two Q&A modes: document-grounded e-Shram answers and contextual financial chat
using the existing Sarvam client. The financial chat receives user-approved profile fields and
Workstream E results; Workstream E remains the source of financial calculations. Glossary text is
the safe fallback when Sarvam is unavailable. Optional Bhashini translation and TTS availability
depends on the configured pipeline and language pair.

> **How "tuned with Sarvam" works:** this is retrieval-augmented generation (RAG), not fine-tuning.
> Your documents are searched for each question and only the matching passages are sent to Sarvam
> with strict grounding rules. For government rules that change, this is safer and easier to keep
> current than fine-tuning: update a document, re-ingest, done.

**Needs Python 3.10+.**

## 1. Setup

```bash
python3 -m venv .venv && source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env        # then put your Sarvam key in LLM_API_KEY
```

## 2. Load the e-Shram data (required — the knowledge base ships empty)

Fastest: one command that downloads, ingests, evaluates and tests Sarvam live:

```bash
python scripts/bootstrap.py
```

Or step by step:

```bash
python scripts/fetch_sources.py            # downloads the official sources listed in documents/sources.json
python scripts/ingest_docs.py documents/   # extracts text, chunks it, records page/URL/date metadata
python scripts/eval_retrieval.py           # checks retrieval on tests/eval_questions.json
```

Add more official PDFs any time (see `documents/README.md`) and re-run ingest — re-ingesting a
document *replaces* its chunks, it never duplicates them. Use `--clear` to start fresh.

## 3. Verify Sarvam works (uses your real key)

```bash
python scripts/check_sarvam.py
```

It makes a basic call, then asks three real questions (en / hi / hinglish) and prints mode, sources and any LLM error.

## 4. Run

```bash
uvicorn app.main:app --reload
# docs: http://127.0.0.1:8000/docs
curl -X POST http://127.0.0.1:8000/api/v1/ask -H 'Content-Type: application/json' \
  -d '{"question":"ई-श्रम रजिस्ट्रेशन के लिए कौन से दस्तावेज़ चाहिए?","language":"hi"}'
```

`/api/v1/ask` without `financial_context` uses the e-Shram document-grounded mode. Supplying
`financial_context` switches this same route to free-form contextual chat:

```json
{
  "question": "How should I plan for my school fees?",
  "language": "hi",
  "occupation": "street_vendor",
  "financial_context": {
    "financial_profile": {},
    "workstream_e": {}
  }
}
```

The chat response includes the answer provider, language provider, source links, directory candidates,
and a disclaimer. When Sarvam is unavailable, the contextual fallback only repeats available
Workstream E results and clearly identifies missing inputs. It does not calculate financial values.

`GET /api/resources` accepts `occupation`, `state`, and `limit`. It returns catalog match status,
missing information, source metadata, and verified-fact fields. `source_retrieved` means only that
allowlisted page metadata was fetched; it does not mean scheme facts were verified. The current local
catalog contains no verified eligibility or benefit facts. Check current details at the linked
official source before acting.

`GET /api/llm/check` reports whether Sarvam is configured and reachable. Bhashini uses
`BHASHINI_USER_ID`, `BHASHINI_API_KEY`, `BHASHINI_PIPELINE_ID`, `BHASHINI_CONFIG_URL`, and
`BHASHINI_TIMEOUT_SECONDS`; the code only uses an exact language/service match and returns an
explicit unavailable status when the selected pipeline does not support it.

The document-grounded mode returns `answer`, `sources` (title, URL, page, date, snippet), `mode`,
`disclaimer`, and `llm_error` if Sarvam had a problem.

| `mode` | meaning |
|---|---|
| `sarvam_rag` | Sarvam answered from the retrieved passages |
| `retrieval_fallback` | Sarvam call failed — excerpts returned, reason in `llm_error` |
| `retrieval_only` | no API key set — excerpts only |
| `no_retrieval` | nothing relevant in the documents — honest "not found" in the user's language |

## What was improved in this version

- **Hindi/Hinglish/Punjabi retrieval against English documents:** dictionary expansion plus a Sarvam call that converts the question into English search terms (cached); falls back gracefully if that call fails.
- **Spelling variants:** e-Shram / eshram / e shram / ई-श्रम, aadhar/adhar, nukta and chandrabindu all match.
- **BM25 ranking** instead of word overlap, with a "nothing relevant" threshold so out-of-scope questions are not forced into an answer.
- **Sarvam client rewritten:** correct headers (Bearer + `api-subscription-key`, the latter only sent to Sarvam hosts), retries on 429/5xx, `<think>` blocks and empty reasoning output handled, generous `max_tokens`, 90 s timeout. Errors are logged and returned — no more silent fallback.
- **Ingestion:** per-document title/URL/date from `documents/sources.json`, PDF page numbers, no duplicates on re-run, atomic writes, warnings for scanned PDFs / JS-only pages.
- **Safety:** answer prompt treats passages as data (prompt-injection resistant), strips invalid citations, redacts Aadhaar/phone/email from questions before logging or sending to the LLM, optional `X-API-Key`, per-IP rate limiting, CORS allow-list, validated request schemas.
- **Bugs fixed:** literal `\n` in the glossary prompt; glossary matching "premium" as EMI and "seasonal income" as "income"; BHASHINI overriding a good LLM explanation.

## Making Sarvam "tuned" to e-Shram: two levels

1. **Grounding (built in, recommended).** After step 2 every answer is built from the e-Shram documents you loaded, cites them, and says "not found" otherwise. This is what keeps answers current.
2. **True fine-tuning (optional).** Sarvam offers managed custom training (LoRA or full-weight) on its infrastructure in India — see https://www.sarvam.ai/products/model-training — and the sarvam-30b weights are published on Hugging Face if you want to run your own LoRA. To prepare data for either:

```bash
python scripts/export_finetune_data.py --per-chunk 2 --langs en,hi,hinglish
```

This writes `finetune/eshram_train.jsonl` (grounded Q&A pairs plus "not in the sources" refusal examples, each with its source passage). Every row is marked `needs_review`: have someone who knows e-Shram verify each answer before training. Keep RAG on even after fine-tuning; a fine-tuned model cannot be trusted to remember rules that change.

## Tests

```bash
pytest -q        # Sarvam/Bhashini provider behavior is covered with controlled test doubles
```

## Before public use

- Validate answers for your top questions against the official source text and date; extend `tests/eval_questions.json`.
- Set `API_KEY`, `RATE_LIMIT_PER_MINUTE`, `CORS_ORIGINS`; run behind HTTPS. Set `TRUST_PROXY=true` only behind a trusted proxy.
- Refresh documents on a schedule (cron: fetch + ingest). `schemes.json` is an unverified directory catalog, not scheme evidence.
- Never claim eligibility or approval for a person; the prompts already instruct the model not to.
- Keyword search is fast and dependency-free. If you later need stronger semantic matching, add a multilingual embedding model and vector store.
