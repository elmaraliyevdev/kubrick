from typing import Literal

from pydantic import BaseModel, Field, field_validator, model_validator


class MatchingAlgorithmConfigResponse(BaseModel):
    id: int
    organization_id: int
    skills_weight: int
    experience_weight: int
    education_weight: int
    additional_weight: int
    fuzzy_match_threshold: float
    skills_match_algorithm: Literal["tfidf", "exact", "fuzzy"]
    enable_synonym_matching: bool
    primary_skills_penalty_all: float
    primary_skills_penalty_some: float
    primary_skills_penalty_none: float

    class Config:
        from_attributes = True


class MatchingAlgorithmConfigPut(BaseModel):
    """Full replacement of tunable matching parameters (admin PUT)."""

    skills_weight: int = Field(gt=0)
    experience_weight: int = Field(gt=0)
    education_weight: int = Field(gt=0)
    additional_weight: int = Field(gt=0)
    fuzzy_match_threshold: float = Field(ge=0.0, le=1.0)
    skills_match_algorithm: Literal["tfidf", "exact", "fuzzy"]
    enable_synonym_matching: bool
    primary_skills_penalty_all: float = Field(ge=0.0)
    primary_skills_penalty_some: float = Field(ge=0.0)
    primary_skills_penalty_none: float = Field(ge=0.0)

    @model_validator(mode="after")
    def weights_sum_one_hundred(self):
        total = (
            self.skills_weight
            + self.experience_weight
            + self.education_weight
            + self.additional_weight
        )
        if total != 100:
            raise ValueError(f"Match weights must sum to 100 (got {total})")
        return self

    @field_validator(
        "fuzzy_match_threshold",
        "primary_skills_penalty_all",
        "primary_skills_penalty_some",
        "primary_skills_penalty_none",
        mode="before",
    )
    @classmethod
    def coerce_float(cls, v):
        return float(v) if v is not None else v
