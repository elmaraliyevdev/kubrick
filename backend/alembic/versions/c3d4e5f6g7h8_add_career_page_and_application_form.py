"""add_career_page_and_application_form

Revision ID: c3d4e5f6g7h8
Revises: b2c3d4e5f6g7
Create Date: 2026-03-19 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = 'c3d4e5f6g7h8'
down_revision: Union[str, None] = 'b2c3d4e5f6g7'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # --- Organizations: add career page branding columns ---
    op.add_column('organizations', sa.Column('logo_url', sa.String(), nullable=True))
    op.add_column('organizations', sa.Column('description', sa.Text(), nullable=True))
    op.add_column('organizations', sa.Column('website_url', sa.String(), nullable=True))
    op.add_column('organizations', sa.Column('brand_color', sa.String(), nullable=True))
    op.add_column('organizations', sa.Column('career_page_enabled', sa.Boolean(), nullable=False, server_default='true'))

    # --- JobApplications: add cover_letter and custom_field_responses ---
    op.add_column('job_applications', sa.Column('cover_letter', sa.Text(), nullable=True))
    op.add_column('job_applications', sa.Column('custom_field_responses', sa.JSON(), nullable=True))

    # --- ApplicationFormConfig: per-org form configuration ---
    op.create_table(
        'application_form_configs',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, unique=True),
        sa.Column('show_phone', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('show_location', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('show_linkedin', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('show_portfolio', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('show_cover_letter', sa.Boolean(), nullable=False, server_default='true'),
        sa.Column('require_phone', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('require_location', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('require_linkedin', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('require_portfolio', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('require_cover_letter', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )

    # --- CustomFormFields: org-defined custom application form fields ---
    op.create_table(
        'custom_form_fields',
        sa.Column('id', sa.Integer(), primary_key=True, index=True),
        sa.Column('organization_id', sa.Integer(), sa.ForeignKey('organizations.id', ondelete='CASCADE'), nullable=False, index=True),
        sa.Column('field_key', sa.String(), nullable=False),
        sa.Column('label', sa.String(), nullable=False),
        sa.Column('field_type', sa.String(), nullable=False),
        sa.Column('is_required', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('options', sa.JSON(), nullable=True),
        sa.Column('placeholder', sa.String(), nullable=True),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.func.now()),
    )


def downgrade() -> None:
    op.drop_table('custom_form_fields')
    op.drop_table('application_form_configs')
    op.drop_column('job_applications', 'custom_field_responses')
    op.drop_column('job_applications', 'cover_letter')
    op.drop_column('organizations', 'career_page_enabled')
    op.drop_column('organizations', 'brand_color')
    op.drop_column('organizations', 'website_url')
    op.drop_column('organizations', 'description')
    op.drop_column('organizations', 'logo_url')
