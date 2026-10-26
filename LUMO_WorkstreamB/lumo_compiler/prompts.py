import json

SYSTEM_PROMPT = """You extract financial facts from a street vendor's narrative (Hindi, Hinglish or English).
Output ONLY a JSON object that matches the given schema. No prose.

Rules:
1. For every number, copy the user's exact words into source_span. The span must appear verbatim in the text.
2. NEVER calculate totals, profit, averages or conversions. NEVER invent a number.
3. If something is not said, use value=null, status="missing", source_span=null.
4. status="stated" only if the user said it directly. Use "inferred" rarely. Use "ambiguous" if the user gave a vague or conflicting number.
5. Income basis: if the user does not say whether the amount is total sales (bikri) or what is left after buying stock, set basis="unknown". Words like bikri/sales/gala => gross_sales. Words like bachta/munafa/kharcha nikalke => net_after_stock.
6. Interest: if the interest period (per day/week/month/year) is not stated, set interest_period="unknown". Never assume it.
7. Keep due dates as the user's words in due_date_text (e.g. "somvaar tak"). Do NOT convert them to dates.
8. One income item per distinct statement. Use kind good_day / bad_day only if the user says so; otherwise "typical".
9. Empty lists are fine when nothing is mentioned.
"""


def _f(value=None, status="missing", span=None):
    return {"value": value, "status": status, "source_span": span}


_EMPTY = _f()

EX1_IN = "Main roz 1500 kamata hoon. Abhi cash 800 hai."
EX1_OUT = {
    "cash_on_hand": _f(800, "stated", "cash 800"),
    "min_reserve": _EMPTY,
    "income": [{"kind": "typical", "amount": _f(1500, "stated", "roz 1500"),
                "basis": "unknown", "period": "day", "days_per_week": _EMPTY}],
    "expenses": [], "debts": [], "household": [], "goals": [],
}

EX2_IN = ("Supplier ko 5000 dena hai somvaar tak. Mahajan se 10000 liya hai, "
          "3 rupaye sainkda byaj. Beti ki fees 1200 mahina.")
EX2_OUT = {
    "cash_on_hand": _EMPTY, "min_reserve": _EMPTY, "income": [], "expenses": [],
    "debts": [
        {"creditor_type": "supplier_credit", "principal": _f(5000, "stated", "5000 dena hai"),
         "interest_rate_pct": _EMPTY, "interest_period": "unknown", "installment": _EMPTY,
         "due_date_text": "somvaar tak"},
        {"creditor_type": "moneylender", "principal": _f(10000, "stated", "10000 liya"),
         "interest_rate_pct": _f(3, "stated", "3 rupaye sainkda"), "interest_period": "unknown",
         "installment": _EMPTY, "due_date_text": None},
    ],
    "household": [{"description": "beti ki fees", "amount": _f(1200, "stated", "fees 1200 mahina"),
                   "period": "month"}],
    "goals": [],
}

FEWSHOT = [(EX1_IN, EX1_OUT), (EX2_IN, EX2_OUT)]


def build_messages(text_norm: str, today_iso: str, feedback: str | None = None):
    msgs = [{"role": "system", "content": SYSTEM_PROMPT}]
    for i, o in FEWSHOT:
        msgs.append({"role": "user", "content": f"Text: {i}"})
        msgs.append({"role": "assistant", "content": json.dumps(o, ensure_ascii=False)})
    user = f"Today is {today_iso}.\nText: {text_norm}"
    if feedback:
        user += f"\n\nYour previous output was invalid: {feedback}\nReturn corrected JSON only."
    msgs.append({"role": "user", "content": user})
    return msgs
