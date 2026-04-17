import json
import logging
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, status, UploadFile, File, Form, Request, Header
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from typing import Optional
import uuid
import aiofiles
from pathlib import Path
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import get_db
from app.core.validation import validate_search_query
from app.core.email import send_application_confirmation, send_new_application_notification
from app.db.models.organization import Organization
from app.db.models.job import Job
from app.db.models.user import User
from app.db.models.candidate import Candidate
from app.db.models.candidate_file import CandidateFile
from app.db.models.job_application import JobApplication
from app.services.application_form_resolution import (
    get_org_application_form,
    resolve_application_form_for_job,
)
from app.schemas.public_careers import (
    PublicCareerPageResponse,
    PublicOrganizationResponse,
    PublicJobListItem,
    PublicJobDetail,
    JobApplicationCreate,
    JobApplicationResponse,
    PublicFormConfigResponse,
    PublicCustomFieldResponse,
)
from app.api.files import (
    get_resume_parser,
    save_work_experience,
    calculate_experience_years,
    validate_uploaded_file_content,
)

logger = logging.getLogger(__name__)
limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

UPLOAD_DIR = Path("uploads/resumes")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt'}


def _get_form_config_for_org(org_id: int, db: Session) -> dict:
    """Org-level application form (career page index / previews)."""
    cfg, fields = get_org_application_form(org_id, db)
    return {
        "config": cfg.model_dump(),
        "custom_fields": [PublicCustomFieldResponse.model_validate(f).model_dump() for f in fields],
    }


@router.get("/{org_slug}")
@limiter.limit("30/minute")
def get_career_page(
    request: Request,
    org_slug: str,
    category: Optional[str] = None,
    work_arrangement: Optional[str] = None,
    employment_type: Optional[str] = None,
    search: Optional[str] = None,
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.slug == org_slug).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if not org.career_page_enabled:
        raise HTTPException(status_code=404, detail="Career page is not available")

    query = db.query(Job).filter(
        Job.organization_id == org.id,
        Job.status == "open",
    )

    if category:
        query = query.filter(Job.category == category)
    if work_arrangement:
        query = query.filter(Job.work_arrangement == work_arrangement)
    if employment_type:
        query = query.filter(Job.employment_type == employment_type)
    if search:
        sanitized_search = validate_search_query(search)
        if sanitized_search:
            query = query.filter(Job.title.ilike(f"%{sanitized_search}%"))

    jobs = query.order_by(Job.created_at.desc()).all()

    # Get distinct categories for filter sidebar
    categories = (
        db.query(Job.category)
        .filter(Job.organization_id == org.id, Job.status == "open", Job.category.isnot(None))
        .distinct()
        .all()
    )
    category_list = sorted([c[0] for c in categories])

    form_config = _get_form_config_for_org(org.id, db)

    return {
        "organization": PublicOrganizationResponse.model_validate(org),
        "jobs": [PublicJobListItem.model_validate(j) for j in jobs],
        "total_count": len(jobs),
        "categories": category_list,
        "application_form": form_config,
    }


@router.get("/{org_slug}/{job_slug}")
@limiter.limit("30/minute")
def get_career_job_detail(
    request: Request,
    org_slug: str,
    job_slug: str,
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.slug == org_slug).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if not org.career_page_enabled:
        raise HTTPException(status_code=404, detail="Career page is not available")

    job = (
        db.query(Job)
        .filter(
            Job.organization_id == org.id,
            Job.slug == job_slug,
            Job.status == "open",
        )
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    job.organization = org
    eff_cfg, eff_fields, uses_org = resolve_application_form_for_job(job.id, org.id, db)

    return {
        "job": PublicJobDetail.model_validate(job),
        "application_form": {
            "config": eff_cfg.model_dump(),
            "custom_fields": [PublicCustomFieldResponse.model_validate(f).model_dump() for f in eff_fields],
            "use_organization_defaults": uses_org,
        },
    }


@router.post("/{org_slug}/{job_slug}/apply", response_model=JobApplicationResponse)
@limiter.limit("5/minute")
async def apply_to_job(
    request: Request,
    org_slug: str,
    job_slug: str,
    background_tasks: BackgroundTasks,
    idempotency_key: Optional[str] = Header(default=None, alias="Idempotency-Key"),
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    linkedin_url: Optional[str] = Form(None),
    portfolio_url: Optional[str] = Form(None),
    cover_letter: Optional[str] = Form(None),
    custom_fields: Optional[str] = Form(None),  # JSON string of custom field responses
    resume: UploadFile = File(...),
    db: Session = Depends(get_db),
):
    # Validate form data through schema
    try:
        form_data = JobApplicationCreate(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=phone,
            location=location,
            linkedin_url=linkedin_url,
            portfolio_url=portfolio_url,
            cover_letter=cover_letter,
        )
    except Exception as e:
        raise HTTPException(status_code=422, detail=str(e))

    # Look up org and job
    org = db.query(Organization).filter(Organization.slug == org_slug).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if not org.career_page_enabled:
        raise HTTPException(status_code=404, detail="Career page is not available")

    job = (
        db.query(Job)
        .filter(
            Job.organization_id == org.id,
            Job.slug == job_slug,
            Job.status == "open",
        )
        .first()
    )
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")

    custom_field_responses = None
    if custom_fields:
        try:
            custom_field_responses = json.loads(custom_fields)
        except json.JSONDecodeError:
            raise HTTPException(status_code=422, detail="Invalid custom fields format")

    eff_cfg, eff_custom_fields, _ = resolve_application_form_for_job(job.id, org.id, db)

    for cf in eff_custom_fields:
        if cf.is_required and (not custom_field_responses or cf.field_key not in custom_field_responses):
            raise HTTPException(
                status_code=422,
                detail=f"Required field '{cf.label}' is missing",
            )

    # Validate required default fields based on effective form config for this job
    if eff_cfg.show_phone and eff_cfg.require_phone and not phone:
        raise HTTPException(status_code=422, detail="Phone is required")
    if eff_cfg.show_location and eff_cfg.require_location and not location:
        raise HTTPException(status_code=422, detail="Location is required")
    if eff_cfg.show_linkedin and eff_cfg.require_linkedin and not linkedin_url:
        raise HTTPException(status_code=422, detail="LinkedIn URL is required")
    if eff_cfg.show_portfolio and eff_cfg.require_portfolio and not portfolio_url:
        raise HTTPException(status_code=422, detail="Portfolio URL is required")
    if eff_cfg.show_cover_letter and eff_cfg.require_cover_letter and not cover_letter:
        raise HTTPException(status_code=422, detail="Cover letter is required")

    # Validate resume file
    if not resume.filename:
        raise HTTPException(status_code=400, detail="No resume file provided")

    file_content = await resume.read()
    sanitized_filename, file_ext = validate_uploaded_file_content(
        file_content,
        resume.filename,
        allowed_extensions=ALLOWED_EXTENSIONS,
        max_size=MAX_FILE_SIZE,
        size_error="File too large. Maximum size: 10MB",
    )

    # Check for existing candidate by email in org -> reuse if found
    candidate = (
        db.query(Candidate)
        .filter(Candidate.email == form_data.email, Candidate.organization_id == org.id)
        .first()
    )

    if not candidate:
        # Parse resume and create new candidate
        try:
            parser = get_resume_parser()
            parsed_data = await parser.parse_resume(file_content, sanitized_filename)

            personal_info = parsed_data.get("personal_info", {})
            skills_info = parsed_data.get("skills", {})

            all_skills = []
            if isinstance(skills_info, dict):
                for skill_type in ['technical_skills', 'soft_skills', 'certifications']:
                    if skills_info.get(skill_type) and isinstance(skills_info[skill_type], list):
                        all_skills.extend(skills_info[skill_type])
            elif isinstance(skills_info, list):
                all_skills = skills_info

            work_experiences = parsed_data.get("work_experience", [])

            candidate = Candidate(
                first_name=form_data.first_name,
                last_name=form_data.last_name,
                email=form_data.email,
                phone=form_data.phone,
                location=form_data.location or personal_info.get("location"),
                linkedin_url=form_data.linkedin_url or personal_info.get("linkedin"),
                portfolio_url=form_data.portfolio_url or personal_info.get("website"),
                skills=all_skills if all_skills else None,
                education=parsed_data.get("education"),
                experience_years=calculate_experience_years(work_experiences),
                raw_resume_text=parsed_data.get("raw_text"),
                organization_id=org.id,
                added_by_id=None,
            )
            db.add(candidate)
            db.flush()

            if work_experiences:
                save_work_experience(candidate.id, work_experiences, db)
        except Exception:
            # If parsing fails, create candidate with form data only
            candidate = Candidate(
                first_name=form_data.first_name,
                last_name=form_data.last_name,
                email=form_data.email,
                phone=form_data.phone,
                location=form_data.location,
                linkedin_url=form_data.linkedin_url,
                portfolio_url=form_data.portfolio_url,
                organization_id=org.id,
                added_by_id=None,
            )
            db.add(candidate)
            db.flush()

    # Check for duplicate application
    existing_app = (
        db.query(JobApplication)
        .filter(
            JobApplication.candidate_id == candidate.id,
            JobApplication.job_id == job.id,
        )
        .first()
    )
    if existing_app:
        raise HTTPException(status_code=409, detail="You have already applied for this position")

    # Optional idempotency support for safe client retries (network timeouts/retries).
    # Scope is per job to prevent accidental collisions across different jobs.
    normalized_idempotency_key: Optional[str] = None
    if idempotency_key:
        normalized_idempotency_key = idempotency_key.strip()
        if len(normalized_idempotency_key) > 128:
            raise HTTPException(status_code=400, detail="Idempotency-Key is too long (max 128 chars)")
        if normalized_idempotency_key:
            replayed_app = (
                db.query(JobApplication)
                .filter(
                    JobApplication.job_id == job.id,
                    JobApplication.idempotency_key == normalized_idempotency_key,
                )
                .first()
            )
            if replayed_app:
                return JobApplicationResponse(
                    message="Application already submitted",
                    application_id=replayed_app.id,
                )

    # Save resume file
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}_{sanitized_filename}"
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(file_content)

    candidate_file = CandidateFile(
        candidate_id=candidate.id,
        filename=sanitized_filename,
        file_path=str(file_path),
        file_type=file_ext[1:],
        file_size=len(file_content),
        is_parsed=True,
    )
    db.add(candidate_file)

    # Create job application with cover letter and custom fields
    application = JobApplication(
        job_id=job.id,
        candidate_id=candidate.id,
        status="applied",
        cover_letter=form_data.cover_letter,
        custom_field_responses=custom_field_responses,
        idempotency_key=normalized_idempotency_key,
    )
    db.add(application)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        # If this is a replay race, return the previously accepted application.
        if normalized_idempotency_key:
            replayed_app = (
                db.query(JobApplication)
                .filter(
                    JobApplication.job_id == job.id,
                    JobApplication.idempotency_key == normalized_idempotency_key,
                )
                .first()
            )
            if replayed_app:
                return JobApplicationResponse(
                    message="Application already submitted",
                    application_id=replayed_app.id,
                )
        raise
    db.refresh(application)

    # Send emails in the background (after response is sent)
    candidate_name = f"{form_data.first_name} {form_data.last_name}"
    job_title = job.title

    # Confirmation to candidate
    background_tasks.add_task(
        send_application_confirmation, form_data.email, candidate_name, job_title, org.name
    )

    # Notification to org admins and recruiters
    hr_users = (
        db.query(User.email)
        .filter(
            User.organization_id == org.id,
            User.role.in_(["admin", "recruiter"]),
            User.email_verified == True,
        )
        .all()
    )
    for (hr_email,) in hr_users:
        background_tasks.add_task(
            send_new_application_notification, hr_email, candidate_name, form_data.email, job_title, org.name
        )

    return JobApplicationResponse(
        message="Application submitted successfully",
        application_id=application.id,
    )
