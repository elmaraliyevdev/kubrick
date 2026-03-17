from sqlalchemy import Column, Integer, String, DateTime, func
from sqlalchemy.orm import relationship
from app.db.session import Base

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String, unique=True, nullable=False)
    slug = Column(String, unique=True, nullable=False, index=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    users = relationship("User", back_populates="organization")
    jobs = relationship("Job", back_populates="organization")
    invites = relationship("Invite", back_populates="organization", cascade="all, delete-orphan")

    candidates = relationship("Candidate", back_populates="organization", cascade="all, delete-orphan")
    matching_config = relationship("MatchingAlgorithmConfig", back_populates="organization", cascade="all, delete-orphan", uselist=False)