from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from app.schemas.organization import OrganizationResponse


class JobBase(BaseModel):
    title: str
    description: str
    location: Optional[str] = None
    employment_type: str = "full_time"
    responsibilities: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    nice_to_have: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
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
    responsibilities: Optional[List[str]] = None
    requirements: Optional[List[str]] = None
    nice_to_have: Optional[List[str]] = None
    benefits: Optional[List[str]] = None
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
    candidate_count: Optional[int] = 0

    class Config:
        from_attributes = True
