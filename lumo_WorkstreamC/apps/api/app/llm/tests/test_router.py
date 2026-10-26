"""HTTP-layer tests for /api/explain and /api/intake/compile. Skipped without fastapi/pydantic/httpx."""
import unittest

try:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from ..gateway import LLMGateway
    from ..router import register_llm, set_gateway
    HAVE_DEPS = True
except Exception:  # pragma: no cover
    HAVE_DEPS = False


@unittest.skipUnless(HAVE_DEPS, "fastapi/pydantic/httpx not installed")
class LLMRouter(unittest.TestCase):
    def setUp(self):
        set_gateway(LLMGateway([]))
        app = FastAPI()
        register_llm(app)
        self.client = TestClient(app)

    def tearDown(self):
        set_gateway(None)

    def test_explain_contract(self):
        r = self.client.post("/api/explain", json={
            "term_key": "projected_cash_shortfall", "language": "hi-IN", "include_audio": True,
            "context": {"scenario_status": "reserve_breach", "shortfall_to_reserve": 500,
                        "minimum_balance_date": "2026-10-23"}})
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual((body["provider"], body["mode"], body["audio"]["status"]), ("fallback", "demo", "unavailable"))
        self.assertIn("₹500", body["example"])

    def test_explain_unknown_term_is_structured_422(self):
        r = self.client.post("/api/explain", json={"term_key": "nope", "language": "en-IN", "context": {}})
        self.assertEqual(r.status_code, 422)
        self.assertEqual(r.json()["issues"][0]["code"], "unknown_term")

    def test_explain_bad_language_uses_same_error_shape(self):
        r = self.client.post("/api/explain", json={"term_key": "minimum_reserve", "language": "fr-FR"})
        self.assertEqual(r.status_code, 422)
        self.assertEqual(r.json()["error"], "validation_error")

    def test_intake_compile(self):
        r = self.client.post("/api/intake/compile", json={
            "text": "I sell vegetables and earn about 1500 rupees per day", "language": "en-IN",
            "as_of_date": "2026-10-19", "existing_twin": None})
        self.assertEqual(r.status_code, 200, r.text)
        body = r.json()
        self.assertEqual(body["mode"], "demo")
        self.assertEqual(body["draft_twin"]["profile"]["cash_on_hand"], None)
        self.assertIn("q_cash_on_hand", [q["id"] for q in body["questions_required"]])


if __name__ == "__main__":
    unittest.main()
