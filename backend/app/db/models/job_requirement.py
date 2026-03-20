from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime


class JobRequirement(Base):
    __tablename__ = "job_requirements"

    id = Column(Integer, primary_key=True, index=True)

    job_id = Column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE", name="fk_job_requirements_job_id"),
        nullable=False,
        index=True
    )

    # Skills and requirements (stored as JSON arrays)
    required_skills = Column(JSONB, nullable=True)  # ["Python", "React", "SQL"]
    nice_to_have_skills = Column(JSONB, nullable=True)  # ["Docker", "AWS", "GraphQL"]
    primary_skills = Column(JSONB, nullable=True)  # ["PHP", "Laravel"] - core skills defining the role

    # Experience requirements
    min_experience_years = Column(Integer, nullable=True)
    max_experience_years = Column(Integer, nullable=True)

    # Other requirements
    education_requirements = Column(JSONB, nullable=True)  # ["Bachelor in CS", "Master preferred"]
    location_requirements = Column(JSONB, nullable=True)  # ["Remote OK", "US timezone"]

    # Metadata
    parsed_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    needs_reparsing = Column(Boolean, default=False, nullable=False)

    # Relationships
    job = relationship("Job", back_populates="job_requirements")

    def __repr__(self):
        return f"<JobRequirement(job_id={self.job_id}, required_skills={len(self.required_skills or [])})>"

    @property
    def all_skills(self):
        """Get all skills (required + nice-to-have) as a single list"""
        required = self.required_skills or []
        nice_to_have = self.nice_to_have_skills or []
        return required + nice_to_have

    @property
    def total_skills_count(self):
        """Get total number of skills listed"""
        return len(self.all_skills)