"""add_primary_skills_support

Revision ID: a1b2c3d4e5f6
Revises: 5f0580ade0ec
Create Date: 2026-02-09 00:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '5f0580ade0ec'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add primary_skills column to job_requirements
    op.add_column('job_requirements', sa.Column('primary_skills', postgresql.JSONB(), nullable=True))

    # Add primary skills penalty columns to matching_algorithm_config
    op.add_column('matching_algorithm_config', sa.Column('primary_skills_penalty_all', sa.Numeric(precision=3, scale=2), nullable=False, server_default='1.00'))
    op.add_column('matching_algorithm_config', sa.Column('primary_skills_penalty_some', sa.Numeric(precision=3, scale=2), nullable=False, server_default='0.60'))
    op.add_column('matching_algorithm_config', sa.Column('primary_skills_penalty_none', sa.Numeric(precision=3, scale=2), nullable=False, server_default='0.25'))


def downgrade() -> None:
    op.drop_column('matching_algorithm_config', 'primary_skills_penalty_none')
    op.drop_column('matching_algorithm_config', 'primary_skills_penalty_some')
    op.drop_column('matching_algorithm_config', 'primary_skills_penalty_all')
    op.drop_column('job_requirements', 'primary_skills')
