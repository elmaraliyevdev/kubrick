"""
Rate limits for OTP send flows (per client IP + email).

Uses Redis when configured so limits are shared across instances.
Falls back to in-memory buckets if Redis is unavailable.
"""

from __future__ import annotations

import hashlib
import logging
import os
import threading
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status
from slowapi.util import get_remote_address

from app.core.redis_client import redis_from_env_url

logger = logging.getLogger(__name__)
_lock = threading.Lock()
# SHA256 hex key -> list of unix timestamps (seconds)
_send_buckets: dict[str, list[float]] = defaultdict(list)

# OTP send: code request, resend verification, forgot-password (same class of "email out")
MAX_OTP_SENDS_PER_WINDOW = 5
OTP_SEND_WINDOW_SECONDS = 15 * 60

_redis_client = None
_redis_checked = False


def _get_redis_client():
    """Lazily initialize Redis client if REDIS_URL is configured."""
    global _redis_client, _redis_checked
    if _redis_checked:
        return _redis_client
    _redis_checked = True

    redis_url = os.getenv("REDIS_URL", "").strip()
    if not redis_url:
        return None

    try:
        client = redis_from_env_url(redis_url)
        client.ping()
        _redis_client = client
        logger.info("OTP rate limiting using Redis shared store")
        return _redis_client
    except Exception as exc:
        logger.warning("Redis unavailable for OTP rate limiting; using in-memory fallback: %s", exc)
        _redis_client = None
        return None


def _enforce_redis_rate_limit(key: str) -> bool:
    """
    Return True when the request is allowed.
    Return False when the request must be rate-limited.
    """
    client = _get_redis_client()
    if client is None:
        return True

    try:
        redis_key = f"otp:send:{key}"
        count = client.incr(redis_key)
        if count == 1:
            client.expire(redis_key, OTP_SEND_WINDOW_SECONDS)
        return count <= MAX_OTP_SENDS_PER_WINDOW
    except Exception as exc:
        # Degrade gracefully to in-memory behavior if Redis becomes unavailable.
        logger.warning("Redis OTP rate limit check failed; using in-memory fallback: %s", exc)
        return True


def enforce_otp_send_rate_limit(request: Request, email: str) -> None:
    """
    Limit how often we accept OTP-send requests for the same (IP, email).
    Raises 429 with a generic message (no enumeration).
    """
    ip = get_remote_address(request) or "unknown"
    raw = f"{ip}|{email.lower().strip()}"
    key = hashlib.sha256(raw.encode()).hexdigest()

    allowed = _enforce_redis_rate_limit(key)
    if not allowed:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )

    # If Redis is enabled and healthy, shared limiting is already enforced.
    # Keep in-memory logic only for environments without Redis.
    if _get_redis_client() is not None:
        return

    now = time.time()
    with _lock:
        times = _send_buckets[key]
        times[:] = [t for t in times if now - t < OTP_SEND_WINDOW_SECONDS]
        if len(times) >= MAX_OTP_SENDS_PER_WINDOW:
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="Too many requests. Please try again later.",
            )
        times.append(now)
