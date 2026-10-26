"""HTTP-layer tests. Skipped automatically when fastapi/pydantic/httpx are not installed.
Run in the integration environment: pip install fastapi pydantic httpx pytest"""
import copy
import json
import unittest
from pathlib import Path

try:
    from fastapi import FastAPI
    from fastapi.testclient import TestClient
    from ..router import register_finance
    HAVE_DEPS = True
except Exception:  # pragma: no cover
    HAVE_DEPS = False

EXAMPLES = Path(__file__).resolve().parent.parent / "examples"


def load(name):
    return json.loads((EXAMPLES / name).read_text(encoding="utf-8"))


@unittest.skipUnless(HAVE_DEPS, "fastapi/pydantic/httpx not installed")
class Router(unittest.TestCase):
    def setUp(self):
        app = FastAPI()
        register_finance(app)
        self.client = TestClient(app)

    def test_example_request_matches_documented_response(self):
        r = self.client.post("/api/finance/simulate", json=load("simulate_request.json"))
        self.assertEqual(r.status_code, 200, r.text)
        self.assertEqual(r.json(), load("simulate_response.json"))   # also proves 0.7 survives JSON->Decimal

    def test_missing_inputs_return_structured_422(self):
        r = self.client.post("/api/finance/simulate", json=load("simulate_missing_inputs_request.json"))
        self.assertEqual(r.status_code, 422)
        self.assertEqual(r.json(), load("simulate_missing_inputs_response_422.json"))

    def test_malformed_request_uses_same_error_shape(self):
        req = copy.deepcopy(load("simulate_request.json"))
        req["twin"]["profile"]["forecast_days"] = 0
        r = self.client.post("/api/finance/simulate", json=req)
        self.assertEqual(r.status_code, 422)
        body = r.json()
        self.assertEqual(body["error"], "validation_error")
        self.assertTrue(any(i["field"].endswith("forecast_days") for i in body["issues"]))

    def test_empty_scenarios_rejected(self):
        req = copy.deepcopy(load("simulate_request.json"))
        req["scenarios"] = []
        self.assertEqual(self.client.post("/api/finance/simulate", json=req).status_code, 422)


if __name__ == "__main__":
    unittest.main()
