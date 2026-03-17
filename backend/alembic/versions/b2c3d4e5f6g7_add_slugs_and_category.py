"""add_slugs_and_category

Revision ID: b2c3d4e5f6g7
Revises: a1b2c3d4e5f6
Create Date: 2026-02-09 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from slugify import slugify

# revision identifiers, used by Alembic.
revision: str = 'b2c3d4e5f6g7'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

RESERVED_SLUGS = {
    "login", "register", "signup", "dashboard", "jobs", "candidates",
    "analytics", "settings", "complete-profile", "verify-email",
    "forgot-password", "reset-password", "api", "admin",
}


def upgrade() -> None:
    # --- Organizations: add slug column (nullable first for backfill) ---
    op.add_column('organizations', sa.Column('slug', sa.String(), nullable=True))

    # Backfill organization slugs
    conn = op.get_bind()
    orgs = conn.execute(sa.text("SELECT id, name FROM organizations")).fetchall()
    used_slugs: set = set()

    for org_id, name in orgs:
        base_slug = slugify(name) or "org"
        slug = base_slug

        # Handle reserved slugs
        if slug in RESERVED_SLUGS:
            slug = f"{base_slug}-careers"
            base_slug = slug

        counter = 0
        while slug in used_slugs:
            counter += 1
            slug = f"{base_slug}-{counter}"

        used_slugs.add(slug)
        conn.execute(
            sa.text("UPDATE organizations SET slug = :slug WHERE id = :id"),
            {"slug": slug, "id": org_id},
        )

    # Now make slug NOT NULL and add unique index
    op.alter_column('organizations', 'slug', nullable=False)
    op.create_unique_constraint('uq_organizations_slug', 'organizations', ['slug'])
    op.create_index('ix_organizations_slug', 'organizations', ['slug'])

    # --- Jobs: add slug and category columns ---
    op.add_column('jobs', sa.Column('slug', sa.String(), nullable=True))
    op.add_column('jobs', sa.Column('category', sa.String(), nullable=True))

    # Backfill job slugs (unique per organization)
    jobs = conn.execute(sa.text("SELECT id, title, organization_id FROM jobs")).fetchall()
    org_slug_sets: dict = {}  # org_id -> set of used slugs

    for job_id, title, org_id in jobs:
        if org_id not in org_slug_sets:
            org_slug_sets[org_id] = set()

        base_slug = slugify(title) or "job"
        slug = base_slug
        counter = 0
        while slug in org_slug_sets[org_id]:
            counter += 1
            slug = f"{base_slug}-{counter}"

        org_slug_sets[org_id].add(slug)
        conn.execute(
            sa.text("UPDATE jobs SET slug = :slug WHERE id = :id"),
            {"slug": slug, "id": job_id},
        )

    # Make slug NOT NULL and add unique constraint + index
    op.alter_column('jobs', 'slug', nullable=False)
    op.create_unique_constraint('uq_job_org_slug', 'jobs', ['organization_id', 'slug'])
    op.create_index('ix_jobs_slug', 'jobs', ['slug'])
    op.create_index('ix_jobs_category', 'jobs', ['category'])


def downgrade() -> None:
    op.drop_index('ix_jobs_category', table_name='jobs')
    op.drop_index('ix_jobs_slug', table_name='jobs')
    op.drop_constraint('uq_job_org_slug', 'jobs', type_='unique')
    op.drop_column('jobs', 'category')
    op.drop_column('jobs', 'slug')

    op.drop_index('ix_organizations_slug', table_name='organizations')
    op.drop_constraint('uq_organizations_slug', 'organizations', type_='unique')
    op.drop_column('organizations', 'slug')
