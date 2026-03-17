from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form, Request
from sqlalchemy.orm import Session
from typing import Optional
import uuid
import aiofiles
from pathlib import Path
from slowapi import Limiter
from slowapi.util import get_remote_address

from app.core.security import get_db
from app.db.models.organization import Organization
from app.db.models.job import Job
from app.db.models.candidate import Candidate
from app.db.models.candidate_file import CandidateFile
from app.db.models.job_application import JobApplication
from app.schemas.public_careers import (
    PublicCareerPageResponse,
    PublicOrganizationResponse,
    PublicJobListItem,
    PublicJobDetail,
    JobApplicationCreate,
    JobApplicationResponse,
)
from app.api.files import get_resume_parser, save_work_experience

limiter = Limiter(key_func=get_remote_address)
router = APIRouter()

UPLOAD_DIR = Path("uploads/resumes")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt'}


@router.get("/{org_slug}", response_model=PublicCareerPageResponse)
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
        query = query.filter(Job.title.ilike(f"%{search}%"))

    jobs = query.order_by(Job.created_at.desc()).all()

    # Get distinct categories for filter sidebar
    categories = (
        db.query(Job.category)
        .filter(Job.organization_id == org.id, Job.status == "open", Job.category.isnot(None))
        .distinct()
        .all()
    )
    category_list = sorted([c[0] for c in categories])

    return PublicCareerPageResponse(
        organization=PublicOrganizationResponse.model_validate(org),
        jobs=[PublicJobListItem.model_validate(j) for j in jobs],
        total_count=len(jobs),
        categories=category_list,
    )


@router.get("/{org_slug}/{job_slug}", response_model=PublicJobDetail)
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

    # Attach org for response serialization
    job.organization = org
    return PublicJobDetail.model_validate(job)


@router.post("/{org_slug}/{job_slug}/apply", response_model=JobApplicationResponse)
@limiter.limit("5/minute")
async def apply_to_job(
    request: Request,
    org_slug: str,
    job_slug: str,
    first_name: str = Form(...),
    last_name: str = Form(...),
    email: str = Form(...),
    phone: Optional[str] = Form(None),
    location: Optional[str] = Form(None),
    linkedin_url: Optional[str] = Form(None),
    portfolio_url: Optional[str] = Form(None),
    cover_letter: Optional[str] = Form(None),
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

    # Validate resume file
    if not resume.filename:
        raise HTTPException(status_code=400, detail="No resume file provided")

    file_ext = Path(resume.filename).suffix.lower()
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"File type {file_ext} not supported. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    file_content = await resume.read()
    if len(file_content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large. Maximum size: 10MB")

    # Check for existing candidate by email in org → reuse if found
    candidate = (
        db.query(Candidate)
        .filter(Candidate.email == form_data.email, Candidate.organization_id == org.id)
        .first()
    )

    if not candidate:
        # Parse resume and create new candidate
        try:
            parser = get_resume_parser()
            parsed_data = await parser.parse_resume(file_content, resume.filename)

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
                experience_years=len(work_experiences) if work_experiences else None,
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

    # Save resume file
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}_{resume.filename}"
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(file_content)

    candidate_file = CandidateFile(
        candidate_id=candidate.id,
        filename=resume.filename,
        file_path=str(file_path),
        file_type=file_ext[1:],
        file_size=len(file_content),
        is_parsed=True,
    )
    db.add(candidate_file)

    # Create job application
    application = JobApplication(
        job_id=job.id,
        candidate_id=candidate.id,
        status="new",
    )
    db.add(application)
    db.commit()
    db.refresh(application)

    return JobApplicationResponse(
        message="Application submitted successfully",
        application_id=application.id,
    )
