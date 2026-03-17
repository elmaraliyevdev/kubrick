import os
from dotenv import load_dotenv

# Load .env FIRST
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from uvicorn.middleware.proxy_headers import ProxyHeadersMiddleware
from app.core.logging import setup_logging, get_logger
from app.middleware.security import SecurityMiddleware, RequestSizeMiddleware

import app.db.models

from app.api import auth, jobs, organizations, candidates, files, matches, health, public_careers

limiter = Limiter(key_func=get_remote_address)

# Setup logging
log_level = os.getenv("LOG_LEVEL", "INFO")
log_format = os.getenv("LOG_FORMAT", "json")
setup_logging(log_level=log_level, log_format=log_format)

logger = get_logger(__name__)

app = FastAPI(
    title="Kubrick API",
    description="AI-Powered Resume Scanner & Candidate Ranking Platform",
    version="1.0.0",
)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Trust proxy headers from reverse proxy (X-Forwarded-For, X-Forwarded-Proto)
app.add_middleware(ProxyHeadersMiddleware, trusted_hosts=["*"])

# Add security middleware
app.add_middleware(SecurityMiddleware)
app.add_middleware(RequestSizeMiddleware, max_size=50 * 1024 * 1024)  # 50MB max

# CORS configuration from environment
allowed_origins = os.getenv("ALLOWED_ORIGINS", "http://localhost:5173").split(",")

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router, tags=["health"])  # No prefix for health checks
app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(jobs.router, prefix="/api/jobs", tags=["jobs"])
app.include_router(organizations.router, prefix="/api/organizations", tags=["organizations"])
app.include_router(candidates.router, prefix="/api/candidates", tags=["candidates"])
app.include_router(files.router, prefix="/api/files", tags=["files"])
app.include_router(matches.router, prefix="/api/matches", tags=["matches"])
app.include_router(public_careers.router, prefix="/api/careers", tags=["public-careers"])

@app.on_event("startup")
async def startup_event():
    """Initialize application on startup."""
    logger.info("Kubrick API starting up...")
    logger.info(f"Environment: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"Debug mode: {os.getenv('DEBUG', 'false')}")

@app.on_event("shutdown")
async def shutdown_event():
    """Clean up on application shutdown."""
    logger.info("Kubrick API shutting down...")