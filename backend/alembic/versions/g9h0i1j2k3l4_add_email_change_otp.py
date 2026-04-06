"""add email_change otp type and otp_codes.user_id

Revision ID: g9h0i1j2k3l4
Revises: f1a2b3c4d5e6
Create Date: 2026-04-07 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "g9h0i1j2k3l4"
down_revision: Union[str, None] = "f1a2b3c4d5e6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    bind = op.get_bind()
    if bind.dialect.name == "postgresql":
        # Safe to run once per environment; PostgreSQL cannot remove enum values later.
        op.execute(sa.text("ALTER TYPE otp_types ADD VALUE 'email_change'"))

    op.add_column("otp_codes", sa.Column("user_id", sa.Integer(), nullable=True))
    op.create_foreign_key(
        "fk_otp_codes_user_id_users",
        "otp_codes",
        "users",
        ["user_id"],
        ["id"],
        ondelete="CASCADE",
    )
    op.create_index(op.f("ix_otp_codes_user_id"), "otp_codes", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_otp_codes_user_id"), table_name="otp_codes")
    op.drop_constraint("fk_otp_codes_user_id_users", "otp_codes", type_="foreignkey")
    op.drop_column("otp_codes", "user_id")
    # PostgreSQL does not support removing enum values safely; leave otp_types as-is.
