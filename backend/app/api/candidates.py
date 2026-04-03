from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func, desc, and_
from typing import List, Optional, Dict, Any
from app.db.models.candidate import Candidate
from app.db.models.candidate_file import CandidateFile
from app.db.models.job_application import JobApplication
from app.schemas.candidate import (
    CandidateCreate,
    CandidateResponse,
    CandidateUpdate,
    CandidateListResponse
)
from app.core.security import get_db, require_org_member
from app.db.models.user import User
from app.services.candidate_matching_service import CandidateMatchingService
from app.core.validation import validate_search_query, validate_pagination_params

router = APIRouter()


def _normalize_candidate_certifications(candidate: Candidate) -> None:
    """
    Backward compatibility for older/seeded data where certifications were stored
    as a list of strings instead of list[dict].
    """
    certs = candidate.certifications
    if not isinstance(certs, list) or not certs:
        return

    if all(isinstance(c, str) for c in certs):
        candidate.certifications = [{"name": c} for c in certs]


@router.get("/", response_model=List[CandidateListResponse])
def list_candidates(
        skip: int = Query(0, ge=0),
        limit: int = Query(100, ge=1, le=1000),
        search: Optional[str] = Query(None, description="Search by name or email"),
        db: Session = Depends(get_db),
        current_user: User = Depends(require_org_member),
):
    """List all candidates for the current user's organization"""
    # Base query
    query = db.query(Candidate).filter(
        Candidate.organization_id == current_user.organization_id
    )

    # Validate and sanitize pagination params
    skip, limit = validate_pagination_params(skip, limit)
    
    # Add search filter if provided
    if search:
        # Validate and sanitize search query
        try:
            sanitized_search = validate_search_query(search)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        if sanitized_search:
            search_filter = f"%{sanitized_search}%"
            query = query.filter(
                (Candidate.first_name.ilike(search_filter)) |
                (Candidate.last_name.ilike(search_filter)) |
                (Candidate.email.ilike(search_filter))
            )

    # Get candidates with computed fields using subqueries to avoid N+1
    candidates = query.order_by(desc(Candidate.created_at)).offset(skip).limit(limit).all()
    candidate_ids = [c.id for c in candidates]
    
    if candidate_ids:
        # Get file counts in a single query
        file_counts = (
            db.query(
                CandidateFile.candidate_id,
                func.count(CandidateFile.id).label('count')
            )
            .filter(CandidateFile.candidate_id.in_(candidate_ids))
            .group_by(CandidateFile.candidate_id)
            .all()
        )
        file_count_map = {fc.candidate_id: fc.count for fc in file_counts}
        
        # Get application counts and latest status in a single query
        app_data = (
            db.query(
                JobApplication.candidate_id,
                func.count(JobApplication.id).label('count'),
                func.max(JobApplication.created_at).label('latest_created_at')
            )
            .filter(JobApplication.candidate_id.in_(candidate_ids))
            .group_by(JobApplication.candidate_id)
            .all()
        )
        app_count_map = {ad.candidate_id: ad.count for ad in app_data}
        
        # Get latest application status for each candidate
        latest_apps = {}
        if app_data:
            for ad in app_data:
                if ad.latest_created_at:
                    latest_app = (
                        db.query(JobApplication.status)
                        .filter(
                            and_(
                                JobApplication.candidate_id == ad.candidate_id,
                                JobApplication.created_at == ad.latest_created_at
                            )
                        )
                        .first()
                    )
                    if latest_app:
                        latest_apps[ad.candidate_id] = latest_app.status
        
        # Assign computed fields
        for candidate in candidates:
            candidate.resume_files_count = file_count_map.get(candidate.id, 0)
            candidate.job_applications_count = app_count_map.get(candidate.id, 0)
            candidate.latest_application_status = latest_apps.get(candidate.id)
    else:
        # No candidates found, set default values
        for candidate in candidates:
            candidate.resume_files_count = 0
            candidate.job_applications_count = 0
            candidate.latest_application_status = None

    return candidates


@router.post("/", response_model=CandidateResponse)
def create_candidate(
        candidate: CandidateCreate,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_org_member),
):
    """Create a new candidate"""
    # Check if candidate with this email already exists in the organization
    if candidate.email:
        existing = db.query(Candidate).filter(
            Candidate.email == candidate.email,
            Candidate.organization_id == current_user.organization_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate with this email already exists in your organization"
            )

    db_candidate = Candidate(
        first_name=candidate.first_name,
        last_name=candidate.last_name,
        email=candidate.email,
        phone=candidate.phone,
        location=candidate.location,
        linkedin_url=candidate.linkedin_url,
        portfolio_url=candidate.portfolio_url,
        notes=candidate.notes,
        organization_id=current_user.organization_id,
        added_by_id=current_user.id,
    )

    db.add(db_candidate)
    db.commit()
    db.refresh(db_candidate)

    # Add computed fields
    db_candidate.resume_files_count = 0
    db_candidate.job_applications_count = 0
    db_candidate.latest_application_status = None
    _normalize_candidate_certifications(db_candidate)

    return db_candidate


@router.get("/{candidate_id}", response_model=CandidateResponse)
def get_candidate(
        candidate_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_org_member),
):
    """Get a specific candidate by ID"""
    candidate = db.query(Candidate).options(joinedload(Candidate.work_experiences)).filter(
        Candidate.id == candidate_id,
        Candidate.organization_id == current_user.organization_id
    ).first()

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )

    # Add computed fields using optimized queries
    candidate.resume_files_count = (
        db.query(func.count(CandidateFile.id))
        .filter(CandidateFile.candidate_id == candidate.id)
        .scalar() or 0
    )

    # Get application count and latest status in a single query
    app_stats = (
        db.query(
            func.count(JobApplication.id).label('count'),
            func.max(JobApplication.created_at).label('latest_created_at')
        )
        .filter(JobApplication.candidate_id == candidate.id)
        .first()
    )
    
    candidate.job_applications_count = app_stats.count if app_stats else 0
    
    # Get latest status if there are applications
    if app_stats and app_stats.latest_created_at:
        latest_status = (
            db.query(JobApplication.status)
            .filter(
                and_(
                    JobApplication.candidate_id == candidate.id,
                    JobApplication.created_at == app_stats.latest_created_at
                )
            )
            .first()
        )
        candidate.latest_application_status = latest_status.status if latest_status else None
    else:
        candidate.latest_application_status = None

    _normalize_candidate_certifications(candidate)
    return candidate


@router.put("/{candidate_id}", response_model=CandidateResponse)
def update_candidate(
        candidate_id: int,
        candidate_update: CandidateUpdate,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_org_member),
):
    """Update a candidate"""
    db_candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.organization_id == current_user.organization_id
    ).first()

    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )

    # Check email uniqueness if email is being updated
    if candidate_update.email and candidate_update.email != db_candidate.email:
        existing = db.query(Candidate).filter(
            Candidate.email == candidate_update.email,
            Candidate.organization_id == current_user.organization_id,
            Candidate.id != candidate_id
        ).first()
        if existing:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Candidate with this email already exists in your organization"
            )

    # Update only provided fields
    update_data = candidate_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_candidate, field, value)

    db.commit()
    db.refresh(db_candidate)

    # Add computed fields using optimized queries
    db_candidate.resume_files_count = (
        db.query(func.count(CandidateFile.id))
        .filter(CandidateFile.candidate_id == db_candidate.id)
        .scalar() or 0
    )

    # Get application count and latest status in a single query
    app_stats = (
        db.query(
            func.count(JobApplication.id).label('count'),
            func.max(JobApplication.created_at).label('latest_created_at')
        )
        .filter(JobApplication.candidate_id == db_candidate.id)
        .first()
    )
    
    db_candidate.job_applications_count = app_stats.count if app_stats else 0
    
    # Get latest status if there are applications
    if app_stats and app_stats.latest_created_at:
        latest_status = (
            db.query(JobApplication.status)
            .filter(
                and_(
                    JobApplication.candidate_id == db_candidate.id,
                    JobApplication.created_at == app_stats.latest_created_at
                )
            )
            .first()
        )
        db_candidate.latest_application_status = latest_status.status if latest_status else None
    else:
        db_candidate.latest_application_status = None

    _normalize_candidate_certifications(db_candidate)
    return db_candidate


@router.delete("/{candidate_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_candidate(
        candidate_id: int,
        db: Session = Depends(get_db),
        current_user: User = Depends(require_org_member),
):
    """Delete a candidate"""
    db_candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.organization_id == current_user.organization_id
    ).first()

    if not db_candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )

    db.delete(db_candidate)
    db.commit()

    return None


# === AI MATCHING ENDPOINTS ===

@router.get("/{candidate_id}/job-matches")
def get_candidate_job_matches(
    candidate_id: int,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Get job matches for a specific candidate ranked by AI score"""
    
    # Verify candidate exists and belongs to user's organization
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.organization_id == current_user.organization_id
    ).first()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    try:
        matching_service = CandidateMatchingService(db)
        
        results = matching_service.get_job_matches_for_candidate(
            candidate_id=candidate_id,
            limit=limit
        )
        
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results["error"]
            )
        
        return results
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get job matches: {str(e)}"
        )


@router.post("/{candidate_id}/recalculate-matches")
async def recalculate_candidate_matches(
    candidate_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Recalculate all match scores for a candidate (after candidate data changes)"""
    
    # Verify candidate exists and belongs to user's organization
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.organization_id == current_user.organization_id
    ).first()
    
    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )
    
    try:
        matching_service = CandidateMatchingService(db)
        
        # Mark existing matches for recalculation
        updated_count = matching_service.mark_matches_for_recalculation(candidate_id=candidate_id)
        
        # Get all jobs for this organization and recalculate matches
        from app.db.models.job import Job
        jobs = db.query(Job).filter(Job.organization_id == current_user.organization_id).all()
        
        results = {
            "candidate_id": candidate_id,
            "marked_for_recalculation": updated_count,
            "jobs_processed": 0,
            "successful_matches": 0,
            "errors": []
        }
        
        for job in jobs:
            try:
                match_result = matching_service.calculate_match_for_pair(
                    candidate_id, job.id, force_recalculate=True
                )
                
                results["jobs_processed"] += 1
                
                if match_result:
                    results["successful_matches"] += 1
                else:
                    results["errors"].append(f"Failed to calculate match for job {job.id}")
                    
            except Exception as e:
                results["errors"].append(f"Error calculating match for job {job.id}: {str(e)}")
        
        return {
            "message": "Candidate match recalculation completed",
            **results
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recalculate matches: {str(e)}"
        )