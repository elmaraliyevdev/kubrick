"""add_job_application_pipeline_constraints

Revision ID: f1a2b3c4d5e6
Revises: e8f9a0b1c2d3
Create Date: 2026-03-27 00:00:00.000000
"""

from typing import Sequence, Union

from alembic import op


# revision identifiers, used by Alembic.
revision: str = "f1a2b3c4d5e6"
down_revision: Union[str, None] = "e8f9a0b1c2d3"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # If older seed data ever created duplicates, remove them so the unique
    # constraint can be applied safely.
    op.execute(
        """
        DELETE FROM job_applications a
        USING job_applications b
        WHERE a.candidate_id = b.candidate_id
          AND a.job_id = b.job_id
          AND a.id > b.id
        """
    )

    op.create_unique_constraint(
        "uq_job_applications_candidate_job",
        "job_applications",
        ["candidate_id", "job_id"],
    )

    op.create_index(
        "ix_job_applications_job_status_updated_at",
        "job_applications",
        ["job_id", "status", "updated_at"],
    )


def downgrade() -> None:
    op.drop_index("ix_job_applications_job_status_updated_at", table_name="job_applications")
    op.drop_constraint(
        "uq_job_applications_candidate_job",
        "job_applications",
        type_="unique",
    )

