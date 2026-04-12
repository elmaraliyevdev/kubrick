from typing import List, Optional, Any, Dict

from pydantic import BaseModel, field_validator, model_validator

from app.schemas.public_careers import PublicFormConfigResponse, PublicCustomFieldResponse


class ResolvedApplicationForm(BaseModel):
    config: PublicFormConfigResponse
    custom_fields: List[PublicCustomFieldResponse]


class JobApplicationFormSettingsResponse(BaseModel):
    use_organization_defaults: bool
    resolved: ResolvedApplicationForm
    organization_custom_fields: List[PublicCustomFieldResponse]
    standard_config: Optional[Dict[str, Any]] = None
    custom_field_ids: Optional[List[int]] = None


class JobApplicationFormSettingsPut(BaseModel):
    use_organization_defaults: bool
    standard_config: Optional[PublicFormConfigResponse] = None
    custom_field_ids: Optional[List[int]] = None

    @model_validator(mode="after")
    def require_payload_when_custom(self):
        if self.use_organization_defaults:
            return self
        if self.standard_config is None:
            raise ValueError("standard_config is required when use_organization_defaults is false")
        if self.custom_field_ids is None:
            raise ValueError(
                "custom_field_ids is required when use_organization_defaults is false (use [] for none)"
            )
        return self

    @field_validator("custom_field_ids")
    @classmethod
    def unique_ids(cls, v: Optional[List[int]]) -> Optional[List[int]]:
        if v is None:
            return v
        seen = set()
        out: List[int] = []
        for x in v:
            if x not in seen:
                seen.add(x)
                out.append(x)
        return out
