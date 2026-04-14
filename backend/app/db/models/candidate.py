from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base


class Candidate(Base):
    __tablename__ = "candidates"

    id = Column(Integer, primary_key=True, index=True)

    # Basic Info (extracted from resume or manually entered)
    first_name = Column(String, nullable=True)
    last_name = Column(String, nullable=True)
    email = Column(String, nullable=True, index=True)
    phone = Column(String, nullable=True)
    location = Column(String, nullable=True)

    # Organization relationship (candidates belong to organizations)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE", name="fk_candidates_org_id"),
        nullable=False,
        index=True,  # Index for filtering by organization
    )

    # Who added this candidate
    added_by_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="SET NULL", name="fk_candidates_added_by"),
        nullable=True,
        index=True,  # Index for filtering by recruiter
    )

    # Parsed resume data (JSON for flexibility)
    skills = Column(JSON, nullable=True)  # ["Python", "React", "SQL"]
    experience_years = Column(Integer, nullable=True)
    education = Column(JSON, nullable=True)  # [{"degree": "BSc", "school": "MIT", "year": 2020}]
    certifications = Column(JSON, nullable=True)

    # Raw resume text (for search and re-parsing)
    raw_resume_text = Column(Text, nullable=True)

    # LinkedIn or portfolio URLs
    linkedin_url = Column(String, nullable=True)
    portfolio_url = Column(String, nullable=True)

    # Notes from recruiters
    notes = Column(Text, nullable=True)

    # Timestamps
    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)  # Index for ordering
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    organization = relationship("Organization", back_populates="candidates")
    added_by = relationship("User", back_populates="candidates_added")
    resume_files = relationship("CandidateFile", back_populates="candidate", cascade="all, delete-orphan")
    job_applications = relationship("JobApplication", back_populates="candidate", cascade="all, delete-orphan")
    work_experiences = relationship("WorkExperience", back_populates="candidate", cascade="all, delete-orphan")
    job_matches = relationship("CandidateJobMatch", back_populates="candidate", cascade="all, delete-orphan")
    outbound_emails = relationship("OutboundEmail", back_populates="candidate")
