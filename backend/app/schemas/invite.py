from pydantic import BaseModel, EmailStr
from datetime import datetime

class InviteBase(BaseModel):
    email: EmailStr

class InviteResponse(BaseModel):
    id: int
    email: EmailStr
    token: str
    organization_id: int
    is_used: bool
    created_at: datetime

    class Config:
        from_attributes = True