from datetime import date

from lumo_compiler.dates import resolve_date_text
from lumo_compiler.normalize import normalize_text, parse_number


def test_number_words():
    assert "1500" in normalize_text("dedh hazaar")
    assert "500" in normalize_text("paanch sau")
    assert "2000" in normalize_text("2 hazaar")
    assert "2500" in normalize_text("do hazaar paanch sau")
    assert "125000" in normalize_text("sawa lakh")
    assert "1500" in normalize_text("डेढ़ हज़ार")


def test_digits_and_commas():
    assert normalize_text("₹१५००") == "₹1500"
    assert normalize_text("1,500 rupaye") == "1500 rupaye"
    assert "2000" in normalize_text("2k")


def test_parse_number():
    assert parse_number("dedh hazaar") == 1500
    assert parse_number("₹२०००") == 2000


def test_dates():
    today = date(2026, 10, 20)  # Tuesday
    assert resolve_date_text("agle somvaar", today) == date(2026, 10, 26)
    assert resolve_date_text("5 din mein", today) == date(2026, 10, 25)
    assert resolve_date_text("kal", today) == date(2026, 10, 21)
    assert resolve_date_text("25/10", today) == date(2026, 10, 25)
    assert resolve_date_text("2026-11-01", today) == date(2026, 11, 1)
    assert resolve_date_text("kabhi", today) is None
