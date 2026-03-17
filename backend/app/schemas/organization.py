from pydantic import BaseModel

class OrganizationBase(BaseModel):
    name: str

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationResponse(OrganizationBase):
    id: int
    slug: str

    class Config:
        from_attributes = True