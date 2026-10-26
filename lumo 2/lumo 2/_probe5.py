"""Measure why the intelligence explainer gets truncated, and whether reasoning effort is tunable."""
import asyncio, json, sys
import httpx

sys.path.insert(0, ".")
from app import sarvam, config
from app.intelligence import sarvam_explainer

BASE = "http://127.0.0.1:8000"
TWIN = {
    "schema_version": "1.0", "twin_id": "probe_kirana", "as_of_date": "2026-10-26", "language": "en-IN",
    "profile": {"occupation": "small kiryana shop owner", "state": "Uttar Pradesh", "district": "Lucknow",
                "cash_on_hand": 42000, "minimum_reserve": 15000, "forecast_days": 30},
    "cash_on_hand": 42000, "minimum_reserve": 15000, "forecast_days": 30,
    "cash_flows": [
        {"id": "cf_sales", "label": "Daily kiryana shop sales", "direction": "inflow", "category": "business_sales",
         "amount": 7800, "frequency": "daily", "start_date": "2026-10-26", "confidence": 0.9,
         "source_type": "user_statement", "source_note": "Daily sales average 7800 rupees", "essential": True},
        {"id": "cf_stock", "label": "Daily inventory restocking", "direction": "outflow", "category": "business_stock_cost",
         "amount": 5300, "frequency": "daily", "start_date": "2026-10-26", "confidence": 0.9,
         "source_type": "user_statement", "source_note": "Restocking costs 5300 rupees every day", "essential": True},
        {"id": "cf_house", "label": "Household essentials", "direction": "outflow", "category": "household_essential",
         "amount": 12000, "frequency": "monthly", "start_date": "2026-11-05", "confidence": 0.9,
         "source_type": "user_statement", "source_note": "Household essentials are 12000 rupees a month", "essential": True},
        {"id": "cf_loan", "label": "Small business loan instalment", "direction": "outflow", "category": "debt_repayment",
         "amount": 5200, "frequency": "monthly", "start_date": "2026-11-10", "confidence": 0.9,
         "source_type": "user_statement", "source_note": "Business loan instalment is 5200 rupees monthly", "essential": True},
    ],
    "goals": [],
}


def call(path, payload):
    r = httpx.post(BASE + path, json=payload, timeout=600)
    r.raise_for_status()
    return r.json()


def main():
    sim = call("/api/finance/simulate", {"twin": TWIN, "scenarios": [{"scenario_id": "baseline", "label": "Current plan"}]})
    result = call("/api/intelligence/analyze", {"financial_twin": TWIN})
    prompt = sarvam_explainer._build_user_prompt("full", result, "en", "small kiryana shop owner")
    print("facts payload chars:", len(json.dumps(result)), "prompt chars:", len(prompt))
    print("report keys:", sorted(result.keys()))
    messages = [{"role": "system", "content": sarvam_explainer._SYSTEM_PROMPT}, {"role": "user", "content": prompt}]
    for extra in ({}, {"reasoning_effort": "low"}, {"reasoning_effort": "none"}):
        for mt in (12000, 20000):
            body = {"model": config.LLM_MODEL, "messages": messages, "temperature": 0.2, "max_tokens": mt, **extra}
            with httpx.Client(timeout=400) as c:
                r = c.post(sarvam._chat_url(), headers=sarvam._headers(sarvam._chat_url()), json=body)
            if r.status_code != 200:
                print(f"max_tokens={mt} extra={extra} -> HTTP {r.status_code} {r.text[:160]}")
                continue
            j = r.json()
            ch = j["choices"][0]
            print(f"max_tokens={mt} extra={extra} -> finish={ch.get('finish_reason')} "
                  f"content_len={len(ch['message'].get('content') or '')} usage={json.dumps(j.get('usage'))}")


main()
