"""Resolve effective application form (org defaults vs per-job hybrid overrides)."""

from typing import List, Tuple, Dict

from sqlalchemy.orm import Session

from app.db.models.application_form_config import ApplicationFormConfig
from app.db.models.custom_form_field import CustomFormField
from app.db.models.job_application_form_settings import JobApplicationFormSettings
from app.schemas.public_careers import PublicFormConfigResponse


def _default_public_config() -> PublicFormConfigResponse:
    return PublicFormConfigResponse()


def get_org_application_form(
    organization_id: int, db: Session
) -> Tuple[PublicFormConfigResponse, List[CustomFormField]]:
    """Organization-level defaults: config row + all custom fields ordered by sort_order."""
    config = (
        db.query(ApplicationFormConfig)
        .filter(ApplicationFormConfig.organization_id == organization_id)
        .first()
    )
    config_model = _default_public_config()
    if config:
        config_model = PublicFormConfigResponse.model_validate(config)

    custom_fields = (
        db.query(CustomFormField)
        .filter(CustomFormField.organization_id == organization_id)
        .order_by(CustomFormField.sort_order)
        .all()
    )
    return config_model, custom_fields


def resolve_application_form_for_job(
    job_id: int, organization_id: int, db: Session
) -> Tuple[PublicFormConfigResponse, List[CustomFormField], bool]:
    """
    Returns (effective_config, effective_custom_fields_ordered, uses_org_defaults).
    """
    settings = (
        db.query(JobApplicationFormSettings)
        .filter(JobApplicationFormSettings.job_id == job_id)
        .first()
    )

    org_config, org_fields = get_org_application_form(organization_id, db)

    if not settings or settings.use_organization_defaults:
        return org_config, org_fields, True

    # Custom mode: standard_config + subset/order of custom fields by id
    if not settings.standard_config or not isinstance(settings.standard_config, dict):
        return org_config, org_fields, True

    try:
        eff_config = PublicFormConfigResponse.model_validate(settings.standard_config)
    except Exception:
        return org_config, org_fields, True

    raw_ids = settings.custom_field_ids
    if raw_ids is None or not isinstance(raw_ids, list):
        raw_ids = []

    id_list: List[int] = []
    for x in raw_ids:
        try:
            id_list.append(int(x))
        except (TypeError, ValueError):
            continue

    by_id: Dict[int, CustomFormField] = {
        f.id: f
        for f in org_fields
        if f.organization_id == organization_id
    }
    ordered: List[CustomFormField] = []
    seen = set()
    for fid in id_list:
        if fid in seen:
            continue
        seen.add(fid)
        field = by_id.get(fid)
        if field is not None:
            ordered.append(field)

    return eff_config, ordered, False


