from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta

from app.core.security import get_current_user, get_db
from app.db.models.user import User
from app.db.models.job import Job
from app.db.models.candidate import Candidate
from app.db.models.job_application import JobApplication
from app.db.models.candidate_job_match import CandidateJobMatch

router = APIRouter()


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get dashboard statistics for the current user's organization."""
    org_id = current_user.organization_id
    if not org_id:
        return {
            "open_positions": 0,
            "new_applications_7d": 0,
            "candidates_to_review": 0,
            "top_match_score": None,
            "trends": {},
        }

    now = datetime.utcnow()
    seven_days_ago = now - timedelta(days=7)
    fourteen_days_ago = now - timedelta(days=14)

    # 1. Open positions
    open_positions = db.query(func.count(Job.id)).filter(
        Job.organization_id == org_id,
        Job.status == "open",
    ).scalar() or 0

    # 2. New applications in last 7 days
    org_job_ids = db.query(Job.id).filter(Job.organization_id == org_id).subquery()

    new_applications_7d = db.query(func.count(JobApplication.id)).filter(
        JobApplication.job_id.in_(org_job_ids),
        JobApplication.created_at >= seven_days_ago,
    ).scalar() or 0

    # Previous 7 days for trend
    prev_applications_7d = db.query(func.count(JobApplication.id)).filter(
        JobApplication.job_id.in_(org_job_ids),
        JobApplication.created_at >= fourteen_days_ago,
        JobApplication.created_at < seven_days_ago,
    ).scalar() or 0

    # 3. Candidates to review (applications with status "new")
    candidates_to_review = db.query(func.count(JobApplication.id)).filter(
        JobApplication.job_id.in_(org_job_ids),
        JobApplication.status == "new",
    ).scalar() or 0

    # 4. Top match score across org
    top_match = db.query(func.max(CandidateJobMatch.overall_score)).filter(
        CandidateJobMatch.job_id.in_(org_job_ids),
    ).scalar()

    # Calculate trends (percentage change vs previous period)
    def calc_trend(current: int, previous: int) -> float | None:
        if previous == 0 and current == 0:
            return 0.0
        if previous == 0:
            return 100.0
        return round(((current - previous) / previous) * 100, 1)

    applications_trend = calc_trend(new_applications_7d, prev_applications_7d)

    return {
        "open_positions": open_positions,
        "new_applications_7d": new_applications_7d,
        "candidates_to_review": candidates_to_review,
        "top_match_score": round(top_match, 1) if top_match else None,
        "trends": {
            "applications": applications_trend,
        },
    }
