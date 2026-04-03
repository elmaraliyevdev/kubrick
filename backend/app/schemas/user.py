from pydantic import BaseModel, EmailStr, field_validator
from typing import Literal, Optional
from app.schemas.organization import OrganizationResponse
from app.core.validation import validate_email_format, InputSanitizer
from app.core.password_security import PasswordStrength

class UserBase(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    
    @field_validator('first_name', 'last_name')
    @classmethod
    def sanitize_names(cls, v: str) -> str:
        if v:
            return InputSanitizer.sanitize_text(v, max_length=100)
        return v

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v: str) -> str:
        is_valid, errors = PasswordStrength.check_complexity(v)
        if not is_valid:
            raise ValueError('; '.join(errors))
        return v
    
    @field_validator('full_name')
    @classmethod
    def sanitize_full_name(cls, v: str) -> str:
        if v:
            return InputSanitizer.sanitize_text(v, max_length=200)
        return v

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: int
    email_verified: bool = False
    role: Literal["admin", "recruiter"] = "recruiter"
    is_active: bool = True
    organization: Optional[OrganizationResponse] = None  # 👈 may be null

    class Config:
        from_attributes = True

class UpdateProfileRequest(BaseModel):
    first_name: Optional[str] = None
    last_name: Optional[str] = None

    @field_validator('first_name', 'last_name')
    @classmethod
    def sanitize_names(cls, v: str) -> str:
        if v is not None:
            return InputSanitizer.sanitize_text(v, max_length=100)
        return v

class CompleteProfileRequest(BaseModel):
    first_name: str
    last_name: str
    organization_name: str
    
    @field_validator('first_name', 'last_name', 'organization_name')
    @classmethod
    def sanitize_fields(cls, v: str) -> str:
        if not v or not v.strip():
            raise ValueError('Field cannot be empty')
        return InputSanitizer.sanitize_text(v, max_length=100)