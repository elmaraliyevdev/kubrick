from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.core.security import get_db, require_org_member
from app.db.models.matching_algorithm_config import MatchingAlgorithmConfig
from app.db.models.user import User
from app.schemas.matching_config import (
    MatchingAlgorithmConfigPut,
    MatchingAlgorithmConfigResponse,
)

router = APIRouter()


def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage matching settings")


def _get_or_create_config(org_id: int, db: Session) -> MatchingAlgorithmConfig:
    config = (
        db.query(MatchingAlgorithmConfig)
        .filter(MatchingAlgorithmConfig.organization_id == org_id)
        .first()
    )
    if not config:
        config = MatchingAlgorithmConfig(organization_id=org_id)
        db.add(config)
        db.flush()
    return config


@router.get("", response_model=MatchingAlgorithmConfigResponse)
def get_matching_config(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    _require_admin(current_user)
    config = _get_or_create_config(current_user.organization_id, db)
    db.commit()
    db.refresh(config)
    return config


@router.put("", response_model=MatchingAlgorithmConfigResponse)
def put_matching_config(
    payload: MatchingAlgorithmConfigPut,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_org_member),
):
    _require_admin(current_user)
    config = _get_or_create_config(current_user.organization_id, db)

    config.skills_weight = payload.skills_weight
    config.experience_weight = payload.experience_weight
    config.education_weight = payload.education_weight
    config.additional_weight = payload.additional_weight
    config.fuzzy_match_threshold = payload.fuzzy_match_threshold
    config.skills_match_algorithm = payload.skills_match_algorithm
    config.enable_synonym_matching = payload.enable_synonym_matching
    config.primary_skills_penalty_all = payload.primary_skills_penalty_all
    config.primary_skills_penalty_some = payload.primary_skills_penalty_some
    config.primary_skills_penalty_none = payload.primary_skills_penalty_none

    db.commit()
    db.refresh(config)
    return config
