from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List, Dict, Any
from datetime import datetime
from app.core.validation import InputSanitizer, validate_url_format, validate_phone_format


class WorkExperienceResponse(BaseModel):
    id: int
    job_title: Optional[str] = None
    company_name: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    duration: Optional[str] = None
    description: Optional[str] = None
    responsibilities: Optional[str] = None
    created_at: datetime

    class Config:
        from_attributes = True

class CandidateBase(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    notes: Optional[str] = None
    
    @field_validator('first_name', 'last_name', 'location')
    @classmethod
    def sanitize_text_fields(cls, v: str) -> str:
        if v:
            return InputSanitizer.sanitize_text(v, max_length=100)
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if v:
            return validate_phone_format(v)
        return v
    
    @field_validator('linkedin_url', 'portfolio_url')
    @classmethod
    def validate_urls(cls, v: str) -> str:
        if v:
            return validate_url_format(v)
        return v
    
    @field_validator('notes')
    @classmethod
    def sanitize_notes(cls, v: str) -> str:
        if v:
            return InputSanitizer.sanitize_text(v, max_length=2000)
        return v


class CandidateCreate(CandidateBase):
    # For manual candidate creation - organization_id will be set from current user
    pass


class CandidateUpdate(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[EmailStr] = None
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    notes: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    education: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    
    @field_validator('first_name', 'last_name', 'location')
    @classmethod
    def sanitize_text_fields(cls, v: str) -> str:
        if v:
            return InputSanitizer.sanitize_text(v, max_length=100)
        return v
    
    @field_validator('phone')
    @classmethod
    def validate_phone(cls, v: str) -> str:
        if v:
            return validate_phone_format(v)
        return v
    
    @field_validator('linkedin_url', 'portfolio_url')
    @classmethod
    def validate_urls(cls, v: str) -> str:
        if v:
            return validate_url_format(v)
        return v
    
    @field_validator('notes')
    @classmethod
    def sanitize_notes(cls, v: str) -> str:
        if v:
            return InputSanitizer.sanitize_text(v, max_length=2000)
        return v
    
    @field_validator('skills')
    @classmethod
    def sanitize_skills(cls, v: List[str]) -> List[str]:
        if v:
            return [InputSanitizer.sanitize_text(skill, max_length=50) for skill in v if skill and skill.strip()]
        return v
    
    @field_validator('experience_years')
    @classmethod
    def validate_experience_years(cls, v: int) -> int:
        if v is not None and (v < 0 or v > 70):
            raise ValueError('Experience years must be between 0 and 70')
        return v


class CandidateResponse(CandidateBase):
    id: int
    organization_id: int
    added_by_id: Optional[int] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    education: Optional[List[Dict[str, Any]]] = None
    certifications: Optional[List[Dict[str, Any]]] = None
    work_experiences: Optional[List[WorkExperienceResponse]] = None
    raw_resume_text: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    # Computed fields
    resume_files_count: Optional[int] = 0
    job_applications_count: Optional[int] = 0
    latest_application_status: Optional[str] = None

    class Config:
        from_attributes = True


class CandidateListResponse(BaseModel):
    id: int
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    email: Optional[str] = None
    location: Optional[str] = None
    skills: Optional[List[str]] = None
    experience_years: Optional[int] = None
    created_at: datetime

    # Summary fields for list view
    resume_files_count: Optional[int] = 0
    job_applications_count: Optional[int] = 0
    latest_application_status: Optional[str] = None

    class Config:
        from_attributes = True