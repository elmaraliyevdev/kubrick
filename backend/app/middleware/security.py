"""
Security middleware for adding security headers and request validation.
"""
from fastapi import Request, HTTPException
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.types import ASGIApp
import time
import logging
from typing import Dict, Optional
import re

logger = logging.getLogger(__name__)


class SecurityMiddleware(BaseHTTPMiddleware):
    """Middleware for security headers and request validation."""
    
    def __init__(self, app: ASGIApp):
        super().__init__(app)
        self.suspicious_patterns = [
            r'<script[^>]*>',          # Script tags
            r'javascript:',            # JavaScript protocol
            r'vbscript:',             # VBScript protocol
            r'onload\s*=',            # Event handlers
            r'onerror\s*=',
            r'onclick\s*=',
            r'eval\s*\(',             # Eval calls
            r'document\.cookie',       # Cookie access
            r'window\.location',       # Location manipulation
            r'\.\./',                 # Directory traversal
            r'etc/passwd',            # System file access
            r'cmd\.exe',              # Command execution
            r'powershell',
            r'bash\s',
            r'/bin/',
            r'union\s+select',        # SQL injection
            r'drop\s+table',
            r'delete\s+from',
            r'insert\s+into',
            r'update\s+set',
        ]
        self.compiled_patterns = [re.compile(pattern, re.IGNORECASE) for pattern in self.suspicious_patterns]
        
    async def dispatch(self, request: Request, call_next):
        start_time = time.time()
        
        # Add security headers
        response = await call_next(request)
        
        # Security headers
        response.headers.update({
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
            "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self'",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Permissions-Policy": "geolocation=(), microphone=(), camera=(), payment=(), usb=(), magnetometer=(), gyroscope=()",
        })
        
        # Add processing time header
        process_time = time.time() - start_time
        response.headers["X-Process-Time"] = str(process_time)
        
        return response
    
    def validate_request_content(self, content: str) -> bool:
        """Check request content for suspicious patterns."""
        if not content:
            return True
            
        for pattern in self.compiled_patterns:
            if pattern.search(content):
                logger.warning(f"Suspicious pattern detected: {pattern.pattern}")
                return False
        
        return True


class RequestSizeMiddleware(BaseHTTPMiddleware):
    """Middleware to limit request body size."""
    
    def __init__(self, app: ASGIApp, max_size: int = 10 * 1024 * 1024):  # 10MB default
        super().__init__(app)
        self.max_size = max_size
    
    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get('content-length')
        
        if content_length is not None:
            content_length = int(content_length)
            if content_length > self.max_size:
                return JSONResponse(
                    status_code=413,
                    content={"detail": f"Request entity too large. Max size: {self.max_size} bytes"}
                )
        
        return await call_next(request)


class RateLimitExceededMiddleware(BaseHTTPMiddleware):
    """Custom rate limit exceeded response."""
    
    async def dispatch(self, request: Request, call_next):
        try:
            response = await call_next(request)
            return response
        except Exception as e:
            if "rate limit exceeded" in str(e).lower():
                return JSONResponse(
                    status_code=429,
                    content={
                        "detail": "Rate limit exceeded. Please try again later.",
                        "type": "rate_limit_error"
                    },
                    headers={"Retry-After": "60"}
                )
            raise


class IPWhitelistMiddleware(BaseHTTPMiddleware):
    """Middleware for IP whitelisting (optional, for admin endpoints)."""
    
    def __init__(self, app: ASGIApp, allowed_ips: Optional[list] = None):
        super().__init__(app)
        self.allowed_ips = allowed_ips or []
    
    async def dispatch(self, request: Request, call_next):
        if self.allowed_ips and request.url.path.startswith("/admin"):
            client_ip = request.client.host if request.client else None
            
            if client_ip not in self.allowed_ips:
                logger.warning(f"Unauthorized IP attempted admin access: {client_ip}")
                return JSONResponse(
                    status_code=403,
                    content={"detail": "Access forbidden from this IP address"}
                )
        
        return await call_next(request)