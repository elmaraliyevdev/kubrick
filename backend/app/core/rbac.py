"""
Role-Based Access Control (RBAC) implementation.
"""
from functools import wraps
from typing import List, Union, Callable, Any
from fastapi import HTTPException, status, Depends
from app.core.security import get_current_user, get_db, require_org_member
from app.db.models.user import User
from sqlalchemy.orm import Session


# Define role hierarchy (higher number = more permissions)
ROLE_HIERARCHY = {
    "admin": 100,
    "recruiter": 50,
    "viewer": 10
}

# Define permissions for each role
ROLE_PERMISSIONS = {
    "admin": [
        "user.create", "user.read", "user.update", "user.delete",
        "organization.create", "organization.read", "organization.update", "organization.delete",
        "candidate.create", "candidate.read", "candidate.update", "candidate.delete",
        "job.create", "job.read", "job.update", "job.delete",
        "file.upload", "file.read", "file.delete",
        "invite.send", "analytics.view", "settings.manage"
    ],
    "recruiter": [
        "candidate.create", "candidate.read", "candidate.update",
        "job.create", "job.read", "job.update",
        "file.upload", "file.read", "analytics.view"
    ],
    "viewer": [
        "candidate.read", "job.read", "file.read"
    ]
}


class PermissionDenied(HTTPException):
    """Custom exception for permission denied errors."""
    def __init__(self, detail: str = "Insufficient permissions"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail
        )


def has_permission(user: User, permission: str) -> bool:
    """Check if user has specific permission."""
    if not user or not user.role:
        return False
    
    user_permissions = ROLE_PERMISSIONS.get(user.role, [])
    return permission in user_permissions


def has_role(user: User, required_role: str) -> bool:
    """Check if user has required role or higher."""
    if not user or not user.role:
        return False
    
    user_level = ROLE_HIERARCHY.get(user.role, 0)
    required_level = ROLE_HIERARCHY.get(required_role, 0)
    
    return user_level >= required_level


def require_permission(permission: str):
    """Decorator to require specific permission."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find the current_user parameter
            current_user = None
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                    break
            
            if not current_user:
                raise PermissionDenied("Authentication required")
            
            if not has_permission(current_user, permission):
                raise PermissionDenied(f"Permission '{permission}' required")
            
            return await func(*args, **kwargs) if hasattr(func, '__await__') else func(*args, **kwargs)
        return wrapper
    return decorator


def require_role(required_role: str):
    """Decorator to require specific role or higher."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Find the current_user parameter
            current_user = None
            for key, value in kwargs.items():
                if isinstance(value, User):
                    current_user = value
                    break
            
            if not current_user:
                raise PermissionDenied("Authentication required")
            
            if not has_role(current_user, required_role):
                raise PermissionDenied(f"Role '{required_role}' or higher required")
            
            return await func(*args, **kwargs) if hasattr(func, '__await__') else func(*args, **kwargs)
        return wrapper
    return decorator


def require_admin(func):
    """Decorator shortcut to require admin role."""
    return require_role("admin")(func)


def require_recruiter(func):
    """Decorator shortcut to require recruiter role or higher."""
    return require_role("recruiter")(func)


class RBACDependencies:
    """FastAPI dependency classes for RBAC."""
    
    @staticmethod
    def require_permission(permission: str):
        """FastAPI dependency to require permission."""
        def check_permission(
            current_user: User = Depends(get_current_user),
            db: Session = Depends(get_db)
        ):
            if not has_permission(current_user, permission):
                raise PermissionDenied(f"Permission '{permission}' required")
            return current_user
        return check_permission
    
    @staticmethod
    def require_role(required_role: str):
        """FastAPI dependency to require role."""
        def check_role(
            current_user: User = Depends(get_current_user),
            db: Session = Depends(get_db)
        ):
            if not has_role(current_user, required_role):
                raise PermissionDenied(f"Role '{required_role}' or higher required")
            return current_user
        return check_role
    
    @staticmethod
    def require_admin():
        """FastAPI dependency to require admin role."""
        return RBACDependencies.require_role("admin")
    
    @staticmethod
    def require_recruiter():
        """FastAPI dependency to require recruiter role or higher."""
        return RBACDependencies.require_role("recruiter")
    
    @staticmethod
    def require_organization_access():
        """Ensure the user belongs to an organization (same as Depends(require_org_member))."""
        return require_org_member


def check_resource_ownership(user: User, resource_user_id: int, resource_org_id: int = None) -> bool:
    """Check if user can access a specific resource."""
    # Admins can access any resource in their organization
    if user.role == "admin" and user.organization_id == resource_org_id:
        return True
    
    # Users can access their own resources
    if user.id == resource_user_id:
        return True
    
    # Users can access resources in their organization (for some resources)
    if resource_org_id and user.organization_id == resource_org_id:
        return True
    
    return False


def get_user_permissions(user: User) -> List[str]:
    """Get all permissions for a user."""
    if not user or not user.role:
        return []
    
    return ROLE_PERMISSIONS.get(user.role, [])