"""
Token blacklist model for JWT revocation.
"""
from sqlalchemy import Column, Integer, String, DateTime, func
from app.db.session import Base


class TokenBlacklist(Base):
    """Store revoked/blacklisted JWT tokens."""
    __tablename__ = "token_blacklist"

    id = Column(Integer, primary_key=True, index=True)
    jti = Column(String, unique=True, nullable=False, index=True)  # JWT ID
    token_type = Column(String, nullable=False)  # 'access' or 'refresh'
    user_id = Column(Integer, nullable=False, index=True)
    blacklisted_at = Column(DateTime(timezone=True), server_default=func.now())
    expires_at = Column(DateTime(timezone=True), nullable=False, index=True)  # Original token expiry
    reason = Column(String, nullable=True)  # logout, security_breach, etc.