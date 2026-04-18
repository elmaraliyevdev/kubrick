"""
Health check endpoints for monitoring and load balancers.
"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from typing import Dict, Any
import time
import psutil
import os
from datetime import datetime
from app.db.session import engine

from app.core.security import get_db
from app.core.redis_client import redis_from_env_url

router = APIRouter(tags=["health"])


def _check_database(db: Session) -> Dict[str, Any]:
    started = time.perf_counter()
    db.execute(text("SELECT 1"))
    response_ms = round((time.perf_counter() - started) * 1000, 2)
    return {
        "status": "healthy",
        "response_time_ms": response_ms,
        "pool": {
            "size": engine.pool.size(),
            "checked_in": engine.pool.checkedin(),
            "checked_out": engine.pool.checkedout(),
            "overflow": engine.pool.overflow(),
        },
    }


def _check_redis() -> Dict[str, Any]:
    redis_url = (os.getenv("REDIS_URL") or "").strip()
    if not redis_url:
        return {"status": "not_configured"}

    try:
        started = time.perf_counter()
        client = redis_from_env_url(redis_url)
        client.ping()
        response_ms = round((time.perf_counter() - started) * 1000, 2)
        return {"status": "healthy", "response_time_ms": response_ms}
    except Exception as exc:
        return {"status": "unhealthy", "error": str(exc)}


def _check_openai_config() -> Dict[str, Any]:
    api_key_present = bool((os.getenv("OPENAI_API_KEY") or "").strip())
    model = os.getenv("OPENAI_MODEL", "gpt-3.5-turbo")
    timeout = int(os.getenv("OPENAI_TIMEOUT", "30"))
    retry_attempts = int(os.getenv("OPENAI_RETRY_ATTEMPTS", "3"))
    return {
        "status": "configured" if api_key_present else "not_configured",
        "model": model,
        "timeout_seconds": timeout,
        "retry_attempts": retry_attempts,
    }


def _check_required_env() -> Dict[str, Any]:
    required_env_vars = ["DATABASE_URL", "SECRET_KEY"]
    missing = [var for var in required_env_vars if not os.getenv(var)]
    return {
        "status": "healthy" if not missing else "unhealthy",
        "missing": missing,
    }


@router.get("/health")
def health_check() -> Dict[str, str]:
    """Basic health check endpoint."""
    return {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "kubrick-api"
    }


@router.get("/health/detailed")
def detailed_health_check(db: Session = Depends(get_db)) -> Dict[str, Any]:
    """Detailed health check with database and system information."""
    health_data = {
        "status": "healthy",
        "timestamp": datetime.utcnow().isoformat(),
        "service": "kubrick-api",
        "version": "1.0.0",
        "checks": {}
    }
    
    # Database connectivity check
    try:
        health_data["checks"]["database"] = _check_database(db)
    except Exception as e:
        health_data["status"] = "unhealthy"
        health_data["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }

    # Redis shared-store check (optional)
    redis_check = _check_redis()
    health_data["checks"]["redis"] = redis_check
    if redis_check["status"] == "unhealthy" and (os.getenv("REDIS_URL") or "").strip():
        health_data["status"] = "degraded"

    # External parser provider config readiness (non-blocking)
    health_data["checks"]["openai"] = _check_openai_config()
    
    # System metrics
    try:
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        health_data["checks"]["system"] = {
            "status": "healthy",
            "cpu_percent": psutil.cpu_percent(interval=1),
            "memory": {
                "total": memory.total,
                "used": memory.used,
                "available": memory.available,
                "percent": memory.percent
            },
            "disk": {
                "total": disk.total,
                "used": disk.used,
                "free": disk.free,
                "percent": (disk.used / disk.total) * 100
            }
        }
        
        # Check if system resources are critically low
        if memory.percent > 90 or (disk.used / disk.total) * 100 > 95:
            if health_data["status"] == "healthy":
                health_data["status"] = "degraded"
            health_data["checks"]["system"]["status"] = "degraded"
            
    except Exception as e:
        health_data["checks"]["system"] = {
            "status": "error",
            "error": str(e)
        }
    
    return health_data


@router.get("/health/ready")
def readiness_check(db: Session = Depends(get_db)) -> Dict[str, str]:
    """Readiness check for Kubernetes deployments."""
    try:
        db_result = _check_database(db)
        env_result = _check_required_env()

        if db_result["status"] != "healthy":
            raise HTTPException(status_code=503, detail="Database is not ready")

        if env_result["status"] != "healthy":
            raise HTTPException(
                status_code=503,
                detail=f"Missing required environment variables: {', '.join(env_result['missing'])}"
            )

        return {
            "status": "ready",
            "timestamp": datetime.utcnow().isoformat()
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=f"Service not ready: {str(e)}"
        )


@router.get("/health/live")
def liveness_check() -> Dict[str, str]:
    """Liveness check for Kubernetes deployments."""
    return {
        "status": "alive",
        "timestamp": datetime.utcnow().isoformat(),
        "uptime_seconds": time.process_time()
    }