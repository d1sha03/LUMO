import unittest

from ..money import format_inr, to_number, quantize_money
from ..scheduler import add_months_clamped, generate_events, occurrence_dates
from .helpers import d, flow


def ds(*xs):
    return [d(x) for x in xs]


class OccurrenceDates(unittest.TestCase):
    def test_once_inside_and_outside_window(self):
        self.assertEqual(occurrence_dates(d("2026-10-21"), "once", d("2026-10-19"), d("2026-10-25")), ds("2026-10-21"))
        self.assertEqual(occurrence_dates(d("2026-10-26"), "once", d("2026-10-19"), d("2026-10-25")), [])
        self.assertEqual(occurrence_dates(d("2026-10-18"), "once", d("2026-10-19"), d("2026-10-25")), [])

    def test_daily_never_before_start_and_includes_final_day(self):
        got = occurrence_dates(d("2026-10-22"), "daily", d("2026-10-19"), d("2026-10-24"))
        self.assertEqual(got, ds("2026-10-22", "2026-10-23", "2026-10-24"))

    def test_daily_start_before_window_begins_at_window(self):
        got = occurrence_dates(d("2026-10-01"), "daily", d("2026-10-19"), d("2026-10-20"))
        self.assertEqual(got, ds("2026-10-19", "2026-10-20"))

    def test_weekly_anchored_on_start_weekday(self):
        # 2026-10-05 and 2026-10-19 are Mondays
        got = occurrence_dates(d("2026-10-05"), "weekly", d("2026-10-19"), d("2026-10-31"))
        self.assertEqual(got, ds("2026-10-19", "2026-10-26"))
        got = occurrence_dates(d("2026-10-21"), "weekly", d("2026-10-19"), d("2026-11-04"))
        self.assertEqual(got, ds("2026-10-21", "2026-10-28", "2026-11-04"))
        got = occurrence_dates(d("2026-10-07"), "weekly", d("2026-10-19"), d("2026-10-25"))
        self.assertEqual(got, ds("2026-10-21"))

    def test_monthly_clamps_to_short_month_without_drifting(self):
        got = occurrence_dates(d("2026-01-31"), "monthly", d("2026-02-01"), d("2026-04-30"))
        self.assertEqual(got, ds("2026-02-28", "2026-03-31", "2026-04-30"))

    def test_monthly_leap_year(self):
        got = occurrence_dates(d("2028-01-31"), "monthly", d("2028-02-01"), d("2028-02-29"))
        self.assertEqual(got, ds("2028-02-29"))

    def test_monthly_year_rollover_and_feb_clamp(self):
        got = occurrence_dates(d("2026-11-30"), "monthly", d("2026-12-01"), d("2027-03-01"))
        self.assertEqual(got, ds("2026-12-30", "2027-01-30", "2027-02-28"))

    def test_monthly_start_in_future_and_window_edges(self):
        self.assertEqual(occurrence_dates(d("2026-11-15"), "monthly", d("2026-10-19"), d("2026-11-14")), [])
        self.assertEqual(occurrence_dates(d("2026-01-15"), "monthly", d("2026-03-15"), d("2026-04-15")),
                         ds("2026-03-15", "2026-04-15"))

    def test_start_after_window_gives_nothing(self):
        for f in ("once", "daily", "weekly", "monthly"):
            self.assertEqual(occurrence_dates(d("2026-12-01"), f, d("2026-10-19"), d("2026-10-25")), [])

    def test_unknown_frequency_rejected(self):
        with self.assertRaises(ValueError):
            occurrence_dates(d("2026-10-19"), "yearly", d("2026-10-19"), d("2026-10-25"))

    def test_add_months_clamped(self):
        self.assertEqual(add_months_clamped(d("2026-01-31"), 1), d("2026-02-28"))
        self.assertEqual(add_months_clamped(d("2026-01-31"), 2), d("2026-03-31"))

    def test_generate_events_sorted_and_windowed(self):
        flows = [flow("b", "outflow", "other", 5, "once", "2026-10-20"),
                 flow("a", "inflow", "other", 7, "daily", "2026-10-20")]
        ev = generate_events(flows, d("2026-10-19"), d("2026-10-21"))
        self.assertEqual([(e.date, e.flow_id) for e in ev],
                         [(d("2026-10-20"), "b"), (d("2026-10-20"), "a"), (d("2026-10-21"), "a")])


class Money(unittest.TestCase):
    def test_format_inr(self):
        self.assertEqual(format_inr(1500), "₹1,500")
        self.assertEqual(format_inr(100000), "₹1,00,000")
        self.assertEqual(format_inr("1234567.5"), "₹12,34,567.50")
        self.assertEqual(format_inr(-500), "-₹500")

    def test_rounding_half_up_and_json_numbers(self):
        self.assertEqual(str(quantize_money("5.025")), "5.03")
        self.assertEqual(to_number(quantize_money("1500")), 1500)
        self.assertIsInstance(to_number(1500), int)
        self.assertEqual(to_number("233.1"), 233.1)


if __name__ == "__main__":
    unittest.main()
