from pydantic import BaseModel, field_validator
from typing import Optional, List
from enum import Enum


class FieldType(str, Enum):
    text = "text"
    textarea = "textarea"
    select = "select"
    checkbox = "checkbox"
    number = "number"
    date = "date"
    url = "url"


# --- Application Form Config (default field toggles) ---

class ApplicationFormConfigResponse(BaseModel):
    show_phone: bool = True
    show_location: bool = True
    show_linkedin: bool = True
    show_portfolio: bool = True
    show_cover_letter: bool = True
    require_phone: bool = False
    require_location: bool = False
    require_linkedin: bool = False
    require_portfolio: bool = False
    require_cover_letter: bool = False

    class Config:
        from_attributes = True


class ApplicationFormConfigUpdate(BaseModel):
    show_phone: Optional[bool] = None
    show_location: Optional[bool] = None
    show_linkedin: Optional[bool] = None
    show_portfolio: Optional[bool] = None
    show_cover_letter: Optional[bool] = None
    require_phone: Optional[bool] = None
    require_location: Optional[bool] = None
    require_linkedin: Optional[bool] = None
    require_portfolio: Optional[bool] = None
    require_cover_letter: Optional[bool] = None


# --- Custom Form Fields ---

class CustomFormFieldCreate(BaseModel):
    label: str
    field_type: FieldType
    is_required: bool = False
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None
    sort_order: int = 0

    @field_validator("label")
    @classmethod
    def validate_label(cls, v: str) -> str:
        v = v.strip()
        if not v or len(v) > 200:
            raise ValueError("Label must be between 1 and 200 characters")
        return v

    @field_validator("options")
    @classmethod
    def validate_options(cls, v, info):
        if info.data.get("field_type") == "select" and (not v or len(v) < 1):
            raise ValueError("Select fields must have at least one option")
        return v


class CustomFormFieldUpdate(BaseModel):
    label: Optional[str] = None
    field_type: Optional[FieldType] = None
    is_required: Optional[bool] = None
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None
    sort_order: Optional[int] = None


class CustomFormFieldResponse(BaseModel):
    id: int
    field_key: str
    label: str
    field_type: str
    is_required: bool
    options: Optional[List[str]] = None
    placeholder: Optional[str] = None
    sort_order: int

    class Config:
        from_attributes = True


class ReorderFieldsRequest(BaseModel):
    field_ids: List[int]  # ordered list of field IDs


# --- Combined response for the full form config ---

class FullApplicationFormResponse(BaseModel):
    config: ApplicationFormConfigResponse
    custom_fields: List[CustomFormFieldResponse]
