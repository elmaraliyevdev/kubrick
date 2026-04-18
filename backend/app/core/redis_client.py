"""
Shared Redis client for rate limiting and health checks.

ElastiCache Serverless + TLS: use explicit ssl=... connections. Some redis-py
versions handle `from_url(rediss://...)` + extra kwargs poorly; explicit params
are more reliable.

Timeouts default to 10s — ElastiCache TLS + cross-AZ latency can exceed 5s.
"""

from __future__ import annotations

import logging
import os
import ssl
from typing import Any, Optional
from urllib.parse import unquote, urlparse

logger = logging.getLogger(__name__)

_DEFAULT_CONNECT_TIMEOUT = 10
_DEFAULT_SOCKET_TIMEOUT = 10


def redis_from_env_url(url: Optional[str] = None) -> Any:
    """
    Build a redis.Redis client from REDIS_URL (or passed url).
    For rediss://, uses explicit ssl=True (ElastiCache in-transit encryption).
    """
    redis_url = (url if url is not None else os.getenv("REDIS_URL", "")).strip()
    if not redis_url:
        raise ValueError("REDIS_URL is empty")

    import redis

    connect_timeout = int(os.getenv("REDIS_SOCKET_CONNECT_TIMEOUT", str(_DEFAULT_CONNECT_TIMEOUT)))
    socket_timeout = int(os.getenv("REDIS_SOCKET_TIMEOUT", str(_DEFAULT_SOCKET_TIMEOUT)))
    verify = (os.getenv("REDIS_SSL_VERIFY", "true") or "true").strip().lower() in (
        "1",
        "true",
        "yes",
    )

    parsed = urlparse(redis_url)
    scheme = (parsed.scheme or "").lower()

    common: dict = {
        "socket_connect_timeout": connect_timeout,
        "socket_timeout": socket_timeout,
        "decode_responses": False,
        "health_check_interval": 30,
    }

    db = 0
    if parsed.path and parsed.path not in ("/", ""):
        path_part = parsed.path.strip("/").split("/")[0]
        if path_part.isdigit():
            db = int(path_part)

    if scheme == "rediss":
        if not parsed.hostname:
            raise ValueError("rediss:// URL must include a hostname")
        port = parsed.port or 6379
        password = unquote(parsed.password) if parsed.password else None
        username = unquote(parsed.username) if parsed.username else None
        return redis.Redis(
            host=parsed.hostname,
            port=port,
            db=db,
            username=username,
            password=password,
            ssl=True,
            ssl_cert_reqs=ssl.CERT_REQUIRED if verify else ssl.CERT_NONE,
            **common,
        )

    if scheme == "redis":
        if not parsed.hostname:
            raise ValueError("redis:// URL must include a hostname")
        port = parsed.port or 6379
        password = unquote(parsed.password) if parsed.password else None
        username = unquote(parsed.username) if parsed.username else None
        return redis.Redis(
            host=parsed.hostname,
            port=port,
            db=db,
            username=username,
            password=password,
            **common,
        )

    return redis.Redis.from_url(redis_url, **common)
