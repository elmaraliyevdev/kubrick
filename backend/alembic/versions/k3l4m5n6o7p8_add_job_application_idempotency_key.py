"""Add idempotency key support for job applications.

Revision ID: k3l4m5n6o7p8
Revises: j2k3l4m5n6o7
Create Date: 2026-04-17

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "k3l4m5n6o7p8"
down_revision: Union[str, None] = "j2k3l4m5n6o7"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.add_column("job_applications", sa.Column("idempotency_key", sa.String(length=128), nullable=True))
    op.create_index(
        "ix_job_applications_idempotency_key",
        "job_applications",
        ["idempotency_key"],
        unique=False,
    )
    op.create_unique_constraint(
        "uq_job_applications_job_idempotency_key",
        "job_applications",
        ["job_id", "idempotency_key"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_job_applications_job_idempotency_key", "job_applications", type_="unique")
    op.drop_index("ix_job_applications_idempotency_key", table_name="job_applications")
    op.drop_column("job_applications", "idempotency_key")
