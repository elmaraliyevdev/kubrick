from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.core.security import get_current_user, get_db
from app.db.models.candidate import Candidate
from app.db.models.job import Job
from app.db.models.job_application import JobApplication
from app.db.models.user import User

router = APIRouter(tags=["pipeline"])


PIPELINE_STAGES: List[str] = ["applied", "screening", "interview", "offer", "hired"]
PIPELINE_STAGE_ORDER: Dict[str, int] = {stage: idx for idx, stage in enumerate(PIPELINE_STAGES)}


class StageMoveRequest(BaseModel):
    stage: str


def _candidate_name(candidate: Candidate) -> str:
    first = candidate.first_name or ""
    last = candidate.last_name or ""
    return (first + " " + last).strip() or (candidate.email or "Unknown")


def _serialize_card(app: JobApplication) -> Dict[str, Any]:
    candidate = app.candidate
    return {
        "application_id": app.id,
        "candidate": {
            "id": candidate.id if candidate else None,
            "first_name": candidate.first_name if candidate else None,
            "last_name": candidate.last_name if candidate else None,
            "name": _candidate_name(candidate) if candidate else None,
            "experience_years": candidate.experience_years if candidate else None,
            "skills": candidate.skills or [] if candidate else [],
        },
        "stage": app.status,
        "match_score": app.match_score,
        "matched_skills": app.matched_skills or [],
        "missing_skills": app.missing_skills or [],
        "ai_summary": app.ai_summary,
        "ai_reasoning": app.ai_reasoning,
        "updated_at": app.updated_at.isoformat() if app.updated_at else None,
    }


@router.get("/jobs/{job_id}/pipeline")
def get_job_pipeline(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    job = db.query(Job).filter(Job.id == job_id, Job.organization_id == current_user.organization_id).first()
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    apps = (
        db.query(JobApplication)
        .join(Candidate, Candidate.id == JobApplication.candidate_id)
        .filter(
            JobApplication.job_id == job_id,
            Candidate.organization_id == current_user.organization_id,
        )
        .order_by(JobApplication.status, JobApplication.match_score.desc(), JobApplication.updated_at.desc())
        .all()
    )

    # Group by lane.
    stages: Dict[str, List[Dict[str, Any]]] = {s: [] for s in PIPELINE_STAGES}
    for app in apps:
        stages[app.status].append(
            {
                **_serialize_card(app),
                "job_id": job_id,
                "job_title": job.title,
            }
        )

    return {
        "job_id": job_id,
        "job_title": job.title,
        "stages": stages,
    }


@router.get("/pipeline")
def get_global_pipeline(
    job_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    jobs = (
        db.query(Job)
        .filter(Job.organization_id == current_user.organization_id)
        .order_by(Job.created_at.desc())
        .all()
    )

    job_title: Optional[str] = None
    if job_id is not None:
        job_obj = db.query(Job).filter(Job.id == job_id, Job.organization_id == current_user.organization_id).first()
        if not job_obj:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
        job_title = job_obj.title

    # Build query with org scoping.
    apps_query = (
        db.query(JobApplication)
        .join(Candidate, Candidate.id == JobApplication.candidate_id)
        .join(Job, Job.id == JobApplication.job_id)
        .filter(
            Candidate.organization_id == current_user.organization_id,
            Job.organization_id == current_user.organization_id,
        )
    )

    if job_id is not None:
        apps_query = apps_query.filter(JobApplication.job_id == job_id)
    else:
        if not jobs:
            stages: Dict[str, List[Dict[str, Any]]] = {s: [] for s in PIPELINE_STAGES}
            return {
                "job_filter": {"job_id": None, "job_title": None},
                "jobs": [],
                "stages": stages,
            }
        job_ids_filter = [j.id for j in jobs]
        apps_query = apps_query.filter(JobApplication.job_id.in_(job_ids_filter))

    apps = apps_query.order_by(
        JobApplication.status,
        JobApplication.match_score.desc(),
        JobApplication.updated_at.desc(),
    ).all()

    stages: Dict[str, List[Dict[str, Any]]] = {s: [] for s in PIPELINE_STAGES}
    for app in apps:
        stages[app.status].append(
            {
                **_serialize_card(app),
                "job_id": app.job_id,
                "job_title": app.job.title if getattr(app, "job", None) else None,
            }
        )

    return {
        "job_filter": {
            "job_id": job_id,
            "job_title": job_title,
        },
        "jobs": [{"id": j.id, "title": j.title} for j in jobs],
        "stages": stages,
    }


@router.patch("/job-applications/{application_id}/stage")
def move_application_stage(
    application_id: int,
    payload: StageMoveRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Dict[str, Any]:
    target_stage = payload.stage.strip()
    if target_stage not in PIPELINE_STAGES:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid stage")

    # Verify ownership by org.
    app = (
        db.query(JobApplication)
        .join(Candidate, Candidate.id == JobApplication.candidate_id)
        .join(Job, Job.id == JobApplication.job_id)
        .filter(
            JobApplication.id == application_id,
            Candidate.organization_id == current_user.organization_id,
            Job.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not app:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Application not found")

    current_stage = app.status
    if PIPELINE_STAGE_ORDER[target_stage] < PIPELINE_STAGE_ORDER[current_stage]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid stage transition: {current_stage} -> {target_stage}",
        )

    app.status = target_stage
    db.add(app)
    db.commit()
    db.refresh(app)

    return {
        **_serialize_card(app),
        "job_id": app.job_id,
        "stage": app.status,
    }

