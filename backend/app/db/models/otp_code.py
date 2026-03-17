from sqlalchemy import Column, Integer, String, DateTime, Enum
from app.db.session import Base

class OtpCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    code = Column(String, nullable=False)
    code_type = Column(Enum("login", "email_verification", "password_reset", name="otp_types"), default="login", nullable=False)
    expires_at = Column(DateTime, nullable=False)