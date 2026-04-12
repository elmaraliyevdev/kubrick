import secrets
import asyncio
import uuid
import aiofiles
from pathlib import Path
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List

from app.db.models.organization import Organization
from app.db.models.user import User
from app.db.models.invite import Invite
from app.schemas.organization import (
    OrganizationUpdate,
    OrganizationResponse,
    OrganizationUserUpdate,
)
from app.schemas.user import UserResponse
from app.schemas.invite import InviteResponse
from app.core.security import get_db, require_org_member
from app.core.file_security import FileSecurityValidator, FileValidationError
from app.core.email import send_invite_email

router = APIRouter()

LOGO_UPLOAD_DIR = Path("uploads/logos")
LOGO_UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
MAX_LOGO_SIZE = 2 * 1024 * 1024  # 2MB
ALLOWED_LOGO_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}


# Get current user's org
@router.get("/me", response_model=OrganizationResponse)
def get_my_org(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member)
):
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


# Update org (admins only)
@router.put("/me", response_model=OrganizationResponse)
def update_org(
    org_data: OrganizationUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update organization")

    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    update_data = org_data.model_dump(exclude_unset=True)

    # Handle name change -> slug regeneration
    if "name" in update_data and update_data["name"] != org.name:
        org.name = update_data["name"]
        from app.utils.slug import generate_organization_slug
        org.slug = generate_organization_slug(update_data["name"], db, exclude_id=org.id)

    # Apply other fields
    for key, value in update_data.items():
        if key != "name":
            setattr(org, key, value)

    db.commit()
    db.refresh(org)
    return org


# Upload org logo
@router.post("/me/logo", response_model=OrganizationResponse)
async def upload_logo(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update organization")

    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if not file.filename:
        raise HTTPException(status_code=400, detail="No file provided")

    file_content = await file.read()
    if len(file_content) > MAX_LOGO_SIZE:
        raise HTTPException(status_code=413, detail="Logo too large. Maximum size: 2MB")

    try:
        _, sanitized_filename = FileSecurityValidator.validate_filename(file.filename)
        file_ext = Path(sanitized_filename).suffix.lower()
        if file_ext not in ALLOWED_LOGO_EXTENSIONS:
            raise HTTPException(
                status_code=400,
                detail=f"File type {file_ext} not supported. Allowed: {', '.join(ALLOWED_LOGO_EXTENSIONS)}"
            )
        _, mime_type = FileSecurityValidator.validate_file_type(file_content, sanitized_filename)
        if not mime_type.startswith("image/"):
            raise HTTPException(status_code=400, detail="Logo must be an image")
        FileSecurityValidator.validate_image_content(file_content)
        FileSecurityValidator.scan_for_malware_signatures(file_content)
    except FileValidationError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    # Delete old logo if exists
    if org.logo_url:
        old_path = Path(org.logo_url)
        if old_path.exists():
            old_path.unlink(missing_ok=True)

    # Save new logo
    file_id = str(uuid.uuid4())
    file_path = LOGO_UPLOAD_DIR / f"{file_id}{file_ext}"
    async with aiofiles.open(file_path, 'wb') as f:
        await f.write(file_content)

    org.logo_url = str(file_path)
    db.commit()
    db.refresh(org)
    return org


# Delete org logo
@router.delete("/me/logo", response_model=OrganizationResponse)
def delete_logo(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update organization")

    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    if org.logo_url:
        old_path = Path(org.logo_url)
        if old_path.exists():
            old_path.unlink(missing_ok=True)
        org.logo_url = None
        db.commit()
        db.refresh(org)

    return org


# List all users in org
@router.get("/me/users", response_model=List[UserResponse])
def list_org_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member)
):
    return db.query(User).filter(User.organization_id == current_user.organization_id).all()


def _role_str(role) -> str:
    return role.value if hasattr(role, "value") else str(role)


def _active_admin_count_after(
    db: Session,
    org_id: int,
    target: User,
    new_role: str,
    new_active: bool,
) -> int:
    new_role_s = _role_str(new_role)
    n = 0
    for u in db.query(User).filter(User.organization_id == org_id).all():
        role = new_role_s if u.id == target.id else _role_str(u.role)
        active = new_active if u.id == target.id else u.is_active
        if active and role == "admin":
            n += 1
    return n


# Update org member (admins only): role and/or active flag
@router.patch("/me/users/{user_id}", response_model=UserResponse)
def update_org_user(
    user_id: int,
    payload: OrganizationUserUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage team members")

    updates = payload.model_dump(exclude_unset=True)
    if not updates:
        raise HTTPException(status_code=400, detail="No fields to update")

    target = (
        db.query(User)
        .filter(
            User.id == user_id,
            User.organization_id == current_user.organization_id,
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    new_role = _role_str(updates["role"]) if "role" in updates else _role_str(target.role)
    new_active = updates.get("is_active", target.is_active)

    if target.id == current_user.id and new_active is False:
        raise HTTPException(status_code=400, detail="You cannot deactivate yourself")

    if _active_admin_count_after(db, current_user.organization_id, target, new_role, new_active) < 1:
        raise HTTPException(
            status_code=400,
            detail="Organization must keep at least one active admin",
        )

    if "role" in updates:
        target.role = updates["role"]
    if "is_active" in updates:
        target.is_active = updates["is_active"]

    db.commit()
    db.refresh(target)
    return target


# Invite user (real onboarding)
@router.post("/me/invite", response_model=InviteResponse)
def invite_user(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can invite users")

    # generate secure token
    token = secrets.token_urlsafe(32)

    invite = Invite(
        email=email,
        token=token,
        organization_id=current_user.organization_id,
        invited_by_id=current_user.id,
    )
    db.add(invite)
    db.commit()
    db.refresh(invite)

    # Send invite email
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    org_name = org.name if org else "your organization"
    invited_by = f"{current_user.first_name or ''} {current_user.last_name or ''}".strip() or current_user.email
    asyncio.create_task(send_invite_email(email, token, org_name, invited_by))

    return invite
