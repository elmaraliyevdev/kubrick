"""
Custom exception classes and error handling.
"""
from typing import Any, Dict, Optional, List
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from starlette.exceptions import HTTPException as StarletteHTTPException
import logging
from enum import Enum


logger = logging.getLogger(__name__)


class ErrorCode(str, Enum):
    """Standardized error codes."""
    # Authentication & Authorization
    INVALID_CREDENTIALS = "INVALID_CREDENTIALS"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    TOKEN_INVALID = "TOKEN_INVALID"
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    ACCOUNT_LOCKED = "ACCOUNT_LOCKED"
    EMAIL_NOT_VERIFIED = "EMAIL_NOT_VERIFIED"
    
    # Validation
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    REQUIRED_FIELD_MISSING = "REQUIRED_FIELD_MISSING"
    
    # Business Logic
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
    OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    
    # System
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    SERVER_ERROR = "SERVER_ERROR"
    
    # File Operations
    FILE_TOO_LARGE = "FILE_TOO_LARGE"
    INVALID_FILE_TYPE = "INVALID_FILE_TYPE"
    FILE_UPLOAD_FAILED = "FILE_UPLOAD_FAILED"


class KubrickException(Exception):
    """Base exception class for Kubrick API."""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode,
        status_code: int = 400,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.error_code = error_code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationException(KubrickException):
    """Exception for validation errors."""
    
    def __init__(self, message: str, field_errors: Optional[Dict[str, List[str]]] = None):
        super().__init__(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            status_code=422,
            details={"field_errors": field_errors or {}}
        )


class AuthenticationException(KubrickException):
    """Exception for authentication errors."""
    
    def __init__(self, message: str = "Authentication failed"):
        super().__init__(
            message=message,
            error_code=ErrorCode.INVALID_CREDENTIALS,
            status_code=401
        )


class AuthorizationException(KubrickException):
    """Exception for authorization errors."""
    
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            message=message,
            error_code=ErrorCode.INSUFFICIENT_PERMISSIONS,
            status_code=403
        )


class ResourceNotFoundException(KubrickException):
    """Exception for resource not found errors."""
    
    def __init__(self, resource: str, identifier: str = None):
        message = f"{resource} not found"
        if identifier:
            message += f" (ID: {identifier})"
        
        super().__init__(
            message=message,
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            status_code=404
        )


class ResourceConflictException(KubrickException):
    """Exception for resource conflict errors."""
    
    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code=ErrorCode.RESOURCE_ALREADY_EXISTS,
            status_code=409
        )


class RateLimitException(KubrickException):
    """Exception for rate limiting errors."""
    
    def __init__(self, message: str = "Rate limit exceeded"):
        super().__init__(
            message=message,
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            status_code=429
        )


class FileUploadException(KubrickException):
    """Exception for file upload errors."""
    
    def __init__(self, message: str, error_code: ErrorCode = ErrorCode.FILE_UPLOAD_FAILED):
        super().__init__(
            message=message,
            error_code=error_code,
            status_code=400
        )


class BusinessLogicException(KubrickException):
    """Exception for business logic violations."""
    
    def __init__(self, message: str):
        super().__init__(
            message=message,
            error_code=ErrorCode.OPERATION_NOT_ALLOWED,
            status_code=422
        )


def create_error_response(
    error_code: ErrorCode,
    message: str,
    status_code: int = 400,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None
) -> Dict[str, Any]:
    """Create standardized error response."""
    error_response = {
        "error": {
            "code": error_code.value,
            "message": message,
            "timestamp": "2024-01-01T00:00:00Z",  # Would use actual timestamp
        }
    }
    
    if details:
        error_response["error"]["details"] = details
    
    if request_id:
        error_response["error"]["request_id"] = request_id
    
    return error_response


async def kubrick_exception_handler(request: Request, exc: KubrickException) -> JSONResponse:
    """Handle Kubrick custom exceptions."""
    logger.warning(f"Kubrick exception: {exc.error_code.value} - {exc.message}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            error_code=exc.error_code,
            message=exc.message,
            status_code=exc.status_code,
            details=exc.details
        )
    )


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    """Handle FastAPI validation exceptions."""
    field_errors = {}
    
    for error in exc.errors():
        field_path = " -> ".join(str(loc) for loc in error["loc"])
        if field_path not in field_errors:
            field_errors[field_path] = []
        field_errors[field_path].append(error["msg"])
    
    logger.warning(f"Validation error: {field_errors}")
    
    return JSONResponse(
        status_code=422,
        content=create_error_response(
            error_code=ErrorCode.VALIDATION_ERROR,
            message="Validation failed",
            status_code=422,
            details={"field_errors": field_errors}
        )
    )


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    """Handle HTTP exceptions."""
    error_code_mapping = {
        401: ErrorCode.INVALID_CREDENTIALS,
        403: ErrorCode.INSUFFICIENT_PERMISSIONS,
        404: ErrorCode.RESOURCE_NOT_FOUND,
        429: ErrorCode.RATE_LIMIT_EXCEEDED,
        500: ErrorCode.SERVER_ERROR
    }
    
    error_code = error_code_mapping.get(exc.status_code, ErrorCode.SERVER_ERROR)
    
    logger.error(f"HTTP exception: {exc.status_code} - {exc.detail}")
    
    return JSONResponse(
        status_code=exc.status_code,
        content=create_error_response(
            error_code=error_code,
            message=str(exc.detail),
            status_code=exc.status_code
        )
    )


async def general_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    """Handle unexpected exceptions."""
    logger.error(f"Unexpected exception: {type(exc).__name__}: {str(exc)}", exc_info=True)
    
    return JSONResponse(
        status_code=500,
        content=create_error_response(
            error_code=ErrorCode.SERVER_ERROR,
            message="An unexpected error occurred",
            status_code=500
        )
    )


def setup_exception_handlers(app):
    """Set up all exception handlers for the FastAPI app."""
    app.add_exception_handler(KubrickException, kubrick_exception_handler)
    app.add_exception_handler(RequestValidationError, validation_exception_handler)
    app.add_exception_handler(StarletteHTTPException, http_exception_handler)
    app.add_exception_handler(Exception, general_exception_handler)