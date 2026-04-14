"""Add rejected pipeline stage and candidate email tables.

Revision ID: j2k3l4m5n6o7
Revises: h1i2j3k4l5m6
Create Date: 2026-04-12

"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "j2k3l4m5n6o7"
down_revision: Union[str, None] = "h1i2j3k4l5m6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        op.execute(sa.text("ALTER TYPE application_status ADD VALUE IF NOT EXISTS 'rejected'"))

    op.create_table(
        "email_templates",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("stage", sa.String(length=32), nullable=False),
        sa.Column("name", sa.String(length=120), nullable=True),
        sa.Column("subject", sa.String(length=500), nullable=False),
        sa.Column("body_html", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.UniqueConstraint("organization_id", "stage", name="uq_email_templates_org_stage"),
    )
    op.create_index("ix_email_templates_organization_id", "email_templates", ["organization_id"])
    op.create_index("ix_email_templates_stage", "email_templates", ["stage"])

    op.create_table(
        "outbound_emails",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column("organization_id", sa.Integer(), sa.ForeignKey("organizations.id", ondelete="CASCADE"), nullable=False),
        sa.Column("job_application_id", sa.Integer(), sa.ForeignKey("job_applications.id", ondelete="CASCADE"), nullable=False),
        sa.Column("candidate_id", sa.Integer(), sa.ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False),
        sa.Column("template_id", sa.Integer(), sa.ForeignKey("email_templates.id", ondelete="SET NULL"), nullable=True),
        sa.Column("sent_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("to_email", sa.String(length=320), nullable=False),
        sa.Column("subject_snapshot", sa.String(length=500), nullable=False),
        sa.Column("html_snapshot", sa.Text(), nullable=False),
        sa.Column("provider_message_id", sa.String(length=120), nullable=True),
        sa.Column("status", sa.String(length=32), nullable=False, server_default="sent"),
        sa.Column("tracking_token", sa.String(length=64), nullable=False),
        sa.Column("first_opened_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index("ix_outbound_emails_organization_id", "outbound_emails", ["organization_id"])
    op.create_index("ix_outbound_emails_job_application_id", "outbound_emails", ["job_application_id"])
    op.create_index("ix_outbound_emails_candidate_id", "outbound_emails", ["candidate_id"])
    op.create_index("ix_outbound_emails_provider_message_id", "outbound_emails", ["provider_message_id"])
    op.create_index("ix_outbound_emails_status", "outbound_emails", ["status"])
    op.create_index("ix_outbound_emails_created_at", "outbound_emails", ["created_at"])
    op.create_index("ix_outbound_emails_tracking_token", "outbound_emails", ["tracking_token"], unique=True)


def downgrade() -> None:
    op.drop_index("ix_outbound_emails_tracking_token", table_name="outbound_emails")
    op.drop_index("ix_outbound_emails_created_at", table_name="outbound_emails")
    op.drop_index("ix_outbound_emails_status", table_name="outbound_emails")
    op.drop_index("ix_outbound_emails_provider_message_id", table_name="outbound_emails")
    op.drop_index("ix_outbound_emails_candidate_id", table_name="outbound_emails")
    op.drop_index("ix_outbound_emails_job_application_id", table_name="outbound_emails")
    op.drop_index("ix_outbound_emails_organization_id", table_name="outbound_emails")
    op.drop_table("outbound_emails")

    op.drop_index("ix_email_templates_stage", table_name="email_templates")
    op.drop_index("ix_email_templates_organization_id", table_name="email_templates")
    op.drop_table("email_templates")

    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # PostgreSQL cannot remove enum values safely in-place; leave application_status as-is.
        pass
