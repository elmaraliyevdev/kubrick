from sqlalchemy import Column, Integer, String, DateTime, Enum, ForeignKey
from app.db.session import Base

class OtpCode(Base):
    __tablename__ = "otp_codes"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, index=True, nullable=False)
    code = Column(String, nullable=False)
    code_type = Column(
        Enum(
            "login",
            "email_verification",
            "password_reset",
            "email_change",
            name="otp_types",
        ),
        default="login",
        nullable=False,
    )
    expires_at = Column(DateTime, nullable=False)
    # For email_change: recipient address is the new email; links OTP to the initiating user.
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=True, index=True)