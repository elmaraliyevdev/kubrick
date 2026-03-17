from sqlalchemy import Column, Integer, String, DateTime, func, Boolean, Enum, ForeignKey
from sqlalchemy.orm import relationship
from app.db.session import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE", name="fk_users_org_id"),
        nullable=True,  # 👈 allow null initially
        index=True  # Add index for faster joins
    )

    role = Column(Enum("admin", "recruiter", name="userroles"), default="recruiter", nullable=False, index=True)
    is_active = Column(Boolean, default=True)
    email_verified = Column(Boolean, default=False, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    organization = relationship("Organization", back_populates="users")
    jobs = relationship("Job", back_populates="owner", cascade="all, delete-orphan")

    candidates_added = relationship("Candidate", back_populates="added_by")