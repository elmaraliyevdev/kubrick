from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, JSON, func
from sqlalchemy.orm import relationship
from app.db.session import Base


class CustomFormField(Base):
    __tablename__ = "custom_form_fields"

    id = Column(Integer, primary_key=True, index=True)
    organization_id = Column(
        Integer,
        ForeignKey("organizations.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    field_key = Column(String, nullable=False)      # machine-readable: "years_experience"
    label = Column(String, nullable=False)           # display: "Years of Experience"
    field_type = Column(String, nullable=False)      # text, textarea, select, checkbox, number, date, url
    is_required = Column(Boolean, default=False, nullable=False)
    options = Column(JSON, nullable=True)            # For select fields: ["Option A", "Option B"]
    placeholder = Column(String, nullable=True)
    sort_order = Column(Integer, default=0, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    organization = relationship("Organization", back_populates="custom_form_fields")
