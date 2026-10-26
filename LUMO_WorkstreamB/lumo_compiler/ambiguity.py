"""Rule-based clarifying questions. Only asks when the answer changes the calculation."""
MAX_QUESTIONS = 3
PERIOD_HI = {"day": "रोज़", "week": "हर हफ़्ते", "month": "हर महीने", "unknown": ""}
PERIOD_EN = {"day": "per day", "week": "per week", "month": "per month", "unknown": ""}
WHO_EN = {"supplier_credit": "your supplier", "moneylender": "the lender", "bank_mfi": "the bank/MFI",
          "family": "your family member", "other": "this creditor"}
WHO_HI = {"supplier_credit": "सप्लायर", "moneylender": "महाजन/साहूकार", "bank_mfi": "बैंक/MFI",
          "family": "परिवार के सदस्य", "other": "इस देनदार"}
PERIOD_OPTS = [("day", "Per day", "रोज़"), ("week", "Per week", "हर हफ़्ते"), ("month", "Per month", "हर महीने")]
CONFIRM = "__confirm__"


def _inr(v):
    return f"₹{int(v):,}"


def _opts(rows):
    return [{"value": v, "label_en": en, "label_hi": hi} for v, en, hi in rows]


def build_questions(ext, max_questions=MAX_QUESTIONS):
    qs = []

    def add(pri, qid, path, en, hi, why, answer_type="number", options=None):
        qs.append({"id": qid, "priority": pri, "field_path": path, "question_en": en, "question_hi": hi,
                   "why_it_matters": why, "answer_type": answer_type, "options": options or []})

    cash = ext["cash_on_hand"]
    if cash["value"] is None:
        add(2, "cash_missing", "cash_on_hand", "How much cash do you have in hand right now?",
            "अभी आपके पास हाथ में कितना नकद है?", "Cash already available is different from expected income.")

    if not ext["income"]:
        add(1, "income_missing", "income", "How much do you sell or earn on a normal day?",
            "आप आम दिन में कितना बेचते या कमाते हैं?", "Income is needed to project cash flow.",
            answer_type="narrative")

    groups = {}
    for i, inc in enumerate(ext["income"]):
        a = inc["amount"]
        amt = _inr(a["value"]) if a["value"] is not None else ""
        if a["value"] is None:
            add(2, f"income_amount:{i}", f"income[{i}].amount", "How much is that amount?",
                "यह रकम कितनी है?", "Income amount is missing.")
        if inc["basis"] == "unknown":
            add(1, f"income_basis:{i}", f"income[{i}].basis",
                f"Is {amt or 'this amount'} your total sales, or what is left after buying stock?",
                f"क्या {amt or 'यह रकम'} कुल बिक्री है, या माल खरीदने के बाद बची रकम?",
                "Sales are not profit. The whole calculation changes with this answer.", "choice",
                _opts([("gross_sales", "Total sales", "कुल बिक्री"),
                       ("net_after_stock", "Left after buying stock", "माल खरीदने के बाद बचा")]))
        if inc["period"] == "unknown":
            add(1, f"income_period:{i}", f"income[{i}].period",
                f"Is {amt or 'this amount'} per day, per week or per month?",
                f"क्या {amt or 'यह रकम'} रोज़, हफ़्ते या महीने की है?",
                "We need the time period to project cash.", "choice", _opts(PERIOD_OPTS))
        if inc["period"] == "day" and inc["days_per_week"]["value"] is None:
            add(4, f"income_days:{i}", f"income[{i}].days_per_week", "How many days a week do you work?",
                "आप हफ़्ते में कितने दिन काम करते हैं?", "Needed to turn daily income into weekly/monthly.")
        if a["value"] is not None and a["status"] == "ambiguous":
            add(2, f"income_confirm:{i}", f"income[{i}].amount", f"Did you mean {amt}? Please confirm.",
                f"क्या आपका मतलब {amt} है? कृपया पुष्टि करें।", "This number looks unusual or unclear.",
                "choice", _opts([(CONFIRM, "Yes, correct", "हाँ, सही है")]))
        if a["value"] is not None and a["status"] == "stated":
            groups.setdefault((inc["kind"], inc["basis"], inc["period"]), []).append(a["value"])
    for key, vals in groups.items():
        if len(set(vals)) > 1:
            add(1, f"income_conflict:{'/'.join(key)}", "income",
                f"You mentioned different amounts ({', '.join(_inr(v) for v in vals)}). Which one is right?",
                f"आपने अलग-अलग रकम बताई ({', '.join(_inr(v) for v in vals)})। कौन सी सही है?",
                "Conflicting amounts cannot both be used.", "narrative")

    for i, d in enumerate(ext["debts"]):
        ct = d["creditor_type"]
        if d["principal"]["value"] is None:
            add(2, f"debt_principal:{i}", f"debts[{i}].principal", f"How much do you owe {WHO_EN[ct]}?",
                f"आपको {WHO_HI[ct]} को कितना देना है?", "Debt amount is missing.")
        rate = d["interest_rate_pct"]["value"]
        if rate is not None and d["interest_period"] == "unknown":
            add(1, f"debt_interest_period:{i}", f"debts[{i}].interest_period",
                f"Is the {rate:g}% interest charged per day, week, month or year?",
                f"क्या {rate:g}% ब्याज रोज़, हफ़्ते, महीने या साल का है?",
                "Monthly vs yearly interest changes the cost hugely.", "choice",
                _opts(PERIOD_OPTS + [("year", "Per year", "हर साल")]))
        if d["due_date"] is None and d["principal"]["value"] is not None:
            add(2, f"debt_due:{i}", f"debts[{i}].due_date_text", f"When do you have to pay {WHO_EN[ct]}?",
                f"{WHO_HI[ct]} को पैसे कब देने हैं? (जैसे: सोमवार, 5 दिन में, 25/10)",
                "Due dates decide when a cash gap can appear.", "date")
    qs.sort(key=lambda q: q["priority"])
    return qs[:max_questions], max(0, len(qs) - max_questions)
