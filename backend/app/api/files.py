from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from typing import List, Optional
import aiofiles
import uuid
import mimetypes
from pathlib import Path
import logging

from app.db.models.work_experience import WorkExperience
from app.db.models.candidate import Candidate
from app.db.models.candidate_file import CandidateFile
from app.core.security import get_db, require_org_member
from app.core.file_security import FileSecurityValidator, FileValidationError
from app.db.models.user import User
from app.services.llm_resume_parser import LLMResumeParser, RegexResumeParser, ParsingConfig

router = APIRouter()
logger = logging.getLogger(__name__)


def calculate_experience_years(work_experiences: list) -> Optional[int]:
    """Calculate total years of experience from work experience date ranges.

    Parses start_date/end_date (MM/YYYY or various formats) from each entry
    and sums the durations. Falls back to counting positions if dates can't be parsed.
    """
    if not work_experiences:
        return None

    from datetime import datetime, date
    import re

    total_months = 0
    parsed_any = False

    for exp in work_experiences:
        start_raw = exp.get("start_date", "")
        end_raw = exp.get("end_date", "")

        start = _parse_date(start_raw)
        end = _parse_date(end_raw, default_to_now=True)

        if start and end and end >= start:
            months = (end.year - start.year) * 12 + (end.month - start.month)
            total_months += max(months, 1)  # At least 1 month per position
            parsed_any = True

    if parsed_any:
        years = round(total_months / 12)
        return max(years, 1)  # At least 1 year if they have work experience

    # Fallback: estimate ~2 years per position if dates can't be parsed
    return len(work_experiences) * 2


def _parse_date(date_str: str, default_to_now: bool = False):
    """Parse a date string into a (year, month) date object.

    Handles: MM/YYYY, YYYY-MM, YYYY, Month YYYY, "Present", "Current", etc.
    """
    from datetime import date
    import re

    if not date_str or not isinstance(date_str, str):
        if default_to_now:
            return date.today()
        return None

    date_str = date_str.strip()

    # "Present", "Current", "Now", etc.
    if re.match(r'(?i)^(present|current|now|ongoing|today)$', date_str):
        return date.today()

    # MM/YYYY or MM-YYYY
    match = re.match(r'^(\d{1,2})[/\-](\d{4})$', date_str)
    if match:
        month, year = int(match.group(1)), int(match.group(2))
        if 1 <= month <= 12 and 1950 <= year <= 2030:
            return date(year, month, 1)

    # YYYY-MM
    match = re.match(r'^(\d{4})[/\-](\d{1,2})$', date_str)
    if match:
        year, month = int(match.group(1)), int(match.group(2))
        if 1 <= month <= 12 and 1950 <= year <= 2030:
            return date(year, month, 1)

    # Month YYYY (e.g., "January 2020", "Jan 2020")
    match = re.match(r'^([A-Za-z]+)\s+(\d{4})$', date_str)
    if match:
        month_str, year = match.group(1), int(match.group(2))
        month = _month_to_number(month_str)
        if month and 1950 <= year <= 2030:
            return date(year, month, 1)

    # Just a year (e.g., "2020")
    match = re.match(r'^(\d{4})$', date_str)
    if match:
        year = int(match.group(1))
        if 1950 <= year <= 2030:
            return date(year, 1, 1)

    if default_to_now:
        return date.today()
    return None


def _month_to_number(month_str: str) -> Optional[int]:
    """Convert month name/abbreviation to number."""
    months = {
        "jan": 1, "january": 1, "feb": 2, "february": 2,
        "mar": 3, "march": 3, "apr": 4, "april": 4,
        "may": 5, "jun": 6, "june": 6, "jul": 7, "july": 7,
        "aug": 8, "august": 8, "sep": 9, "september": 9,
        "oct": 10, "october": 10, "nov": 11, "november": 11,
        "dec": 12, "december": 12,
    }
    return months.get(month_str.lower().strip())

# Configuration
UPLOAD_DIR = Path("uploads/resumes")
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10MB
ALLOWED_EXTENSIONS = {'.pdf', '.docx', '.doc', '.txt'}


def validate_uploaded_file_content(
    file_content: bytes,
    filename: str,
    *,
    allowed_extensions: set[str],
    max_size: int,
    size_error: str,
) -> tuple[str, str]:
    """Validate uploaded content and return (sanitized_filename, file_ext)."""
    try:
        _, sanitized_filename = FileSecurityValidator.validate_filename(filename)
        file_ext = Path(sanitized_filename).suffix.lower()
        if file_ext not in allowed_extensions:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail=f"File type {file_ext} not supported. Allowed: {', '.join(allowed_extensions)}",
            )
        if len(file_content) > max_size:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail=size_error,
            )
        FileSecurityValidator.validate_file_type(file_content, sanitized_filename)
        FileSecurityValidator.scan_for_malware_signatures(file_content)
    except FileValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(exc),
        ) from exc

    return sanitized_filename, file_ext

@router.get("/download/{file_id}")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    """Download a resume file by its ID"""
    candidate_file = (
        db.query(CandidateFile)
        .join(Candidate, CandidateFile.candidate_id == Candidate.id)
        .filter(
            CandidateFile.id == file_id,
            Candidate.organization_id == current_user.organization_id,
        )
        .first()
    )

    if not candidate_file:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found"
        )

    file_path = Path(candidate_file.file_path)
    if not file_path.exists():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="File not found on disk"
        )

    media_type, _ = mimetypes.guess_type(candidate_file.filename)
    if not media_type:
        media_type = "application/octet-stream"

    return FileResponse(
        path=str(file_path),
        filename=candidate_file.filename,
        media_type=media_type,
    )


# Initialize parser lazily to avoid startup issues
resume_parser = None

def get_resume_parser():
    """Get parser instance, creating it lazily. Falls back to regex parsing if OpenAI is unavailable."""
    global resume_parser
    if resume_parser is None:
        import os
        try:
            config = ParsingConfig(
                model=os.getenv('OPENAI_MODEL', 'gpt-3.5-turbo'),
                temperature=float(os.getenv('OPENAI_TEMPERATURE', '0.1')),
                max_tokens=int(os.getenv('OPENAI_MAX_TOKENS', '2000')),
                timeout=int(os.getenv('OPENAI_TIMEOUT', '30')),
            )
            resume_parser = LLMResumeParser(config=config)
            logger.info("LLM resume parser initialized")
        except Exception as e:
            logger.warning(f"LLM parser unavailable ({e}), using regex fallback")
            resume_parser = RegexResumeParser()
    return resume_parser


def save_work_experience(candidate_id: int, work_experiences: List[dict], db: Session):
    """Save work experience entries for a candidate"""
    for exp in work_experiences:
        work_exp = WorkExperience(
            candidate_id=candidate_id,
            job_title=exp.get('job_title'),
            company_name=exp.get('company_name'),
            location=exp.get('location'),
            employment_type=exp.get('employment_type'),
            start_date=exp.get('start_date'),
            end_date=exp.get('end_date'),
            duration=exp.get('duration'),
            description=exp.get('description'),
            responsibilities=exp.get('responsibilities')
        )
        db.add(work_exp)


@router.post("/upload-resume-create-candidate")
async def upload_resume_create_candidate(
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(require_org_member),
):
    """Upload a resume and automatically create a new candidate"""

    # Validate file
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )

    file_content = await file.read()
    sanitized_filename, file_ext = validate_uploaded_file_content(
        file_content,
        file.filename,
        allowed_extensions=ALLOWED_EXTENSIONS,
        max_size=MAX_FILE_SIZE,
        size_error=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024 * 1024)}MB",
    )

    try:
        # Parse resume first
        parser = get_resume_parser()
        parsed_data = await parser.parse_resume(file_content, sanitized_filename)

        # Debug logging
        logger.info(f"Parse result keys: {list(parsed_data.keys())}")
        parsing_method = parsed_data.get("parsing_metadata", {}).get("method", "unknown")
        logger.info(f"Parsing method used: {parsing_method}")

        # Handle LLM parser result structure
        personal_info = parsed_data.get("personal_info", {})
        skills_info = parsed_data.get("skills", {})
        
        # Extract name from full_name
        first_name = None
        last_name = None
        if personal_info.get("full_name"):
            name_parts = personal_info["full_name"].split()
            if len(name_parts) >= 2:
                first_name = name_parts[0]
                last_name = " ".join(name_parts[1:])
            else:
                first_name = personal_info["full_name"]
        
        # Check for duplicate email if provided
        email = personal_info.get("email")
        if email:
            existing = db.query(Candidate).filter(
                Candidate.email == email,
                Candidate.organization_id == current_user.organization_id
            ).first()
            if existing:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Candidate with email {email} already exists in your organization"
                )
        
        # Collect all skills from different categories
        all_skills = []
        if isinstance(skills_info, dict):
            # LLM parser format: {"technical_skills": [...], "soft_skills": [...]}
            for skill_type in ['technical_skills', 'soft_skills', 'certifications']:
                if skills_info.get(skill_type) and isinstance(skills_info[skill_type], list):
                    all_skills.extend(skills_info[skill_type])
        elif isinstance(skills_info, list):
            # Regex parser format: ["skill1", "skill2", ...]
            all_skills = skills_info
        
        # Calculate experience years from work experience dates
        work_experiences = parsed_data.get("work_experience", [])
        experience_years = calculate_experience_years(work_experiences)

        # Create new candidate with parsed data
        candidate = Candidate(
            first_name=first_name,
            last_name=last_name,
            email=email,
            phone=personal_info.get("phone"),
            location=personal_info.get("location"),
            linkedin_url=personal_info.get("linkedin"),
            portfolio_url=personal_info.get("website"),
            skills=all_skills if all_skills else None,
            education=parsed_data.get("education"),
            experience_years=experience_years,
            raw_resume_text=parsed_data.get("raw_text"),
            organization_id=current_user.organization_id,
            added_by_id=current_user.id
        )

        db.add(candidate)
        db.flush()  # Get the ID without committing

        # Save work experience entries
        if work_experiences:
            save_work_experience(candidate.id, work_experiences, db)

        # Generate unique filename and save file
        file_id = str(uuid.uuid4())
        file_path = UPLOAD_DIR / f"{file_id}_{sanitized_filename}"

        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)

        # Create file record
        candidate_file = CandidateFile(
            candidate_id=candidate.id,
            filename=sanitized_filename,
            file_path=str(file_path),
            file_type=file_ext[1:],  # Remove the dot
            file_size=len(file_content),
            is_parsed=True
        )

        db.add(candidate_file)
        db.commit()
        db.refresh(candidate)
        db.refresh(candidate_file)

        # Prepare response with LLM parsing metadata
        parsing_metadata = parsed_data.get("parsing_metadata", {})
        
        # Count all skills
        total_skills = 0
        if isinstance(skills_info, dict):
            for skill_type in ['technical_skills', 'soft_skills', 'certifications']:
                if skills_info.get(skill_type) and isinstance(skills_info[skill_type], list):
                    total_skills += len(skills_info[skill_type])
        elif isinstance(skills_info, list):
            total_skills = len(skills_info)

        return {
            "message": "Resume uploaded and candidate created successfully",
            "candidate_id": candidate.id,
            "file_id": candidate_file.id,
            "candidate": {
                "id": candidate.id,
                "first_name": candidate.first_name,
                "last_name": candidate.last_name,
                "email": candidate.email,
                "phone": candidate.phone,
                "location": candidate.location,
                "skills_count": len(candidate.skills) if candidate.skills else 0,
                "experience_years": candidate.experience_years
            },
            "parsed_data": {
                "name_found": bool(personal_info.get("full_name")),
                "skills_found": total_skills,
                "email_found": bool(personal_info.get("email")),
                "phone_found": bool(personal_info.get("phone")),
                "location_found": bool(personal_info.get("location")),
                "linkedin_found": bool(personal_info.get("linkedin")),
                "website_found": bool(personal_info.get("website")),
                "experience_years": candidate.experience_years,
                "education_items": len(parsed_data.get("education", [])),
                "work_experience_items": len(work_experiences),
                "projects_found": len(parsed_data.get("projects", [])),
                "parsing_method": parsing_metadata.get("method", "unknown"),
                "parsing_strategy": parsing_metadata.get("strategy", "unknown"),
                "language_detected": parsing_metadata.get("language", "unknown")
            }
        }

    except HTTPException:
        # Re-raise HTTP exceptions as-is
        raise
    
    except Exception as e:
        logger.error(f"Unexpected error uploading resume and creating candidate: {e}")
        import traceback
        traceback.print_exc()
        
        # Check if it's an LLM parsing error
        if "LLM parsing failed" in str(e) or "OpenAI" in str(e):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Resume parsing failed. Please check if the file is a valid resume and try again. Error: {str(e)}"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to process resume upload: {str(e)}"
            )


@router.post("/upload-resume/{candidate_id}")
async def upload_resume(
        candidate_id: int,
        file: UploadFile = File(...),
        db: Session = Depends(get_db),
        current_user: User = Depends(require_org_member),
):
    """Upload and parse a resume for an existing candidate"""

    # Validate candidate exists and belongs to user's organization
    candidate = db.query(Candidate).filter(
        Candidate.id == candidate_id,
        Candidate.organization_id == current_user.organization_id
    ).first()

    if not candidate:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Candidate not found"
        )

    # Validate file
    if not file.filename:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )

    file_content = await file.read()
    sanitized_filename, file_ext = validate_uploaded_file_content(
        file_content,
        file.filename,
        allowed_extensions=ALLOWED_EXTENSIONS,
        max_size=MAX_FILE_SIZE,
        size_error=f"File too large. Maximum size: {MAX_FILE_SIZE // (1024 * 1024)}MB",
    )

    # Generate unique filename
    file_id = str(uuid.uuid4())
    file_path = UPLOAD_DIR / f"{file_id}_{sanitized_filename}"

    try:
        # Save file
        async with aiofiles.open(file_path, 'wb') as f:
            await f.write(file_content)

        # Parse resume
        parser = get_resume_parser()
        parsed_data = await parser.parse_resume(file_content, sanitized_filename)

        # Handle LLM parser result structure
        personal_info = parsed_data.get("personal_info", {})
        skills_info = parsed_data.get("skills", {})
        
        # Update candidate with parsed data (only if not already set)
        if personal_info.get("full_name") and not candidate.first_name:
            # Split full name into first and last
            name_parts = personal_info["full_name"].split()
            if len(name_parts) >= 2:
                candidate.first_name = name_parts[0]
                candidate.last_name = " ".join(name_parts[1:])
            else:
                candidate.first_name = personal_info["full_name"]
        
        if personal_info.get("email") and not candidate.email:
            candidate.email = personal_info["email"]
        if personal_info.get("phone") and not candidate.phone:
            candidate.phone = personal_info["phone"]
        if personal_info.get("location") and not candidate.location:
            candidate.location = personal_info["location"]
        if personal_info.get("linkedin") and not candidate.linkedin_url:
            candidate.linkedin_url = personal_info["linkedin"]
        if personal_info.get("website") and not candidate.portfolio_url:
            candidate.portfolio_url = personal_info["website"]
        
        # Handle skills (LLM format is different)
        if skills_info:
            existing_skills = candidate.skills or []
            new_skills = []
            
            # Collect all skills from different categories
            if isinstance(skills_info, dict):
                for skill_type in ['technical_skills', 'soft_skills', 'certifications']:
                    if skills_info.get(skill_type) and isinstance(skills_info[skill_type], list):
                        new_skills.extend(skills_info[skill_type])
            elif isinstance(skills_info, list):
                new_skills = skills_info
            
            if new_skills:
                combined_skills = list(set(existing_skills + new_skills))
                candidate.skills = combined_skills
        
        if parsed_data.get("education"):
            candidate.education = parsed_data["education"]
        
        # Calculate experience years from work experience if not already set
        work_experiences = parsed_data.get("work_experience", [])
        if work_experiences and not candidate.experience_years:
            candidate.experience_years = calculate_experience_years(work_experiences)
        
        # Store raw resume text if available
        if hasattr(parsed_data, 'raw_text'):
            candidate.raw_resume_text = parsed_data.get("raw_text")

        # Save work experience entries
        if parsed_data.get("work_experience"):
            # Clear existing work experience for this candidate
            db.query(WorkExperience).filter(WorkExperience.candidate_id == candidate_id).delete()
            # Save new work experience
            save_work_experience(candidate_id, parsed_data["work_experience"], db)

        # Create file record
        candidate_file = CandidateFile(
            candidate_id=candidate_id,
            filename=sanitized_filename,
            file_path=str(file_path),
            file_type=file_ext[1:],  # Remove the dot
            file_size=len(file_content),
            is_parsed=True
        )

        db.add(candidate_file)
        db.commit()
        db.refresh(candidate)
        db.refresh(candidate_file)

        # Prepare response with LLM parsing metadata
        personal_info = parsed_data.get("personal_info", {})
        skills_info = parsed_data.get("skills", {})
        parsing_metadata = parsed_data.get("parsing_metadata", {})
        
        # Count all skills
        total_skills = 0
        if isinstance(skills_info, dict):
            for skill_type in ['technical_skills', 'soft_skills', 'certifications']:
                if skills_info.get(skill_type) and isinstance(skills_info[skill_type], list):
                    total_skills += len(skills_info[skill_type])
        elif isinstance(skills_info, list):
            total_skills = len(skills_info)

        return {
            "message": "Resume uploaded and parsed successfully",
            "file_id": candidate_file.id,
            "parsed_data": {
                "name_found": bool(personal_info.get("full_name")),
                "skills_found": total_skills,
                "email_found": bool(personal_info.get("email")),
                "phone_found": bool(personal_info.get("phone")),
                "location_found": bool(personal_info.get("location")),
                "linkedin_found": bool(personal_info.get("linkedin")),
                "website_found": bool(personal_info.get("website")),
                "experience_years": candidate.experience_years,
                "education_items": len(parsed_data.get("education", [])),
                "work_experience_items": len(parsed_data.get("work_experience", [])),
                "projects_found": len(parsed_data.get("projects", [])),
                "parsing_method": parsing_metadata.get("method", "unknown"),
                "parsing_strategy": parsing_metadata.get("strategy", "unknown"),
                "language_detected": parsing_metadata.get("language", "unknown")
            }
        }

    except Exception as e:
        logger.error(f"Unexpected error uploading resume: {e}")
        if file_path.exists():
            file_path.unlink()

        # Check if it's an LLM parsing error  
        if "LLM parsing failed" in str(e) or "OpenAI" in str(e):
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail=f"Resume parsing failed. Please check if the file is a valid resume and try again. Error: {str(e)}"
            )
        else:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Failed to process resume upload"
            )


@router.post("/bulk-upload-resumes")
async def bulk_upload_resumes(
        files: List[UploadFile] = File(...),
        auto_create_candidates: bool = Form(default=True),
        db: Session = Depends(get_db),
        current_user: User = Depends(require_org_member),
):
    """Bulk upload resumes and optionally auto-create candidates"""

    if len(files) > 20:  # Limit bulk uploads
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Maximum 20 files allowed per bulk upload"
        )

    results = []

    for file in files:
        try:
            # Validate file
            if not file.filename:
                results.append({
                    "filename": "unknown",
                    "success": False,
                    "error": "No filename provided"
                })
                continue

            file_content = await file.read()
            try:
                sanitized_filename, file_ext = validate_uploaded_file_content(
                    file_content,
                    file.filename,
                    allowed_extensions=ALLOWED_EXTENSIONS,
                    max_size=MAX_FILE_SIZE,
                    size_error="File too large",
                )
            except HTTPException as exc:
                results.append({
                    "filename": file.filename,
                    "success": False,
                    "error": exc.detail,
                })
                continue

            # Parse resume
            parser = get_resume_parser()
            parsed_data = await parser.parse_resume(file_content, sanitized_filename)

            if auto_create_candidates:
                # Handle LLM parser result structure
                personal_info = parsed_data.get("personal_info", {})
                skills_info = parsed_data.get("skills", {})
                
                # Extract name from full_name
                first_name = None
                last_name = None
                if personal_info.get("full_name"):
                    name_parts = personal_info["full_name"].split()
                    if len(name_parts) >= 2:
                        first_name = name_parts[0]
                        last_name = " ".join(name_parts[1:])
                    else:
                        first_name = personal_info["full_name"]
                
                # Collect all skills from different categories
                all_skills = []
                if isinstance(skills_info, dict):
                    for skill_type in ['technical_skills', 'soft_skills', 'certifications']:
                        if skills_info.get(skill_type) and isinstance(skills_info[skill_type], list):
                            all_skills.extend(skills_info[skill_type])
                elif isinstance(skills_info, list):
                    all_skills = skills_info
                
                # Calculate experience years from work experience dates
                work_experiences = parsed_data.get("work_experience", [])
                experience_years = calculate_experience_years(work_experiences)
                
                # Create new candidate with all parsed data
                candidate = Candidate(
                    first_name=first_name,
                    last_name=last_name,
                    email=personal_info.get("email"),
                    phone=personal_info.get("phone"),
                    location=personal_info.get("location"),
                    linkedin_url=personal_info.get("linkedin"),
                    portfolio_url=personal_info.get("website"),
                    skills=all_skills if all_skills else None,
                    education=parsed_data.get("education"),
                    experience_years=experience_years,
                    raw_resume_text=parsed_data.get("raw_text"),
                    organization_id=current_user.organization_id,
                    added_by_id=current_user.id
                )
                db.add(candidate)
                db.flush()  # Get the ID without committing

                # Save work experience
                if parsed_data.get("work_experience"):
                    save_work_experience(candidate.id, parsed_data["work_experience"], db)

                # Save file
                file_id = str(uuid.uuid4())
                file_path = UPLOAD_DIR / f"{file_id}_{sanitized_filename}"

                async with aiofiles.open(file_path, 'wb') as f:
                    await f.write(file_content)

                # Create file record
                candidate_file = CandidateFile(
                    candidate_id=candidate.id,
                    filename=sanitized_filename,
                    file_path=str(file_path),
                    file_type=file_ext[1:],
                    file_size=len(file_content),
                    is_parsed=True
                )
                db.add(candidate_file)

                # Calculate response data
                personal_info = parsed_data.get("personal_info", {})
                skills_info = parsed_data.get("skills", {})
                parsing_metadata = parsed_data.get("parsing_metadata", {})
                
                # Count all skills
                total_skills = 0
                if isinstance(skills_info, dict):
                    for skill_type in ['technical_skills', 'soft_skills', 'certifications']:
                        if skills_info.get(skill_type) and isinstance(skills_info[skill_type], list):
                            total_skills += len(skills_info[skill_type])
                elif isinstance(skills_info, list):
                    total_skills = len(skills_info)
                
                results.append({
                    "filename": file.filename,
                    "success": True,
                    "candidate_id": candidate.id,
                    "parsed_data": {
                        "name_found": bool(personal_info.get("full_name")),
                        "skills_found": total_skills,
                        "email_found": bool(personal_info.get("email")),
                        "phone_found": bool(personal_info.get("phone")),
                        "location_found": bool(personal_info.get("location")),
                        "linkedin_found": bool(personal_info.get("linkedin")),
                        "website_found": bool(personal_info.get("website")),
                        "experience_years": candidate.experience_years,
                        "work_experience_items": len(parsed_data.get("work_experience", [])),
                        "projects_found": len(parsed_data.get("projects", [])),
                        "parsing_method": parsing_metadata.get("method", "unknown"),
                        "parsing_strategy": parsing_metadata.get("strategy", "unknown"),
                        "language_detected": parsing_metadata.get("language", "unknown")
                    }
                })

        except Exception as e:
            results.append({
                "filename": file.filename,
                "success": False,
                "error": str(e)
            })

    db.commit()

    successful = sum(1 for r in results if r["success"])

    return {
        "message": f"Processed {len(files)} files. {successful} successful, {len(files) - successful} failed.",
        "results": results
    }
