"""add job_application_form_settings for hybrid per-job application forms

Revision ID: h1i2j3k4l5m6
Revises: g9h0i1j2k3l4
Create Date: 2026-04-03

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "h1i2j3k4l5m6"
down_revision: Union[str, None] = "g9h0i1j2k3l4"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        "job_application_form_settings",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("job_id", sa.Integer(), sa.ForeignKey("jobs.id", ondelete="CASCADE"), nullable=False, unique=True),
        sa.Column("use_organization_defaults", sa.Boolean(), nullable=False, server_default="true"),
        sa.Column("standard_config", sa.JSON(), nullable=True),
        sa.Column("custom_field_ids", sa.JSON(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
def downgrade() -> None:
    op.drop_table("job_application_form_settings")
