"""migrate_job_application_status_lanes

Revision ID: e8f9a0b1c2d3
Revises: d4e5f6g7h8i9
Create Date: 2026-03-27 00:00:00.000000

This migration updates `job_applications.status` to the canonical five
pipeline lanes: applied -> screening -> interview -> offer -> hired.
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "e8f9a0b1c2d3"
down_revision: Union[str, None] = "d4e5f6g7h8i9"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Rename existing enum type so we can create the new one with the same name.
    op.execute("ALTER TYPE application_status RENAME TO application_status_old")

    # New canonical v1 lanes.
    op.execute(
        "CREATE TYPE application_status AS ENUM ('applied', 'screening', 'interview', 'offer', 'hired')"
    )

    # Rewrite column values while converting to the new enum type.
    op.execute(
        """
        ALTER TABLE job_applications
        ALTER COLUMN status
        TYPE application_status
        USING (
            CASE status::text
                WHEN 'new' THEN 'applied'
                WHEN 'reviewed' THEN 'screening'
                WHEN 'shortlisted' THEN 'screening'
                WHEN 'interviewed' THEN 'interview'
                WHEN 'hired' THEN 'hired'
                WHEN 'rejected' THEN 'screening'
                WHEN 'offer' THEN 'offer'
                ELSE 'applied'
            END
        )::application_status
        """
    )

    # Clean up old enum type.
    op.execute("DROP TYPE application_status_old")

    # Set a sensible default for future inserts.
    op.execute("ALTER TABLE job_applications ALTER COLUMN status SET DEFAULT 'applied'")


def downgrade() -> None:
    # Best-effort downgrade back to the legacy enum values.
    op.execute("ALTER TYPE application_status RENAME TO application_status_new_lanes")
    op.execute(
        "CREATE TYPE application_status AS ENUM ('new', 'reviewed', 'shortlisted', 'interviewed', 'rejected', 'hired')"
    )

    op.execute(
        """
        ALTER TABLE job_applications
        ALTER COLUMN status
        TYPE application_status
        USING (
            CASE status::text
                WHEN 'applied' THEN 'new'
                WHEN 'screening' THEN 'reviewed'
                WHEN 'interview' THEN 'interviewed'
                WHEN 'offer' THEN 'interviewed'
                WHEN 'hired' THEN 'hired'
                ELSE 'new'
            END
        )::application_status
        """
    )

    op.execute("DROP TYPE application_status_new_lanes")
    op.execute("ALTER TABLE job_applications ALTER COLUMN status SET DEFAULT 'new'")

