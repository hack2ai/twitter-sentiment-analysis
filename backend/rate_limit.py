from __future__ import annotations

import threading
import time
from collections import defaultdict, deque
from typing import Deque

from fastapi import Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """Apply a small in-memory sliding-window limit to authentication endpoints."""

    def __init__(self, app, limit: int = 5, window_seconds: int = 60):
        super().__init__(app)
        self.limit = limit
        self.window_seconds = window_seconds
        self._requests: dict[tuple[str, str], Deque[float]] = defaultdict(deque)
        self._lock = threading.Lock()
        self._protected_paths = {"/auth/login", "/auth/register"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path not in self._protected_paths:
            return await call_next(request)

        client_host = request.client.host if request.client else "unknown"
        key = (client_host, request.url.path)
        now = time.monotonic()

        with self._lock:
            timestamps = self._requests[key]
            cutoff = now - self.window_seconds
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()

            if len(timestamps) >= self.limit:
                retry_after = max(1, int(self.window_seconds - (now - timestamps[0])))
                return JSONResponse(
                    status_code=429,
                    content={"detail": "Too many authentication attempts. Please try again later."},
                    headers={"Retry-After": str(retry_after)},
                )

            timestamps.append(now)

        return await call_next(request)
