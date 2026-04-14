import logging
import os
import secrets
from typing import List

from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy.orm import Session, joinedload

from app.constants.pipeline import PIPELINE_STAGE_SET
from app.core.email import send_email
from app.core.security import get_db, require_org_member
from app.db.models.candidate import Candidate
from app.db.models.email_template import EmailTemplate
from app.db.models.job import Job
from app.db.models.job_application import JobApplication
from app.db.models.outbound_email import OutboundEmail
from app.db.models.user import User
from app.schemas.candidate_email import (
    EmailTemplateResponse,
    EmailTemplateUpsert,
    OutboundEmailListResponse,
    OutboundEmailResponse,
    SendCandidateEmailRequest,
)

logger = logging.getLogger(__name__)


def _public_api_base() -> str:
    return os.getenv("PUBLIC_API_URL", "http://localhost:8000").rstrip("/")


router = APIRouter(tags=["candidate-email"])


def _get_application_for_org(db: Session, application_id: int, org_id: int) -> JobApplication | None:
    return (
        db.query(JobApplication)
        .options(
            joinedload(JobApplication.candidate),
            joinedload(JobApplication.job).joinedload(Job.organization),
        )
        .join(Candidate, Candidate.id == JobApplication.candidate_id)
        .join(Job, Job.id == JobApplication.job_id)
        .filter(
            JobApplication.id == application_id,
            Candidate.organization_id == org_id,
            Job.organization_id == org_id,
        )
        .first()
    )


@router.get("/organizations/me/email-templates", response_model=List[EmailTemplateResponse])
def list_email_templates(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    rows = (
        db.query(EmailTemplate)
        .filter(EmailTemplate.organization_id == current_user.organization_id)
        .order_by(EmailTemplate.stage)
        .all()
    )
    return rows


@router.put("/organizations/me/email-templates/{stage}", response_model=EmailTemplateResponse)
def upsert_email_template(
    stage: str,
    payload: EmailTemplateUpsert,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    stage = stage.strip()
    if stage not in PIPELINE_STAGE_SET:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid pipeline stage")

    existing = (
        db.query(EmailTemplate)
        .filter(
            EmailTemplate.organization_id == current_user.organization_id,
            EmailTemplate.stage == stage,
        )
        .first()
    )
    if existing:
        existing.name = payload.name
        existing.subject = payload.subject
        existing.body_html = payload.body_html
        db.add(existing)
        db.commit()
        db.refresh(existing)
        return existing

    row = EmailTemplate(
        organization_id=current_user.organization_id,
        stage=stage,
        name=payload.name,
        subject=payload.subject,
        body_html=payload.body_html,
    )
    db.add(row)
    db.commit()
    db.refresh(row)
    return row


@router.delete("/organizations/me/email-templates/{stage}", status_code=status.HTTP_204_NO_CONTENT)
def delete_email_template(
    stage: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    stage = stage.strip()
    row = (
        db.query(EmailTemplate)
        .filter(
            EmailTemplate.organization_id == current_user.organization_id,
            EmailTemplate.stage == stage,
        )
        .first()
    )
    if not row:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
    db.delete(row)
    db.commit()
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post("/job-applications/{application_id}/emails", response_model=OutboundEmailResponse)
async def send_candidate_email(
    application_id: int,
    payload: SendCandidateEmailRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    from app.services.candidate_email_render import append_tracking_pixel, build_merge_context, render_email_template

    app = _get_application_for_org(db, application_id, current_user.organization_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    candidate = app.candidate
    job = app.job
    org = job.organization if job else None
    if not candidate or not job or not org:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    if not candidate.email or not str(candidate.email).strip():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Candidate has no email address",
        )

    to_email = str(candidate.email).strip()
    subject: str
    body_html: str
    template_id: int | None = None

    if payload.template_id is not None:
        tmpl = (
            db.query(EmailTemplate)
            .filter(
                EmailTemplate.id == payload.template_id,
                EmailTemplate.organization_id == current_user.organization_id,
            )
            .first()
        )
        if not tmpl:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Template not found")
        template_id = tmpl.id
        subject = tmpl.subject
        body_html = tmpl.body_html
    else:
        subject = payload.subject or ""
        body_html = payload.body_html or ""

    ctx = build_merge_context(
        candidate_first_name=candidate.first_name,
        candidate_last_name=candidate.last_name,
        candidate_email=candidate.email,
        job_title=job.title,
        organization_name=org.name,
        recruiter_first_name=current_user.first_name,
        recruiter_last_name=current_user.last_name,
    )

    try:
        rendered_subject = render_email_template(subject, ctx)
        rendered_body = render_email_template(body_html, ctx)
    except Exception as e:
        logger.warning("Template render failed: %s", e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid template variables or syntax",
        ) from e

    tracking_token = secrets.token_urlsafe(32)
    pixel_url = f"{_public_api_base()}/api/email/open/{tracking_token}"
    final_html = append_tracking_pixel(rendered_body, pixel_url)

    outbound = OutboundEmail(
        organization_id=current_user.organization_id,
        job_application_id=app.id,
        candidate_id=candidate.id,
        template_id=template_id,
        sent_by_user_id=current_user.id,
        to_email=to_email,
        subject_snapshot=rendered_subject,
        html_snapshot=final_html,
        tracking_token=tracking_token,
        status="sent",
    )
    db.add(outbound)
    db.flush()

    tags = [{"name": "outbound_id", "value": str(outbound.id)}]

    try:
        result = await send_email(
            to_email,
            rendered_subject,
            final_html,
            tags=tags,
        )
        mid = result.get("id") if isinstance(result, dict) else None
        if mid:
            outbound.provider_message_id = str(mid)
    except Exception as e:
        logger.exception("send_email failed")
        outbound.status = "failed"
        outbound.error_message = str(e)[:2000]
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Email provider rejected the message",
        ) from e

    db.commit()
    db.refresh(outbound)
    return outbound


@router.get("/job-applications/{application_id}/emails", response_model=OutboundEmailListResponse)
def list_candidate_emails(
    application_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    app = _get_application_for_org(db, application_id, current_user.organization_id)
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    rows = (
        db.query(OutboundEmail)
        .filter(
            OutboundEmail.job_application_id == application_id,
            OutboundEmail.organization_id == current_user.organization_id,
        )
        .order_by(OutboundEmail.created_at.desc())
        .all()
    )
    return OutboundEmailListResponse(emails=rows)
