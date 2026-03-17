import secrets
import asyncio
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.db.session import SessionLocal
from app.db.models.organization import Organization
from app.db.models.user import User
from app.db.models.invite import Invite
from app.schemas.organization import OrganizationCreate, OrganizationResponse
from app.schemas.user import UserResponse
from app.schemas.invite import InviteResponse
from app.core.security import get_current_user, get_db
from app.core.email import send_invite_email

router = APIRouter()


# Get current user's org
@router.get("/me", response_model=OrganizationResponse)
def get_my_org(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org

# Update org name (admins only)
@router.put("/me", response_model=OrganizationResponse)
def update_org(
    org_data: OrganizationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can update organization")

    org = db.query(Organization).filter(Organization.id == current_user.organization_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")

    org.name = org_data.name
    from app.utils.slug import generate_organization_slug
    org.slug = generate_organization_slug(org_data.name, db, exclude_id=org.id)
    db.commit()
    db.refresh(org)
    return org

# List all users in org
@router.get("/me/users", response_model=List[UserResponse])
def list_org_users(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return db.query(User).filter(User.organization_id == current_user.organization_id).all()

# Invite user (real onboarding)
@router.post("/me/invite", response_model=InviteResponse)
def invite_user(
    email: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
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