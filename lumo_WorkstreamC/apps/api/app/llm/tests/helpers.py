"""Mock OpenAI-compatible server (real HTTP on localhost) for exercising the provider adapters."""
import json
import threading
import time
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


def ok(content, finish="stop"):
    return 200, {"choices": [{"message": {"content": content}, "finish_reason": finish}]}, 0


def ok_json(obj):
    return ok(json.dumps(obj, ensure_ascii=False))


class MockServer:
    """responses: list of (status, body, delay_seconds); the last one repeats when exhausted."""

    def __init__(self, responses):
        self.responses = list(responses)
        self.requests = []
        outer = self

        class Handler(BaseHTTPRequestHandler):
            def log_message(self, *a):
                pass

            def do_POST(self):
                length = int(self.headers.get("Content-Length", 0))
                body = json.loads(self.rfile.read(length) or b"{}")
                outer.requests.append({"path": self.path, "headers": {k.lower(): v for k, v in self.headers.items()}, "body": body})
                idx = min(len(outer.requests) - 1, len(outer.responses) - 1)
                status, payload, delay = outer.responses[idx]
                if delay:
                    time.sleep(delay)
                data = payload if isinstance(payload, (bytes, str)) else json.dumps(payload)
                data = data.encode("utf-8") if isinstance(data, str) else data
                try:
                    self.send_response(status)
                    self.send_header("Content-Type", "application/json")
                    self.send_header("Content-Length", str(len(data)))
                    self.end_headers()
                    self.wfile.write(data)
                except (BrokenPipeError, ConnectionResetError):
                    pass

        self.httpd = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = f"http://127.0.0.1:{self.httpd.server_address[1]}/v1"
        self.thread = threading.Thread(target=self.httpd.serve_forever, daemon=True)

    def __enter__(self):
        self.thread.start()
        return self

    def __exit__(self, *exc):
        self.httpd.shutdown()
        self.httpd.server_close()
