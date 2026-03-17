from pydantic import BaseModel
from typing import Optional
from datetime import datetime
from app.schemas.organization import OrganizationResponse

class JobBase(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    employment_type: str = "full_time"
    experience_level: str = "mid"
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    skills_required: Optional[str] = None
    work_arrangement: str = "onsite"
    status: str = "open"
    category: Optional[str] = None

class JobCreate(JobBase):
    pass

class JobUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    location: Optional[str] = None
    employment_type: Optional[str] = None
    experience_level: Optional[str] = None
    salary_min: Optional[int] = None
    salary_max: Optional[int] = None
    skills_required: Optional[str] = None
    work_arrangement: Optional[str] = None
    status: Optional[str] = None
    category: Optional[str] = None

class JobResponse(JobBase):
    id: int
    slug: str
    user_id: int
    organization_id: int
    organization: Optional[OrganizationResponse] = None
    created_at: datetime
    updated_at: datetime
    candidate_count: Optional[int] = 0  # Will be populated by API

    class Config:
        from_attributes = True
