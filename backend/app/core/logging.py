"""
Logging configuration with structured logging, security, and monitoring.
"""
import logging
import logging.config
import json
import os
import sys
from datetime import datetime
from typing import Dict, Any, Optional
from pathlib import Path
import traceback


class SecurityAuditLogger:
    """Logger for security events and audit trails."""
    
    def __init__(self, name: str = "security_audit"):
        self.logger = logging.getLogger(name)
        
        # Create security log file if it doesn't exist
        log_dir = Path("logs")
        log_dir.mkdir(exist_ok=True)
        
        # Security log handler
        security_handler = logging.FileHandler("logs/security_audit.log")
        security_formatter = logging.Formatter(
            '%(asctime)s - SECURITY - %(levelname)s - %(message)s'
        )
        security_handler.setFormatter(security_formatter)
        
        self.logger.addHandler(security_handler)
        self.logger.setLevel(logging.INFO)
    
    def log_auth_attempt(self, email: str, success: bool, ip_address: str, user_agent: str):
        """Log authentication attempts."""
        event = {
            "event_type": "auth_attempt",
            "email": email,
            "success": success,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        if success:
            self.logger.info(f"Successful login: {json.dumps(event)}")
        else:
            self.logger.warning(f"Failed login attempt: {json.dumps(event)}")
    
    def log_suspicious_activity(self, event_type: str, details: Dict[str, Any], ip_address: str):
        """Log suspicious activities."""
        event = {
            "event_type": "suspicious_activity",
            "activity_type": event_type,
            "details": details,
            "ip_address": ip_address,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.logger.error(f"Suspicious activity detected: {json.dumps(event)}")
    
    def log_data_access(self, user_id: int, resource: str, action: str, success: bool):
        """Log data access events."""
        event = {
            "event_type": "data_access",
            "user_id": user_id,
            "resource": resource,
            "action": action,
            "success": success,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.logger.info(f"Data access: {json.dumps(event)}")
    
    def log_permission_denied(self, user_id: int, requested_resource: str, ip_address: str):
        """Log permission denied events."""
        event = {
            "event_type": "permission_denied",
            "user_id": user_id,
            "requested_resource": requested_resource,
            "ip_address": ip_address,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.logger.warning(f"Permission denied: {json.dumps(event)}")


class StructuredFormatter(logging.Formatter):
    """Custom formatter for structured JSON logging."""
    
    def format(self, record: logging.LogRecord) -> str:
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "message": record.getMessage(),
            "module": record.module,
            "function": record.funcName,
            "line": record.lineno,
        }
        
        # Add exception information if present
        if record.exc_info:
            log_data["exception"] = {
                "type": record.exc_info[0].__name__,
                "message": str(record.exc_info[1]),
                "traceback": traceback.format_exception(*record.exc_info)
            }
        
        # Add extra fields if present
        if hasattr(record, 'extra_data'):
            log_data.update(record.extra_data)
        
        return json.dumps(log_data)


class RequestLogger:
    """Logger for HTTP requests and responses."""
    
    def __init__(self):
        self.logger = logging.getLogger("http_requests")
    
    def log_request(self, method: str, url: str, status_code: int, 
                   duration_ms: float, user_id: Optional[int] = None, 
                   ip_address: Optional[str] = None):
        """Log HTTP request details."""
        extra_data = {
            "request": {
                "method": method,
                "url": url,
                "status_code": status_code,
                "duration_ms": duration_ms,
                "user_id": user_id,
                "ip_address": ip_address
            }
        }
        
        # Determine log level based on status code
        if status_code >= 500:
            level = logging.ERROR
        elif status_code >= 400:
            level = logging.WARNING
        else:
            level = logging.INFO
        
        self.logger.log(
            level,
            f"{method} {url} - {status_code} ({duration_ms}ms)",
            extra={"extra_data": extra_data}
        )


def setup_logging(log_level: str = "INFO", log_format: str = "json") -> None:
    """Configure application logging."""
    
    # Create logs directory
    log_dir = Path("logs")
    log_dir.mkdir(exist_ok=True)
    
    # Configure logging based on format preference
    if log_format.lower() == "json":
        formatter_class = StructuredFormatter
    else:
        formatter_class = logging.Formatter
        formatter_format = '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    
    # Logging configuration
    config = {
        "version": 1,
        "disable_existing_loggers": False,
        "formatters": {
            "standard": {
                "()": formatter_class,
            } if log_format.lower() == "json" else {
                "format": formatter_format,
                "datefmt": "%Y-%m-%d %H:%M:%S"
            }
        },
        "handlers": {
            "console": {
                "class": "logging.StreamHandler",
                "level": log_level,
                "formatter": "standard",
                "stream": sys.stdout
            },
            "file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": log_level,
                "formatter": "standard",
                "filename": "logs/app.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5
            },
            "error_file": {
                "class": "logging.handlers.RotatingFileHandler",
                "level": "ERROR",
                "formatter": "standard",
                "filename": "logs/errors.log",
                "maxBytes": 10485760,  # 10MB
                "backupCount": 5
            }
        },
        "loggers": {
            "": {  # Root logger
                "handlers": ["console", "file"],
                "level": log_level,
                "propagate": False
            },
            "uvicorn": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False
            },
            "sqlalchemy.engine": {
                "handlers": ["file"],
                "level": "WARNING",  # Only log SQL errors, not all queries
                "propagate": False
            },
            "security_audit": {
                "handlers": ["file", "error_file"],
                "level": "INFO",
                "propagate": False
            },
            "http_requests": {
                "handlers": ["console", "file"],
                "level": "INFO",
                "propagate": False
            }
        }
    }
    
    logging.config.dictConfig(config)


def get_logger(name: str) -> logging.Logger:
    """Get a logger instance."""
    return logging.getLogger(name)


# Global instances
security_logger = SecurityAuditLogger()
request_logger = RequestLogger()