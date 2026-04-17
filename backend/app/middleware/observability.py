"""
Observability middleware for request correlation and basic HTTP metrics.
"""

from __future__ import annotations

import time
import uuid
import logging

from fastapi import Request, Response
from prometheus_client import Counter, Histogram, CONTENT_TYPE_LATEST, generate_latest
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp

logger = logging.getLogger("http_requests")

REQUEST_COUNT = Counter(
    "http_requests_total",
    "Total HTTP requests processed",
    ["method", "path", "status_code"],
)

REQUEST_LATENCY_SECONDS = Histogram(
    "http_request_duration_seconds",
    "HTTP request latency in seconds",
    ["method", "path"],
    buckets=(0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0),
)


def build_metrics_response() -> Response:
    """Expose Prometheus metrics payload."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)


def _normalize_metrics_path(path: str) -> str:
    """
    Normalize dynamic segments to avoid high-cardinality metric labels.
    """
    if not path:
        return "/"
    parts = path.strip("/").split("/")
    normalized = []
    for part in parts:
        if part.isdigit():
            normalized.append(":id")
        elif len(part) >= 32 and all(c in "0123456789abcdef-" for c in part.lower()):
            normalized.append(":token")
        else:
            normalized.append(part)
    return "/" + "/".join(normalized)


class ObservabilityMiddleware(BaseHTTPMiddleware):
    """Attach request IDs and collect basic request metrics."""

    def __init__(self, app: ASGIApp):
        super().__init__(app)

    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("X-Request-ID") or str(uuid.uuid4())
        request.state.request_id = request_id
        start = time.perf_counter()

        response = await call_next(request)

        duration = time.perf_counter() - start
        path = _normalize_metrics_path(request.url.path)
        method = request.method
        status_code = str(response.status_code)

        REQUEST_COUNT.labels(method=method, path=path, status_code=status_code).inc()
        REQUEST_LATENCY_SECONDS.labels(method=method, path=path).observe(duration)

        response.headers["X-Request-ID"] = request_id
        logger.info(
            "request_id=%s method=%s path=%s status=%s duration_ms=%.2f",
            request_id,
            method,
            request.url.path,
            status_code,
            duration * 1000,
        )
        return response
