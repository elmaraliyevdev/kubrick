"""add_job_bullet_sections

Revision ID: d4e5f6g7h8i9
Revises: c3d4e5f6g7h8
Create Date: 2026-03-19 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = 'd4e5f6g7h8i9'
down_revision: Union[str, None] = 'c3d4e5f6g7h8'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Add 4 bullet point JSON columns
    op.add_column('jobs', sa.Column('responsibilities', sa.JSON(), nullable=True))
    op.add_column('jobs', sa.Column('requirements', sa.JSON(), nullable=True))
    op.add_column('jobs', sa.Column('nice_to_have', sa.JSON(), nullable=True))
    op.add_column('jobs', sa.Column('benefits', sa.JSON(), nullable=True))

    # Make experience_level nullable (no longer required)
    op.alter_column('jobs', 'experience_level', nullable=True,
                    existing_type=sa.Enum('junior', 'mid', 'senior', 'lead', name='experiencelevels'))


def downgrade() -> None:
    op.alter_column('jobs', 'experience_level', nullable=False,
                    existing_type=sa.Enum('junior', 'mid', 'senior', 'lead', name='experiencelevels'))
    op.drop_column('jobs', 'benefits')
    op.drop_column('jobs', 'nice_to_have')
    op.drop_column('jobs', 'requirements')
    op.drop_column('jobs', 'responsibilities')
