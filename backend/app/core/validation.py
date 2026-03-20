"""
Input validation and sanitization utilities for security hardening.
"""
import re
import html
import bleach
from typing import Any, Optional, Union, List
from pydantic import BaseModel, field_validator
from sqlalchemy import text
from email_validator import validate_email, EmailNotValidError


class InputSanitizer:
    """Utilities for sanitizing user input to prevent XSS and injection attacks."""
    
    # Allowed HTML tags for rich text fields (very restrictive)
    ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'ul', 'ol', 'li']
    ALLOWED_ATTRIBUTES = {}
    
    @staticmethod
    def sanitize_html(content: str) -> str:
        """Sanitize HTML content to prevent XSS attacks."""
        if not content:
            return ""
        
        # Use bleach to clean HTML
        cleaned = bleach.clean(
            content,
            tags=InputSanitizer.ALLOWED_TAGS,
            attributes=InputSanitizer.ALLOWED_ATTRIBUTES,
            strip=True
        )
        return cleaned
    
    @staticmethod
    def sanitize_text(text: str, max_length: Optional[int] = None) -> str:
        """Sanitize plain text input."""
        if not text:
            return ""
        
        # Remove null bytes and control characters
        sanitized = re.sub(r'[\x00-\x08\x0b\x0c\x0e-\x1f\x7f]', '', text)
        
        # HTML escape to prevent XSS
        sanitized = html.escape(sanitized)
        
        # Trim whitespace
        sanitized = sanitized.strip()
        
        # Apply length limit
        if max_length and len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        return sanitized
    
    @staticmethod
    def validate_sql_safe(value: str) -> bool:
        """Check if a string contains potentially dangerous SQL patterns."""
        if not value:
            return True
        
        # Convert to lowercase for pattern matching
        lower_value = value.lower()
        
        # Dangerous SQL keywords and patterns
        dangerous_patterns = [
            r'\b(drop|delete|truncate|alter|create|insert|update)\b',
            r'\b(union|select|from|where|having|group by|order by)\b',
            r'[;\'"\\]',  # SQL injection characters
            r'--',        # SQL comments
            r'/\*.*\*/',  # SQL block comments
            r'\bexec\b',
            r'\bexecute\b',
            r'\bsp_\w+',  # Stored procedures
            r'\bxp_\w+',  # Extended procedures
        ]
        
        for pattern in dangerous_patterns:
            if re.search(pattern, lower_value):
                return False
        
        return True
    
    @staticmethod
    def sanitize_filename(filename: str) -> str:
        """Sanitize filename to prevent directory traversal attacks."""
        if not filename:
            return ""
        
        # Remove directory traversal attempts
        sanitized = re.sub(r'\.\.+', '', filename)
        sanitized = re.sub(r'[/\\]', '', sanitized)
        
        # Remove dangerous characters
        sanitized = re.sub(r'[<>:"|?*\x00-\x1f]', '', sanitized)
        
        # Limit length
        if len(sanitized) > 255:
            name, ext = sanitized.rsplit('.', 1) if '.' in sanitized else (sanitized, '')
            max_name_len = 250 - len(ext)
            sanitized = f"{name[:max_name_len]}.{ext}" if ext else name[:255]
        
        return sanitized


class SecureBaseModel(BaseModel):
    """Base model with built-in input validation and sanitization."""
    
    @field_validator('*', mode='before')
    @classmethod
    def sanitize_strings(cls, v: Any, field_info) -> Any:
        """Automatically sanitize string inputs."""
        if isinstance(v, str):
            # Check for SQL injection patterns in search/filter fields
            field_name = field_info.field_title or 'unknown'
            if any(keyword in field_name.lower() for keyword in ['search', 'filter', 'query']):
                if not InputSanitizer.validate_sql_safe(v):
                    raise ValueError(f"Invalid characters detected in {field_name}")
            
            # Sanitize based on field type
            if 'html' in field_name.lower() or 'content' in field_name.lower():
                return InputSanitizer.sanitize_html(v)
            else:
                return InputSanitizer.sanitize_text(v, max_length=10000)
        
        return v


def validate_email_format(email: str) -> str:
    """Validate email format using email-validator."""
    try:
        # Validate email format
        valid_email = validate_email(email)
        return valid_email.email
    except EmailNotValidError:
        raise ValueError("Invalid email format")


def validate_phone_format(phone: str) -> str:
    """Validate phone number format."""
    if not phone:
        return phone
    
    # Remove all non-digit characters except + for international format
    cleaned = re.sub(r'[^\d+\-\s\(\)]', '', phone)
    
    # Basic validation - should be 10-15 digits
    digits_only = re.sub(r'[^\d]', '', cleaned)
    
    if len(digits_only) < 7 or len(digits_only) > 15:
        raise ValueError("Phone number must be 7-15 digits")
    
    return cleaned


def validate_url_format(url: str) -> str:
    """Validate URL format. Auto-prepends https:// if scheme is missing."""
    if not url:
        return url

    # Auto-prepend https:// if no scheme present
    if not re.match(r'^https?://', url, re.IGNORECASE):
        url = f"https://{url}"

    # Basic URL validation
    url_pattern = re.compile(
        r'^https?://'  # http:// or https://
        r'(?:(?:[A-Z0-9](?:[A-Z0-9-]{0,61}[A-Z0-9])?\.)+[A-Z]{2,6}\.?|'  # domain...
        r'localhost|'  # localhost...
        r'\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})'  # ...or ip
        r'(?::\d+)?'  # optional port
        r'(?:/?|[/?]\S+)$', re.IGNORECASE)

    if not url_pattern.match(url):
        raise ValueError("Invalid URL format")

    return url


# Rate limiting helpers
class RateLimitConfig:
    """Rate limiting configuration."""
    
    # Different limits for different endpoint types
    RATES = {
        'auth': "5/minute",       # Authentication endpoints
        'upload': "10/minute",    # File uploads
        'search': "30/minute",    # Search endpoints
        'api_default': "100/minute",  # Default API rate
        'bulk': "5/minute",       # Bulk operations
    }
    
    @classmethod
    def get_rate(cls, endpoint_type: str) -> str:
        """Get rate limit for endpoint type."""
        return cls.RATES.get(endpoint_type, cls.RATES['api_default'])


def validate_pagination_params(skip: int, limit: int) -> tuple[int, int]:
    """Validate and sanitize pagination parameters."""
    # Ensure non-negative skip
    skip = max(0, skip)
    
    # Limit maximum page size to prevent abuse
    limit = max(1, min(limit, 1000))
    
    return skip, limit


def validate_search_query(query: str) -> str:
    """Validate and sanitize search query."""
    if not query:
        return ""
    
    # Remove dangerous patterns
    if not InputSanitizer.validate_sql_safe(query):
        raise ValueError("Invalid search query format")
    
    # Sanitize and limit length
    sanitized = InputSanitizer.sanitize_text(query, max_length=200)
    
    # Remove excessive whitespace
    sanitized = re.sub(r'\s+', ' ', sanitized).strip()
    
    return sanitized