from sqlalchemy import Column, Integer, String, Text, ForeignKey, DateTime, func, Date
from sqlalchemy.orm import relationship
from app.db.session import Base


class WorkExperience(Base):
    __tablename__ = "work_experiences"

    id = Column(Integer, primary_key=True, index=True)
    candidate_id = Column(
        Integer,
        ForeignKey("candidates.id", ondelete="CASCADE", name="fk_work_exp_candidate_id"),
        nullable=False,
    )

    # Job details
    job_title = Column(String, nullable=True)
    company_name = Column(String, nullable=True)
    location = Column(String, nullable=True)
    employment_type = Column(String, nullable=True)  # Full-time, Part-time, Contract, etc.

    # Dates
    start_date = Column(String, nullable=True)  # Store as string since formats vary
    end_date = Column(String, nullable=True)  # "Present" for current jobs
    duration = Column(String, nullable=True)  # "April 2025-August 2025"

    # Description
    description = Column(Text, nullable=True)
    responsibilities = Column(Text, nullable=True)

    # Metadata
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    candidate = relationship("Candidate", back_populates="work_experiences")