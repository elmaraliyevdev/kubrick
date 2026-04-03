"""
In-memory rate limits for OTP send flows (per client IP + email).

Mitigates abuse and complements SlowAPI's per-IP limits. For multi-instance
deployments, replace with Redis or a shared store.
"""

from __future__ import annotations

import hashlib
import threading
import time
from collections import defaultdict

from fastapi import HTTPException, Request, status
from slowapi.util import get_remote_address

_lock = threading.Lock()
# SHA256 hex key -> list of unix timestamps (seconds)
_send_buckets: dict[str, list[float]] = defaultdict(list)

# OTP send: code request, resend verification, forgot-password (same class of "email out")
MAX_OTP_SENDS_PER_WINDOW = 5
OTP_SEND_WINDOW_SECONDS = 15 * 60


def enforce_otp_send_rate_limit(request: Request, email: str) -> None:
    """
    Limit how often we accept OTP-send requests for the same (IP, email).
    Raises 429 with a generic message (no enumeration).
    """
    ip = get_remote_address(request) or "unknown"
    raw = f"{ip}|{email.lower().strip()}"
    key = hashlib.sha256(raw.encode()).hexdigest()
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
