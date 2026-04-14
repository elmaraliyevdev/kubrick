import hmac
import logging
import os
from datetime import datetime, timezone
from typing import Any, Dict, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.core.security import get_db
from app.db.models.outbound_email import OutboundEmail

logger = logging.getLogger(__name__)

router = APIRouter(tags=["email-public"])

# Minimal 1x1 transparent GIF
_GIF_1X1 = (
    b"GIF89a\x01\x00\x01\x00\x80\x01\x00\x00\x00\x00\xff\xff\xff!\xf9\x04\x01\x00\x00\x00"
    b"\x00,\x00\x00\x00\x00\x01\x00\x01\x00\x00\x02\x02\x04\x01\x00;"
)


def _webhook_authorized(request: Request, secret: Optional[str]) -> bool:
    expected = os.getenv("RESEND_WEBHOOK_SECRET", "").strip()
    if not expected:
        return True
    if secret and secrets_compare(secret, expected):
        return True
    hdr = request.headers.get("X-Webhook-Secret") or request.headers.get("Authorization", "").replace("Bearer ", "", 1)
    if hdr and secrets_compare(hdr.strip(), expected):
        return True
    return False


def secrets_compare(a: str, b: str) -> bool:
    try:
        return hmac.compare_digest(a.encode("utf-8"), b.encode("utf-8"))
    except Exception:
        return False


@router.get("/email/open/{token}")
def track_email_open(
    token: str,
    db: Session = Depends(get_db),
):
    row = db.query(OutboundEmail).filter(OutboundEmail.tracking_token == token).first()
    if row and row.first_opened_at is None:
        row.first_opened_at = datetime.now(timezone.utc)
        db.add(row)
        db.commit()
    return Response(content=_GIF_1X1, media_type="image/gif", headers={"Cache-Control": "no-store"})


@router.post("/webhooks/resend")
async def resend_webhook(
    request: Request,
    db: Session = Depends(get_db),
    secret: Optional[str] = Query(None, description="Optional shared secret (configure in Resend webhook URL)"),
):
    if not _webhook_authorized(request, secret):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid webhook secret")

    try:
        body: Dict[str, Any] = await request.json()
    except Exception:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid JSON")

    etype = str(body.get("type") or body.get("event") or "")
    data = body.get("data")
    if not isinstance(data, dict):
        data = {}

    email_id = data.get("email_id") or data.get("id") or body.get("email_id")
    if not email_id:
        return {"ok": True, "ignored": True}

    row = db.query(OutboundEmail).filter(OutboundEmail.provider_message_id == str(email_id)).first()
    if not row:
        return {"ok": True, "matched": False}

    if "delivered" in etype.lower():
        row.status = "delivered"
    elif "bounce" in etype.lower() or "complained" in etype.lower():
        row.status = "bounced"
    elif "open" in etype.lower():
        if row.first_opened_at is None:
            row.first_opened_at = datetime.now(timezone.utc)

    db.add(row)
    db.commit()
    return {"ok": True, "matched": True}
