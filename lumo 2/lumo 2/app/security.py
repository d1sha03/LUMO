"""Optional API-key check and a simple in-memory per-client rate limiter."""
import hmac
import time
from collections import defaultdict, deque

from fastapi import HTTPException, Request

from app import config


def client_ip(request: Request) -> str:
    if config.TRUST_PROXY:
        fwd = request.headers.get("x-forwarded-for")
        if fwd:
            return fwd.split(",")[0].strip()
    return request.client.host if request.client else "unknown"


class RateLimiter:
    def __init__(self):
        self.hits = defaultdict(deque)

    def reset(self):
        self.hits.clear()

    def check(self, key: str):
        limit = config.RATE_LIMIT_PER_MINUTE
        if limit <= 0:
            return
        now = time.monotonic()
        q = self.hits[key]
        while q and now - q[0] > 60:
            q.popleft()
        if len(q) >= limit:
            raise HTTPException(status_code=429, detail="Too many requests. Please wait a minute.",
                                headers={"Retry-After": "60"})
        q.append(now)
        if len(self.hits) > 10000:       # keep memory bounded
            for k in [k for k, v in self.hits.items() if not v][:5000]:
                self.hits.pop(k, None)


limiter = RateLimiter()


async def protect(request: Request):
    """FastAPI dependency for endpoints that cost money or touch the LLM."""
    if config.API_KEY:
        supplied = request.headers.get("x-api-key", "")
        if not hmac.compare_digest(supplied.encode(), config.API_KEY.encode()):
            raise HTTPException(status_code=401, detail="Missing or invalid X-API-Key header.")
    limiter.check(client_ip(request))
