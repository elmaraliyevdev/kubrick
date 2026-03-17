from pydantic import BaseModel, EmailStr, field_validator
from typing import Optional, List
from datetime import datetime
from app.core.validation import InputSanitizer, validate_phone_format, validate_url_format


class PublicOrganizationResponse(BaseModel):
    name: str
    slug: str

    class Config:
        from_attributes = True


class PublicJobListItem(BaseModel):
    title: str
    slug: str
    location: Optional[str] = None
    employment_type: str
    experience_level: str
    work_arrangement: str
    category: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    created_at: datetime

    class Config:
        from_attributes = True


class PublicJobDetail(BaseModel):
    title: str
    slug: str
    description: str
    location: Optional[str] = None
    employment_type: str
    experience_level: str
    work_arrangement: str
    category: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    skills_required: Optional[str] = None
    created_at: datetime
    organization: PublicOrganizationResponse

    class Config:
        from_attributes = True


class PublicCareerPageResponse(BaseModel):
    organization: PublicOrganizationResponse
    jobs: List[PublicJobListItem]
    total_count: int
    categories: List[str]


class JobApplicationCreate(BaseModel):
    first_name: str
    last_name: str
    email: EmailStr
    phone: Optional[str] = None
    location: Optional[str] = None
    linkedin_url: Optional[str] = None
    portfolio_url: Optional[str] = None
    cover_letter: Optional[str] = None

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

    @field_validator('cover_letter')
    @classmethod
    def sanitize_cover_letter(cls, v: str) -> str:
        if v:
            return InputSanitizer.sanitize_text(v, max_length=5000)
        return v


class JobApplicationResponse(BaseModel):
    message: str
    application_id: int
