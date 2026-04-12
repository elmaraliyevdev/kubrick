from pydantic import BaseModel, EmailStr, field_validator
import re
from app.core.validation import InputSanitizer
from app.core.password_security import validate_password_security

class RegisterRequest(BaseModel):
    email: EmailStr
    password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        is_valid, errors = validate_password_security(v, check_breaches=True)
        if not is_valid:
            raise ValueError('; '.join(errors))
        return v

class LoginPasswordRequest(BaseModel):
    email: EmailStr
    password: str
    
    @field_validator('password')
    @classmethod
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError('Password must be at least 6 characters long')
        if len(v) > 128:
            raise ValueError('Password too long')
        # Check for suspicious patterns
        if not InputSanitizer.validate_sql_safe(v):
            raise ValueError('Invalid password format')
        return v

class RequestCodeRequest(BaseModel):
    email: EmailStr
    
    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        # Additional validation beyond EmailStr
        if len(v) > 254:  # RFC 5321 limit
            raise ValueError('Email address too long')
        return v

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        if len(v) > 254:  # RFC 5321 limit
            raise ValueError('Email address too long')
        return v

class ResetPasswordRequest(BaseModel):
    email: EmailStr
    code: str
    new_password: str

    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        if len(v) > 254:
            raise ValueError('Email address too long')
        return v

    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        v = InputSanitizer.sanitize_text(v)
        if len(v) != 6:
            raise ValueError('Verification code must be 6 digits')
        if not v.isdigit():
            raise ValueError('Verification code must contain only numbers')
        return v

    @field_validator('new_password')
    @classmethod
    def validate_password(cls, v):
        from app.core.password_security import PasswordStrength
        is_valid, errors = PasswordStrength.check_complexity(v)
        if not is_valid:
            raise ValueError('; '.join(errors))
        return v

class ChangePasswordRequest(BaseModel):
    current_password: str
    new_password: str

    @field_validator("current_password")
    @classmethod
    def validate_current_password(cls, v: str) -> str:
        if not v or len(v) > 128:
            raise ValueError("Invalid current password")
        if not InputSanitizer.validate_sql_safe(v):
            raise ValueError("Invalid password format")
        return v

    @field_validator("new_password")
    @classmethod
    def validate_new_password(cls, v: str) -> str:
        from app.core.password_security import PasswordStrength

        is_valid, errors = PasswordStrength.check_complexity(v)
        if not is_valid:
            raise ValueError("; ".join(errors))
        return v


class VerifyCodeRequest(BaseModel):
    email: EmailStr
    code: str
    
    @field_validator('email')
    @classmethod
    def validate_email_format(cls, v: str) -> str:
        # Additional validation beyond EmailStr
        if len(v) > 254:  # RFC 5321 limit
            raise ValueError('Email address too long')
        return v
    
    @field_validator('code')
    @classmethod
    def validate_code(cls, v):
        v = InputSanitizer.sanitize_text(v)
        if not v or len(v) > 32:
            raise ValueError('Invalid verification code')
        return v


class RequestEmailChangeRequest(BaseModel):
    new_email: EmailStr
    password: str

    @field_validator("new_email")
    @classmethod
    def validate_new_email_format(cls, v: str) -> str:
        if len(v) > 254:
            raise ValueError("Email address too long")
        return v

    @field_validator("password")
    @classmethod
    def validate_password(cls, v: str) -> str:
        if not v or len(v) > 128:
            raise ValueError("Invalid password")
        if not InputSanitizer.validate_sql_safe(v):
            raise ValueError("Invalid password format")
        return v


class ConfirmEmailChangeRequest(BaseModel):
    new_email: EmailStr
    code: str

    @field_validator("new_email")
    @classmethod
    def validate_new_email_format(cls, v: str) -> str:
        if len(v) > 254:
            raise ValueError("Email address too long")
        return v

    @field_validator("code")
    @classmethod
    def validate_code(cls, v: str) -> str:
        v = InputSanitizer.sanitize_text(v)
        if len(v) != 6:
            raise ValueError("Verification code must be 6 digits")
        if not v.isdigit():
            raise ValueError("Verification code must contain only numbers")
        return v
