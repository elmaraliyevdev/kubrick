from slugify import slugify
from sqlalchemy.orm import Session
from typing import Optional

from app.db.models.organization import Organization
from app.db.models.job import Job

RESERVED_SLUGS = {
    "login", "register", "signup", "dashboard", "jobs", "candidates",
    "analytics", "settings", "complete-profile", "verify-email",
    "forgot-password", "reset-password", "api", "admin",
}


def generate_organization_slug(
    name: str, db: Session, exclude_id: Optional[int] = None
) -> str:
    base_slug = slugify(name)
    if not base_slug:
        base_slug = "org"

    candidate = base_slug
    counter = 0

    while True:
        # Check reserved slugs
        if candidate in RESERVED_SLUGS:
            candidate = f"{base_slug}-careers"
            base_slug = candidate  # use this as the new base for counter appending

        query = db.query(Organization).filter(Organization.slug == candidate)
        if exclude_id is not None:
            query = query.filter(Organization.id != exclude_id)

        if not query.first():
            return candidate

        counter += 1
        candidate = f"{base_slug}-{counter}"


def generate_job_slug(
    title: str, organization_id: int, db: Session, exclude_id: Optional[int] = None
) -> str:
    base_slug = slugify(title)
    if not base_slug:
        base_slug = "job"

    candidate = base_slug
    counter = 0

    while True:
        query = db.query(Job).filter(
            Job.organization_id == organization_id,
            Job.slug == candidate,
        )
        if exclude_id is not None:
            query = query.filter(Job.id != exclude_id)

        if not query.first():
            return candidate

        counter += 1
        candidate = f"{base_slug}-{counter}"
