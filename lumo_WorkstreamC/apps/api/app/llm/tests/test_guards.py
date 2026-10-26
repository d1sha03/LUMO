import unittest
from decimal import Decimal as D

from ..glossary import LANGUAGES, TERMS, fallback_text
from ..guards import banned_phrases, disallowed_numbers, language_ok
from ..text_utils import numbers_in, parse_json_object, stated_numbers
from ..errors import OutputRejected


class Numbers(unittest.TestCase):
    def test_numbers_in_formats(self):
        self.assertEqual(numbers_in("₹1,500 and 12,34,567.50 and 7"), {D("1500"), D("1234567.50"), D("7")})
        self.assertEqual(numbers_in("₹१,५०० और ੨੦੦੦"), {D("1500"), D("2000")})
        self.assertEqual(numbers_in("2026-11-01"), {D("2026"), D("11"), D("1")})
        self.assertIn(D("2000"), numbers_in("2 hazar rupaye"))
        self.assertIn(D("150000"), numbers_in("1.5 lakh"))
        self.assertIn(D("2500"), numbers_in("2.5k"))

    def test_spoken_numbers_count_as_stated(self):
        # Saaras returns speech as words, so "आठ सौ" must count as the amount 800 for intake.
        self.assertIn(D("800"), stated_numbers("मेरी रोज़ की कमाई आठ सौ रुपये है"))
        self.assertIn(D("500"), stated_numbers("माल पर पाँच सौ रुपये लगते हैं"))
        self.assertIn(D("18000"), stated_numbers("अठारह हज़ार रुपये"))
        self.assertIn(D("800"), stated_numbers("eight hundred rupees"))
        self.assertIn(D("2000"), stated_numbers("ਦੋ ਹਜ਼ਾਰ ਰੁਪਏ"))
        self.assertNotIn(D("30"), stated_numbers("तीसरा महीना"))    # an ordinal is not the amount 30
        self.assertNotIn(D("2"), stated_numbers("company"))         # never split a word in half
        # The answer-side guard keeps reading digits only, so the word "एक" is not the number 1.
        self.assertNotIn(D("800"), numbers_in("आठ सौ रुपये"))
        self.assertNotIn(D("1"), numbers_in("एक दुकान है"))

    def test_disallowed_numbers(self):
        allowed = {D("500"), D("2026"), D("10"), D("23")}
        self.assertEqual(disallowed_numbers("₹500 on 2026-10-23", allowed), [])
        self.assertEqual(disallowed_numbers("₹700 on 2026-10-23", allowed), [D("700")])
        self.assertEqual(disallowed_numbers("पाँच सौ नहीं, ७०० रुपये", allowed), [D("700")])   # Devanagari digits checked too
        self.assertEqual(disallowed_numbers("1. First point\n2) Second point", allowed), [])    # list markers ignored
        self.assertEqual(disallowed_numbers("500.0", {D("500")}), [])

    def test_language_guard(self):
        self.assertTrue(language_ok("आपकी नकदी कम हो सकती है", "hi-IN"))
        self.assertFalse(language_ok("Your cash may run low", "hi-IN"))
        self.assertTrue(language_ok("ਤੁਹਾਡੀ ਨਕਦੀ ਘੱਟ ਹੋ ਸਕਦੀ ਹੈ", "pa-IN"))
        self.assertFalse(language_ok("आपकी नकदी कम हो सकती है", "pa-IN"))
        self.assertTrue(language_ok("Your cash may run low", "en-IN"))
        self.assertFalse(language_ok("आपकी नकदी कम हो सकती है", "en-IN"))

    def test_banned_phrases(self):
        for bad in ("We guarantee you will be fine", "You will definitely run out", "You should take a loan",
                    "आपको लोन ले लेना चाहिए", "यह पक्का होगा", "ਇਹ ਪੱਕਾ ਹੈ"):
            self.assertTrue(banned_phrases(bad), bad)
        self.assertFalse(banned_phrases("This is a warning, not a certainty."))

    def test_fallback_templates_pass_every_guard(self):
        ctx = {"scenario_status": "reserve_breach", "shortfall_to_reserve": 500, "minimum_balance": -800,
               "minimum_balance_date": "2026-10-23", "minimum_reserve": 1500, "sales_change_percent": -30,
               "shock_duration_days": 14}
        allowed = numbers_in(" ".join(str(v) for v in ctx.values()))
        for term in TERMS:
            for lang in LANGUAGES:
                for c in (ctx, {}, {**ctx, "scenario_status": "cash_deficit"}, {**ctx, "scenario_status": "within_reserve"}):
                    e, x = fallback_text(term, lang, c)
                    text = f"{e} {x}"
                    self.assertEqual(disallowed_numbers(text, allowed), [], (term, lang))
                    self.assertTrue(language_ok(text, lang), (term, lang))
                    self.assertEqual(banned_phrases(text), [], (term, lang))
                    self.assertTrue(e.strip() and x.strip())


class Json(unittest.TestCase):
    def test_parse_variants(self):
        self.assertEqual(parse_json_object('x {"a": 1} y'), {"a": 1})
        self.assertEqual(parse_json_object('<think>{"a": 9}</think>{"a": 2}'), {"a": 2})
        for bad in ("", "no json", "[1,2]", '{"a": }'):
            with self.assertRaises(OutputRejected):
                parse_json_object(bad)


if __name__ == "__main__":
    unittest.main()
