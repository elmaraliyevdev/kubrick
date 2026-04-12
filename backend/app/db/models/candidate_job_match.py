from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Numeric, UniqueConstraint, JSON
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime
from typing import Dict, Any, Optional

JsonMatchData = JSON().with_variant(JSONB, "postgresql")


class CandidateJobMatch(Base):
    __tablename__ = "candidate_job_matches"

    id = Column(Integer, primary_key=True, index=True)

    # Foreign keys
    candidate_id = Column(
        Integer,
        ForeignKey("candidates.id", ondelete="CASCADE", name="fk_candidate_job_matches_candidate_id"),
        nullable=False,
        index=True
    )
    
    job_id = Column(
        Integer,
        ForeignKey("jobs.id", ondelete="CASCADE", name="fk_candidate_job_matches_job_id"),
        nullable=False,
        index=True
    )

    # Score components (out of 100 total)
    overall_score = Column(Numeric(5, 2), nullable=True, index=True)  # 0.00 - 100.00
    skills_score = Column(Numeric(5, 2), nullable=True)  # 0.00 - 40.00
    experience_score = Column(Numeric(5, 2), nullable=True)  # 0.00 - 25.00
    education_score = Column(Numeric(5, 2), nullable=True)  # 0.00 - 15.00
    additional_score = Column(Numeric(5, 2), nullable=True)  # 0.00 - 20.00

    # Detailed skill analysis
    skills_matched = Column(JsonMatchData, nullable=True)  # ["Python", "React"] - exact/fuzzy matches
    skills_missing = Column(JsonMatchData, nullable=True)  # ["Docker", "Kubernetes"] - required but missing
    skills_extra = Column(JsonMatchData, nullable=True)  # ["Ruby", "Vue.js"] - candidate has but not required

    # Detailed match analysis
    match_details = Column(JsonMatchData, nullable=True)  # Full analysis breakdown

    # Metadata
    calculated_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    needs_recalculation = Column(Boolean, default=False, nullable=False)
    calculation_version = Column(String(10), default="1.0", nullable=False)

    # Relationships
    candidate = relationship("Candidate", back_populates="job_matches")
    job = relationship("Job", back_populates="candidate_matches")

    # Unique constraint - one match per candidate-job pair
    __table_args__ = (
        UniqueConstraint('candidate_id', 'job_id', name='uq_candidate_job_match'),
    )

    def __repr__(self):
        return f"<CandidateJobMatch(candidate_id={self.candidate_id}, job_id={self.job_id}, score={self.overall_score})>"

    @property
    def score_tier(self) -> str:
        """Get the score tier (excellent/good/poor)"""
        if not self.overall_score:
            return "unscored"
        
        score = float(self.overall_score)
        if score >= 80:
            return "excellent"
        elif score >= 60:
            return "good"
        else:
            return "poor"

    @property
    def score_tier_color(self) -> str:
        """Get color for the score tier"""
        tier = self.score_tier
        return {
            "excellent": "green",
            "good": "yellow", 
            "poor": "red",
            "unscored": "gray"
        }.get(tier, "gray")

    @property
    def skills_matched_count(self) -> int:
        """Number of skills that matched"""
        return len(self.skills_matched or [])

    @property
    def skills_missing_count(self) -> int:
        """Number of required skills missing"""
        return len(self.skills_missing or [])

    @property
    def skills_extra_count(self) -> int:
        """Number of extra skills candidate has"""
        return len(self.skills_extra or [])

    def get_match_summary(self) -> Dict[str, Any]:
        """Get a summary of the match for API responses"""
        return {
            "overall_score": float(self.overall_score) if self.overall_score else None,
            "tier": self.score_tier,
            "breakdown": {
                "skills": float(self.skills_score) if self.skills_score else None,
                "experience": float(self.experience_score) if self.experience_score else None,
                "education": float(self.education_score) if self.education_score else None,
                "additional": float(self.additional_score) if self.additional_score else None,
            },
            "skills_summary": {
                "matched": self.skills_matched or [],
                "missing": self.skills_missing or [],
                "extra": self.skills_extra or [],
                "matched_count": self.skills_matched_count,
                "missing_count": self.skills_missing_count,
                "extra_count": self.skills_extra_count,
            },
            "calculated_at": self.calculated_at.isoformat() if self.calculated_at else None,
            "needs_recalculation": self.needs_recalculation,
            "primary_skills_penalty": {
                "applied": self.match_details.get("component_scores", {}).get("primary_skills_multiplier", 1.0) if self.match_details else 1.0,
                "raw_score": self.match_details.get("component_scores", {}).get("raw_score") if self.match_details else None,
                "missing_primary": self.match_details.get("summary", {}).get("primary_skills_missing", []) if self.match_details else [],
            }
        }
