from pydantic import BaseModel, field_validator
from typing import Literal, Optional


class OrganizationBase(BaseModel):
    name: str


class OrganizationCreate(OrganizationBase):
    pass


class OrganizationUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    brand_color: Optional[str] = None
    career_page_enabled: Optional[bool] = None

    @field_validator("brand_color")
    @classmethod
    def validate_brand_color(cls, v):
        if v is not None:
            v = v.strip()
            if not v.startswith("#") or len(v) not in (4, 7):
                raise ValueError("Brand color must be a hex color like #4F46E5")
        return v


class OrganizationUserUpdate(BaseModel):
    """Admin-only updates for a user in the current organization."""

    role: Optional[Literal["admin", "recruiter"]] = None
    is_active: Optional[bool] = None


class OrganizationResponse(OrganizationBase):
    id: int
    slug: str
    logo_url: Optional[str] = None
    description: Optional[str] = None
    website_url: Optional[str] = None
    brand_color: Optional[str] = None
    career_page_enabled: bool = True

    class Config:
        from_attributes = True
