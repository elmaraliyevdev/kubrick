from sqlalchemy import Column, Integer, Enum, Text, ForeignKey, DateTime, func, JSON
from sqlalchemy.orm import relationship
from app.db.session import Base


class JobApplication(Base):
    __tablename__ = "job_applications"

    id = Column(Integer, primary_key=True, index=True)

    job_id = Column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE", name="fk_applications_job_id"),
        nullable=False,
        index=True,  # Index for job-based queries
    )
    candidate_id = Column(
        Integer,
        ForeignKey("candidates.id", ondelete="CASCADE", name="fk_applications_candidate_id"),
        nullable=False,
        index=True,  # Index for candidate-based queries
    )

    # AI Matching Score (0-100)
    match_score = Column(Integer, nullable=True)
    matched_skills = Column(JSON, nullable=True)  # ["Python", "React"]
    missing_skills = Column(JSON, nullable=True)  # ["AWS", "Kubernetes"]

    # Application status
    status = Column(
        Enum("new", "reviewed", "shortlisted", "interviewed", "rejected", "hired", name="application_status"),
        default="new",
        nullable=False,
        index=True,  # Index for status filtering
    )

    # AI-generated insights
    ai_summary = Column(Text, nullable=True)  # AI-generated candidate pitch
    ai_reasoning = Column(Text, nullable=True)  # Why this score was given

    # Application form data
    cover_letter = Column(Text, nullable=True)
    custom_field_responses = Column(JSON, nullable=True)  # {"field_key": "value", ...}

    # Recruiter notes for this specific application
    recruiter_notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), index=True)  # Index for time-based queries
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    job = relationship("Job", back_populates="applications")
    candidate = relationship("Candidate", back_populates="job_applications")