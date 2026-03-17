from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean, Numeric, UniqueConstraint
from sqlalchemy.orm import relationship
from app.db.session import Base
from datetime import datetime
from typing import Dict, Any


class MatchingAlgorithmConfig(Base):
    __tablename__ = "matching_algorithm_config"

    id = Column(Integer, primary_key=True, index=True)

    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE", name="fk_matching_config_organization_id"),
        nullable=False
    )

    # Scoring weights (should sum to 100)
    skills_weight = Column(Integer, default=40, nullable=False)
    experience_weight = Column(Integer, default=25, nullable=False)
    education_weight = Column(Integer, default=15, nullable=False)
    additional_weight = Column(Integer, default=20, nullable=False)

    # Algorithm settings
    fuzzy_match_threshold = Column(Numeric(3, 2), default=0.80, nullable=False)
    skills_match_algorithm = Column(String(20), default="tfidf", nullable=False)
    enable_synonym_matching = Column(Boolean, default=True, nullable=False)

    # Primary skills penalty multipliers
    primary_skills_penalty_all = Column(Numeric(3, 2), default=1.00, nullable=False)
    primary_skills_penalty_some = Column(Numeric(3, 2), default=0.60, nullable=False)
    primary_skills_penalty_none = Column(Numeric(3, 2), default=0.25, nullable=False)

    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow, nullable=False)

    # Relationships
    organization = relationship("Organization", back_populates="matching_config")

    # Unique constraint - one config per organization
    __table_args__ = (
        UniqueConstraint('organization_id', name='uq_matching_config_organization'),
    )

    def __repr__(self):
        return f"<MatchingAlgorithmConfig(org_id={self.organization_id}, weights={self.skills_weight}/{self.experience_weight}/{self.education_weight}/{self.additional_weight})>"

    @property
    def total_weight(self) -> int:
        """Calculate total weight (should be 100)"""
        return self.skills_weight + self.experience_weight + self.education_weight + self.additional_weight

    @property
    def weights_normalized(self) -> Dict[str, float]:
        """Get normalized weights (as percentages)"""
        total = self.total_weight
        if total == 0:
            return {"skills": 0.4, "experience": 0.25, "education": 0.15, "additional": 0.20}
        
        return {
            "skills": self.skills_weight / total,
            "experience": self.experience_weight / total,
            "education": self.education_weight / total,
            "additional": self.additional_weight / total
        }

    @property
    def is_valid_config(self) -> bool:
        """Check if configuration is valid"""
        # Weights should be positive and sum to 100
        weights_valid = (
            self.skills_weight > 0 and
            self.experience_weight > 0 and
            self.education_weight > 0 and
            self.additional_weight > 0 and
            self.total_weight == 100
        )
        
        # Fuzzy threshold should be between 0 and 1
        threshold_valid = 0.0 <= float(self.fuzzy_match_threshold) <= 1.0
        
        # Algorithm should be supported
        algorithm_valid = self.skills_match_algorithm in ["tfidf", "exact", "fuzzy"]
        
        return weights_valid and threshold_valid and algorithm_valid

    def get_config_dict(self) -> Dict[str, Any]:
        """Get configuration as dictionary for use in algorithms"""
        return {
            "weights": {
                "skills": self.skills_weight,
                "experience": self.experience_weight,
                "education": self.education_weight,
                "additional": self.additional_weight
            },
            "weights_normalized": self.weights_normalized,
            "fuzzy_match_threshold": float(self.fuzzy_match_threshold),
            "skills_match_algorithm": self.skills_match_algorithm,
            "enable_synonym_matching": self.enable_synonym_matching,
            "total_weight": self.total_weight,
            "is_valid": self.is_valid_config,
            "primary_skills_penalty": {
                "all_present": float(self.primary_skills_penalty_all),
                "some_present": float(self.primary_skills_penalty_some),
                "none_present": float(self.primary_skills_penalty_none),
            }
        }

    @classmethod
    def get_default_config(cls) -> Dict[str, Any]:
        """Get default configuration values"""
        return {
            "skills_weight": 40,
            "experience_weight": 25,
            "education_weight": 15,
            "additional_weight": 20,
            "fuzzy_match_threshold": 0.80,
            "skills_match_algorithm": "tfidf",
            "enable_synonym_matching": True,
            "primary_skills_penalty_all": 1.00,
            "primary_skills_penalty_some": 0.60,
            "primary_skills_penalty_none": 0.25
        }