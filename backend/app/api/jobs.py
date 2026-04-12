from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from sqlalchemy import func
from typing import List, Dict, Any, Optional
import logging

from app.db.session import SessionLocal
from app.db.models.job import Job
from app.db.models.job_requirement import JobRequirement
from app.db.models.job_application import JobApplication
from app.db.models.job_application_form_settings import JobApplicationFormSettings
from app.db.models.custom_form_field import CustomFormField
from app.schemas.job import JobCreate, JobResponse, JobUpdate
from app.schemas.job_application_form import (
    JobApplicationFormSettingsResponse,
    JobApplicationFormSettingsPut,
    ResolvedApplicationForm,
)
from app.schemas.public_careers import PublicCustomFieldResponse
from app.services.application_form_resolution import (
    get_org_application_form,
    resolve_application_form_for_job,
)
from app.core.security import get_db, require_org_member
from app.db.models.user import User
from app.services.job_description_parser import JobDescriptionParser
from app.services.candidate_matching_service import CandidateMatchingService

router = APIRouter()

@router.get("/", response_model=List[JobResponse])
def list_jobs(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    """List all jobs for the current user's organization"""
    jobs = (
        db.query(Job)
        .options(joinedload(Job.organization))
        .filter(Job.organization_id == current_user.organization_id)
        .order_by(Job.created_at.desc())
        .all()
    )

    # Count actual applications per job
    job_ids = [j.id for j in jobs]
    if job_ids:
        counts = dict(
            db.query(JobApplication.job_id, func.count(JobApplication.id))
            .filter(JobApplication.job_id.in_(job_ids))
            .group_by(JobApplication.job_id)
            .all()
        )
        for job in jobs:
            job.candidate_count = counts.get(job.id, 0)
    else:
        for job in jobs:
            job.candidate_count = 0

    return jobs

@router.post("/", response_model=JobResponse)
def create_job(
    job: JobCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    """Create a new job posting"""
    from app.utils.slug import generate_job_slug
    db_job = Job(
        title=job.title,
        description=job.description,
        location=job.location,
        employment_type=job.employment_type,
        responsibilities=job.responsibilities,
        requirements=job.requirements,
        nice_to_have=job.nice_to_have,
        benefits=job.benefits,
        skills_required=job.skills_required,
        work_arrangement=job.work_arrangement,
        status=job.status,
        category=job.category,
        experience_level=job.experience_level,
        user_id=current_user.id,
        organization_id=current_user.organization_id,
    )
    db_job.slug = generate_job_slug(job.title, current_user.organization_id, db)
    db.add(db_job)
    db.commit()
    db.refresh(db_job)
    
    # Load organization relationship for response
    db_job = (
        db.query(Job)
        .options(joinedload(Job.organization))
        .filter(Job.id == db_job.id)
        .first()
    )
    db_job.candidate_count = db.query(func.count(JobApplication.id)).filter(JobApplication.job_id == db_job.id).scalar() or 0

    return db_job

@router.get("/{job_id}", response_model=JobResponse)
def get_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    """Get a specific job by ID"""
    job = (
        db.query(Job)
        .options(joinedload(Job.organization))
        .filter(
            Job.id == job_id,
            Job.organization_id == current_user.organization_id
        )
        .first()
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    job.candidate_count = db.query(func.count(JobApplication.id)).filter(JobApplication.job_id == job.id).scalar() or 0
    return job

@router.put("/{job_id}", response_model=JobResponse)
def update_job(
    job_id: int,
    job_update: JobUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    """Update a job posting"""
    db_job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.organization_id == current_user.organization_id
        )
        .first()
    )
    
    if not db_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Update only provided fields
    update_data = job_update.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(db_job, field, value)

    if 'title' in update_data:
        from app.utils.slug import generate_job_slug
        db_job.slug = generate_job_slug(update_data['title'], db_job.organization_id, db, exclude_id=db_job.id)

    db.commit()
    db.refresh(db_job)
    
    # Load organization relationship for response
    db_job = (
        db.query(Job)
        .options(joinedload(Job.organization))
        .filter(Job.id == db_job.id)
        .first()
    )
    db_job.candidate_count = db.query(func.count(JobApplication.id)).filter(JobApplication.job_id == db_job.id).scalar() or 0

    return db_job

@router.delete("/{job_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_job(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    """Delete a job posting"""
    db_job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.organization_id == current_user.organization_id
        )
        .first()
    )
    
    if not db_job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    db.delete(db_job)
    db.commit()
    
    return None


def _job_application_form_response(
    job_id: int, organization_id: int, db: Session
) -> JobApplicationFormSettingsResponse:
    settings = (
        db.query(JobApplicationFormSettings)
        .filter(JobApplicationFormSettings.job_id == job_id)
        .first()
    )
    eff_cfg, eff_fields, uses_org = resolve_application_form_for_job(job_id, organization_id, db)
    _, org_all_fields = get_org_application_form(organization_id, db)

    return JobApplicationFormSettingsResponse(
        use_organization_defaults=settings.use_organization_defaults if settings else True,
        resolved=ResolvedApplicationForm(
            config=eff_cfg,
            custom_fields=[PublicCustomFieldResponse.model_validate(f) for f in eff_fields],
        ),
        organization_custom_fields=[PublicCustomFieldResponse.model_validate(f) for f in org_all_fields],
        standard_config=settings.standard_config if settings and not settings.use_organization_defaults else None,
        custom_field_ids=list(settings.custom_field_ids)
        if settings
        and not settings.use_organization_defaults
        and settings.custom_field_ids is not None
        else None,
    )


@router.get("/{job_id}/application-form", response_model=JobApplicationFormSettingsResponse)
def get_job_application_form(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.organization_id == current_user.organization_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")
    return _job_application_form_response(job.id, current_user.organization_id, db)


@router.put("/{job_id}/application-form", response_model=JobApplicationFormSettingsResponse)
def put_job_application_form(
    job_id: int,
    payload: JobApplicationFormSettingsPut,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can configure job application forms")

    job = (
        db.query(Job)
        .filter(Job.id == job_id, Job.organization_id == current_user.organization_id)
        .first()
    )
    if not job:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Job not found")

    org_id = current_user.organization_id

    if payload.use_organization_defaults:
        existing = (
            db.query(JobApplicationFormSettings)
            .filter(JobApplicationFormSettings.job_id == job_id)
            .first()
        )
        if existing:
            db.delete(existing)
        db.commit()
        return _job_application_form_response(job.id, org_id, db)

    if payload.standard_config is None or payload.custom_field_ids is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="standard_config and custom_field_ids are required when overriding the form",
        )

    valid_ids = {
        r[0]
        for r in db.query(CustomFormField.id)
        .filter(CustomFormField.organization_id == org_id)
        .all()
    }
    for fid in payload.custom_field_ids:
        if fid not in valid_ids:
            raise HTTPException(
                status_code=400,
                detail=f"Custom field id {fid} does not belong to this organization",
            )

    row = (
        db.query(JobApplicationFormSettings)
        .filter(JobApplicationFormSettings.job_id == job_id)
        .first()
    )
    if not row:
        row = JobApplicationFormSettings(job_id=job_id)
        db.add(row)

    row.use_organization_defaults = False
    row.standard_config = payload.standard_config.model_dump()
    row.custom_field_ids = list(payload.custom_field_ids)
    db.commit()

    return _job_application_form_response(job.id, org_id, db)


# Initialize job description parser
job_parser = JobDescriptionParser()
logger = logging.getLogger(__name__)


@router.post("/{job_id}/parse-requirements")
async def parse_job_requirements(
    job_id: int,
    force_reparse: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Parse job description and extract structured requirements"""
    # Get the job
    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.organization_id == current_user.organization_id
        )
        .first()
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Check if requirements already exist and don't need reparsing
    existing_requirements = (
        db.query(JobRequirement)
        .filter(JobRequirement.job_id == job_id)
        .first()
    )
    
    if existing_requirements and not existing_requirements.needs_reparsing and not force_reparse:
        return {
            "message": "Job requirements already parsed",
            "job_id": job_id,
            "requirements_id": existing_requirements.id,
            "parsed_at": existing_requirements.parsed_at.isoformat(),
            "requirements": {
                "required_skills": existing_requirements.required_skills or [],
                "nice_to_have_skills": existing_requirements.nice_to_have_skills or [],
                "min_experience_years": existing_requirements.min_experience_years,
                "max_experience_years": existing_requirements.max_experience_years,
                "education_requirements": existing_requirements.education_requirements or [],
                "location_requirements": existing_requirements.location_requirements or [],
                "primary_skills": existing_requirements.primary_skills or [],
            }
        }

    try:
        # Parse the job description
        parsed_data = await job_parser.parse_job_description_async(
            job_description=job.description,
            job_title=job.title,
            job_location=job.location or "",
            employment_type=job.employment_type,
            experience_level=job.experience_level
        )
        
        # Create or update job requirements
        if existing_requirements:
            # Update existing
            existing_requirements.required_skills = parsed_data["required_skills"]
            existing_requirements.nice_to_have_skills = parsed_data["nice_to_have_skills"]
            existing_requirements.min_experience_years = parsed_data["min_experience_years"]
            existing_requirements.max_experience_years = parsed_data["max_experience_years"]
            existing_requirements.education_requirements = parsed_data["education_requirements"]
            existing_requirements.location_requirements = parsed_data["location_requirements"]
            existing_requirements.primary_skills = parsed_data.get("primary_skills", [])
            existing_requirements.needs_reparsing = False
            
            db.commit()
            db.refresh(existing_requirements)
            requirements_record = existing_requirements
        else:
            # Create new
            requirements_record = JobRequirement(
                job_id=job_id,
                required_skills=parsed_data["required_skills"],
                nice_to_have_skills=parsed_data["nice_to_have_skills"],
                primary_skills=parsed_data.get("primary_skills", []),
                min_experience_years=parsed_data["min_experience_years"],
                max_experience_years=parsed_data["max_experience_years"],
                education_requirements=parsed_data["education_requirements"],
                location_requirements=parsed_data["location_requirements"],
                needs_reparsing=False
            )
            
            db.add(requirements_record)
            db.commit()
            db.refresh(requirements_record)
        
        return {
            "message": "Job requirements parsed successfully",
            "job_id": job_id,
            "requirements_id": requirements_record.id,
            "parsed_at": requirements_record.parsed_at.isoformat(),
            "requirements": {
                "required_skills": requirements_record.required_skills or [],
                "nice_to_have_skills": requirements_record.nice_to_have_skills or [],
                "min_experience_years": requirements_record.min_experience_years,
                "max_experience_years": requirements_record.max_experience_years,
                "education_requirements": requirements_record.education_requirements or [],
                "location_requirements": requirements_record.location_requirements or [],
                "primary_skills": requirements_record.primary_skills or [],
            },
            "parsing_metadata": parsed_data["parsing_metadata"]
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to parse job requirements: {str(e)}"
        )


@router.get("/{job_id}/requirements")
def get_job_requirements(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Get parsed job requirements"""
    # Verify job exists and belongs to user's organization
    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.organization_id == current_user.organization_id
        )
        .first()
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get requirements
    requirements = (
        db.query(JobRequirement)
        .filter(JobRequirement.job_id == job_id)
        .first()
    )
    
    if not requirements:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job requirements not found. Please parse the job description first."
        )
    
    return {
        "job_id": job_id,
        "requirements_id": requirements.id,
        "parsed_at": requirements.parsed_at.isoformat(),
        "needs_reparsing": requirements.needs_reparsing,
        "requirements": {
            "required_skills": requirements.required_skills or [],
            "nice_to_have_skills": requirements.nice_to_have_skills or [],
            "min_experience_years": requirements.min_experience_years,
            "max_experience_years": requirements.max_experience_years,
            "education_requirements": requirements.education_requirements or [],
            "location_requirements": requirements.location_requirements or [],
            "primary_skills": requirements.primary_skills or [],
        },
        "summary": {
            "total_skills": requirements.total_skills_count,
            "required_skills_count": len(requirements.required_skills or []),
            "nice_to_have_skills_count": len(requirements.nice_to_have_skills or []),
            "primary_skills_count": len(requirements.primary_skills or []),
            "has_experience_requirements": requirements.min_experience_years is not None,
            "has_education_requirements": bool(requirements.education_requirements),
            "has_location_requirements": bool(requirements.location_requirements),
        }
    }


@router.put("/{job_id}/requirements")
def update_job_requirements(
    job_id: int,
    requirements_update: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Manually update job requirements"""
    # Verify job exists and belongs to user's organization
    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.organization_id == current_user.organization_id
        )
        .first()
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    # Get or create requirements
    requirements = (
        db.query(JobRequirement)
        .filter(JobRequirement.job_id == job_id)
        .first()
    )
    
    if not requirements:
        requirements = JobRequirement(job_id=job_id)
        db.add(requirements)
    
    # Update fields that are provided
    if "required_skills" in requirements_update:
        requirements.required_skills = requirements_update["required_skills"]
    if "nice_to_have_skills" in requirements_update:
        requirements.nice_to_have_skills = requirements_update["nice_to_have_skills"]
    if "min_experience_years" in requirements_update:
        requirements.min_experience_years = requirements_update["min_experience_years"]
    if "max_experience_years" in requirements_update:
        requirements.max_experience_years = requirements_update["max_experience_years"]
    if "education_requirements" in requirements_update:
        requirements.education_requirements = requirements_update["education_requirements"]
    if "location_requirements" in requirements_update:
        requirements.location_requirements = requirements_update["location_requirements"]
    if "primary_skills" in requirements_update:
        requirements.primary_skills = requirements_update["primary_skills"]
    
    # Mark as manually updated (doesn't need reparsing unless job description changes)
    requirements.needs_reparsing = False
    
    db.commit()
    db.refresh(requirements)
    
    return {
        "message": "Job requirements updated successfully",
        "job_id": job_id,
        "requirements_id": requirements.id,
        "requirements": {
            "required_skills": requirements.required_skills or [],
            "nice_to_have_skills": requirements.nice_to_have_skills or [],
            "min_experience_years": requirements.min_experience_years,
            "max_experience_years": requirements.max_experience_years,
            "education_requirements": requirements.education_requirements or [],
            "location_requirements": requirements.location_requirements or [],
            "primary_skills": requirements.primary_skills or [],
        }
    }


# === AI MATCHING ENDPOINTS ===

@router.post("/{job_id}/calculate-matches")
async def calculate_job_matches(
    job_id: int,
    candidate_ids: Optional[List[int]] = None,
    force_recalculate: bool = False,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Calculate AI match scores for candidates against a job"""
    
    # Verify job exists and belongs to user's organization
    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.organization_id == current_user.organization_id
        )
        .first()
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    try:
        matching_service = CandidateMatchingService(db)
        
        results = matching_service.calculate_matches_for_job(
            job_id=job_id,
            candidate_ids=candidate_ids,
            force_recalculate=force_recalculate
        )
        
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results["error"]
            )
        
        return {
            "message": "Match calculation completed",
            **results
        }
        
    except Exception as e:
        logger.error(f"Error calculating matches for job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to calculate matches: {str(e)}"
        )


@router.get("/{job_id}/ranked-candidates")
def get_ranked_candidates(
    job_id: int,
    limit: int = 50,
    offset: int = 0,
    min_score: Optional[float] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Get candidates ranked by AI match score for a job"""
    
    # Verify job exists and belongs to user's organization
    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.organization_id == current_user.organization_id
        )
        .first()
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    try:
        matching_service = CandidateMatchingService(db)
        
        results = matching_service.get_ranked_candidates_for_job(
            job_id=job_id,
            limit=limit,
            offset=offset,
            min_score=min_score
        )
        
        if "error" in results:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=results["error"]
            )
        
        return results
        
    except Exception as e:
        logger.error(f"Error getting ranked candidates for job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get ranked candidates: {str(e)}"
        )


@router.post("/{job_id}/bulk-score")
async def bulk_recalculate_scores(
    job_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
) -> Dict[str, Any]:
    """Recalculate all match scores for a job (after job changes)"""
    
    # Verify job exists and belongs to user's organization
    job = (
        db.query(Job)
        .filter(
            Job.id == job_id,
            Job.organization_id == current_user.organization_id
        )
        .first()
    )
    
    if not job:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Job not found"
        )
    
    try:
        matching_service = CandidateMatchingService(db)
        
        # Mark all existing matches for recalculation
        updated_count = matching_service.mark_matches_for_recalculation(job_id=job_id)
        
        # Recalculate all matches
        results = matching_service.calculate_matches_for_job(
            job_id=job_id,
            force_recalculate=True
        )
        
        return {
            "message": "Bulk score recalculation completed",
            "marked_for_recalculation": updated_count,
            **results
        }
        
    except Exception as e:
        logger.error(f"Error bulk recalculating scores for job {job_id}: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to recalculate scores: {str(e)}"
        )