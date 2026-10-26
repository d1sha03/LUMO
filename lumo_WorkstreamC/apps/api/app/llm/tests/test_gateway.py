import json
import unittest

from ..errors import OutputRejected
from ..gateway import LLMGateway, build_gateway_from_env
from ..providers import bharatgen_from_env, sarvam_from_env
from .helpers import MockServer, ok, ok_json


def validate(obj):
    if obj.get("x") != 1:
        raise OutputRejected("x must be 1")
    return obj["x"]


def fallback():
    return "FALLBACK"


MSG = [{"role": "user", "content": "q"}]


class Gateway(unittest.TestCase):
    def test_live_success(self):
        with MockServer([ok_json({"x": 1})]) as s:
            g = LLMGateway([bharatgen_from_env({"BHARATGEN_BASE_URL": s.url})])
            r = g.run_json(MSG, validate, fallback)
        self.assertEqual((r.value, r.mode, r.provider), (1, "live", "bharatgen:bharatgenai/Param-1-2.9B-Instruct"))
        self.assertEqual(r.warnings(), [])

    def test_json_in_code_fence_accepted(self):
        with MockServer([ok('Sure!\n```json\n{"x": 1}\n```')]) as s:
            r = LLMGateway([bharatgen_from_env({"BHARATGEN_BASE_URL": s.url})]).run_json(MSG, validate, fallback)
        self.assertEqual(r.mode, "live")

    def test_repair_retry_sends_rejection_reason(self):
        with MockServer([ok("not json at all"), ok_json({"x": 1})]) as s:
            r = LLMGateway([bharatgen_from_env({"BHARATGEN_BASE_URL": s.url})]).run_json(MSG, validate, fallback)
            self.assertEqual(r.mode, "live")
            self.assertEqual(len(s.requests), 2)
            retry = s.requests[1]["body"]["messages"]
            self.assertEqual(retry[-1]["role"], "user")
            self.assertIn("rejected", retry[-1]["content"])
            self.assertEqual(retry[-2]["content"], "not json at all")

    def test_validation_rejection_exhausts_attempts_then_next_provider(self):
        with MockServer([ok_json({"x": 2})]) as bad, MockServer([ok_json({"x": 1})]) as good:
            g = LLMGateway([bharatgen_from_env({"BHARATGEN_BASE_URL": bad.url}),
                            sarvam_from_env({"SARVAM_BASE_URL": good.url, "SARVAM_API_KEY": "k"})], max_attempts=2)
            r = g.run_json(MSG, validate, fallback)
            self.assertEqual(len(bad.requests), 2)
            self.assertEqual(r.provider, "sarvam:sarvam-105b")
            self.assertEqual(r.mode, "live")
            self.assertTrue(any("rejected" in w for w in r.warnings()))

    def test_http_failure_goes_to_next_provider_without_retry(self):
        with MockServer([(503, {}, 0)]) as bad, MockServer([ok_json({"x": 1})]) as good:
            g = LLMGateway([bharatgen_from_env({"BHARATGEN_BASE_URL": bad.url}),
                            sarvam_from_env({"SARVAM_BASE_URL": good.url, "SARVAM_API_KEY": "k"})])
            r = g.run_json(MSG, validate, fallback)
            self.assertEqual(len(bad.requests), 1)
            self.assertEqual(r.provider, "sarvam:sarvam-105b")

    def test_no_provider_configured_is_labelled_demo(self):
        r = build_gateway_from_env({}).run_json(MSG, validate, fallback)
        self.assertEqual((r.value, r.mode, r.provider), ("FALLBACK", "demo", "fallback"))
        self.assertIn("No government LLM is configured", r.warnings()[0])

    def test_all_providers_fail_falls_back_and_says_so(self):
        with MockServer([(500, {}, 0)]) as s:
            r = LLMGateway([bharatgen_from_env({"BHARATGEN_BASE_URL": s.url})]).run_json(MSG, validate, fallback)
        self.assertEqual((r.mode, r.provider), ("demo", "fallback"))
        self.assertTrue(any("HTTP 500" in w for w in r.warnings()))
        self.assertTrue(any("fallback was used" in w for w in r.warnings()))

    def test_env_factory(self):
        g = build_gateway_from_env({"LUMO_LLM_PROVIDERS": "sarvam, bharatgen, demo", "SARVAM_API_KEY": "k",
                                    "BHARATGEN_BASE_URL": "http://localhost:8000/v1"})
        self.assertEqual([p.key for p in g.providers], ["sarvam", "bharatgen"])
        self.assertTrue(g.any_configured())
        self.assertEqual([p.key for p in build_gateway_from_env({}).providers], ["bharatgen", "sarvam"])
        self.assertFalse(build_gateway_from_env({}).any_configured())

    def test_only_government_backed_providers_allowed(self):
        for name in ("openai", "anthropic", "bharatgen,gemini"):
            with self.assertRaises(ValueError) as c:
                build_gateway_from_env({"LUMO_LLM_PROVIDERS": name})
            self.assertIn("government-backed", str(c.exception))

    def test_describe_never_exposes_keys(self):
        g = build_gateway_from_env({"SARVAM_API_KEY": "SECRETVALUE"})
        text = json.dumps(g.describe())
        self.assertNotIn("SECRETVALUE", text)
        self.assertIn("IndiaAI", text)


if __name__ == "__main__":
    unittest.main()
