from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, Enum, JSON, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime

class Job(Base):
    __tablename__ = "jobs"
    __table_args__ = (
        UniqueConstraint('organization_id', 'slug', name='uq_job_org_slug'),
    )

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE", name="fk_jobs_user_id"),
        nullable=False,
        index=True,
    )

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE", name="fk_jobs_org_id"),
        nullable=False,
        index=True,
    )

    title = Column(String, nullable=False)
    slug = Column(String, nullable=False, index=True)
    description = Column(Text, nullable=False)
    location = Column(String, nullable=True)

    employment_type = Column(
        Enum("full_time", "part_time", "contract", "internship", name="employmenttypes"),
        nullable=False,
        default="full_time",
    )

    # Structured bullet point sections
    responsibilities = Column(JSON, nullable=True)  # ["Build APIs", "Code review", ...]
    requirements = Column(JSON, nullable=True)       # ["5+ years Python", "REST APIs", ...]
    nice_to_have = Column(JSON, nullable=True)       # ["AWS experience", "Open source", ...]
    benefits = Column(JSON, nullable=True)           # ["Health insurance", "Remote work", ...]

    # Kept for backward compat / matching engine, but hidden from job form
    experience_level = Column(
        Enum("junior", "mid", "senior", "lead", name="experiencelevels"),
        nullable=True,
        default=None,
    )
    salary_min = Column(Integer, nullable=True)
    salary_max = Column(Integer, nullable=True)
    skills_required = Column(Text, nullable=True)

    category = Column(String, nullable=True, index=True)

    work_arrangement = Column(
        Enum("remote_only", "remote_possible", "hybrid", "onsite", "relocation_required", name="workarrangements"),
        nullable=False,
        default="onsite",
    )

    status = Column(
        Enum("open", "closed", "draft", name="jobstatus"),
        nullable=False,
        default="open",
        index=True,
    )

    created_at = Column(DateTime, default=datetime.utcnow, index=True)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="jobs")
    organization = relationship("Organization", back_populates="jobs")

    applications = relationship("JobApplication", back_populates="job", cascade="all, delete-orphan")
    job_requirements = relationship("JobRequirement", back_populates="job", cascade="all, delete-orphan", uselist=False)
    candidate_matches = relationship("CandidateJobMatch", back_populates="job", cascade="all, delete-orphan")