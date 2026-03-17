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

from app.core.security import get_db

router = APIRouter(tags=["health"])


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
        db.execute(text("SELECT 1"))
        health_data["checks"]["database"] = {
            "status": "healthy",
            "response_time_ms": 0  # Could measure actual response time
        }
    except Exception as e:
        health_data["status"] = "unhealthy"
        health_data["checks"]["database"] = {
            "status": "unhealthy",
            "error": str(e)
        }
    
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
        # Check database connectivity
        db.execute(text("SELECT 1"))
        
        # Check if all required environment variables are set
        required_env_vars = [
            "DATABASE_URL",
            "SECRET_KEY"
        ]
        
        missing_vars = [var for var in required_env_vars if not os.getenv(var)]
        
        if missing_vars:
            raise HTTPException(
                status_code=503,
                detail=f"Missing required environment variables: {', '.join(missing_vars)}"
            )
        
        return {
            "status": "ready",
            "timestamp": datetime.utcnow().isoformat()
        }
        
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