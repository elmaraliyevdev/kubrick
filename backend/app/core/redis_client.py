"""
Shared Redis client for rate limiting and health checks.

ElastiCache Serverless + TLS (rediss://) needs generous connect/read timeouts;
1s is often too short for TLS handshake and cold paths.
"""

from __future__ import annotations

import logging
import os
import ssl
from typing import Any, Optional

logger = logging.getLogger(__name__)

# Tunable via env; defaults suit ElastiCache TLS + network latency
_DEFAULT_CONNECT_TIMEOUT = 5
_DEFAULT_SOCKET_TIMEOUT = 5


def redis_from_env_url(url: Optional[str] = None) -> Any:
    """
    Build a redis.Redis client from REDIS_URL (or passed url).
    Uses ssl_cert_reqs for rediss:// so AWS ElastiCache TLS validates normally.
    """
    redis_url = (url if url is not None else os.getenv("REDIS_URL", "")).strip()
    if not redis_url:
        raise ValueError("REDIS_URL is empty")

    import redis

    connect_timeout = int(os.getenv("REDIS_SOCKET_CONNECT_TIMEOUT", str(_DEFAULT_CONNECT_TIMEOUT)))
    socket_timeout = int(os.getenv("REDIS_SOCKET_TIMEOUT", str(_DEFAULT_SOCKET_TIMEOUT)))

    kwargs: dict = {
        "socket_connect_timeout": connect_timeout,
        "socket_timeout": socket_timeout,
    }

    if redis_url.startswith("rediss://"):
        verify = (os.getenv("REDIS_SSL_VERIFY", "true") or "true").strip().lower() in (
            "1",
            "true",
            "yes",
        )
        kwargs["ssl_cert_reqs"] = ssl.CERT_REQUIRED if verify else ssl.CERT_NONE

    return redis.Redis.from_url(redis_url, **kwargs)
