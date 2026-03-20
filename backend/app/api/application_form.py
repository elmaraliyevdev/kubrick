from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.core.security import get_current_user, get_db
from app.db.models.user import User
from app.db.models.application_form_config import ApplicationFormConfig
from app.db.models.custom_form_field import CustomFormField
from app.schemas.application_form import (
    ApplicationFormConfigResponse,
    ApplicationFormConfigUpdate,
    CustomFormFieldCreate,
    CustomFormFieldUpdate,
    CustomFormFieldResponse,
    FullApplicationFormResponse,
    ReorderFieldsRequest,
)

router = APIRouter()


def _get_or_create_config(org_id: int, db: Session) -> ApplicationFormConfig:
    """Get the form config for an org, creating with defaults if it doesn't exist."""
    config = db.query(ApplicationFormConfig).filter(
        ApplicationFormConfig.organization_id == org_id
    ).first()
    if not config:
        config = ApplicationFormConfig(organization_id=org_id)
        db.add(config)
        db.flush()
    return config


def _require_admin(user: User):
    if user.role != "admin":
        raise HTTPException(status_code=403, detail="Only admins can manage application form settings")


def _slugify_field_key(label: str) -> str:
    """Generate a machine-readable key from a label."""
    import re
    key = label.lower().strip()
    key = re.sub(r'[^a-z0-9\s]', '', key)
    key = re.sub(r'\s+', '_', key)
    return key[:50]


# --- Full form config (config + custom fields) ---

@router.get("", response_model=FullApplicationFormResponse)
def get_application_form(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Get the full application form configuration for the current org."""
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    config = _get_or_create_config(current_user.organization_id, db)
    db.commit()

    custom_fields = (
        db.query(CustomFormField)
        .filter(CustomFormField.organization_id == current_user.organization_id)
        .order_by(CustomFormField.sort_order)
        .all()
    )

    return FullApplicationFormResponse(
        config=ApplicationFormConfigResponse.model_validate(config),
        custom_fields=[CustomFormFieldResponse.model_validate(f) for f in custom_fields],
    )


# --- Config toggle endpoints ---

@router.put("/config", response_model=ApplicationFormConfigResponse)
def update_form_config(
    payload: ApplicationFormConfigUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update which default fields are shown/required on the application form."""
    _require_admin(current_user)
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    config = _get_or_create_config(current_user.organization_id, db)

    update_data = payload.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(config, key, value)

    db.commit()
    db.refresh(config)
    return config


# --- Custom fields CRUD ---

@router.post("/fields", response_model=CustomFormFieldResponse, status_code=201)
def create_custom_field(
    payload: CustomFormFieldCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Create a new custom form field for the org's application form."""
    _require_admin(current_user)
    if not current_user.organization_id:
        raise HTTPException(status_code=400, detail="User must belong to an organization")

    field_key = _slugify_field_key(payload.label)

    # Ensure unique field_key within org
    existing = db.query(CustomFormField).filter(
        CustomFormField.organization_id == current_user.organization_id,
        CustomFormField.field_key == field_key,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail=f"A custom field with key '{field_key}' already exists")

    # Auto-assign sort_order if not provided
    if payload.sort_order == 0:
        max_order = (
            db.query(CustomFormField.sort_order)
            .filter(CustomFormField.organization_id == current_user.organization_id)
            .order_by(CustomFormField.sort_order.desc())
            .first()
        )
        payload.sort_order = (max_order[0] + 1) if max_order else 0

    field = CustomFormField(
        organization_id=current_user.organization_id,
        field_key=field_key,
        label=payload.label,
        field_type=payload.field_type.value,
        is_required=payload.is_required,
        options=payload.options,
        placeholder=payload.placeholder,
        sort_order=payload.sort_order,
    )
    db.add(field)
    db.commit()
    db.refresh(field)
    return field


@router.put("/fields/{field_id}", response_model=CustomFormFieldResponse)
def update_custom_field(
    field_id: int,
    payload: CustomFormFieldUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Update a custom form field."""
    _require_admin(current_user)

    field = db.query(CustomFormField).filter(
        CustomFormField.id == field_id,
        CustomFormField.organization_id == current_user.organization_id,
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Custom field not found")

    update_data = payload.model_dump(exclude_unset=True)

    # If label is changing, regenerate field_key
    if "label" in update_data:
        new_key = _slugify_field_key(update_data["label"])
        existing = db.query(CustomFormField).filter(
            CustomFormField.organization_id == current_user.organization_id,
            CustomFormField.field_key == new_key,
            CustomFormField.id != field_id,
        ).first()
        if existing:
            raise HTTPException(status_code=409, detail=f"A custom field with key '{new_key}' already exists")
        field.field_key = new_key

    if "field_type" in update_data:
        update_data["field_type"] = update_data["field_type"].value if hasattr(update_data["field_type"], "value") else update_data["field_type"]

    for key, value in update_data.items():
        if key != "label" or key == "label":  # label already handled above for key regen
            setattr(field, key, value)

    db.commit()
    db.refresh(field)
    return field


@router.delete("/fields/{field_id}", status_code=204)
def delete_custom_field(
    field_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Delete a custom form field."""
    _require_admin(current_user)

    field = db.query(CustomFormField).filter(
        CustomFormField.id == field_id,
        CustomFormField.organization_id == current_user.organization_id,
    ).first()
    if not field:
        raise HTTPException(status_code=404, detail="Custom field not found")

    db.delete(field)
    db.commit()


@router.put("/fields/reorder", response_model=List[CustomFormFieldResponse])
def reorder_custom_fields(
    payload: ReorderFieldsRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """Reorder custom fields by providing an ordered list of field IDs."""
    _require_admin(current_user)

    fields = (
        db.query(CustomFormField)
        .filter(
            CustomFormField.organization_id == current_user.organization_id,
            CustomFormField.id.in_(payload.field_ids),
        )
        .all()
    )

    field_map = {f.id: f for f in fields}

    for index, field_id in enumerate(payload.field_ids):
        if field_id in field_map:
            field_map[field_id].sort_order = index

    db.commit()

    # Return in new order
    ordered = sorted(fields, key=lambda f: f.sort_order)
    return [CustomFormFieldResponse.model_validate(f) for f in ordered]
