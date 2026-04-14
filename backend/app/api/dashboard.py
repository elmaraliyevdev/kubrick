from datetime import date, datetime, timedelta, timezone, time as dt_time
from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import func

from app.core.security import get_current_user, get_db
from app.db.models.user import User
from app.db.models.job import Job
from app.db.models.candidate import Candidate
from app.db.models.job_application import JobApplication
from app.db.models.candidate_job_match import CandidateJobMatch

router = APIRouter()


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _aware(dt: datetime) -> datetime:
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _resolve_range(
    period: str,
    start: Optional[date],
    end: Optional[date],
    now: datetime,
) -> tuple[datetime, datetime, datetime, datetime]:
    """
    Returns (range_start, range_end, prev_range_start, prev_range_end)
    where prev_range is the immediately preceding interval of equal length (for trends).
    All ranges are inclusive end for display; queries use inclusive boundaries on datetime.
    """
    now = _aware(now)

    if period == "custom":
        if not start or not end:
            raise HTTPException(
                status_code=400,
                detail="Query parameters 'start' and 'end' (YYYY-MM-DD) are required when period=custom",
            )
        if start > end:
            raise HTTPException(status_code=400, detail="'start' must be on or before 'end'")

        range_start = datetime.combine(start, dt_time.min, tzinfo=timezone.utc)
        range_end = datetime.combine(end, dt_time.max, tzinfo=timezone.utc)
    elif period == "7d":
        range_end = now
        range_start = now - timedelta(days=7)
    elif period == "30d":
        range_end = now
        range_start = now - timedelta(days=30)
    elif period == "month":
        range_end = now
        range_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    else:
        raise HTTPException(
            status_code=400,
            detail="period must be one of: 7d, 30d, month, custom",
        )

    delta = range_end - range_start
    if delta.total_seconds() <= 0:
        delta = timedelta(days=1)
    prev_range_end = range_start - timedelta(microseconds=1)
    prev_range_start = range_start - delta

    return range_start, range_end, prev_range_start, prev_range_end


def _calc_trend(current: int, previous: int) -> float | None:
    if previous == 0 and current == 0:
        return 0.0
    if previous == 0:
        return 100.0
    return round(((current - previous) / previous) * 100, 1)


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    period: str = Query("7d", description="7d | 30d | month | custom"),
    start: Optional[date] = Query(None, description="Range start (custom)"),
    end: Optional[date] = Query(None, description="Range end (custom)"),
):
    """Dashboard statistics for the organization, scoped to a selectable time range."""
    org_id = current_user.organization_id
    if not org_id:
        return {
            "period": period,
            "open_positions": 0,
            "new_applications": 0,
            "new_applications_7d": 0,
            "new_candidates": 0,
            "new_jobs": 0,
            "candidates_to_review": 0,
            "top_match_score": None,
            "trends": {},
            "range": {},
        }

    now = _utc_now()
    range_start, range_end, prev_start, prev_end = _resolve_range(period, start, end, now)

    org_job_ids = db.query(Job.id).filter(Job.organization_id == org_id).subquery()

    # Rolling 7d (backward compatible key for tests / widgets)
    seven_ago = now - timedelta(days=7)
    new_applications_7d = (
        db.query(func.count(JobApplication.id))
        .filter(
            JobApplication.job_id.in_(org_job_ids),
            JobApplication.created_at >= seven_ago,
        )
        .scalar()
        or 0
    )

    open_positions = (
        db.query(func.count(Job.id))
        .filter(
            Job.organization_id == org_id,
            Job.status == "open",
        )
        .scalar()
        or 0
    )

    new_applications = (
        db.query(func.count(JobApplication.id))
        .filter(
            JobApplication.job_id.in_(org_job_ids),
            JobApplication.created_at >= range_start,
            JobApplication.created_at <= range_end,
        )
        .scalar()
        or 0
    )

    prev_applications = (
        db.query(func.count(JobApplication.id))
        .filter(
            JobApplication.job_id.in_(org_job_ids),
            JobApplication.created_at >= prev_start,
            JobApplication.created_at <= prev_end,
        )
        .scalar()
        or 0
    )

    new_candidates = (
        db.query(func.count(Candidate.id))
        .filter(
            Candidate.organization_id == org_id,
            Candidate.created_at >= range_start,
            Candidate.created_at <= range_end,
        )
        .scalar()
        or 0
    )

    # Jobs created in range (naive created_at on Job — compare as UTC day bounds)
    new_jobs = (
        db.query(func.count(Job.id))
        .filter(
            Job.organization_id == org_id,
            Job.created_at >= range_start.replace(tzinfo=None),
            Job.created_at <= range_end.replace(tzinfo=None),
        )
        .scalar()
        or 0
    )

    candidates_to_review = (
        db.query(func.count(JobApplication.id))
        .filter(
            JobApplication.job_id.in_(org_job_ids),
            JobApplication.status == "applied",
        )
        .scalar()
        or 0
    )

    top_match = (
        db.query(func.max(CandidateJobMatch.overall_score))
        .filter(CandidateJobMatch.job_id.in_(org_job_ids))
        .scalar()
    )

    applications_trend = _calc_trend(new_applications, prev_applications)

    return {
        "period": period,
        "open_positions": open_positions,
        "new_applications": new_applications,
        "new_applications_7d": new_applications_7d,
        "new_candidates": new_candidates,
        "new_jobs": new_jobs,
        "candidates_to_review": candidates_to_review,
        "top_match_score": round(top_match, 1) if top_match else None,
        "trends": {
            "applications": applications_trend,
        },
        "range": {
            "start": range_start.isoformat(),
            "end": range_end.isoformat(),
        },
    }


@router.get("/applications")
def list_dashboard_applications(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
    period: str = Query("7d"),
    start: Optional[date] = Query(None),
    end: Optional[date] = Query(None),
    limit: int = Query(500, ge=1, le=1000),
) -> List[Dict[str, Any]]:
    """Job applications in the organization within the same date range as /stats."""
    org_id = current_user.organization_id
    if not org_id:
        return []

    now = _utc_now()
    range_start, range_end, _, _ = _resolve_range(period, start, end, now)

    rows = (
        db.query(JobApplication, Job, Candidate)
        .join(Job, Job.id == JobApplication.job_id)
        .join(Candidate, Candidate.id == JobApplication.candidate_id)
        .filter(
            Job.organization_id == org_id,
            JobApplication.created_at >= range_start,
            JobApplication.created_at <= range_end,
        )
        .order_by(JobApplication.created_at.desc())
        .limit(limit)
        .all()
    )

    out: List[Dict[str, Any]] = []
    for app, job, cand in rows:
        name = f"{cand.first_name or ''} {cand.last_name or ''}".strip() or (cand.email or "Unknown")
        out.append(
            {
                "id": app.id,
                "job_id": job.id,
                "job_title": job.title,
                "candidate_id": cand.id,
                "candidate_name": name,
                "status": app.status,
                "match_score": app.match_score,
                "created_at": app.created_at.isoformat() if app.created_at else None,
            }
        )
    return out
