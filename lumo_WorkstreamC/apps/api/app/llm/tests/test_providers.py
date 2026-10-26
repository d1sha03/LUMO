import unittest

from ..errors import ProviderCallError, ProviderNotConfigured
from ..providers import bharatgen_from_env, sarvam_from_env
from .helpers import MockServer, ok

MSG = [{"role": "user", "content": "hi"}]


class Providers(unittest.TestCase):
    def test_bharatgen_self_hosted_bearer_optional(self):
        with MockServer([ok("{}")]) as s:
            p = bharatgen_from_env({"BHARATGEN_BASE_URL": s.url})
            self.assertTrue(p.is_configured())              # self-hosted: key optional
            self.assertEqual(p.chat(MSG), "{}")
            req = s.requests[0]
            self.assertEqual(req["path"], "/v1/chat/completions")
            self.assertNotIn("authorization", req["headers"])
            self.assertEqual(req["body"]["model"], "bharatgenai/Param-1-2.9B-Instruct")
            self.assertEqual(req["body"]["temperature"], 0.0)
            self.assertNotIn("response_format", req["body"])

    def test_bharatgen_with_key_and_json_mode(self):
        with MockServer([ok("{}")]) as s:
            p = bharatgen_from_env({"BHARATGEN_BASE_URL": s.url, "BHARATGEN_API_KEY": "k123",
                                    "BHARATGEN_JSON_MODE": "true", "BHARATGEN_MODEL": "bharatgenai/Param2-17B"})
            p.chat(MSG)
            r = s.requests[0]
            self.assertEqual(r["headers"]["authorization"], "Bearer k123")
            self.assertEqual(r["body"]["response_format"], {"type": "json_object"})
            self.assertEqual(r["body"]["model"], "bharatgenai/Param2-17B")

    def test_sarvam_subscription_header_and_model(self):
        with MockServer([ok("{}")]) as s:
            p = sarvam_from_env({"SARVAM_BASE_URL": s.url, "SARVAM_API_KEY": "sk-abc"})
            p.chat(MSG)
            r = s.requests[0]
            self.assertEqual(r["headers"]["api-subscription-key"], "sk-abc")
            self.assertNotIn("authorization", r["headers"])
            self.assertEqual(r["body"]["model"], "sarvam-105b")

    def test_sarvam_header_and_model_overridable(self):
        with MockServer([ok("{}")]) as s:
            sarvam_from_env({"SARVAM_BASE_URL": s.url, "SARVAM_API_KEY": "x", "SARVAM_MODEL": "sarvam-105b",
                             "SARVAM_AUTH_HEADER": "X-Key"}).chat(MSG)
            self.assertEqual(s.requests[0]["headers"]["x-key"], "x")
            self.assertEqual(s.requests[0]["body"]["model"], "sarvam-105b")

    def test_sarvam_accepts_main_app_llm_environment_names(self):
        with MockServer([ok("{}")]) as s:
            p = sarvam_from_env({
                "LLM_BASE_URL": s.url,
                "LLM_API_KEY": "llm-secret",
                "LLM_MODEL": "sarvam-105b",
            })
            p.chat(MSG)
            request = s.requests[0]
            self.assertEqual(request["headers"]["api-subscription-key"], "llm-secret")
            self.assertEqual(request["body"]["model"], "sarvam-105b")

    def test_not_configured(self):
        self.assertFalse(sarvam_from_env({}).is_configured())                 # key required
        self.assertFalse(bharatgen_from_env({}).is_configured())              # no base url
        self.assertFalse(bharatgen_from_env({"BHARATGEN_BASE_URL": "ftp://x"}).is_configured())
        with self.assertRaises(ProviderNotConfigured):
            sarvam_from_env({}).chat(MSG)

    def test_reasoning_blocks_stripped(self):
        with MockServer([ok("<think>hmm 12345</think>{\"a\": 1}")]) as s:
            self.assertEqual(bharatgen_from_env({"BHARATGEN_BASE_URL": s.url}).chat(MSG).strip().endswith('{"a": 1}'), True)

    def test_http_error_has_no_secret(self):
        with MockServer([(500, {"error": "boom"}, 0)]) as s:
            p = sarvam_from_env({"SARVAM_BASE_URL": s.url, "SARVAM_API_KEY": "TOPSECRET"})
            with self.assertRaises(ProviderCallError) as c:
                p.chat(MSG)
            self.assertIn("HTTP 500", str(c.exception))
            self.assertNotIn("TOPSECRET", str(c.exception))

    def test_bad_shapes_are_call_errors(self):
        for resp in (ok(None), ok("   "), ok("{}", finish="length"), (200, "not json", 0), (200, {"choices": []}, 0)):
            with MockServer([resp]) as s:
                with self.assertRaises(ProviderCallError, msg=str(resp)):
                    bharatgen_from_env({"BHARATGEN_BASE_URL": s.url}).chat(MSG)

    def test_unclosed_think_block_is_empty_answer(self):
        with MockServer([ok("<think>still thinking and ran out of tokens")]) as s:
            with self.assertRaises(ProviderCallError):
                bharatgen_from_env({"BHARATGEN_BASE_URL": s.url}).chat(MSG)

    def test_timeout(self):
        with MockServer([(200, {"choices": [{"message": {"content": "{}"}}]}, 1.0)]) as s:
            p = bharatgen_from_env({"BHARATGEN_BASE_URL": s.url, "LUMO_LLM_TIMEOUT_SECONDS": "0.2"})
            with self.assertRaises(ProviderCallError) as c:
                p.chat(MSG)
            self.assertIn("timed out", str(c.exception))

    def test_connection_refused(self):
        p = bharatgen_from_env({"BHARATGEN_BASE_URL": "http://127.0.0.1:9/v1", "LUMO_LLM_TIMEOUT_SECONDS": "1"})
        with self.assertRaises(ProviderCallError):
            p.chat(MSG)


if __name__ == "__main__":
    unittest.main()
