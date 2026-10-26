from app.intelligence.twin_adapter import twin_to_financial_profile


def test_twin_adapter_preserves_unknowns_and_maps_recorded_values():
    twin = {
        "as_of_date": "2026-10-19",
        "language": "hi-IN",
        "profile": {
            "occupation": "vegetable vendor",
            "cash_on_hand": None,
            "district": "Lucknow",
            "state": "Uttar Pradesh",
        },
        "cash_flows": [
            {
                "amount": 500,
                "frequency": "weekly",
                "direction": "inflow",
                "category": "business_sales",
                "label": "Weekly sales",
                "source_type": "user_statement",
                "source_note": "I sell 500 each week",
                "confidence": 0.8,
            },
            {
                "amount": 1500,
                "frequency": "monthly",
                "direction": "outflow",
                "category": "debt_repayment",
                "label": "Loan repayment",
            },
            {
                "amount": 9000,
                "frequency": "monthly",
                "direction": "outflow",
                "category": "household_essential",
                "label": "Household expenses",
                "essential": True,
            },
        ],
        "goals": [
            {
                "label": "Children school fees",
                "target_amount": 15000,
                "target_date": "2027-01-19",
                "priority": "essential",
                "current_saved": None,
                "source_type": "user_statement",
                "source_note": "Children school fees 15000 in three months",
                "confidence": 0.8,
            },
        ],
    }

    profile = twin_to_financial_profile(twin)

    assert profile.user.occupation == "street_vendor"
    assert profile.user.language == "hi"
    assert profile.user.location == "Lucknow, Uttar Pradesh"
    assert profile.income.monthly_average == 500 * 52 / 12
    assert profile.expenses.essential_monthly == 9000
    assert profile.debts[0].monthly_payment == 1500
    assert profile.goals[0].deadline_months == 3
    assert profile.goals[0].current_savings is None
    assert profile.cash_available is None
    assert profile.source_metadata["cash_flows"][0]["confidence"] == 0.8
    assert profile.source_metadata["goals"][0]["source_note"] == "Children school fees 15000 in three months"
