from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, model_validator


class EmailTemplateResponse(BaseModel):
    id: int
    organization_id: int
    stage: str
    name: Optional[str] = None
    subject: str
    body_html: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True


class EmailTemplateUpsert(BaseModel):
    name: Optional[str] = Field(None, max_length=120)
    subject: str = Field(..., max_length=500)
    body_html: str = Field(..., min_length=1)


class SendCandidateEmailRequest(BaseModel):
    template_id: Optional[int] = None
    subject: Optional[str] = Field(None, max_length=500)
    body_html: Optional[str] = None

    @model_validator(mode="after")
    def require_content(self):
        if self.template_id is not None:
            return self
        if self.subject and self.body_html:
            return self
        raise ValueError("Either template_id or both subject and body_html are required")


class OutboundEmailResponse(BaseModel):
    id: int
    job_application_id: int
    template_id: Optional[int] = None
    to_email: str
    subject_snapshot: str
    status: str
    provider_message_id: Optional[str] = None
    first_opened_at: Optional[datetime] = None
    created_at: datetime

    class Config:
        from_attributes = True


class OutboundEmailListResponse(BaseModel):
    emails: List[OutboundEmailResponse]
